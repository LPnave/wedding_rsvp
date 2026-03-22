import { NextRequest, NextResponse } from "next/server"

const ADMIN_PATHS = ["/admin", "/api/admin"]
const USHER_PATHS = ["/usher", "/api/usher"]

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

  // --- Usher protection ---
  const isUsherPath = USHER_PATHS.some((p) => pathname.startsWith(p))
  const isUsherLogin = pathname === "/usher/login"
  const isUsherAuth = pathname === "/api/usher/auth"

  if (isUsherPath && !isUsherLogin && !isUsherAuth) {
    const cookie = req.cookies.get("usher_auth")
    if (!cookie || cookie.value !== process.env.USHER_SECRET) {
      return NextResponse.redirect(new URL("/usher/login", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/usher/:path*", "/api/usher/:path*"],
}
