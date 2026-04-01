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

    const guests = result.rows as unknown as Array<{
      code: string
      family_name: string
      max_guests: number
      table_number: string | null
      confirmed_guests: number
      table_mates?: Array<{ family_name: string; confirmed_guests: number; max_guests: number }>
    }>

    // Collect distinct table numbers to fetch all table-mates in one query
    const tableNumbers = [...new Set(guests.filter((g) => g.table_number).map((g) => g.table_number as string))]

    if (tableNumbers.length > 0) {
      const guestCodes = guests.map((g) => g.code)
      const placeholders = tableNumbers.map(() => "?").join(",")
      const codePlaceholders = guestCodes.map(() => "?").join(",")

      const matesResult = await db.execute({
        sql: `
          SELECT
            i.family_name,
            i.max_guests,
            i.table_number,
            COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.guest_count ELSE 0 END), 0) AS confirmed_guests
          FROM invites i
          LEFT JOIN rsvps r ON r.invite_code = i.code COLLATE NOCASE
          WHERE i.table_number IN (${placeholders})
            AND i.code NOT IN (${codePlaceholders})
          GROUP BY i.id
          ORDER BY i.family_name ASC
        `,
        args: [...tableNumbers, ...guestCodes],
      })

      const mates = matesResult.rows as unknown as Array<{
        family_name: string
        max_guests: number
        table_number: string
        confirmed_guests: number
      }>

      // Attach table-mates to each guest by matching table_number
      for (const guest of guests) {
        if (!guest.table_number) continue
        guest.table_mates = mates.filter((m) => m.table_number === guest.table_number)
      }
    }

    return NextResponse.json(guests)
  } catch (error) {
    console.error("Usher lookup error:", error)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
