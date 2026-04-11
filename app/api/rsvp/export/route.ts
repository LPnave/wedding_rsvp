import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")

  if (!process.env.RSVP_EXPORT_SECRET || key !== process.env.RSVP_EXPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await db.execute(`
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
      )
      WHERE rn = 1
      ORDER BY created_at ASC
    `)

    const rows = result.rows.map((row) => {
      const name = String(row.name).replace(/"/g, '""')
      const family = String(row.family_name).replace(/"/g, '""')
      const side = row.side ? String(row.side) : ""
      const attending = row.attending === 1 ? "Yes" : "No"
      const guestCount = row.attending === 1 ? String(row.guest_count ?? 1) : "0"
      const inviteCode = row.invite_code ? String(row.invite_code) : ""
      const date = String(row.created_at).split("T")[0] ?? String(row.created_at)
      return `"${name}","${family}",${side},${inviteCode},${attending},${guestCount},${date}`
    })

    const csv = ["Name,Family,Side,InviteCode,Attending,GuestCount,Date", ...rows].join("\n")

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
