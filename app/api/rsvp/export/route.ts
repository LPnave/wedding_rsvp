import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")

  if (!process.env.RSVP_EXPORT_SECRET || key !== process.env.RSVP_EXPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await db.execute("SELECT name, attending, created_at FROM rsvps ORDER BY created_at ASC")

    const rows = result.rows.map((row) => {
      const name = String(row.name).replace(/"/g, '""')
      const attending = row.attending === 1 ? "Yes" : "No"
      const date = String(row.created_at).split("T")[0] ?? String(row.created_at)
      return `"${name}",${attending},${date}`
    })

    const csv = ["Name,Attending,Date", ...rows].join("\n")

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rsvps-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("RSVP export error:", error)
    return NextResponse.json({ error: "Failed to export RSVPs" }, { status: 500 })
  }
}
