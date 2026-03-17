import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminInvites } from "@/components/admin-invites"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const auth = cookieStore.get("admin_auth")

  if (!auth || auth.value !== process.env.RSVP_EXPORT_SECRET) {
    redirect("/admin/login")
  }

  return <AdminInvites exportSecret={process.env.RSVP_EXPORT_SECRET!} />
}
