import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { UsherPortal } from "@/components/usher-portal"

export default async function UsherPage() {
  const cookieStore = await cookies()
  const auth = cookieStore.get("usher_auth")

  if (!auth || auth.value !== process.env.USHER_SECRET) {
    redirect("/usher/login")
  }

  return <UsherPortal />
}
