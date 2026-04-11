"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  Copy, Check, QrCode, Trash2, MessageCircle, RefreshCw, MoreHorizontal,
  Pencil, ChevronUp, ChevronDown, Clock, X, Bell, LayoutGrid, List,
} from "lucide-react"
import { AdminStatsModal } from "@/components/admin-stats"

const RSVP_DEADLINE = new Date("2026-06-27")
const WA_DEFAULT_TEMPLATE = "You're invited to Pabasara & Lahiru's wedding! \uD83C\uDF89\n\nPlease RSVP here: {invite_link}"

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

const SORTABLE_COLS = ["Family", "Side", "Status", "Confirmed", "Table #"]

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
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null)
  const [editForm, setEditForm] = useState({ family_name: "", max_guests: "1", side: "groom" })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [filters, setFilters] = useState({ name: "", code: "", side: "all", responded: "all" })
  // Feature: sort
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: "asc" | "desc" } | null>(null)
  // Feature: view toggle
  const [view, setView] = useState<"list" | "seating">("list")
  // Feature: WhatsApp template
  const [waTemplate, setWaTemplate] = useState<string>(() => {
    if (typeof window === "undefined") return WA_DEFAULT_TEMPLATE
    return localStorage.getItem("wa_template") ?? WA_DEFAULT_TEMPLATE
  })
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [templateDraft, setTemplateDraft] = useState("")
  // Feature: undo delete
  const [pendingDeleteInvite, setPendingDeleteInvite] = useState<Invite | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Feature: remind pending
  const [showRemindModal, setShowRemindModal] = useState(false)
  // Feature: deadline banner
  const [deadlineDismissed, setDeadlineDismissed] = useState(false)
  // Seating header rename
  const [editingTableHeader, setEditingTableHeader] = useState<string | null>(null)
  const [tableHeaderInput, setTableHeaderInput] = useState("")
  // Seating drag-and-drop
  const [dragInviteId, setDragInviteId] = useState<number | null>(null)
  const [dragOverTable, setDragOverTable] = useState<string | null>(null)
  // Extra (empty) tables added via "+ Add Table"
  const [extraTables, setExtraTables] = useState<string[]>([])

  const router = useRouter()

  const fetchInvites = async () => {
    const res = await fetch("/api/admin/invites")
    if (res.ok) setInvites(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchInvites() }, [])
  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current) }, [])

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
      setInvites((prev) => [...prev, {
        id: data.id, code: data.code,
        family_name: formData.family_name.trim(),
        max_guests: parseInt(formData.max_guests, 10),
        side: formData.side, table_number: null,
        responded: 0, confirmed_guests: 0, created_at: data.created_at,
      }])
      setFormData((p) => ({ ...p, family_name: "", max_guests: "1" }))
    } else {
      const data = await res.json()
      setFormError(data.error ?? "Failed to create invite")
    }
    setSubmitting(false)
  }

  const handleDelete = (id: number) => {
    const invite = invites.find((i) => i.id === id)
    if (!invite) return
    setOpenMenu(null)
    // Commit any existing pending delete immediately before starting a new one
    if (deleteTimerRef.current && pendingDeleteInvite) {
      clearTimeout(deleteTimerRef.current)
      fetch(`/api/admin/invites/${pendingDeleteInvite.id}`, { method: "DELETE" })
    }
    setInvites((prev) => prev.filter((i) => i.id !== id))
    setPendingDeleteInvite(invite)
    deleteTimerRef.current = setTimeout(() => {
      fetch(`/api/admin/invites/${id}`, { method: "DELETE" })
      setPendingDeleteInvite(null)
      deleteTimerRef.current = null
    }, 5000)
  }

  const handleUndoDelete = () => {
    if (!pendingDeleteInvite) return
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    deleteTimerRef.current = null
    setInvites((prev) =>
      [...prev, pendingDeleteInvite].sort((a, b) => a.created_at.localeCompare(b.created_at))
    )
    setPendingDeleteInvite(null)
  }

  const handleUpdateTableNumber = async (id: number) => {
    const newValue = tableInput.trim() || null
    const res = await fetch(`/api/admin/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_number: newValue }),
    })
    setEditingTable(null)
    if (res.ok) setInvites((prev) => prev.map((i) => i.id === id ? { ...i, table_number: newValue } : i))
  }

  const handleRenameTable = async (oldKey: string) => {
    const newValue = tableHeaderInput.trim()
    setEditingTableHeader(null)
    if (!newValue || newValue === oldKey) return
    const group = seatingGroups[oldKey] ?? []
    await Promise.all(
      group.map((invite) =>
        fetch(`/api/admin/invites/${invite.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_number: newValue }),
        })
      )
    )
    setInvites((prev) =>
      prev.map((i) =>
        group.some((g) => g.id === i.id) ? { ...i, table_number: newValue } : i
      )
    )
  }

  const handleDropInviteToTable = async (inviteId: number, targetTable: string | null) => {
    setDragInviteId(null)
    setDragOverTable(null)
    setInvites((prev) =>
      prev.map((i) => i.id === inviteId ? { ...i, table_number: targetTable } : i)
    )
    await fetch(`/api/admin/invites/${inviteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_number: targetTable }),
    })
  }

  const handleAddTable = () => {
    const existing = [
      ...invites.filter((i) => i.table_number).map((i) => i.table_number!),
      ...extraTables,
    ].map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
    const newKey = String(next)
    setExtraTables((prev) => prev.includes(newKey) ? prev : [...prev, newKey])
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

  const openEditModal = (invite: Invite) => {
    setEditingInvite(invite)
    setEditForm({ family_name: invite.family_name, max_guests: String(invite.max_guests), side: invite.side })
    setEditError(null)
    setOpenMenu(null)
  }

  const handleEditInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInvite) return
    setEditSubmitting(true)
    setEditError(null)
    const res = await fetch(`/api/admin/invites/${editingInvite.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", ...editForm }),
    })
    if (res.ok) {
      setInvites((prev) =>
        prev.map((i) =>
          i.id === editingInvite.id
            ? { ...i, family_name: editForm.family_name.trim(), max_guests: parseInt(editForm.max_guests, 10), side: editForm.side }
            : i
        )
      )
      setEditingInvite(null)
    } else {
      const data = await res.json()
      setEditError(data.error ?? "Failed to update invite")
    }
    setEditSubmitting(false)
  }

  const buildWaLink = (invite: Invite, template: string) => {
    const inviteLink = `${window.location.origin}/?invite=${invite.code}`
    const msg = template
      .replace(/\{invite_link\}/g, inviteLink)
      .replace(/\{family_name\}/g, invite.family_name)
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
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

  const handleSaveTemplate = () => {
    setWaTemplate(templateDraft)
    localStorage.setItem("wa_template", templateDraft)
    setShowTemplateEditor(false)
  }

  const handleSendAllReminders = async (list: Invite[]) => {
    for (const invite of list) {
      window.open(buildWaLink(invite, waTemplate), "_blank")
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  // --- Derived values ---
  const totalExpected = invites.reduce((sum, i) => sum + i.max_guests, 0)
  const totalConfirmed = invites.reduce((sum, i) => sum + Number(i.confirmed_guests), 0)
  const totalResponded = invites.filter((i) => Number(i.responded) > 0).length

  const now = new Date()
  const isOverdue = (invite: Invite) => now > RSVP_DEADLINE && Number(invite.responded) === 0
  const overdueCount = invites.filter(isOverdue).length
  const pendingInvites = invites.filter((i) => Number(i.responded) === 0)

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

  const sortedFiltered = sortConfig
    ? [...filtered].sort((a, b) => {
        const dir = sortConfig.dir === "asc" ? 1 : -1
        switch (sortConfig.col) {
          case "Family":    return dir * a.family_name.localeCompare(b.family_name)
          case "Side":      return dir * a.side.localeCompare(b.side)
          case "Status": {
            const val = (i: Invite) => Number(i.responded) === 0 ? 0 : Number(i.confirmed_guests) > 0 ? 2 : 1
            return dir * (val(a) - val(b))
          }
          case "Confirmed": return dir * (Number(a.confirmed_guests) - Number(b.confirmed_guests))
          case "Table #":   return dir * ((a.table_number ?? "").localeCompare(b.table_number ?? "", undefined, { numeric: true }))
          default:          return 0
        }
      })
    : filtered

  const seatingGroups = invites.reduce<Record<string, Invite[]>>((acc, inv) => {
    const key = inv.table_number ?? "__unassigned__"
    if (!acc[key]) acc[key] = []
    acc[key].push(inv)
    return acc
  }, {})
  const assignedTables = Object.keys(seatingGroups)
    .filter((k) => k !== "__unassigned__")
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const allSeatingTables = [...new Set([...assignedTables, ...extraTables])]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  // --- Helper renderers ---
  const sortTh = (label: string) => {
    const sortable = SORTABLE_COLS.includes(label)
    const isActive = sortConfig?.col === label
    const nextDir: "asc" | "desc" = isActive && sortConfig?.dir === "asc" ? "desc" : "asc"
    return (
      <th key={label} className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
        {sortable ? (
          <button
            onClick={() => setSortConfig(isActive && sortConfig?.dir === "desc" ? null : { col: label, dir: nextDir })}
            className={`flex items-center gap-1 hover:text-primary transition-smooth ${isActive ? "text-primary" : ""}`}
          >
            {label}
            {isActive
              ? sortConfig.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              : <ChevronUp className="w-3 h-3 opacity-20" />}
          </button>
        ) : label}
      </th>
    )
  }

  const statusBadge = (invite: Invite) => {
    const responded = Number(invite.responded) > 0
    const confirmed = Number(invite.confirmed_guests) > 0
    if (!responded) return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        {isOverdue(invite) && <Clock className="w-3 h-3" />}
        Pending
      </span>
    )
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
        href={buildWaLink(invite, waTemplate)}
        target="_blank" rel="noopener noreferrer" title="Share via WhatsApp"
        className="p-2 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-smooth inline-flex items-center"
      >
        <MessageCircle className="w-4 h-4" />
      </a>
      <div>
        <button
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
            setOpenMenu(openMenu === invite.id ? null : invite.id)
          }}
          title="More options"
          className="p-2 rounded-lg border border-border hover:bg-cream transition-smooth text-muted-foreground"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // ============================================================
  return (
    <div className="min-h-screen bg-ivory">
      {/* Dropdown backdrop */}
      {openMenu !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
      )}

      {/* Three-dot dropdown portal */}
      {openMenu !== null && menuPos && (() => {
        const openInvite = invites.find((i) => i.id === openMenu)
        if (!openInvite) return null
        return createPortal(
          <div
            className="fixed w-48 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <button onClick={() => openEditModal(openInvite)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-cream transition-smooth">
              <Pencil className="w-4 h-4 shrink-0" />
              Edit
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => handleRegenerateCode(openInvite.id)}
              disabled={regeneratingCode === openInvite.id}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-smooth disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              Regenerate Code
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => handleDelete(openInvite.id)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-smooth"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Delete
            </button>
          </div>,
          document.body
        )
      })()}

      {/* Edit modal */}
      {editingInvite && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingInvite(null)} />
          <div className="relative bg-white rounded-xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
            <h3 className="font-playfair text-xl text-primary">Edit Invite</h3>
            <form onSubmit={handleEditInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-primary mb-1">Family Name</label>
                <input type="text" value={editForm.family_name} onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))} required autoFocus className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-primary mb-1">Max Guests</label>
                <input type="number" min={1} max={20} value={editForm.max_guests} onChange={(e) => setEditForm((p) => ({ ...p, max_guests: e.target.value }))} required className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-primary mb-2">Side</label>
                <div className="flex gap-6">
                  {(["groom", "bride"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="edit-side" value={s} checked={editForm.side === s} onChange={() => setEditForm((p) => ({ ...p, side: s }))} className="accent-primary" />
                      <span className="text-sm text-primary">{s === "groom" ? "Groom's side" : "Bride's side"}</span>
                    </label>
                  ))}
                </div>
              </div>
              {editError && <p className="text-sm text-red-500">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingInvite(null)} className="flex-1 text-sm py-2 rounded-lg border border-border hover:bg-cream transition-smooth">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 text-sm py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth disabled:opacity-50">
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Undo delete bar */}
      {pendingDeleteInvite && createPortal(
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-xl shadow-xl overflow-hidden w-72">
          <style>{`@keyframes undoShrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm truncate min-w-0">
              <span className="opacity-70">Deleted </span>
              <span className="font-medium">{pendingDeleteInvite.family_name}</span>
            </p>
            <button onClick={handleUndoDelete} className="shrink-0 text-sm font-semibold underline hover:no-underline">
              Undo
            </button>
          </div>
          <div className="h-1 bg-primary-foreground/20">
            <div
              className="h-full bg-primary-foreground/50 origin-left"
              style={{ animation: "undoShrink 5s linear forwards" }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* WhatsApp template editor modal */}
      {showTemplateEditor && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowTemplateEditor(false)} />
          <div className="relative bg-white rounded-xl border border-border shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-playfair text-xl text-primary">WhatsApp Message Template</h3>
              <button onClick={() => setShowTemplateEditor(false)} className="p-1 rounded-lg hover:bg-cream transition-smooth text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Customise the message sent when sharing via WhatsApp. Click a variable to insert it.</p>
            <div className="flex gap-2 flex-wrap">
              {["{invite_link}", "{family_name}"].map((v) => (
                <button
                  key={v}
                  onClick={() => setTemplateDraft((d) => d + v)}
                  className="text-xs px-2 py-1 rounded-lg border border-border bg-cream hover:border-primary hover:text-primary transition-smooth font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
            <textarea
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent resize-none font-mono"
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Preview</p>
              <div className="text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-primary whitespace-pre-wrap">
                {templateDraft
                  .replace(/\{invite_link\}/g, "https://yourwedding.com/?invite=SAMPLECD")
                  .replace(/\{family_name\}/g, "Silva Family")}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setTemplateDraft(WA_DEFAULT_TEMPLATE)} className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-cream transition-smooth whitespace-nowrap">
                Reset
              </button>
              <button onClick={() => setShowTemplateEditor(false)} className="flex-1 text-sm py-2 rounded-lg border border-border hover:bg-cream transition-smooth">
                Cancel
              </button>
              <button onClick={handleSaveTemplate} className="flex-1 text-sm py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth">
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Remind pending modal */}
      {showRemindModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowRemindModal(false)} />
          <div className="relative bg-white rounded-xl border border-border shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-playfair text-xl text-primary">Remind Pending</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pendingInvites.length} invite{pendingInvites.length !== 1 ? "s" : ""} haven&apos;t responded
                </p>
              </div>
              <button onClick={() => setShowRemindModal(false)} className="p-1 rounded-lg hover:bg-cream transition-smooth text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {pendingInvites.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No pending invites — everyone has responded!</p>
              ) : pendingInvites.map((invite) => (
                <div key={invite.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{invite.family_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{invite.code}</p>
                  </div>
                  <a
                    href={buildWaLink(invite, waTemplate)}
                    target="_blank" rel="noopener noreferrer"
                    title="Send reminder via WhatsApp"
                    className="shrink-0 p-2 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-smooth inline-flex items-center"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
            {pendingInvites.length > 0 && (
              <div className="px-6 py-4 border-t border-border shrink-0">
                <button
                  onClick={() => handleSendAllReminders(pendingInvites)}
                  className="w-full text-sm py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-smooth flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send all ({pendingInvites.length})
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">Opens each WhatsApp link with a short delay. Allow pop-ups if prompted.</p>
              </div>
            )}
          </div>
        </div>,
        document.body
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

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5 md:space-y-6">
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
        <div className="bg-white rounded-xl border border-border">

          {/* Panel header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-4 border-b border-border">
            <h2 className="font-medium text-primary">Invite Groups</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* List / Seating toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-smooth ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-cream text-muted-foreground"}`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setView("seating")}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1.5 border-l border-border transition-smooth ${view === "seating" ? "bg-primary text-primary-foreground" : "hover:bg-cream text-muted-foreground"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Seating</span>
                </button>
              </div>
              {/* WA template button */}
              <button
                onClick={() => { setTemplateDraft(waTemplate); setShowTemplateEditor(true) }}
                title="Edit WhatsApp message template"
                className="p-2 rounded-lg border border-border hover:bg-cream transition-smooth text-muted-foreground"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              {/* Remind pending */}
              {pendingInvites.length > 0 && (
                <button
                  onClick={() => setShowRemindModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-smooth"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Remind ({pendingInvites.length})</span>
                </button>
              )}
              {/* Add */}
              <button
                onClick={() => setShowForm((v) => !v)}
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-smooth"
              >
                {showForm ? "Cancel" : "+ Add"}
              </button>
            </div>
          </div>

          {/* Add invite form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="px-4 md:px-6 py-4 bg-cream border-b border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary mb-1">Family Name</label>
                  <input type="text" value={formData.family_name} onChange={(e) => setFormData((p) => ({ ...p, family_name: e.target.value }))} required placeholder="e.g. Silva Family" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary mb-1">Max Guests</label>
                  <input type="number" min={1} max={20} value={formData.max_guests} onChange={(e) => setFormData((p) => ({ ...p, max_guests: e.target.value }))} required className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-primary mb-2">Side</label>
                <div className="flex gap-6">
                  {(["groom", "bride"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="side" value={s} checked={formData.side === s} onChange={() => setFormData((p) => ({ ...p, side: s }))} className="accent-primary" />
                      <span className="text-sm text-primary">{s === "groom" ? "Groom's side" : "Bride's side"}</span>
                    </label>
                  ))}
                </div>
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <button type="submit" disabled={submitting} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-smooth disabled:opacity-50">
                {submitting ? "Creating..." : "Create Invite"}
              </button>
            </form>
          )}

          {/* RSVP deadline banner */}
          {overdueCount > 0 && !deadlineDismissed && (
            <div className="flex items-center gap-3 px-4 md:px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-800">
              <Clock className="w-4 h-4 shrink-0" />
              <p className="text-xs flex-1">
                <span className="font-semibold">{overdueCount} invite{overdueCount !== 1 ? "s" : ""}</span> still pending past the RSVP deadline (27 June 2026).
              </p>
              <button onClick={() => setDeadlineDismissed(true)} className="p-1 rounded hover:bg-amber-100 transition-smooth shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Seating view */}
          {view === "seating" && !loading && (
            <div className="p-4 md:p-6">
              {invites.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No invites yet.</p>
              ) : (
                <div className="space-y-6">
                  {/* Table cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allSeatingTables.map((tableKey) => {
                      const group = seatingGroups[tableKey] ?? []
                      const totalMax = group.reduce((s, i) => s + i.max_guests, 0)
                      const totalConfirmedTable = group.reduce((s, i) => s + Number(i.confirmed_guests), 0)
                      const isOver = dragOverTable === tableKey
                      return (
                        <div
                          key={tableKey}
                          onDragOver={(e) => { e.preventDefault(); setDragOverTable(tableKey) }}
                          onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverTable(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (dragInviteId !== null) handleDropInviteToTable(dragInviteId, tableKey)
                          }}
                          className={`rounded-xl border overflow-hidden transition-smooth ${isOver ? "border-accent ring-2 ring-accent/30 bg-accent/5" : "border-border"}`}
                        >
                          {/* Card header */}
                          <div className="px-4 py-2.5 bg-cream border-b border-border flex items-center justify-between gap-2">
                            {editingTableHeader === tableKey ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={tableHeaderInput}
                                  onChange={(e) => setTableHeaderInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameTable(tableKey)
                                    if (e.key === "Escape") setEditingTableHeader(null)
                                  }}
                                  autoFocus
                                  placeholder="Table name"
                                  className="w-full px-2 py-0.5 text-sm font-medium rounded border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-primary"
                                />
                                <button onClick={() => handleRenameTable(tableKey)} className="p-1 rounded bg-primary text-primary-foreground shrink-0">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingTableHeader(null)} className="p-1 rounded border border-border hover:bg-white transition-smooth text-muted-foreground shrink-0">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingTableHeader(tableKey); setTableHeaderInput(tableKey) }}
                                title="Click to rename"
                                className="text-sm font-medium text-primary hover:text-accent transition-smooth flex items-center gap-1.5 group"
                              >
                                Table {tableKey}
                                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-smooth" />
                              </button>
                            )}
                            {editingTableHeader !== tableKey && (
                              <span className="text-xs text-muted-foreground shrink-0">{totalConfirmedTable} / {totalMax} seats</span>
                            )}
                          </div>

                          {/* Rows */}
                          <div className="divide-y divide-border">
                            {group.map((invite) => (
                              <div
                                key={invite.id}
                                draggable
                                onDragStart={(e) => {
                                  setDragInviteId(invite.id)
                                  e.dataTransfer.effectAllowed = "move"
                                }}
                                onDragEnd={() => { setDragInviteId(null); setDragOverTable(null) }}
                                className={`px-4 py-2.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none transition-smooth ${dragInviteId === invite.id ? "opacity-40 bg-cream" : "hover:bg-cream/60"}`}
                              >
                                <span className="text-sm text-primary truncate">{invite.family_name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{Number(invite.confirmed_guests)} / {invite.max_guests}</span>
                              </div>
                            ))}
                            {group.length === 0 && (
                              <div className={`px-4 py-4 text-xs text-center transition-smooth ${isOver ? "text-accent" : "text-muted-foreground"}`}>
                                {isOver ? "Drop here" : "Empty — drag a family here"}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Add Table card */}
                    <button
                      onClick={handleAddTable}
                      className="rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-cream/40 transition-smooth flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground hover:text-primary min-h-[100px]"
                    >
                      <span className="text-2xl leading-none">+</span>
                      <span className="text-xs font-medium">Add Table</span>
                    </button>
                  </div>

                  {/* Unassigned */}
                  {seatingGroups["__unassigned__"] && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Unassigned ({seatingGroups["__unassigned__"].length})
                      </p>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOverTable("__unassigned__") }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverTable(null)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (dragInviteId !== null) handleDropInviteToTable(dragInviteId, null)
                        }}
                        className={`flex flex-wrap gap-2 min-h-[44px] p-2 rounded-xl border-2 border-dashed transition-smooth ${dragOverTable === "__unassigned__" ? "border-accent bg-accent/5" : "border-transparent"}`}
                      >
                        {seatingGroups["__unassigned__"].map((invite) => (
                          <span
                            key={invite.id}
                            draggable
                            onDragStart={(e) => {
                              setDragInviteId(invite.id)
                              e.dataTransfer.effectAllowed = "move"
                            }}
                            onDragEnd={() => { setDragInviteId(null); setDragOverTable(null) }}
                            className={`px-3 py-1.5 text-sm bg-cream border border-border rounded-lg text-primary cursor-grab active:cursor-grabbing select-none transition-smooth ${dragInviteId === invite.id ? "opacity-40" : "hover:border-primary"}`}
                          >
                            {invite.family_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {allSeatingTables.length === 0 && !seatingGroups["__unassigned__"] && (
                    <p className="text-center text-sm text-muted-foreground py-8">No tables assigned yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* List view */}
          {view === "list" && (
            <>
              {/* Filters */}
              {!loading && invites.length > 0 && (
                <div className="px-4 md:px-6 py-3 border-b border-border bg-white flex flex-wrap gap-2 md:gap-3 items-center">
                  <input type="text" placeholder="Search name..." value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent flex-1 min-w-0 sm:flex-none sm:w-40" />
                  <input type="text" placeholder="Code..." value={filters.code} onChange={(e) => setFilters((p) => ({ ...p, code: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent w-28 font-mono" />
                  <select value={filters.side} onChange={(e) => setFilters((p) => ({ ...p, side: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="all">All sides</option>
                    <option value="groom">Groom&apos;s</option>
                    <option value="bride">Bride&apos;s</option>
                  </select>
                  <select value={filters.responded} onChange={(e) => setFilters((p) => ({ ...p, responded: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent">
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
                  <div className="hidden md:block overflow-hidden rounded-b-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-cream text-left">
                        <tr>
                          {["Family", "Side", "Code", "Status", "Confirmed", "Table #", "Actions"].map((h) => sortTh(h))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedFiltered.map((invite) => (
                          <tr key={invite.id} className="hover:bg-cream/50 transition-smooth">
                            <td className="px-6 py-4 font-medium text-primary">{invite.family_name}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${invite.side === "bride" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                                {invite.side === "bride" ? "Bride's" : "Groom's"}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{invite.code}</td>
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
                    {sortedFiltered.map((invite) => (
                      <div key={invite.id} className="px-4 py-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-primary truncate">{invite.family_name}</p>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">{invite.code}</p>
                          </div>
                          <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${invite.side === "bride" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                            {invite.side === "bride" ? "Bride's" : "Groom's"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {statusBadge(invite)}
                          <span className="text-xs text-muted-foreground">{Number(invite.confirmed_guests)} / {invite.max_guests} guests</span>
                          <div className="ml-auto">{tableNumberCell(invite)}</div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          {actionButtons(invite)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
