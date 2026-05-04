"use client"

import React, { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  Copy, Check, QrCode, Trash2, MessageCircle, RefreshCw, MoreHorizontal,
  Pencil, ChevronUp, ChevronDown, ChevronRight, Clock, X, Bell, LayoutGrid, List,
  UserPlus,
} from "lucide-react"
import { AdminStatsModal } from "@/components/admin-stats"

const RSVP_DEADLINE = new Date("2026-06-27")
const WA_DEFAULT_TEMPLATE = "You're invited to Pabasara & Lahiru's wedding! \uD83C\uDF89\n\nPlease RSVP here: {invite_link}"

interface Guest {
  id: number
  invite_id: number
  name: string
  table_number: string | null
  attending: number | null
}

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
  guests: Guest[]
}

type DragItem =
  | { type: "guest"; id: number; inviteId: number }
  | { type: "invite"; id: number }

type EditingGuest = {
  id: number
  inviteId: number
  name: string
  table_number: string
  attending: number | null
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
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: "asc" | "desc" } | null>(null)
  const [view, setView] = useState<"list" | "seating">("list")
  const [waTemplate, setWaTemplate] = useState<string>(() => {
    if (typeof window === "undefined") return WA_DEFAULT_TEMPLATE
    return localStorage.getItem("wa_template") ?? WA_DEFAULT_TEMPLATE
  })
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [templateDraft, setTemplateDraft] = useState("")
  const [pendingDeleteInvite, setPendingDeleteInvite] = useState<Invite | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showRemindModal, setShowRemindModal] = useState(false)
  const [deadlineDismissed, setDeadlineDismissed] = useState(false)
  const [editingTableHeader, setEditingTableHeader] = useState<string | null>(null)
  const [tableHeaderInput, setTableHeaderInput] = useState("")
  const [dragItem, setDragItem] = useState<DragItem | null>(null)
  const [dragOverTable, setDragOverTable] = useState<string | null>(null)
  const [extraTables, setExtraTables] = useState<string[]>([])

  // Guest management state
  const [expandedInvites, setExpandedInvites] = useState<Set<number>>(new Set())
  const [addingGuestTo, setAddingGuestTo] = useState<number | null>(null)
  const [guestFormData, setGuestFormData] = useState({ name: "", table_number: "" })
  const [guestFormSubmitting, setGuestFormSubmitting] = useState(false)
  const [editingGuest, setEditingGuest] = useState<EditingGuest | null>(null)

  // Seating panel state
  const [guestSearch, setGuestSearch] = useState("")
  const [guestFilter, setGuestFilter] = useState<"all" | "unassigned" | "groom" | "bride">("all")
  const [selectedGuest, setSelectedGuest] = useState<SeatingCard | null>(null)

  const router = useRouter()

  const fetchInvites = async () => {
    const res = await fetch("/api/admin/invites")
    if (res.ok) setInvites(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchInvites() }, [])
  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current) }, [])

  // ── Derived attendance status ────────────────────────────────────────────
  const getInviteStatus = (invite: Invite): "pending" | "attending" | "rejected" => {
    if (invite.guests.length > 0) {
      const hasResponded = invite.guests.some((g) => g.attending !== null)
      if (!hasResponded) return "pending"
      return invite.guests.some((g) => g.attending === 1) ? "attending" : "rejected"
    }
    if (Number(invite.responded) === 0) return "pending"
    return Number(invite.confirmed_guests) > 0 ? "attending" : "rejected"
  }

  const getConfirmedCount = (invite: Invite) =>
    invite.guests.length > 0
      ? invite.guests.filter((g) => g.attending === 1).length
      : Number(invite.confirmed_guests)

  const getTotalCount = (invite: Invite) =>
    invite.guests.length > 0 ? invite.guests.length : invite.max_guests

  // ── Invite CRUD ──────────────────────────────────────────────────────────
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
        guests: [],
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
    const promises: Promise<unknown>[] = []
    const updates: ((prev: Invite[]) => Invite[])[] = []
    for (const invite of invites) {
      if (invite.guests.length > 0) {
        for (const g of invite.guests) {
          if (g.table_number === oldKey) {
            promises.push(fetch(`/api/admin/guests/${g.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ table_number: newValue }),
            }))
          }
        }
      } else if (invite.table_number === oldKey) {
        promises.push(fetch(`/api/admin/invites/${invite.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_number: newValue }),
        }))
      }
    }
    await Promise.all(promises)
    setInvites((prev) => prev.map((i) => ({
      ...i,
      table_number: i.guests.length === 0 && i.table_number === oldKey ? newValue : i.table_number,
      guests: i.guests.map((g) => g.table_number === oldKey ? { ...g, table_number: newValue } : g),
    })))
    void updates
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

  // ── Guest CRUD ───────────────────────────────────────────────────────────
  const toggleExpand = (id: number) => {
    setExpandedInvites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddGuest = async (inviteId: number) => {
    if (!guestFormData.name.trim()) return
    setGuestFormSubmitting(true)
    const res = await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invite_id: inviteId,
        name: guestFormData.name.trim(),
        table_number: guestFormData.table_number.trim() || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const newGuest: Guest = {
        id: data.id,
        invite_id: inviteId,
        name: guestFormData.name.trim(),
        table_number: guestFormData.table_number.trim() || null,
        attending: null,
      }
      setInvites((prev) =>
        prev.map((i) => i.id === inviteId ? { ...i, guests: [...i.guests, newGuest] } : i)
      )
      setGuestFormData({ name: "", table_number: "" })
    }
    setGuestFormSubmitting(false)
  }

  const handleUpdateGuest = async (guestId: number, inviteId: number, fields: Partial<Pick<Guest, "name" | "table_number" | "attending">>) => {
    const res = await fetch(`/api/admin/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      setInvites((prev) =>
        prev.map((i) =>
          i.id === inviteId
            ? { ...i, guests: i.guests.map((g) => g.id === guestId ? { ...g, ...fields } : g) }
            : i
        )
      )
    }
    setEditingGuest(null)
  }

  const handleDeleteGuest = async (guestId: number, inviteId: number) => {
    await fetch(`/api/admin/guests/${guestId}`, { method: "DELETE" })
    setInvites((prev) =>
      prev.map((i) =>
        i.id === inviteId ? { ...i, guests: i.guests.filter((g) => g.id !== guestId) } : i
      )
    )
  }

  // ── Seating drag-and-drop ────────────────────────────────────────────────
  const handleDropToTable = async (targetTable: string | null) => {
    if (!dragItem) return
    setDragItem(null)
    setDragOverTable(null)
    if (dragItem.type === "guest") {
      setInvites((prev) =>
        prev.map((i) =>
          i.id === dragItem.inviteId
            ? { ...i, guests: i.guests.map((g) => g.id === dragItem.id ? { ...g, table_number: targetTable } : g) }
            : i
        )
      )
      await fetch(`/api/admin/guests/${dragItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: targetTable }),
      })
    } else {
      setInvites((prev) =>
        prev.map((i) => i.id === dragItem.id ? { ...i, table_number: targetTable } : i)
      )
      await fetch(`/api/admin/invites/${dragItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: targetTable }),
      })
    }
  }

  const handleAssignCard = async (card: SeatingCard, targetTable: string | null) => {
    if (card.kind === "guest") {
      setInvites((prev) =>
        prev.map((i) =>
          i.id === card.inviteId
            ? { ...i, guests: i.guests.map((g) => g.id === card.guestId ? { ...g, table_number: targetTable } : g) }
            : i
        )
      )
      await fetch(`/api/admin/guests/${card.guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: targetTable }),
      })
    } else {
      setInvites((prev) =>
        prev.map((i) => i.id === card.inviteId ? { ...i, table_number: targetTable } : i)
      )
      await fetch(`/api/admin/invites/${card.inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: targetTable }),
      })
    }
  }

  const handleAddTable = () => {
    const existing = [
      ...invites.flatMap((i) =>
        i.guests.length > 0
          ? i.guests.filter((g) => g.table_number).map((g) => g.table_number!)
          : i.table_number ? [i.table_number] : []
      ),
      ...extraTables,
    ].map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
    const newKey = String(next)
    setExtraTables((prev) => prev.includes(newKey) ? prev : [...prev, newKey])
  }

  const handleRemoveTable = (tableKey: string) => {
    // Only remove from extraTables — real tables (with guests/invites) can't be deleted this way
    setExtraTables((prev) => prev.filter((t) => t !== tableKey))
  }

  // ── WA / sharing ─────────────────────────────────────────────────────────
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
      ctx.fillStyle = "#2d5a4f"; ctx.textAlign = "center"
      // Auto-fit family name: shrink font until it fits, or wrap to two lines
      const maxNameWidth = W - 100
      let nameFontSize = 22
      ctx.font = `bold ${nameFontSize}px Georgia, serif`
      while (ctx.measureText(familyName).width > maxNameWidth && nameFontSize > 13) {
        nameFontSize -= 1
        ctx.font = `bold ${nameFontSize}px Georgia, serif`
      }
      if (ctx.measureText(familyName).width > maxNameWidth) {
        // Still too long — split into two lines at the middle word boundary
        const words = familyName.split(" ")
        const mid = Math.ceil(words.length / 2)
        const line1 = words.slice(0, mid).join(" ")
        const line2 = words.slice(mid).join(" ")
        const lineH = nameFontSize + 6
        ctx.fillText(line1, W / 2, 490)
        ctx.fillText(line2, W / 2, 490 + lineH)
        ctx.font = "13px Arial, sans-serif"; ctx.fillStyle = "#5a6f52"
        ctx.fillText("You are invited to join us", W / 2, 490 + lineH * 2 + 8)
      } else {
        ctx.fillText(familyName, W / 2, 498)
        ctx.font = "13px Arial, sans-serif"; ctx.fillStyle = "#5a6f52"
        ctx.fillText("You are invited to join us", W / 2, 526)
      }
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

  // ── Derived values ───────────────────────────────────────────────────────
  const totalExpected = invites.reduce((sum, i) => sum + getTotalCount(i), 0)
  const totalConfirmed = invites.reduce((sum, i) => sum + getConfirmedCount(i), 0)
  const totalResponded = invites.filter((i) => getInviteStatus(i) !== "pending").length

  const now = new Date()
  const isOverdue = (invite: Invite) => now > RSVP_DEADLINE && getInviteStatus(invite) === "pending"
  const overdueCount = invites.filter(isOverdue).length
  const pendingInvites = invites.filter((i) => getInviteStatus(i) === "pending")

  const filtered = invites.filter((i) => {
    if (filters.name && !i.family_name.toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.code && !i.code.toLowerCase().includes(filters.code.toLowerCase())) return false
    if (filters.side !== "all" && i.side !== filters.side) return false
    const status = getInviteStatus(i)
    if (filters.responded === "attending" && status !== "attending") return false
    if (filters.responded === "rejected" && status !== "rejected") return false
    if (filters.responded === "pending" && status !== "pending") return false
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
            const val = (i: Invite) => { const s = getInviteStatus(i); return s === "pending" ? 0 : s === "attending" ? 2 : 1 }
            return dir * (val(a) - val(b))
          }
          case "Confirmed": return dir * (getConfirmedCount(a) - getConfirmedCount(b))
          case "Table #": {
            const ta = a.guests.length > 0
              ? [...new Set(a.guests.filter((g) => g.table_number).map((g) => g.table_number!))].join(",")
              : (a.table_number ?? "")
            const tb = b.guests.length > 0
              ? [...new Set(b.guests.filter((g) => g.table_number).map((g) => g.table_number!))].join(",")
              : (b.table_number ?? "")
            return dir * ta.localeCompare(tb, undefined, { numeric: true })
          }
          default: return 0
        }
      })
    : filtered

  // ── Seating derived data ─────────────────────────────────────────────────
  type SeatingCard =
    | { kind: "guest"; guestId: number; inviteId: number; guestName: string; familyName: string; attending: number | null; tableNumber: string | null; side: string }
    | { kind: "invite"; inviteId: number; familyName: string; confirmedGuests: number; maxGuests: number; tableNumber: string | null; side: string }

  const seatingCards: SeatingCard[] = [
    ...invites.flatMap((i) =>
      i.guests.map((g) => ({
        kind: "guest" as const,
        guestId: g.id,
        inviteId: i.id,
        guestName: g.name,
        familyName: i.family_name,
        attending: g.attending,
        tableNumber: g.table_number,
        side: i.side,
      }))
    ),
    ...invites.filter((i) => i.guests.length === 0).map((i) => ({
      kind: "invite" as const,
      inviteId: i.id,
      familyName: i.family_name,
      confirmedGuests: Number(i.confirmed_guests),
      maxGuests: i.max_guests,
      tableNumber: i.table_number,
      side: i.side,
    })),
  ]

  const seatingGrouped = seatingCards.reduce<Record<string, SeatingCard[]>>((acc, card) => {
    const key = card.tableNumber ?? "__unassigned__"
    if (!acc[key]) acc[key] = []
    acc[key].push(card)
    return acc
  }, {})

  const assignedTables = [...new Set(seatingCards.filter((c) => c.tableNumber).map((c) => c.tableNumber!))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const allSeatingTables = [...new Set([...assignedTables, ...extraTables])]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  // ── Helper renderers ─────────────────────────────────────────────────────
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
    const status = getInviteStatus(invite)
    if (status === "pending") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        {isOverdue(invite) && <Clock className="w-3 h-3" />}
        Pending
      </span>
    )
    if (status === "attending") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Attending</span>
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>
  }

  const guestAttendingBadge = (attending: number | null) => {
    if (attending === null) return <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Pending</span>
    if (attending === 1) return <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Attending</span>
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Not attending</span>
  }

  const tableNumberCell = (invite: Invite) => {
    if (invite.guests.length > 0) {
      const tables = [...new Set(invite.guests.filter((g) => g.table_number).map((g) => g.table_number!))]
      return (
        <span className="text-xs text-muted-foreground">
          {tables.length === 0 ? "—" : tables.length === 1 ? `Table ${tables[0]}` : `${tables.length} tables`}
        </span>
      )
    }
    return editingTable === invite.id ? (
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
  }

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

  // ── Guest sub-table rows ─────────────────────────────────────────────────
  const renderGuestRow = (guest: Guest, inviteId: number) => {
    const saveGuest = () => {
      if (!editingGuest) return
      handleUpdateGuest(editingGuest.id, inviteId, {
        name: editingGuest.name,
        table_number: editingGuest.table_number.trim() || null,
        attending: editingGuest.attending,
      })
    }

    if (editingGuest?.id === guest.id) {
      return (
        <tr key={guest.id} className="bg-white">
          <td className="px-4 py-2">
            <input
              type="text"
              value={editingGuest.name}
              onChange={(e) => setEditingGuest((p) => p ? { ...p, name: e.target.value } : null)}
              onKeyDown={(e) => { if (e.key === "Enter") saveGuest(); if (e.key === "Escape") setEditingGuest(null) }}
              autoFocus
              className="w-full px-2 py-1 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </td>
          <td className="px-4 py-2">
            <input
              type="text"
              value={editingGuest.table_number}
              onChange={(e) => setEditingGuest((p) => p ? { ...p, table_number: e.target.value } : null)}
              onKeyDown={(e) => { if (e.key === "Enter") saveGuest(); if (e.key === "Escape") setEditingGuest(null) }}
              placeholder="e.g. 5"
              className="w-20 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </td>
          <td className="px-4 py-2">
            <div className="flex gap-1.5">
              {([1, 0, null] as const).map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setEditingGuest((p) => p ? { ...p, attending: val } : null)}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-smooth ${
                    editingGuest.attending === val
                      ? val === 1 ? "bg-green-100 text-green-700 border-green-300"
                        : val === 0 ? "bg-red-100 text-red-700 border-red-300"
                        : "bg-amber-100 text-amber-700 border-amber-300"
                      : "bg-white text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {val === 1 ? "Yes" : val === 0 ? "No" : "?"}
                </button>
              ))}
            </div>
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center gap-1">
              <button
                onClick={saveGuest}
                className="p-1 rounded bg-primary text-primary-foreground"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditingGuest(null)}
                className="p-1 rounded border border-border hover:bg-cream text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>
      )
    }
    return (
      <tr key={guest.id} className="bg-white hover:bg-cream/30 transition-smooth">
        <td className="px-4 py-2.5 text-sm text-primary">{guest.name}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">
          {guest.table_number ? `Table ${guest.table_number}` : "—"}
        </td>
        <td className="px-4 py-2.5">{guestAttendingBadge(guest.attending)}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingGuest({ id: guest.id, inviteId, name: guest.name, table_number: guest.table_number ?? "", attending: guest.attending })}
              className="p-1 rounded hover:bg-cream text-muted-foreground hover:text-primary transition-smooth"
              title="Edit guest"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteGuest(guest.id, inviteId)}
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-smooth"
              title="Remove guest"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const renderGuestSubRow = (invite: Invite) => (
    <tr key={`guests-${invite.id}`}>
      <td colSpan={7} className="px-6 pt-0 pb-4 bg-cream/20">
        <div className="rounded-lg border border-border overflow-hidden">
          {invite.guests.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream/70 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Table</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invite.guests.map((g) => renderGuestRow(g, invite.id))}
              </tbody>
            </table>
          )}
          {addingGuestTo === invite.id ? (
            <div className="px-4 py-3 bg-white border-t border-border flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Guest name"
                value={guestFormData.name}
                onChange={(e) => setGuestFormData((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddGuest(invite.id) }}
                autoFocus
                className="flex-1 min-w-[140px] px-3 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="text"
                placeholder="Table (optional)"
                value={guestFormData.table_number}
                onChange={(e) => setGuestFormData((p) => ({ ...p, table_number: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddGuest(invite.id) }}
                className="w-28 px-3 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={() => handleAddGuest(invite.id)}
                disabled={guestFormSubmitting || !guestFormData.name.trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingGuestTo(null); setGuestFormData({ name: "", table_number: "" }) }}
                className="p-1 rounded text-muted-foreground hover:text-primary transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="px-4 py-2.5 border-t border-border bg-white">
              {invite.guests.length === 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  No individual guests added. Add guests to enable per-person table assignments and RSVP tracking.
                </p>
              )}
              <button
                onClick={() => { setAddingGuestTo(invite.id); setGuestFormData({ name: "", table_number: "" }) }}
                className="text-xs text-accent hover:text-primary flex items-center gap-1.5 transition-smooth"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add guest
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )

  // ============================================================
  return (
    <div className="min-h-screen bg-ivory">
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

      {/* Edit invite modal */}
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
            <div className="h-full bg-primary-foreground/50 origin-left" style={{ animation: "undoShrink 5s linear forwards" }} />
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
              <button onClick={() => setTemplateDraft(WA_DEFAULT_TEMPLATE)} className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-cream transition-smooth whitespace-nowrap">Reset</button>
              <button onClick={() => setShowTemplateEditor(false)} className="flex-1 text-sm py-2 rounded-lg border border-border hover:bg-cream transition-smooth">Cancel</button>
              <button onClick={handleSaveTemplate} className="flex-1 text-sm py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth">Save</button>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Total Invites", value: invites.length },
            { label: "Total Guests", value: totalExpected },
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
              <button
                onClick={() => { setTemplateDraft(waTemplate); setShowTemplateEditor(true) }}
                title="Edit WhatsApp message template"
                className="p-2 rounded-lg border border-border hover:bg-cream transition-smooth text-muted-foreground"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              {pendingInvites.length > 0 && (
                <button
                  onClick={() => setShowRemindModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-smooth"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Remind ({pendingInvites.length})</span>
                </button>
              )}
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

          {/* ── Seating view ──────────────────────────────────────────────── */}
          {view === "seating" && !loading && (
            <div className="p-4 md:p-6">
              {invites.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No invites yet.</p>
              ) : (
                <div className="space-y-3">
                  {/* Toolbar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleAddTable}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-border hover:border-primary hover:bg-cream/60 transition-smooth text-muted-foreground hover:text-primary"
                    >
                      <span className="text-base leading-none font-medium">+</span>
                      Add Table
                    </button>
                    {selectedGuest && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Click a table to assign <span className="font-medium text-primary">{selectedGuest.kind === "guest" ? selectedGuest.guestName : selectedGuest.familyName}</span>
                        </span>
                        <button
                          onClick={() => setSelectedGuest(null)}
                          className="p-0.5 rounded hover:bg-cream text-muted-foreground hover:text-primary transition-smooth"
                          title="Cancel selection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Split layout */}
                  <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[520px]">

                    {/* ── Left panel: Tables ──────────────────────────────── */}
                    <div className="w-[58%] overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                        {allSeatingTables.map((tableKey) => {
                          const group = seatingGrouped[tableKey] ?? []
                          const totalMax = group.reduce((s, c) => s + (c.kind === "guest" ? 1 : c.maxGuests), 0)
                          const totalConfirmedTable = group.reduce((s, c) => {
                            if (c.kind === "guest") return s + (c.attending === 1 ? 1 : 0)
                            return s + c.confirmedGuests
                          }, 0)
                          const isOver = dragOverTable === tableKey
                          const isClickAssign = selectedGuest !== null
                          return (
                            <div
                              key={tableKey}
                              onDragOver={(e) => { e.preventDefault(); setDragOverTable(tableKey) }}
                              onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverTable(null)
                              }}
                              onDrop={(e) => { e.preventDefault(); handleDropToTable(tableKey) }}
                              className={`rounded-xl border overflow-hidden transition-smooth ${isOver ? "border-accent ring-2 ring-accent/30 bg-accent/5" : isClickAssign ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}
                            >
                              {/* Table header */}
                              <div
                                className={`px-4 py-2.5 bg-cream border-b border-border flex items-center justify-between gap-2 ${isClickAssign && editingTableHeader !== tableKey ? "cursor-pointer hover:bg-primary/10" : ""}`}
                                onClick={() => {
                                  if (isClickAssign && selectedGuest && editingTableHeader !== tableKey) {
                                    handleAssignCard(selectedGuest, tableKey)
                                    setSelectedGuest(null)
                                  }
                                }}
                              >
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
                                    onClick={(e) => { e.stopPropagation(); setEditingTableHeader(tableKey); setTableHeaderInput(tableKey) }}
                                    title="Click to rename"
                                    className="text-sm font-medium text-primary hover:text-accent transition-smooth flex items-center gap-1.5 group"
                                  >
                                    Table {tableKey}
                                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-smooth" />
                                  </button>
                                )}
                                {editingTableHeader !== tableKey && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs text-muted-foreground">{totalConfirmedTable} / {totalMax} seats</span>
                                    {group.length === 0 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveTable(tableKey) }}
                                        title="Remove empty table"
                                        className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-smooth"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Table entries */}
                              <div className="divide-y divide-border">
                                {group.map((card) => {
                                  const isBeingDragged = card.kind === "guest"
                                    ? dragItem?.type === "guest" && dragItem.id === card.guestId
                                    : dragItem?.type === "invite" && dragItem.id === card.inviteId
                                  if (card.kind === "guest") {
                                    return (
                                      <div
                                        key={`g-${card.guestId}`}
                                        draggable
                                        onDragStart={(e) => { setDragItem({ type: "guest", id: card.guestId, inviteId: card.inviteId }); e.dataTransfer.effectAllowed = "move" }}
                                        onDragEnd={() => { setDragItem(null); setDragOverTable(null) }}
                                        className={`px-4 py-2.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none transition-smooth ${isBeingDragged ? "opacity-40 bg-cream" : "hover:bg-cream/60"}`}
                                      >
                                        <div className="min-w-0">
                                          <span className="text-sm text-primary truncate block">{card.guestName}</span>
                                          <span className="text-xs text-muted-foreground truncate block">{card.familyName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className={`w-2 h-2 rounded-full ${card.attending === 1 ? "bg-green-500" : card.attending === 0 ? "bg-red-400" : "bg-amber-300"}`} />
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleAssignCard(card, null) }}
                                            title="Unassign"
                                            className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-smooth"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return (
                                    <div
                                      key={`i-${card.inviteId}`}
                                      draggable
                                      onDragStart={(e) => { setDragItem({ type: "invite", id: card.inviteId }); e.dataTransfer.effectAllowed = "move" }}
                                      onDragEnd={() => { setDragItem(null); setDragOverTable(null) }}
                                      className={`px-4 py-2.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none transition-smooth ${isBeingDragged ? "opacity-40 bg-cream" : "hover:bg-cream/60"}`}
                                    >
                                      <div className="min-w-0">
                                        <span className="text-sm text-primary truncate block">{card.familyName}</span>
                                        <span className="text-xs text-muted-foreground">{card.confirmedGuests} / {card.maxGuests} guests</span>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleAssignCard(card, null) }}
                                        title="Unassign"
                                        className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-smooth"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )
                                })}
                                {group.length === 0 && (
                                  <div className={`px-4 py-4 text-xs text-center transition-smooth ${isOver ? "text-accent" : isClickAssign ? "text-primary/50" : "text-muted-foreground"}`}>
                                    {isOver ? "Drop here" : isClickAssign ? "Click header to assign" : "Empty — drag a guest here"}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {allSeatingTables.length === 0 && (
                          <p className="text-sm text-muted-foreground py-8 col-span-2 text-center">No tables yet. Click &quot;+ Add Table&quot; to get started.</p>
                        )}
                      </div>
                    </div>

                    {/* ── Right panel: Guest list ──────────────────────────── */}
                    <div className="w-[42%] flex flex-col border border-border rounded-xl overflow-hidden bg-white">
                      {/* Search */}
                      <div className="px-3 py-2 border-b border-border">
                        <input
                          type="text"
                          placeholder="Search guests..."
                          value={guestSearch}
                          onChange={(e) => setGuestSearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      {/* Filter tabs */}
                      <div className="flex border-b border-border bg-cream/50 text-xs shrink-0">
                        {(["all", "unassigned", "groom", "bride"] as const).map((f) => {
                          const count = f === "all"
                            ? seatingCards.length
                            : f === "unassigned"
                            ? seatingCards.filter((c) => !c.tableNumber).length
                            : seatingCards.filter((c) => c.side === f).length
                          return (
                            <button
                              key={f}
                              onClick={() => setGuestFilter(f)}
                              className={`flex-1 px-1 py-1.5 transition-smooth ${guestFilter === f ? "bg-white font-medium text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-primary"}`}
                            >
                              {f === "groom" ? "Groom's" : f === "bride" ? "Bride's" : f.charAt(0).toUpperCase() + f.slice(1)}
                              <span className="ml-0.5 opacity-60">({count})</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Guest rows */}
                      <div
                        className="overflow-y-auto flex-1"
                        onDragOver={(e) => { e.preventDefault(); setDragOverTable("__unassigned__") }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverTable(null)
                        }}
                        onDrop={(e) => { e.preventDefault(); handleDropToTable(null) }}
                      >
                        {(() => {
                          const q = guestSearch.toLowerCase()
                          const filtered = seatingCards.filter((card) => {
                            const name = card.kind === "guest" ? card.guestName : card.familyName
                            if (q && !name.toLowerCase().includes(q) && !card.familyName.toLowerCase().includes(q)) return false
                            if (guestFilter === "unassigned" && card.tableNumber) return false
                            if (guestFilter === "groom" && card.side !== "groom") return false
                            if (guestFilter === "bride" && card.side !== "bride") return false
                            return true
                          })

                          if (filtered.length === 0) {
                            return (
                              <p className="text-center text-sm text-muted-foreground py-8">
                                {q ? "No guests match your search." : "No guests found."}
                              </p>
                            )
                          }

                          return filtered.map((card) => {
                            const isBeingDragged = card.kind === "guest"
                              ? dragItem?.type === "guest" && dragItem.id === card.guestId
                              : dragItem?.type === "invite" && dragItem.id === card.inviteId
                            const isSelected = selectedGuest !== null && (
                              card.kind === "guest" && selectedGuest.kind === "guest"
                                ? card.guestId === (selectedGuest as Extract<SeatingCard, { kind: "guest" }>).guestId
                                : card.kind === "invite" && selectedGuest.kind === "invite"
                                  ? card.inviteId === (selectedGuest as Extract<SeatingCard, { kind: "invite" }>).inviteId
                                  : false
                            )
                            const displayName = card.kind === "guest" ? card.guestName : card.familyName
                            const subLabel = card.kind === "guest" ? card.familyName : `${card.confirmedGuests}/${card.maxGuests} guests`
                            const attendingDotClass = card.kind === "guest"
                              ? card.attending === 1 ? "bg-green-500" : card.attending === 0 ? "bg-red-400" : "bg-amber-300"
                              : null

                            return (
                              <div
                                key={card.kind === "guest" ? `g-${card.guestId}` : `i-${card.inviteId}`}
                                draggable
                                onDragStart={(e) => {
                                  if (card.kind === "guest") {
                                    setDragItem({ type: "guest", id: card.guestId, inviteId: card.inviteId })
                                  } else {
                                    setDragItem({ type: "invite", id: card.inviteId })
                                  }
                                  e.dataTransfer.effectAllowed = "move"
                                  e.stopPropagation()
                                }}
                                onDragEnd={() => { setDragItem(null); setDragOverTable(null) }}
                                onClick={() => setSelectedGuest(isSelected ? null : card)}
                                className={`px-4 py-2.5 flex items-center gap-3 border-b border-border cursor-pointer select-none transition-smooth ${isSelected ? "bg-primary/5 ring-inset ring-1 ring-primary/40" : isBeingDragged ? "opacity-40" : card.tableNumber ? "opacity-70 hover:opacity-100 hover:bg-cream/60" : "hover:bg-cream/60"}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm text-primary truncate block">{displayName}</span>
                                  <span className="text-xs text-muted-foreground truncate block">{subLabel}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {card.tableNumber ? (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">T{card.tableNumber}</span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-600 border border-amber-200">—</span>
                                  )}
                                  {attendingDotClass && <span className={`w-2 h-2 rounded-full shrink-0 ${attendingDotClass}`} />}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── List view ─────────────────────────────────────────────────── */}
          {view === "list" && (
            <>
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
                          <React.Fragment key={invite.id}>
                            <tr className={`transition-smooth ${expandedInvites.has(invite.id) ? "bg-cream/30" : "hover:bg-cream/50"}`}>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => toggleExpand(invite.id)}
                                    className="p-0.5 rounded hover:bg-cream text-muted-foreground transition-smooth shrink-0"
                                    title={expandedInvites.has(invite.id) ? "Collapse guests" : "Expand guests"}
                                  >
                                    {expandedInvites.has(invite.id)
                                      ? <ChevronDown className="w-4 h-4" />
                                      : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                  <div className="min-w-0">
                                    <span className="font-medium text-primary">{invite.family_name}</span>
                                    {invite.guests.length > 0 && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {invite.guests.length}/{invite.max_guests}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${invite.side === "bride" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                                  {invite.side === "bride" ? "Bride's" : "Groom's"}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{invite.code}</td>
                              <td className="px-6 py-4">{statusBadge(invite)}</td>
                              <td className="px-6 py-4 text-center">{getConfirmedCount(invite)} / {getTotalCount(invite)}</td>
                              <td className="px-6 py-4">{tableNumberCell(invite)}</td>
                              <td className="px-6 py-4">{actionButtons(invite)}</td>
                            </tr>
                            {expandedInvites.has(invite.id) && renderGuestSubRow(invite)}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-border">
                    {sortedFiltered.map((invite) => (
                      <div key={invite.id} className="px-4 py-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-1.5">
                            <button
                              onClick={() => toggleExpand(invite.id)}
                              className="p-0.5 rounded hover:bg-cream text-muted-foreground transition-smooth shrink-0"
                            >
                              {expandedInvites.has(invite.id)
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <div className="min-w-0">
                              <p className="font-medium text-primary truncate">{invite.family_name}</p>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">{invite.code}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${invite.side === "bride" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                            {invite.side === "bride" ? "Bride's" : "Groom's"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {statusBadge(invite)}
                          <span className="text-xs text-muted-foreground">{getConfirmedCount(invite)} / {getTotalCount(invite)} guests</span>
                          <div className="ml-auto">{tableNumberCell(invite)}</div>
                        </div>

                        {/* Mobile guest expansion */}
                        {expandedInvites.has(invite.id) && (
                          <div className="rounded-lg border border-border overflow-hidden mt-2">
                            {invite.guests.length > 0 && (
                              <div className="divide-y divide-border">
                                {invite.guests.map((g) => (
                                  <div key={g.id} className="px-3 py-2.5 bg-white flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm text-primary truncate">{g.name}</p>
                                      <p className="text-xs text-muted-foreground">{g.table_number ? `Table ${g.table_number}` : "No table"}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {guestAttendingBadge(g.attending)}
                                      <button
                                        onClick={() => setEditingGuest({ id: g.id, inviteId: invite.id, name: g.name, table_number: g.table_number ?? "", attending: g.attending })}
                                        className="p-1 rounded hover:bg-cream text-muted-foreground hover:text-primary transition-smooth"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteGuest(g.id, invite.id)}
                                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-smooth"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {invite.guests.length === 0 && (
                              <p className="px-3 py-2 text-xs text-muted-foreground bg-white">No guests added yet.</p>
                            )}
                            {addingGuestTo === invite.id ? (
                              <div className="px-3 py-2.5 bg-cream border-t border-border flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  placeholder="Name"
                                  value={guestFormData.name}
                                  onChange={(e) => setGuestFormData((p) => ({ ...p, name: e.target.value }))}
                                  autoFocus
                                  className="flex-1 min-w-[100px] px-2 py-1.5 text-sm rounded border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <input
                                  type="text"
                                  placeholder="Table"
                                  value={guestFormData.table_number}
                                  onChange={(e) => setGuestFormData((p) => ({ ...p, table_number: e.target.value }))}
                                  className="w-20 px-2 py-1.5 text-sm rounded border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <button
                                  onClick={() => handleAddGuest(invite.id)}
                                  disabled={guestFormSubmitting || !guestFormData.name.trim()}
                                  className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
                                >
                                  Add
                                </button>
                                <button onClick={() => { setAddingGuestTo(null); setGuestFormData({ name: "", table_number: "" }) }} className="p-1 text-muted-foreground">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddingGuestTo(invite.id); setGuestFormData({ name: "", table_number: "" }) }}
                                className="w-full px-3 py-2.5 text-xs text-accent hover:text-primary flex items-center gap-1.5 bg-cream border-t border-border transition-smooth"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Add guest
                              </button>
                            )}
                          </div>
                        )}

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

      {/* Edit guest modal (shared for mobile) */}
      {editingGuest && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingGuest(null)} />
          <div className="relative bg-white rounded-xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-playfair text-lg text-primary">Edit Guest</h3>
            <div>
              <label className="block text-xs font-medium text-primary mb-1">Name</label>
              <input type="text" value={editingGuest.name} onChange={(e) => setEditingGuest((p) => p ? { ...p, name: e.target.value } : null)} autoFocus className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary mb-1">Table Number</label>
              <input type="text" value={editingGuest.table_number} onChange={(e) => setEditingGuest((p) => p ? { ...p, table_number: e.target.value } : null)} placeholder="e.g. 5" className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary mb-2">Attendance</label>
              <div className="flex gap-2">
                {([1, 0, null] as const).map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => setEditingGuest((p) => p ? { ...p, attending: val } : null)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-smooth ${
                      editingGuest.attending === val
                        ? val === 1 ? "bg-green-100 text-green-700 border-green-300"
                          : val === 0 ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-amber-100 text-amber-700 border-amber-300"
                        : "border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {val === 1 ? "Attending" : val === 0 ? "Not attending" : "Pending"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditingGuest(null)} className="flex-1 text-sm py-2 rounded-lg border border-border hover:bg-cream transition-smooth">Cancel</button>
              <button
                onClick={() => handleUpdateGuest(editingGuest.id, editingGuest.inviteId, {
                  name: editingGuest.name,
                  table_number: editingGuest.table_number.trim() || null,
                  attending: editingGuest.attending,
                })}
                className="flex-1 text-sm py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
