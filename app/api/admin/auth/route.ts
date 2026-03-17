import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!process.env.RSVP_EXPORT_SECRET || password !== process.env.RSVP_EXPORT_SECRET) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set("admin_auth", process.env.RSVP_EXPORT_SECRET, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete("admin_auth")
  return res
}
