"use client"

import { useState, useEffect } from "react"
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

interface Stats {
  sides: Array<{ label: string; expected: number; confirmed: number }>
  responses: Array<{ label: string; value: number }>
}

const STATUS_COLORS: Record<string, string> = {
  Attending: "#4ade80",
  Pending: "#fbbf24",
  Rejected: "#f87171",
}

export function AdminStatsModal() {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || stats) return
    setLoading(true)
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false))
  }, [open, stats])

  // Refetch on each open to get fresh data
  const handleOpen = () => {
    setStats(null)
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg border border-border text-primary hover:bg-cream transition-smooth whitespace-nowrap"
      >
        Stats
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
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

            {loading && (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading stats...</div>
            )}

            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Guests by Side */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-primary">Guests by Side</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.sides} barCategoryGap="35%">
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "#f5f0e8" }}
                        contentStyle={{ border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="expected" name="Expected" fill="#e5e0d8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="confirmed" name="Confirmed" fill="#2d5a4f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#e5e0d8] inline-block" />Expected</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#2d5a4f] inline-block" />Confirmed</span>
                  </div>
                </div>

                {/* Response Status */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-primary">Response Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.responses} barCategoryGap="35%">
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "#f5f0e8" }}
                        contentStyle={{ border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="value" name="Invites" radius={[4, 4, 0, 0]}>
                        {stats.responses.map((entry) => (
                          <Cell key={entry.label} fill={STATUS_COLORS[entry.label]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {stats.responses.map((s) => (
                      <span key={s.label} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: STATUS_COLORS[s.label] }} />
                        {s.label}: {s.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
