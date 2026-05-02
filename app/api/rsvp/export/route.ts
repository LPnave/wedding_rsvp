import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")

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

    const guestRows = guestsResult.rows.map((row) => {
      const name = String(row.name).replace(/"/g, '""')
      const family = String(row.family).replace(/"/g, '""')
      const side = row.side ? String(row.side) : ""
      const inviteCode = row.invite_code ? String(row.invite_code) : ""
      const tableNum = row.table_number ? String(row.table_number) : ""
      const att = row.attending === 1 ? "Yes" : row.attending === 0 ? "No" : "Pending"
      const date = String(row.created_at).split("T")[0] ?? String(row.created_at)
      return `"${name}","${family}",${side},${inviteCode},${tableNum},${att},${date}`
    })

    const legacyRows = legacyResult.rows.map((row) => {
      const name = String(row.name).replace(/"/g, '""')
      const family = String(row.family_name).replace(/"/g, '""')
      const side = row.side ? String(row.side) : ""
      const inviteCode = row.invite_code ? String(row.invite_code) : ""
      const att = row.attending === 1 ? "Yes" : "No"
      const guestCount = row.attending === 1 ? String(row.guest_count ?? 1) : "0"
      const date = String(row.created_at).split("T")[0] ?? String(row.created_at)
      return `"${name}","${family}",${side},${inviteCode},,${att},${date},${guestCount}`
    })

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
