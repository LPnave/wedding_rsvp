import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { rsvpLimiter } from "@/lib/ratelimit"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1"
  const { success } = await rsvpLimiter.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { name, attending, invite_code, guest_count, responses } = body

    // ── Per-guest flow (new) ────────────────────────────────────────────────
    if (invite_code && Array.isArray(responses)) {
      const normalizedCode = String(invite_code).toUpperCase()

      const inviteResult = await db.execute({
        sql: "SELECT id, family_name FROM invites WHERE code = ?",
        args: [normalizedCode],
      })
      if (inviteResult.rows.length === 0) {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 400 })
      }
      const inviteId = Number(inviteResult.rows[0].id)
      const familyName = String(inviteResult.rows[0].family_name)

      if (responses.length === 0) {
        return NextResponse.json({ error: "No responses provided" }, { status: 400 })
      }

      for (const r of responses as Array<{ guest_id: unknown; attending: unknown }>) {
        if (typeof r.guest_id !== "number") {
          return NextResponse.json({ error: "Invalid guest_id" }, { status: 400 })
        }
        if (r.attending !== "yes" && r.attending !== "no") {
          return NextResponse.json({ error: "Attending must be 'yes' or 'no'" }, { status: 400 })
        }
      }

      // Verify all guest IDs belong to this invite
      const guestIds = (responses as Array<{ guest_id: number }>).map((r) => r.guest_id)
      const guestPlaceholders = guestIds.map(() => "?").join(",")
      const guestCheck = await db.execute({
        sql: `SELECT id FROM guests WHERE id IN (${guestPlaceholders}) AND invite_id = ?`,
        args: [...guestIds, inviteId],
      })
      if (guestCheck.rows.length !== guestIds.length) {
        return NextResponse.json({ error: "Invalid guest IDs" }, { status: 400 })
      }

      // Update each guest's attending status
      await Promise.all(
        (responses as Array<{ guest_id: number; attending: string }>).map((r) =>
          db.execute({
            sql: "UPDATE guests SET attending = ? WHERE id = ?",
            args: [r.attending === "yes" ? 1 : 0, r.guest_id],
          })
        )
      )

      // Log a submission record in rsvps for history
      const attendingCount = (responses as Array<{ attending: string }>).filter(
        (r) => r.attending === "yes"
      ).length
      await db.execute({
        sql: "INSERT INTO rsvps (name, attending, invite_code, guest_count) VALUES (?, ?, ?, ?)",
        args: [familyName, attendingCount > 0 ? 1 : 0, normalizedCode, attendingCount],
      })

      return NextResponse.json({ success: true }, { status: 201 })
    }

    // ── Legacy / walk-in flow ───────────────────────────────────────────────
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (attending !== "yes" && attending !== "no") {
      return NextResponse.json({ error: "Attendance must be 'yes' or 'no'" }, { status: 400 })
    }

    let resolvedInviteCode: string | null = null
    let resolvedGuestCount = 1

    if (invite_code) {
      const normalizedCode = String(invite_code).toUpperCase()
      const inviteResult = await db.execute({
        sql: "SELECT max_guests FROM invites WHERE code = ?",
        args: [normalizedCode],
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
      resolvedInviteCode = normalizedCode
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
