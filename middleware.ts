import { NextRequest, NextResponse } from "next/server"

const ADMIN_PATHS = ["/admin", "/api/admin"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  const isLoginPage = pathname === "/admin/login"
  const isAuthApi = pathname === "/api/admin/auth"

  if (!isAdminPath || isLoginPage || isAuthApi) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get("admin_auth")
  if (!cookie || cookie.value !== process.env.RSVP_EXPORT_SECRET) {
    const loginUrl = new URL("/admin/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
