import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!process.env.ESCORT_SECRET || password !== process.env.ESCORT_SECRET) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set("escort_auth", process.env.ESCORT_SECRET, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete("escort_auth")
  return res
}
