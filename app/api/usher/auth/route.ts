import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!process.env.USHER_SECRET || password !== process.env.USHER_SECRET) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set("usher_auth", process.env.USHER_SECRET, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete("usher_auth")
  return res
}
