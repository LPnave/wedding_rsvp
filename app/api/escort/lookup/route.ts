import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    const result = await db.execute({
      sql: `
        SELECT
          i.code,
          i.family_name,
          i.max_guests,
          i.table_number,
          COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.guest_count ELSE 0 END), 0) AS confirmed_guests
        FROM invites i
        LEFT JOIN rsvps r ON r.invite_code = i.code COLLATE NOCASE
        WHERE i.code = ? COLLATE NOCASE
           OR i.family_name LIKE ?
        GROUP BY i.id
        ORDER BY i.family_name ASC
        LIMIT 10
      `,
      args: [query, `%${query}%`],
    })

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Escort lookup error:", error)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
