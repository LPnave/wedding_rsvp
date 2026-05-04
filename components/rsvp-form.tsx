"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

interface GuestInfo {
  id: number
  name: string
  attending: number | null
  table_number: string | null
}

interface InviteInfo {
  family_name: string
  max_guests: number
  table_number: string | null
  already_submitted: boolean
  guests: GuestInfo[]
}

interface LegacyFormData {
  name: string
  attendance: string
  guestCount: number
}

export function RSVPForm() {
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get("invite")

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [inviteLoading, setInviteLoading] = useState(!!inviteCode)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Per-guest responses: guest_id → "yes" | "no"
  const [guestResponses, setGuestResponses] = useState<Record<number, "yes" | "no">>({})

  // Legacy / walk-in form state
  const [legacyForm, setLegacyForm] = useState<LegacyFormData>({
    name: "",
    attendance: "",
    guestCount: 1,
  })

  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!inviteCode) return
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(inviteCode)}`)
        if (!res.ok) {
          setInviteError("This invite link is not valid.")
          setInviteLoading(false)
          return
        }
        const data: InviteInfo = await res.json()
        setInvite(data)

        // Pre-populate responses for guests that already responded
        if (data.guests.length > 0) {
          const existing: Record<number, "yes" | "no"> = {}
          for (const g of data.guests) {
            if (g.attending !== null) existing[g.id] = g.attending === 1 ? "yes" : "no"
          }
          if (Object.keys(existing).length > 0) setGuestResponses(existing)
        } else {
          setLegacyForm((prev) => ({ ...prev, guestCount: Number(data.max_guests) }))
        }

        if (data.already_submitted) setSubmitted(true)
      } catch {
        setInviteError("Could not load invite details. You can still RSVP below.")
      } finally {
        setInviteLoading(false)
      }
    }
    fetchInvite()
  }, [inviteCode])

  const allGuestsAnswered = invite?.guests.length
    ? invite.guests.every((g) => guestResponses[g.id] !== undefined)
    : legacyForm.attendance !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (inviteCode && invite && invite.guests.length > 0) {
        // Per-guest RSVP flow
        const responses = invite.guests.map((g) => ({
          guest_id: g.id,
          attending: guestResponses[g.id] ?? "no",
        }))

        const res = await fetch("/api/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invite_code: inviteCode.toUpperCase(),
            responses,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Something went wrong")
        }

        // Re-fetch invite to get latest table numbers for success display
        const updatedRes = await fetch(`/api/invite/${encodeURIComponent(inviteCode)}`)
        if (updatedRes.ok) {
          setInvite(await updatedRes.json())
        }

        setSubmitted(true)
      } else {
        // Legacy / walk-in flow
        const body: Record<string, unknown> = {
          name: invite ? invite.family_name : legacyForm.name,
          attending: legacyForm.attendance,
        }
        if (inviteCode && invite) {
          body.invite_code = inviteCode.toUpperCase()
          body.guest_count = legacyForm.guestCount
        }

        const res = await fetch("/api/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Something went wrong")
        }

        setSubmitted(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-16 md:py-24 px-4 bg-cream">
      <div className="max-w-2xl mx-auto">
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .slide-up { animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
          @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .success-pulse { animation: successPulse 0.6s ease-out; }
          @keyframes inputFocus {
            from { box-shadow: 0 0 0 0 rgba(212, 175, 142, 0.1); }
            to { box-shadow: 0 0 0 3px rgba(212, 175, 142, 0.2); }
          }
          .input-focus:focus { animation: inputFocus 0.3s ease-out; }
        `}</style>

        <div className="text-center space-y-2 mb-10">
          <h2 className="font-playfair text-4xl md:text-5xl text-primary">RSVP</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 max-w-32 h-px bg-accent" />
            <svg className="w-4 h-4 text-accent animate-float" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 1a9 9 0 100 18 9 9 0 000-18zM9 5h2v2H9V5zm0 4h2v6H9V9z" />
            </svg>
            <div className="flex-1 max-w-32 h-px bg-accent" />
          </div>
        </div>

        {inviteLoading ? (
          <div className="text-center text-muted-foreground text-sm py-8">Loading your invitation...</div>
        ) : inviteCode && inviteError ? (
          <div className="bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border text-center space-y-4">
            <svg className="w-12 h-12 text-amber-400 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="font-playfair text-2xl text-primary">Invalid Invite Link</h3>
            <p className="text-primary/70">{inviteError}</p>
          </div>
        ) : !submitted ? (
          <form onSubmit={handleSubmit} className="slide-up">
            <div className="bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border space-y-6 hover-lift transition-smooth-slow">

              {/* Family greeting */}
              {invite && (
                <div className="text-center pb-2 border-b border-border">
                  <p className="text-sm text-muted-foreground">You are invited with</p>
                  <p className="font-playfair text-2xl text-primary mt-1">{invite.family_name}</p>
                </div>
              )}

              {/* Per-guest attendance checklist */}
              {invite && invite.guests.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-primary">Please confirm attendance for each guest:</p>
                  <div className="space-y-2">
                    {invite.guests.map((guest) => (
                      <div
                        key={guest.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border bg-cream/30"
                      >
                        <span className="text-sm text-primary font-medium">{guest.name}</span>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setGuestResponses((prev) => ({ ...prev, [guest.id]: "yes" }))}
                            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-lg font-medium transition-smooth border-2 ${
                              guestResponses[guest.id] === "yes"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-white text-primary border-border hover:border-primary hover:bg-primary/5"
                            }`}
                          >
                            Attending
                          </button>
                          <button
                            type="button"
                            onClick={() => setGuestResponses((prev) => ({ ...prev, [guest.id]: "no" }))}
                            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-lg font-medium transition-smooth border-2 ${
                              guestResponses[guest.id] === "no"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-white text-primary border-border hover:border-primary hover:bg-primary/5"
                            }`}
                          >
                            Not attending
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Name input — walk-in only */}
                  {!invite && (
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">
                        Your Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={legacyForm.name}
                        onChange={(e) => setLegacyForm((p) => ({ ...p, name: e.target.value }))}
                        required
                        placeholder="Enter your full name"
                        className="input-focus w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-smooth"
                      />
                    </div>
                  )}

                  {/* Single attendance toggle (legacy / no guests registered) */}
                  <div>
                    <label className="block text-sm font-medium text-primary mb-3">Will you be able to join us?</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setLegacyForm((p) => ({ ...p, attendance: "yes" }))}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-smooth border-2 ${
                          legacyForm.attendance === "yes"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white text-primary border-border hover:border-primary hover:bg-primary/5"
                        }`}
                      >
                        Yes, I will attend
                      </button>
                      <button
                        type="button"
                        onClick={() => setLegacyForm((p) => ({ ...p, attendance: "no" }))}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-smooth border-2 ${
                          legacyForm.attendance === "no"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white text-primary border-border hover:border-primary hover:bg-primary/5"
                        }`}
                      >
                        No, I cannot attend
                      </button>
                    </div>
                  </div>

                  {/* Guest count — invite with no registered guests */}
                  {invite && legacyForm.attendance === "yes" && invite.max_guests > 1 && (
                    <div>
                      <label htmlFor="guestCount" className="block text-sm font-medium text-primary mb-2">
                        How many guests will be attending?
                      </label>
                      <select
                        id="guestCount"
                        value={legacyForm.guestCount}
                        onChange={(e) => setLegacyForm((p) => ({ ...p, guestCount: parseInt(e.target.value, 10) }))}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-smooth"
                      >
                        {Array.from({ length: invite.max_guests }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} guest{n !== 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {error && <p className="text-sm text-center text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting || !allGuestsAnswered}
                className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
              >
                {isSubmitting ? "Submitting..." : "Submit RSVP"}
              </button>

              <p className="text-sm text-center text-muted-foreground">
                We appreciate your response and look forward to celebrating with you!
              </p>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border text-center space-y-4 success-pulse hover-lift transition-smooth">
            <svg className="w-16 h-16 text-accent mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="font-playfair text-2xl md:text-3xl text-primary">Thank you for sharing in our joy</h3>
            <p className="text-primary/70 elegant-text">
              We have received your RSVP and truly appreciate your response.
            </p>

            {/* Per-guest table display */}
            {invite && invite.guests.length > 0 && invite.guests.some((g) => g.table_number) && (
              <div className="mt-4 pt-4 border-t border-border text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-widest text-center mb-3">Your Table Assignments</p>
                <div className="space-y-2">
                  {invite.guests.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-1.5 px-1">
                      <span className="text-sm text-primary">{g.name}</span>
                      {g.table_number ? (
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground mr-1">Table</span>
                          <span className="font-playfair text-2xl text-primary">{g.table_number}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">TBA</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">Please show the QR or this invitation at the entrance</p>
              </div>
            )}

            {/* Legacy: single table number */}
            {invite && invite.guests.length === 0 && invite.table_number && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Your Table</p>
                <p className="font-playfair text-5xl text-primary">{invite.table_number}</p>
                <p className="text-xs text-muted-foreground mt-1">Please show the QR or this invitation at the entrance</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
