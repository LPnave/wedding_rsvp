import { NextRequest, NextResponse } from "next/server"

const ADMIN_PATHS = ["/admin", "/api/admin"]
const ESCORT_PATHS = ["/escort", "/api/escort"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // --- Admin protection ---
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  const isAdminLogin = pathname === "/admin/login"
  const isAdminAuth = pathname === "/api/admin/auth"

  if (isAdminPath && !isAdminLogin && !isAdminAuth) {
    const cookie = req.cookies.get("admin_auth")
    if (!cookie || cookie.value !== process.env.RSVP_EXPORT_SECRET) {
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }
  }

  // --- Escort protection ---
  const isEscortPath = ESCORT_PATHS.some((p) => pathname.startsWith(p))
  const isEscortLogin = pathname === "/escort/login"
  const isEscortAuth = pathname === "/api/escort/auth"

  if (isEscortPath && !isEscortLogin && !isEscortAuth) {
    const cookie = req.cookies.get("escort_auth")
    if (!cookie || cookie.value !== process.env.ESCORT_SECRET) {
      return NextResponse.redirect(new URL("/escort/login", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/escort/:path*", "/api/escort/:path*"],
}
