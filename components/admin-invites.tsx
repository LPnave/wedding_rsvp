"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, QrCode, Trash2, MessageCircle, RefreshCw, MoreHorizontal } from "lucide-react"
import { AdminStatsModal } from "@/components/admin-stats"

interface Invite {
  id: number
  code: string
  family_name: string
  max_guests: number
  side: string
  table_number: string | null
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
  const [downloadingQR, setDownloadingQR] = useState<string | null>(null)
  const [editingTable, setEditingTable] = useState<number | null>(null)
  const [tableInput, setTableInput] = useState("")
  const [regeneratingCode, setRegeneratingCode] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [filters, setFilters] = useState({ name: "", code: "", side: "all", responded: "all" })
  const router = useRouter()

  const fetchInvites = async () => {
    const res = await fetch("/api/admin/invites")
    if (res.ok) setInvites(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchInvites() }, [])


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
      const data = await res.json()
      const newInvite: Invite = {
        id: data.id,
        code: data.code,
        family_name: formData.family_name.trim(),
        max_guests: parseInt(formData.max_guests, 10),
        side: formData.side,
        table_number: null,
        responded: 0,
        confirmed_guests: 0,
        created_at: data.created_at,
      }
      setInvites((prev) => [...prev, newInvite])
      setFormData((p) => ({ ...p, family_name: "", max_guests: "1" }))
    } else {
      const data = await res.json()
      setFormError(data.error ?? "Failed to create invite")
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" })
    setOpenMenu(null)
    setConfirmDelete(null)
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== id))
    }
  }

  const handleUpdateTableNumber = async (id: number) => {
    const newValue = tableInput.trim() || null
    const res = await fetch(`/api/admin/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_number: newValue }),
    })
    setEditingTable(null)
    if (res.ok) {
      setInvites((prev) => prev.map((i) => i.id === id ? { ...i, table_number: newValue } : i))
    }
  }

  const handleRegenerateCode = async (id: number) => {
    setOpenMenu(null)
    setRegeneratingCode(id)
    const res = await fetch(`/api/admin/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate" }),
    })
    setRegeneratingCode(null)
    if (res.ok) {
      const data = await res.json()
      setInvites((prev) => prev.map((i) => i.id === id ? { ...i, code: data.code } : i))
    }
  }

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/?invite=${code}`)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDownloadQR = async (code: string, familyName: string) => {
    setDownloadingQR(code)
    try {
      const QRCode = await import("qrcode")
      const inviteUrl = `${window.location.origin}/?invite=${code}`
      const W = 500, H = 660
      const canvas = document.createElement("canvas")
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "#fef9f3"; ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = "#d4af8e"; ctx.lineWidth = 6; ctx.strokeRect(16, 16, W - 32, H - 32)
      ctx.lineWidth = 1.5; ctx.strokeRect(26, 26, W - 52, H - 52)
      ctx.fillStyle = "#2d5a4f"; ctx.font = "italic 28px Georgia, serif"; ctx.textAlign = "center"
      ctx.fillText("Pabasara & Lahiru", W / 2, 80)
      ctx.font = "14px Georgia, serif"; ctx.fillStyle = "#5a6f52"
      ctx.fillText("31st July 2026  ·  Kandy, Sri Lanka", W / 2, 108)
      ctx.strokeStyle = "#d4af8e"; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(80, 124); ctx.lineTo(W - 80, 124); ctx.stroke()
      ctx.fillStyle = "#2d5a4f"; ctx.font = "italic 22px Georgia, serif"; ctx.textAlign = "center"
      ctx.fillText("RSVP", W / 2, 156)
      const qrDataUrl = await QRCode.toDataURL(inviteUrl, { width: 280, margin: 1, color: { dark: "#2d5a4f", light: "#fef9f3" } })
      const qrImg = new Image()
      await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); qrImg.src = qrDataUrl })
      ctx.drawImage(qrImg, (W - 280) / 2, 174, 280, 280)
      ctx.fillStyle = "#2d5a4f"; ctx.font = "bold 22px Georgia, serif"; ctx.textAlign = "center"
      ctx.fillText(familyName, W / 2, 498)
      ctx.font = "13px Arial, sans-serif"; ctx.fillStyle = "#5a6f52"
      ctx.fillText("You are invited to join us", W / 2, 526)
      ctx.font = "11px monospace"; ctx.fillStyle = "#d4af8e"; ctx.fillText(code, W / 2, 590)
      const link = document.createElement("a")
      link.download = `${familyName.replace(/\s+/g, "-")}-invite-qr.png`
      link.href = canvas.toDataURL("image/png"); link.click()
    } finally { setDownloadingQR(null) }
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

  const statusBadge = (invite: Invite) => {
    const responded = Number(invite.responded) > 0
    const confirmed = Number(invite.confirmed_guests) > 0
    if (!responded) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
    if (confirmed) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Attending</span>
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>
  }

  const tableNumberCell = (invite: Invite) =>
    editingTable === invite.id ? (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={tableInput}
          onChange={(e) => setTableInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUpdateTableNumber(invite.id)
            if (e.key === "Escape") setEditingTable(null)
          }}
          autoFocus
          placeholder="e.g. 5"
          className="w-16 px-2 py-1 text-xs rounded border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-center"
        />
        <button onClick={() => handleUpdateTableNumber(invite.id)} className="p-1 rounded bg-primary text-primary-foreground">
          <Check className="w-3 h-3" />
        </button>
      </div>
    ) : (
      <button
        onClick={() => { setEditingTable(invite.id); setTableInput(invite.table_number ?? "") }}
        className="text-xs px-2 py-1 rounded border border-dashed border-border hover:border-primary hover:text-primary transition-smooth text-muted-foreground"
        title="Assign table number"
      >
        {invite.table_number ? `Table ${invite.table_number}` : "—"}
      </button>
    )

  const actionButtons = (invite: Invite) => (
    <div className="flex items-center gap-2">
      <button onClick={() => handleCopyLink(invite.code)} title="Copy invite link" className="p-2 rounded-lg border border-border hover:bg-cream transition-smooth text-primary">
        {copiedCode === invite.code ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      </button>
      <button onClick={() => handleDownloadQR(invite.code, invite.family_name)} disabled={downloadingQR === invite.code} title="Download QR code" className="p-2 rounded-lg border border-border hover:bg-cream transition-smooth text-primary disabled:opacity-50">
        <QrCode className="w-4 h-4" />
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`You're invited to Pabasara & Lahiru's wedding! 🎉\n\nPlease RSVP here: ${window.location.origin}/?invite=${invite.code}`)}`}
        target="_blank" rel="noopener noreferrer" title="Share via WhatsApp"
        className="p-2 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-smooth inline-flex items-center"
      >
        <MessageCircle className="w-4 h-4" />
      </a>

      {/* Three-dot menu */}
      <div className="relative">
        <button
          onClick={() => { setOpenMenu(openMenu === invite.id ? null : invite.id); setConfirmDelete(null) }}
          title="More options"
          className="p-2 rounded-lg border border-border hover:bg-cream transition-smooth text-muted-foreground"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {openMenu === invite.id && (
          <div className="absolute right-[-60px] top-full mt-1 w-48 bg-white rounded-xl border border-border shadow-lg z-30 overflow-hidden">
            {confirmDelete === invite.id ? (
              <div className="p-3 space-y-2">
                <p className="text-xs text-primary font-medium">Delete this invite?</p>
                <p className="text-xs text-muted-foreground">This cannot be undone.</p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-cream transition-smooth"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(invite.id)}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-smooth"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleRegenerateCode(invite.id)}
                  disabled={regeneratingCode === invite.id}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-smooth disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  Regenerate Code
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => setConfirmDelete(invite.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-smooth"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ivory">
      {openMenu !== null && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => { setOpenMenu(null); setConfirmDelete(null) }}
        />
      )}
      {/* Header */}
      <header className="bg-white border-b border-border px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-playfair text-xl md:text-2xl text-primary truncate">Guest Management</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Pabasara &amp; Lahiru — 31 July 2026</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AdminStatsModal />
          <a
            href={`/api/rsvp/export?key=${exportSecret}`}
            className="text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg border border-border text-primary hover:bg-cream transition-smooth whitespace-nowrap"
          >
            <span className="hidden sm:inline">Download </span>CSV
          </a>
          <button
            onClick={handleLogout}
            className="text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-cream transition-smooth whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5 md:space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: "Total Invites", value: invites.length },
            { label: "Responded", value: `${totalResponded} / ${invites.length}` },
            { label: "Confirmed", value: `${totalConfirmed} / ${totalExpected}` },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-border p-3 md:p-5 text-center">
              <p className="text-2xl md:text-3xl font-playfair text-primary">{card.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Invites panel */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <h2 className="font-medium text-primary">Invite Groups</h2>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-smooth"
            >
              {showForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {/* Add invite form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="px-4 md:px-6 py-4 bg-cream border-b border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <span className="text-sm text-primary">{s === "groom" ? "Groom's side" : "Bride's side"}</span>
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
            <div className="px-4 md:px-6 py-3 border-b border-border bg-white flex flex-wrap gap-2 md:gap-3 items-center">
              <input
                type="text"
                placeholder="Search name..."
                value={filters.name}
                onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent flex-1 min-w-0 sm:flex-none sm:w-40"
              />
              <input
                type="text"
                placeholder="Code..."
                value={filters.code}
                onChange={(e) => setFilters((p) => ({ ...p, code: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent w-28 font-mono"
              />
              <select
                value={filters.side}
                onChange={(e) => setFilters((p) => ({ ...p, side: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All sides</option>
                <option value="groom">Groom&apos;s</option>
                <option value="bride">Bride&apos;s</option>
              </select>
              <select
                value={filters.responded}
                onChange={(e) => setFilters((p) => ({ ...p, responded: e.target.value }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All</option>
                <option value="attending">Attending</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
              {hasActiveFilters && (
                <>
                  <button onClick={() => setFilters({ name: "", code: "", side: "all", responded: "all" })} className="text-xs text-muted-foreground hover:text-primary transition-smooth">
                    Clear
                  </button>
                  <span className="text-xs text-muted-foreground ml-auto">{filtered.length} / {invites.length}</span>
                </>
              )}
            </div>
          )}

          {loading ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">Loading...</div>
          ) : invites.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">No invites yet. Add your first invite group above.</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">No invites match your filters.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream text-left">
                    <tr>
                      {["Family", "Side", "Code", "Max", "Status", "Confirmed", "Table #", "Actions"].map((h) => (
                        <th key={h} className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((invite) => (
                      <tr key={invite.id} className="hover:bg-cream/50 transition-smooth">
                        <td className="px-6 py-4 font-medium text-primary">{invite.family_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${invite.side === "bride" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                            {invite.side === "bride" ? "Bride's" : "Groom's"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{invite.code}</td>
                        <td className="px-6 py-4 text-center">{invite.max_guests}</td>
                        <td className="px-6 py-4">{statusBadge(invite)}</td>
                        <td className="px-6 py-4 text-center">{Number(invite.confirmed_guests)} / {invite.max_guests}</td>
                        <td className="px-6 py-4">{tableNumberCell(invite)}</td>
                        <td className="px-6 py-4">{actionButtons(invite)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((invite) => (
                  <div key={invite.id} className="px-4 py-4 space-y-3">
                    {/* Top row: name + side badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-primary truncate">{invite.family_name}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{invite.code}</p>
                      </div>
                      <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${invite.side === "bride" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                        {invite.side === "bride" ? "Bride's" : "Groom's"}
                      </span>
                    </div>

                    {/* Middle row: status + guests + table */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {statusBadge(invite)}
                      <span className="text-xs text-muted-foreground">
                        {Number(invite.confirmed_guests)} / {invite.max_guests} guests
                      </span>
                      <div className="ml-auto">{tableNumberCell(invite)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {actionButtons(invite)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
