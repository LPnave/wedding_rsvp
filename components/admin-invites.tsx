"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Invite {
  id: number
  code: string
  family_name: string
  max_guests: number
  responded: number
  confirmed_guests: number
  created_at: string
}

export function AdminInvites({ exportSecret }: { exportSecret: string }) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ family_name: "", code: "", max_guests: "2" })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const router = useRouter()

  const fetchInvites = async () => {
    const res = await fetch("/api/admin/invites")
    if (res.ok) {
      setInvites(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  const slugify = (val: string) =>
    val.toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

  const handleFamilyNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      family_name: val,
      code: slugify(val),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      setFormData({ family_name: "", code: "", max_guests: "2" })
      setShowForm(false)
      fetchInvites()
    } else {
      const data = await res.json()
      setFormError(data.error ?? "Failed to create invite")
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: number, familyName: string) => {
    if (!confirm(`Delete invite for "${familyName}"? This cannot be undone.`)) return
    await fetch(`/api/admin/invites/${id}`, { method: "DELETE" })
    fetchInvites()
  }

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/?invite=${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" })
    router.push("/admin/login")
  }

  const totalExpected = invites.reduce((sum, i) => sum + i.max_guests, 0)
  const totalConfirmed = invites.reduce((sum, i) => sum + Number(i.confirmed_guests), 0)
  const totalResponded = invites.filter((i) => Number(i.responded) > 0).length

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl text-primary">Guest Management</h1>
          <p className="text-sm text-muted-foreground">Pabasara & Lahiru — 31 July 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/rsvp/export?key=${exportSecret}`}
            className="text-sm px-4 py-2 rounded-lg border border-border text-primary hover:bg-cream transition-smooth"
          >
            Download CSV
          </a>
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-cream transition-smooth"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Invites", value: invites.length },
            { label: "Responded", value: `${totalResponded} / ${invites.length}` },
            { label: "Guests Confirmed", value: `${totalConfirmed} / ${totalExpected}` },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-border p-5 text-center">
              <p className="text-3xl font-playfair text-primary">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Invites table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-medium text-primary">Invite Groups</h2>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-smooth"
            >
              {showForm ? "Cancel" : "+ Add Invite"}
            </button>
          </div>

          {/* Add invite form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="px-6 py-4 bg-cream border-b border-border space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary mb-1">Family Name</label>
                  <input
                    type="text"
                    value={formData.family_name}
                    onChange={(e) => handleFamilyNameChange(e.target.value)}
                    required
                    placeholder="e.g. Silva Family"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary mb-1">Invite Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: slugify(e.target.value) }))}
                    required
                    placeholder="e.g. SILVA-FAMILY"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary mb-1">Max Guests</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.max_guests}
                    onChange={(e) => setFormData((p) => ({ ...p, max_guests: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Invite"}
              </button>
            </form>
          )}

          {/* Table */}
          {loading ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">Loading...</div>
          ) : invites.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">
              No invites yet. Add your first invite group above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-cream text-left">
                <tr>
                  {["Family", "Code", "Max Guests", "Responded", "Confirmed", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-cream/50 transition-smooth">
                    <td className="px-6 py-4 font-medium text-primary">{invite.family_name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{invite.code}</td>
                    <td className="px-6 py-4 text-center">{invite.max_guests}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          Number(invite.responded) > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {Number(invite.responded) > 0 ? "Yes" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {Number(invite.confirmed_guests)} / {invite.max_guests}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(invite.code)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-cream transition-smooth"
                        >
                          {copiedCode === invite.code ? "Copied!" : "Copy Link"}
                        </button>
                        <button
                          onClick={() => handleDelete(invite.id, invite.family_name)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-smooth"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
