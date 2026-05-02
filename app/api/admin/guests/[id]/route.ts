import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import type { InValue } from "@libsql/client"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await req.json()
    const fields: string[] = []
    const args: InValue[] = []

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
      }
      fields.push("name = ?")
      args.push(body.name.trim())
    }
    if (body.table_number !== undefined) {
      fields.push("table_number = ?")
      args.push(body.table_number ?? null)
    }
    if (body.attending !== undefined) {
      fields.push("attending = ?")
      args.push(body.attending)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    args.push(id)
    await db.execute({
      sql: `UPDATE guests SET ${fields.join(", ")} WHERE id = ?`,
      args,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin guests PATCH error:", error)
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await db.execute({
      sql: "DELETE FROM guests WHERE id = ?",
      args: [id],
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin guests DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete guest" }, { status: 500 })
  }
}
