import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, attending } = body

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (attending !== "yes" && attending !== "no") {
      return NextResponse.json({ error: "Attendance must be 'yes' or 'no'" }, { status: 400 })
    }

    await db.execute({
      sql: "INSERT INTO rsvps (name, attending) VALUES (?, ?)",
      args: [name.trim(), attending === "yes" ? 1 : 0],
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("RSVP submission error:", error)
    return NextResponse.json({ error: "Failed to submit RSVP" }, { status: 500 })
  }
}
