import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const normalizedCode = code.toUpperCase()
  try {
    const inviteResult = await db.execute({
      sql: "SELECT id, family_name, max_guests, table_number FROM invites WHERE code = ?",
      args: [normalizedCode],
    })

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const row = inviteResult.rows[0]
    const inviteId = Number(row.id)

    const guestsResult = await db.execute({
      sql: "SELECT id, name, attending, table_number FROM guests WHERE invite_id = ? ORDER BY created_at ASC",
      args: [inviteId],
    })

    const guests = (
      guestsResult.rows as unknown as Array<{
        id: number
        name: string
        attending: number | null
        table_number: string | null
      }>
    ).map((g) => ({
      id: Number(g.id),
      name: String(g.name),
      attending: g.attending as number | null,
      table_number: g.table_number as string | null,
    }))

    // already_submitted: all guests responded (or legacy rsvp exists for no-guest invites)
    let alreadySubmitted: boolean
    if (guests.length > 0) {
      alreadySubmitted = guests.every((g) => g.attending !== null)
    } else {
      const rsvpResult = await db.execute({
        sql: "SELECT 1 FROM rsvps WHERE invite_code = ? LIMIT 1",
        args: [normalizedCode],
      })
      alreadySubmitted = rsvpResult.rows.length > 0
    }

    return NextResponse.json({
      family_name: row.family_name,
      max_guests: row.max_guests,
      table_number: row.table_number ?? null,
      already_submitted: alreadySubmitted,
      guests,
    })
  } catch (error) {
    console.error("Invite lookup error:", error)
    return NextResponse.json({ error: "Failed to look up invite" }, { status: 500 })
  }
}
