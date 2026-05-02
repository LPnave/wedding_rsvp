import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const invite_id = searchParams.get("invite_id")
  if (!invite_id) {
    return NextResponse.json({ error: "invite_id is required" }, { status: 400 })
  }
  try {
    const result = await db.execute({
      sql: "SELECT id, invite_id, name, table_number, attending, created_at FROM guests WHERE invite_id = ? ORDER BY created_at ASC",
      args: [invite_id],
    })
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Admin guests GET error:", error)
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { invite_id, name, table_number } = body

    if (!invite_id || typeof invite_id !== "number") {
      return NextResponse.json({ error: "invite_id is required" }, { status: 400 })
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const inviteCheck = await db.execute({
      sql: "SELECT id FROM invites WHERE id = ?",
      args: [invite_id],
    })
    if (inviteCheck.rows.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const result = await db.execute({
      sql: "INSERT INTO guests (invite_id, name, table_number) VALUES (?, ?, ?)",
      args: [invite_id, name.trim(), table_number?.trim() || null],
    })
    const id = Number(result.lastInsertRowid)
    const created_at = new Date().toISOString().replace("T", " ").slice(0, 19)
    return NextResponse.json({ success: true, id, created_at }, { status: 201 })
  } catch (error) {
    console.error("Admin guests POST error:", error)
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 })
  }
}
