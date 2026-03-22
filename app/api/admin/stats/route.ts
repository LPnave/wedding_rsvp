import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT
        i.side,
        i.max_guests,
        COUNT(r.id) AS responded,
        COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.guest_count ELSE 0 END), 0) AS confirmed_guests
      FROM invites i
      LEFT JOIN rsvps r ON r.invite_code = i.code COLLATE NOCASE
      GROUP BY i.id
    `)

    const rows = result.rows as unknown as Array<{
      side: string
      max_guests: number
      responded: number
      confirmed_guests: number
    }>

    const stats = {
      sides: [
        {
          label: "Groom's Side",
          expected: rows.filter((r) => r.side === "groom").reduce((s, r) => s + Number(r.max_guests), 0),
          confirmed: rows.filter((r) => r.side === "groom").reduce((s, r) => s + Number(r.confirmed_guests), 0),
        },
        {
          label: "Bride's Side",
          expected: rows.filter((r) => r.side === "bride").reduce((s, r) => s + Number(r.max_guests), 0),
          confirmed: rows.filter((r) => r.side === "bride").reduce((s, r) => s + Number(r.confirmed_guests), 0),
        },
      ],
      responses: [
        { label: "Attending", value: rows.filter((r) => Number(r.responded) > 0 && Number(r.confirmed_guests) > 0).length },
        { label: "Pending",   value: rows.filter((r) => Number(r.responded) === 0).length },
        { label: "Rejected",  value: rows.filter((r) => Number(r.responded) > 0 && Number(r.confirmed_guests) === 0).length },
      ],
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Admin stats GET error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
