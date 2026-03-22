import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  try {
    // Regenerate invite code
    if (body.action === "regenerate") {
      for (let attempt = 0; attempt < 5; attempt++) {
        const newCode = generateCode()
        try {
          await db.execute({
            sql: "UPDATE invites SET code = ? WHERE id = ?",
            args: [newCode, id],
          })
          return NextResponse.json({ success: true, code: newCode })
        } catch (err: unknown) {
          if (err instanceof Error && err.message?.includes("UNIQUE")) continue
          throw err
        }
      }
      return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 })
    }

    // Update table number
    await db.execute({
      sql: "UPDATE invites SET table_number = ? WHERE id = ?",
      args: [body.table_number ?? null, id],
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin invites PATCH error:", error)
    return NextResponse.json({ error: "Failed to update invite" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await db.execute({
      sql: "DELETE FROM invites WHERE id = ?",
      args: [id],
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin invites DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete invite" }, { status: 500 })
  }
}
