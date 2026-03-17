import { NextRequest, NextResponse } from "next/server"
import { authLimiter } from "@/lib/ratelimit"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1"
  const { success, remaining } = await authLimiter.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    )
  }

  const { password } = await req.json()

  if (!process.env.RSVP_EXPORT_SECRET || password !== process.env.RSVP_EXPORT_SECRET) {
    return NextResponse.json(
      { error: `Invalid password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` },
      { status: 401 }
    )
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
