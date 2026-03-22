import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT
        i.id,
        i.code,
        i.family_name,
        i.max_guests,
        i.side,
        i.table_number,
        i.created_at,
        COUNT(r.id) AS responded,
        COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.guest_count ELSE 0 END), 0) AS confirmed_guests
      FROM invites i
      LEFT JOIN rsvps r ON r.invite_code = i.code COLLATE NOCASE
      GROUP BY i.id
      ORDER BY i.created_at ASC
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Admin invites GET error:", error)
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 })
  }
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(req: NextRequest) {
  try {
    const { family_name, max_guests, side } = await req.json()

    if (!family_name || typeof family_name !== "string" || family_name.trim() === "") {
      return NextResponse.json({ error: "Family name is required" }, { status: 400 })
    }
    const guests = parseInt(max_guests, 10)
    if (isNaN(guests) || guests < 1) {
      return NextResponse.json({ error: "Max guests must be at least 1" }, { status: 400 })
    }
    if (side !== "groom" && side !== "bride") {
      return NextResponse.json({ error: "Side must be 'groom' or 'bride'" }, { status: 400 })
    }

    // Retry up to 5 times on the unlikely chance of a collision
    let code = ""
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode()
      try {
        await db.execute({
          sql: "INSERT INTO invites (code, family_name, max_guests, side) VALUES (?, ?, ?, ?)",
          args: [code, family_name.trim(), guests, side],
        })
        return NextResponse.json({ success: true, code }, { status: 201 })
      } catch (err: unknown) {
        if (err instanceof Error && err.message?.includes("UNIQUE")) continue
        throw err
      }
    }

    return NextResponse.json({ error: "Failed to generate unique code, please try again" }, { status: 500 })
  } catch (error) {
    console.error("Admin invites POST error:", error)
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 })
  }
}
