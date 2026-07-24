import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import * as XLSX from "xlsx"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")
  const format = searchParams.get("format") ?? "default" // "default" | "tablewise"

  if (!process.env.RSVP_EXPORT_SECRET || key !== process.env.RSVP_EXPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Per-guest records (primary source of truth)
    const guestsResult = await db.execute(`
      SELECT
        g.name        AS name,
        i.family_name AS family,
        i.side        AS side,
        i.code        AS invite_code,
        g.table_number,
        g.attending,
        g.created_at
      FROM guests g
      JOIN invites i ON i.id = g.invite_id
      ORDER BY i.family_name ASC, g.name ASC
    `)

    // Walk-in RSVPs (no invite code) + latest per invite with no guest records
    const legacyResult = await db.execute(`
      SELECT name, attending, guest_count, invite_code, family_name, side, created_at
      FROM (
        SELECT
          r.name,
          r.attending,
          r.guest_count,
          r.invite_code,
          COALESCE(i.family_name, '') AS family_name,
          COALESCE(i.side, '')        AS side,
          r.created_at,
          CASE
            WHEN r.invite_code IS NULL THEN 1
            ELSE ROW_NUMBER() OVER (PARTITION BY r.invite_code ORDER BY r.created_at DESC)
          END AS rn
        FROM rsvps r
        LEFT JOIN invites i ON i.code = r.invite_code
        WHERE r.invite_code IS NULL
           OR NOT EXISTS (SELECT 1 FROM guests g WHERE g.invite_id = i.id)
      )
      WHERE rn = 1
      ORDER BY family_name ASC, name ASC
    `)

    type GuestRow = {
      name: string; family: string; side: string; invite_code: string
      table_number: string | null; attending: number | null; created_at: string
    }
    type LegacyRow = {
      name: string; family_name: string; side: string; invite_code: string | null
      attending: number | null; guest_count: number | null; created_at: string
    }

    const guests = guestsResult.rows as unknown as GuestRow[]
    const legacy = legacyResult.rows as unknown as LegacyRow[]

    const escCsv = (s: string) => `"${s.replace(/"/g, '""')}"`
    const attLabel = (v: number | null) => v === 1 ? "Yes" : v === 0 ? "No" : "Pending"
    const dateStr = (s: string) => String(s).split("T")[0] ?? String(s)

    if (format === "tablewise") {
      const sortKey = (t: string | null) => {
        if (!t) return Number.MAX_SAFE_INTEGER
        const n = parseInt(t, 10)
        return isNaN(n) ? Number.MAX_SAFE_INTEGER - 1 : n
      }

      // Group guests by table number
      const grouped: Record<string, GuestRow[]> = {}
      for (const g of guests) {
        const key = g.table_number ?? "__unassigned__"
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(g)
      }

      // Sort table keys
      const tableKeys = Object.keys(grouped).sort((a, b) => {
        return sortKey(a === "__unassigned__" ? null : a) - sortKey(b === "__unassigned__" ? null : b)
      })

      const lines: string[] = []
      for (const key of tableKeys) {
        const label = key === "__unassigned__" ? "Unassigned" : `Table ${key}`
        lines.push(escCsv(label))  // table header row
        for (const g of grouped[key].sort((a, b) => a.name.localeCompare(b.name))) {
          lines.push(`,${escCsv(g.name)},${escCsv(g.family)},${g.side},${attLabel(g.attending)}`)
        }
        lines.push("") // blank row between tables
      }

      // Legacy/unassigned at the end under their own section
      if (legacy.length > 0) {
        lines.push(escCsv("Walk-ins / Legacy"))
        for (const row of legacy) {
          lines.push(`,${escCsv(row.name)},${escCsv(row.family_name)},${row.side},${attLabel(row.attending)}`)
        }
        lines.push("")
      }

      const csv = ["Table,Name,Family,Side,Attending", ...lines].join("\n")

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="guests-tablewise-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // ── XLSX: flat guest list ────────────────────────────────────────────────
    if (format === "xlsx") {
      const rows = [
        ["Name", "Family", "Side", "Invite Code", "Table", "Attending", "Date"],
        ...guests.map((r) => [r.name, r.family, r.side, r.invite_code, r.table_number ?? "", attLabel(r.attending), dateStr(r.created_at)]),
        ...legacy.map((r) => [r.name, r.family_name, r.side, r.invite_code ?? "", "", attLabel(r.attending), dateStr(r.created_at)]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Guest List")
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="rsvps-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      })
    }

    // ── XLSX: table-wise ─────────────────────────────────────────────────────
    if (format === "tablewise-xlsx") {
      const sortKey = (t: string | null) => {
        if (!t) return Number.MAX_SAFE_INTEGER
        const n = parseInt(t, 10)
        return isNaN(n) ? Number.MAX_SAFE_INTEGER - 1 : n
      }
      const grouped: Record<string, GuestRow[]> = {}
      for (const g of guests) {
        const key = g.table_number ?? "__unassigned__"
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(g)
      }
      const tableKeys = Object.keys(grouped).sort((a, b) =>
        sortKey(a === "__unassigned__" ? null : a) - sortKey(b === "__unassigned__" ? null : b)
      )

      const rows: (string | number)[][] = [["Table", "Name", "Family", "Side", "Attending"]]
      for (const key of tableKeys) {
        const label = key === "__unassigned__" ? "Unassigned" : `Table ${key}`
        rows.push([label, "", "", "", ""])
        for (const g of grouped[key].sort((a, b) => a.name.localeCompare(b.name))) {
          rows.push(["", g.name, g.family, g.side, attLabel(g.attending)])
        }
        rows.push(["", "", "", "", ""])
      }
      if (legacy.length > 0) {
        rows.push(["Walk-ins / Legacy", "", "", "", ""])
        for (const r of legacy) {
          rows.push(["", r.name, r.family_name, r.side, attLabel(r.attending)])
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "By Table")
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="guests-tablewise-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      })
    }

    // ── Default: flat guest list ──────────────────────────────────────────────
    const guestRows = guests.map((row) =>
      [
        escCsv(row.name),
        escCsv(row.family),
        row.side,
        row.invite_code,
        row.table_number ?? "",
        attLabel(row.attending),
        dateStr(row.created_at),
        "",
      ].join(",")
    )

    const legacyRows = legacy.map((row) =>
      [
        escCsv(row.name),
        escCsv(row.family_name),
        row.side,
        row.invite_code ?? "",
        "",
        attLabel(row.attending),
        dateStr(row.created_at),
        row.attending === 1 ? String(row.guest_count ?? 1) : "0",
      ].join(",")
    )

    const csv = [
      "Name,Family,Side,InviteCode,Table,Attending,Date,GuestCount",
      ...guestRows,
      ...legacyRows,
    ].join("\n")

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rsvps-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("RSVP export error:", error)
    return NextResponse.json({ error: "Failed to export RSVPs" }, { status: 500 })
  }
}
