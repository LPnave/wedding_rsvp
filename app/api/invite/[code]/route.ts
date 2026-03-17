import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
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
    return NextResponse.json({
      family_name: row.family_name,
      max_guests: row.max_guests,
    })
  } catch (error) {
    console.error("Invite lookup error:", error)
    return NextResponse.json({ error: "Failed to look up invite" }, { status: 500 })
  }
}
