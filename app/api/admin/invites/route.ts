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

export async function POST(req: NextRequest) {
  try {
    const { family_name, code, max_guests } = await req.json()

    if (!family_name || typeof family_name !== "string" || family_name.trim() === "") {
      return NextResponse.json({ error: "Family name is required" }, { status: 400 })
    }
    if (!code || typeof code !== "string" || code.trim() === "") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }
    const guests = parseInt(max_guests, 10)
    if (isNaN(guests) || guests < 1) {
      return NextResponse.json({ error: "Max guests must be at least 1" }, { status: 400 })
    }

    const slug = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-")

    await db.execute({
      sql: "INSERT INTO invites (code, family_name, max_guests) VALUES (?, ?, ?)",
      args: [slug, family_name.trim(), guests],
    })

    return NextResponse.json({ success: true, code: slug }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "That code is already taken" }, { status: 409 })
    }
    console.error("Admin invites POST error:", error)
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 })
  }
}
