"use client"

import { useEffect, useState } from "react"
import { CalendarDays, MapPin, ClipboardCheck, Mail } from "lucide-react"

const SECTIONS = [
  { id: "hero-section",     label: "Invite",  Icon: Mail },
  { id: "ceremony-section", label: "Agenda",  Icon: CalendarDays },
  { id: "venue-section",    label: "Venue",   Icon: MapPin },
  { id: "rsvp-section",     label: "RSVP",    Icon: ClipboardCheck },
]

export function BottomNav() {
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    // Hide nav while hero section is visible
    const hero = document.getElementById("hero-section")
    if (!hero) return

    const heroObserver = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.7 },
    )
    heroObserver.observe(hero)

    // Track which section is currently in view (including hero for active state)
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    )
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) sectionObserver.observe(el)
    })

    return () => {
      heroObserver.disconnect()
      sectionObserver.disconnect()
    }
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      {/* Frosted glass bar */}
      <div className="mx-auto max-w-sm mb-4 px-2">
        <div className="flex items-center justify-around bg-white/90 backdrop-blur-md border border-border rounded-2xl shadow-lg px-2 py-2">
          {SECTIONS.map(({ id, label, Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-xs tracking-wide transition-all duration-200 ${isActive ? "font-semibold" : "font-normal"}`}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
