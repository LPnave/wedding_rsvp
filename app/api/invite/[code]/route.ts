import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const normalizedCode = code.toUpperCase()
  try {
    const result = await db.execute({
      sql: `
        SELECT
          i.family_name,
          i.max_guests,
          i.table_number,
          EXISTS(
            SELECT 1 FROM rsvps r
            WHERE r.invite_code = i.code
          ) AS already_submitted
        FROM invites i
        WHERE i.code = ?
      `,
      args: [normalizedCode],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const row = result.rows[0]

    return NextResponse.json({
      family_name: row.family_name,
      max_guests: row.max_guests,
      table_number: row.table_number ?? null,
      already_submitted: row.already_submitted === 1,
    })
  } catch (error) {
    console.error("Invite lookup error:", error)
    return NextResponse.json({ error: "Failed to look up invite" }, { status: 500 })
  }
}
