import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT
        i.id,
        i.side,
        i.max_guests,
        COUNT(DISTINCT g.id)                                                  AS actual_guest_count,
        COALESCE(SUM(CASE WHEN g.attending = 1 THEN 1 ELSE 0 END), 0)        AS confirmed_guests_new,
        COALESCE(SUM(CASE WHEN g.attending IS NOT NULL THEN 1 ELSE 0 END), 0) AS responded_guests,
        MAX(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END)                     AS has_rsvp,
        COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.guest_count ELSE 0 END), 0) AS confirmed_guests_legacy
      FROM invites i
      LEFT JOIN guests g ON g.invite_id = i.id
      LEFT JOIN rsvps r ON r.invite_code = i.code
      GROUP BY i.id
    `)

    const rows = result.rows as unknown as Array<{
      side: string
      max_guests: number
      actual_guest_count: number
      confirmed_guests_new: number
      responded_guests: number
      has_rsvp: number
      confirmed_guests_legacy: number
    }>

    const getExpected = (r: (typeof rows)[number]) =>
      Number(r.actual_guest_count) > 0 ? Number(r.actual_guest_count) : Number(r.max_guests)

    const getConfirmed = (r: (typeof rows)[number]) =>
      Number(r.actual_guest_count) > 0
        ? Number(r.confirmed_guests_new)
        : Number(r.confirmed_guests_legacy)

    const getStatus = (r: (typeof rows)[number]) => {
      if (Number(r.actual_guest_count) > 0) {
        if (Number(r.responded_guests) === 0) return "pending"
        return Number(r.confirmed_guests_new) > 0 ? "attending" : "rejected"
      }
      if (!Number(r.has_rsvp)) return "pending"
      return Number(r.confirmed_guests_legacy) > 0 ? "attending" : "rejected"
    }

    const getRejected = (r: (typeof rows)[number]) => {
      if (Number(r.actual_guest_count) > 0) {
        return Number(r.actual_guest_count) - Number(r.confirmed_guests_new) - (Number(r.responded_guests) < Number(r.actual_guest_count) ? Number(r.actual_guest_count) - Number(r.responded_guests) : 0)
      }
      return getStatus(r) === "rejected" ? Number(r.max_guests) : 0
    }

    const getPending = (r: (typeof rows)[number]) => {
      if (Number(r.actual_guest_count) > 0) {
        return Number(r.actual_guest_count) - Number(r.responded_guests)
      }
      return getStatus(r) === "pending" ? Number(r.max_guests) : 0
    }

    const stats = {
      sides: [
        {
          label: "Groom's Side",
          confirmed: rows.filter((r) => r.side === "groom").reduce((s, r) => s + getConfirmed(r), 0),
          rejected: rows.filter((r) => r.side === "groom").reduce((s, r) => s + getRejected(r), 0),
          pending: rows.filter((r) => r.side === "groom").reduce((s, r) => s + getPending(r), 0),
        },
        {
          label: "Bride's Side",
          confirmed: rows.filter((r) => r.side === "bride").reduce((s, r) => s + getConfirmed(r), 0),
          rejected: rows.filter((r) => r.side === "bride").reduce((s, r) => s + getRejected(r), 0),
          pending: rows.filter((r) => r.side === "bride").reduce((s, r) => s + getPending(r), 0),
        },
      ],
      responses: [
        { label: "Attending", value: rows.filter((r) => getStatus(r) === "attending").length },
        { label: "Pending",   value: rows.filter((r) => getStatus(r) === "pending").length },
        { label: "Rejected",  value: rows.filter((r) => getStatus(r) === "rejected").length },
      ],
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Admin stats GET error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
