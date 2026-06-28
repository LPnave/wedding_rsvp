"use client"

import { useState } from "react"
import { X } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

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
  responded: number
  confirmed_guests: number
  guests: Guest[]
}

interface Props {
  invites: Invite[]
}

function getInviteStatus(invite: Invite): "pending" | "attending" | "partial" | "rejected" {
  if (invite.guests.length > 0) {
    const hasResponded = invite.guests.some((g) => g.attending !== null)
    if (!hasResponded) return "pending"
    const hasYes = invite.guests.some((g) => g.attending === 1)
    const hasNo  = invite.guests.some((g) => g.attending === 0)
    if (hasYes && hasNo) return "partial"
    return hasYes ? "attending" : "rejected"
  }
  if (Number(invite.responded) === 0) return "pending"
  return Number(invite.confirmed_guests) > 0 ? "attending" : "rejected"
}

function getConfirmed(invite: Invite): number {
  return invite.guests.length > 0
    ? invite.guests.filter((g) => g.attending === 1).length
    : Number(invite.confirmed_guests)
}

function getRejected(invite: Invite): number {
  if (invite.guests.length > 0) return invite.guests.filter((g) => g.attending === 0).length
  return getInviteStatus(invite) === "rejected" ? Number(invite.max_guests) : 0
}

function getPending(invite: Invite): number {
  if (invite.guests.length > 0) return invite.guests.filter((g) => g.attending === null).length
  return getInviteStatus(invite) === "pending" ? Number(invite.max_guests) : 0
}

function sideStats(invites: Invite[], side: string) {
  const group = invites.filter((i) => i.side === side)
  return {
    confirmed: group.reduce((s, i) => s + getConfirmed(i), 0),
    rejected:  group.reduce((s, i) => s + getRejected(i), 0),
    pending:   group.reduce((s, i) => s + getPending(i), 0),
  }
}

const STATUS_COLORS: Record<string, string> = {
  Attending: "#4ade80",
  Pending:   "#fbbf24",
  Rejected:  "#f87171",
}

export function AdminStatsModal({ invites }: Props) {
  const [open, setOpen] = useState(false)

  const groom = sideStats(invites, "groom")
  const bride  = sideStats(invites, "bride")

  const chartData = [
    { label: "Groom's Side", ...groom },
    { label: "Bride's Side", ...bride },
  ]

  const responseCounts = [
    { label: "Attending", value: invites.filter((i) => getInviteStatus(i) === "attending").length },
    { label: "Pending",   value: invites.filter((i) => getInviteStatus(i) === "pending").length },
    { label: "Rejected",  value: invites.filter((i) => getInviteStatus(i) === "rejected").length },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg border border-border text-primary hover:bg-cream transition-smooth whitespace-nowrap"
      >
        Stats
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-border shadow-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-xl text-primary">RSVP Statistics</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-cream transition-smooth text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Guests by Side */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-primary">Guests by Side</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barCategoryGap="35%" barGap={4}>
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "#f5f0e8" }}
                      contentStyle={{ border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="confirmed" name="Confirmed" fill="#2d5a4f" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected"  name="Rejected"  fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending"   name="Pending"   fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#2d5a4f] inline-block" />Confirmed</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#f87171] inline-block" />Rejected</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#fbbf24] inline-block" />Pending</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[{ label: "Groom's Side", ...groom }, { label: "Bride's Side", ...bride }].map((s) => (
                    <div key={s.label} className="rounded-lg bg-cream/50 border border-border p-3 text-xs space-y-1">
                      <p className="font-medium text-primary">{s.label}</p>
                      <p className="text-green-700">✓ {s.confirmed} confirmed</p>
                      <p className="text-red-500">✕ {s.rejected} rejected</p>
                      <p className="text-amber-500">◌ {s.pending} pending</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Status */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-primary">Response Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={responseCounts} barCategoryGap="35%">
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "#f5f0e8" }}
                      contentStyle={{ border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="value" name="Invites" radius={[4, 4, 0, 0]}>
                      {responseCounts.map((entry) => (
                        <Cell key={entry.label} fill={STATUS_COLORS[entry.label]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  {responseCounts.map((s) => (
                    <span key={s.label} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: STATUS_COLORS[s.label] }} />
                      {s.label}: {s.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
