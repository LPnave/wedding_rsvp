import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, attending, invite_code, guest_count } = body

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (attending !== "yes" && attending !== "no") {
      return NextResponse.json({ error: "Attendance must be 'yes' or 'no'" }, { status: 400 })
    }

    let resolvedInviteCode: string | null = null
    let resolvedGuestCount = 1

    if (invite_code) {
      const inviteResult = await db.execute({
        sql: "SELECT max_guests FROM invites WHERE code = ? COLLATE NOCASE",
        args: [invite_code],
      })

      if (inviteResult.rows.length === 0) {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 400 })
      }

      const maxGuests = Number(inviteResult.rows[0].max_guests)
      const requestedCount = parseInt(guest_count, 10)

      if (isNaN(requestedCount) || requestedCount < 1) {
        return NextResponse.json({ error: "Guest count must be at least 1" }, { status: 400 })
      }
      if (requestedCount > maxGuests) {
        return NextResponse.json(
          { error: `Guest count cannot exceed ${maxGuests}` },
          { status: 400 }
        )
      }

      resolvedInviteCode = String(invite_code).toUpperCase()
      resolvedGuestCount = requestedCount
    }

    await db.execute({
      sql: "INSERT INTO rsvps (name, attending, invite_code, guest_count) VALUES (?, ?, ?, ?)",
      args: [name.trim(), attending === "yes" ? 1 : 0, resolvedInviteCode, resolvedGuestCount],
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("RSVP submission error:", error)
    return NextResponse.json({ error: "Failed to submit RSVP" }, { status: 500 })
  }
}
