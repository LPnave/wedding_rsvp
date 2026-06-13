"use client"

import { useEffect, useState } from "react"
import { Gem, Wine, UtensilsCrossed, Music2, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface TimelineItem {
  time: string
  event: string
  Icon: LucideIcon
}

export function CeremonyDetails() {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsInView(true) },
      { threshold: 0.1 },
    )
    const element = document.getElementById("ceremony-section")
    if (element) observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const timeline: TimelineItem[] = [
    { time: "10:00 AM", event: "Poruwa Ceremony",  Icon: Gem },
    { time: "12:00 PM", event: "Bar Opens",        Icon: Wine },
    { time: "1:00 PM",  event: "Lunch",            Icon: UtensilsCrossed },
    { time: "2:00 PM",  event: "Dance Away",       Icon: Music2 },
    { time: "4:00 PM",  event: "Sparkle Send Off", Icon: Sparkles },
  ]

  return (
    <section id="ceremony-section" className="py-16 md:py-24 px-4 bg-cream">
      <div className="max-w-2xl mx-auto">
        <style>{`
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .fsup { animation: fadeSlideUp 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        `}</style>

        {/* Poruwa Ceremony heading card */}
        <div
          className={`bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border hover-lift transition-smooth mb-10 ${isInView ? "fsup" : "opacity-0"}`}
          style={{ animationDelay: "0s" }}
        >
          <h3 className="font-playfair text-2xl md:text-3xl text-primary text-center">
            Poruwa Ceremony at 10.00 am
          </h3>
        </div>

        <div
          className={`text-center space-y-2 mb-10 ${isInView ? "fsup" : "opacity-0"}`}
          style={{ animationDelay: "0.05s" }}
        >
          <h2 className="font-playfair text-4xl md:text-5xl text-primary">Wedding Agenda</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 max-w-32 h-px bg-accent" />
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <div className="flex-1 max-w-32 h-px bg-accent" />
          </div>
        </div>

        {/* Timeline — centred with a fixed-width inner container */}
        <div
          className={`bg-white rounded-lg shadow-sm border border-border px-6 md:px-10 py-4 flex justify-center transition-smooth ${isInView ? "fsup" : "opacity-0"}`}
          style={{ animationDelay: "0.1s" }}
        >
          <div className="relative w-full max-w-sm">
            {/* Vertical line */}
            <div className="absolute left-[88px] top-0 bottom-0 w-px bg-accent/40" />

            <div className="space-y-2">
              {timeline.map(({ time, event, Icon }, index) => (
                <div
                  key={index}
                  className={`relative flex items-center ${isInView ? "fsup" : "opacity-0"}`}
                  style={{ animationDelay: isInView ? `${0.2 + index * 0.1}s` : "0s" }}
                >
                  {/* Icon — left of the line */}
                  <div className="w-20 shrink-0 flex justify-center py-5">
                    <div className="w-12 h-12 rounded-full bg-cream border border-accent/30 flex items-center justify-center shadow-sm">
                      <Icon className="w-5 h-5 text-primary/70" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Connector dot on the line */}
                  <div className="relative z-20 shrink-0 w-4 flex justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-white" />
                  </div>

                  {/* Text — right of the line */}
                  <div className="py-5 flex-1 pl-5 border-b border-border/30">
                    <p className="text-sm font-medium text-primary/50 tracking-wide">{time}</p>
                    <p className="text-base md:text-lg text-primary mt-0.5">{event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
