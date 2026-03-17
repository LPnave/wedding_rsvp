import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

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
