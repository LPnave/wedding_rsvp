import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    // Search by code, family name, or individual guest name
    const inviteResult = await db.execute({
      sql: `
        SELECT
          i.id,
          i.code,
          i.family_name,
          i.max_guests,
          i.table_number,
          COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.guest_count ELSE 0 END), 0) AS confirmed_guests_rsvp
        FROM invites i
        LEFT JOIN rsvps r ON r.invite_code = i.code
        WHERE i.code = ?
           OR i.family_name LIKE ?
           OR i.id IN (SELECT invite_id FROM guests WHERE name LIKE ?)
        GROUP BY i.id
        ORDER BY i.family_name ASC
        LIMIT 10
      `,
      args: [query.toUpperCase(), `%${query}%`, `%${query}%`],
    })

    if (inviteResult.rows.length === 0) {
      return NextResponse.json([])
    }

    const inviteIds = inviteResult.rows.map((r) => Number(r.id))
    const placeholders = inviteIds.map(() => "?").join(",")

    // Fetch guests for matched invites
    const guestsResult = await db.execute({
      sql: `SELECT id, invite_id, name, table_number, attending FROM guests WHERE invite_id IN (${placeholders})`,
      args: inviteIds,
    })

    type GuestRow = { id: number; invite_id: number; name: string; table_number: string | null; attending: number | null }
    const guestsByInvite = (guestsResult.rows as unknown as GuestRow[]).reduce(
      (acc, g) => {
        const key = Number(g.invite_id)
        if (!acc[key]) acc[key] = []
        acc[key].push(g)
        return acc
      },
      {} as Record<number, GuestRow[]>
    )

    // Collect unique table numbers used by guests (and invite-level for legacy)
    const guestTableNumbers = [
      ...new Set(
        (guestsResult.rows as unknown as GuestRow[])
          .filter((g) => g.table_number)
          .map((g) => g.table_number as string)
      ),
    ]
    const inviteLegacyTableNumbers = [
      ...new Set(
        inviteResult.rows
          .filter((r) => r.table_number && !(guestsByInvite[Number(r.id)]?.length > 0))
          .map((r) => String(r.table_number))
      ),
    ]
    const allTableNumbers = [...new Set([...guestTableNumbers, ...inviteLegacyTableNumbers])]

    // Fetch table-mates from other invites' guests
    type MateRow = { name: string; family_name: string; table_number: string; invite_id: number }
    let tableMatePeople: MateRow[] = []

    if (allTableNumbers.length > 0) {
      const tnPlaceholders = allTableNumbers.map(() => "?").join(",")
      const idPlaceholders = inviteIds.map(() => "?").join(",")

      const [guestMatesResult, inviteMatesResult] = await Promise.all([
        db.execute({
          sql: `
            SELECT g.name, i.family_name, g.table_number, g.invite_id
            FROM guests g JOIN invites i ON i.id = g.invite_id
            WHERE g.table_number IN (${tnPlaceholders})
              AND g.invite_id NOT IN (${idPlaceholders})
          `,
          args: [...allTableNumbers, ...inviteIds],
        }),
        db.execute({
          sql: `
            SELECT i.family_name AS name, i.family_name, i.table_number, i.id AS invite_id
            FROM invites i
            WHERE i.table_number IN (${tnPlaceholders})
              AND i.id NOT IN (${idPlaceholders})
              AND NOT EXISTS (SELECT 1 FROM guests g WHERE g.invite_id = i.id)
          `,
          args: [...allTableNumbers, ...inviteIds],
        }),
      ])

      tableMatePeople = [
        ...(guestMatesResult.rows as unknown as MateRow[]),
        ...(inviteMatesResult.rows as unknown as MateRow[]),
      ]
    }

    // Build final response
    const results = inviteResult.rows.map((row) => {
      const inviteId = Number(row.id)
      const guests = guestsByInvite[inviteId] ?? []

      if (guests.length > 0) {
        const guestsWithMates = guests.map((g) => ({
          ...g,
          table_mates: g.table_number
            ? tableMatePeople.filter((m) => m.table_number === g.table_number)
            : [],
        }))
        return {
          code: row.code,
          family_name: row.family_name,
          max_guests: row.max_guests,
          table_number: null,
          confirmed_guests: guests.filter((g) => g.attending === 1).length,
          guests: guestsWithMates,
          table_mates: [],
        }
      }

      // Legacy: invite-level table
      const tableNumber = row.table_number as string | null
      return {
        code: row.code,
        family_name: row.family_name,
        max_guests: row.max_guests,
        table_number: tableNumber,
        confirmed_guests: Number(row.confirmed_guests_rsvp),
        guests: [],
        table_mates: tableNumber
          ? tableMatePeople.filter((m) => m.table_number === tableNumber)
          : [],
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Usher lookup error:", error)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
