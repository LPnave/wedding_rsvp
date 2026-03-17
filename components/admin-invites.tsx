"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Invite {
  id: number
  code: string
  family_name: string
  max_guests: number
  side: string
  responded: number
  confirmed_guests: number
  created_at: string
}

export function AdminInvites({ exportSecret }: { exportSecret: string }) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ family_name: "", max_guests: "1", side: "groom" })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [filters, setFilters] = useState({ name: "", code: "", side: "all", responded: "all" })
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
      setFormData((p) => ({ ...p, family_name: "", max_guests: "1" }))
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

  const filtered = invites.filter((i) => {
    if (filters.name && !i.family_name.toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.code && !i.code.toLowerCase().includes(filters.code.toLowerCase())) return false
    if (filters.side !== "all" && i.side !== filters.side) return false
    if (filters.responded === "attending" && !(Number(i.responded) > 0 && Number(i.confirmed_guests) > 0)) return false
    if (filters.responded === "rejected" && !(Number(i.responded) > 0 && Number(i.confirmed_guests) === 0)) return false
    if (filters.responded === "pending" && Number(i.responded) > 0) return false
    return true
  })

  const hasActiveFilters = filters.name || filters.code || filters.side !== "all" || filters.responded !== "all"

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary mb-1">Family Name</label>
                  <input
                    type="text"
                    value={formData.family_name}
                    onChange={(e) => setFormData((p) => ({ ...p, family_name: e.target.value }))}
                    required
                    placeholder="e.g. Silva Family"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
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
              <div>
                <label className="block text-xs font-medium text-primary mb-2">Side</label>
                <div className="flex gap-6">
                  {(["groom", "bride"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="side"
                        value={s}
                        checked={formData.side === s}
                        onChange={() => setFormData((p) => ({ ...p, side: s }))}
                        className="accent-primary"
                      />
                      <span className="text-sm text-primary capitalize">{s === "groom" ? "Groom's side" : "Bride's side"}</span>
                    </label>
                  ))}
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

          {/* Filters */}
          {!loading && invites.length > 0 && (
            <div className="px-6 py-3 border-b border-border bg-white flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Search name..."
                value={filters.name}
                onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent w-40"
              />
              <input
                type="text"
                placeholder="Search code..."
                value={filters.code}
                onChange={(e) => setFilters((p) => ({ ...p, code: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent w-36 font-mono"
              />
              <select
                value={filters.side}
                onChange={(e) => setFilters((p) => ({ ...p, side: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All sides</option>
                <option value="groom">Groom&apos;s side</option>
                <option value="bride">Bride&apos;s side</option>
              </select>
              <select
                value={filters.responded}
                onChange={(e) => setFilters((p) => ({ ...p, responded: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All responses</option>
                <option value="attending">Attending</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
              {hasActiveFilters && (
                <button
                  onClick={() => setFilters({ name: "", code: "", side: "all", responded: "all" })}
                  className="text-xs text-muted-foreground hover:text-primary transition-smooth"
                >
                  Clear filters
                </button>
              )}
              {hasActiveFilters && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {filtered.length} of {invites.length} shown
                </span>
              )}
            </div>
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
                  {["Family", "Side", "Code", "Max Guests", "Responded", "Confirmed", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground text-sm">
                      No invites match your filters.
                    </td>
                  </tr>
                ) : filtered.map((invite) => (
                  <tr key={invite.id} className="hover:bg-cream/50 transition-smooth">
                    <td className="px-6 py-4 font-medium text-primary">{invite.family_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        invite.side === "bride"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {invite.side === "bride" ? "Bride's" : "Groom's"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{invite.code}</td>
                    <td className="px-6 py-4 text-center">{invite.max_guests}</td>
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        const responded = Number(invite.responded) > 0
                        const confirmed = Number(invite.confirmed_guests) > 0
                        if (!responded) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                        if (confirmed) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Attending</span>
                        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>
                      })()}
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
