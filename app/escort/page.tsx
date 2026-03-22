import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { EscortPortal } from "@/components/escort-portal"

export default async function EscortPage() {
  const cookieStore = await cookies()
  const auth = cookieStore.get("escort_auth")

  if (!auth || auth.value !== process.env.ESCORT_SECRET) {
    redirect("/escort/login")
  }

  return <EscortPortal />
}
