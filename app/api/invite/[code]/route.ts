import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { inviteLimiter } from "@/lib/ratelimit"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1"
  const { success } = await inviteLimiter.limit(ip)

  if (!success) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }

  const { code } = await params
  try {
    const result = await db.execute({
      sql: "SELECT family_name, max_guests FROM invites WHERE code = ? COLLATE NOCASE",
      args: [code],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const row = result.rows[0]

    const rsvpResult = await db.execute({
      sql: "SELECT id FROM rsvps WHERE invite_code = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 1",
      args: [code],
    })

    return NextResponse.json({
      family_name: row.family_name,
      max_guests: row.max_guests,
      already_submitted: rsvpResult.rows.length > 0,
    })
  } catch (error) {
    console.error("Invite lookup error:", error)
    return NextResponse.json({ error: "Failed to look up invite" }, { status: 500 })
  }
}
