"use client"

import { useEffect, useState } from "react"
import { Flower2 } from "lucide-react"
import { useSearchParams } from "next/navigation"

const WEDDING_DATE = new Date("2026-07-31T08:50:00+05:30")
const WEDDING_DAY_START = new Date("2026-07-31T00:00:00+05:30")

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(): TimeLeft {
  const diff = WEDDING_DATE.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

type Phase = "before" | "today" | "done"

function getPhase(): Phase {
  const now = Date.now()
  if (now >= WEDDING_DATE.getTime()) return "done"
  if (now >= WEDDING_DAY_START.getTime()) return "today"
  return "before"
}

export function CountdownSection() {
  const searchParams = useSearchParams()
  const previewPhase = searchParams.get("countdown") as Phase | null

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [phase, setPhase] = useState<Phase | null>(null)
  const [isInView, setIsInView] = useState(false)

  const activePhase = previewPhase ?? phase

  useEffect(() => {
    setTimeLeft(getTimeLeft())
    setPhase(getPhase())
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft())
      setPhase(getPhase())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsInView(true) },
      { threshold: 0.1 },
    )
    const el = document.getElementById("countdown-section")
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const units = [
    { label: "Days",    value: timeLeft?.days },
    { label: "Hours",   value: timeLeft?.hours },
    { label: "Minutes", value: timeLeft?.minutes },
    { label: "Seconds", value: timeLeft?.seconds },
  ]

  return (
    <section id="countdown-section" className="py-16 md:py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto text-center">
        <style>{`
          @keyframes cntFadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .cnt-fadeup { animation: cntFadeUp 0.7s cubic-bezier(0.4,0,0.2,1) forwards; }
          @keyframes tickFlip {
            0%   { transform: translateY(0);    opacity: 1; }
            49%  { transform: translateY(-6px); opacity: 0; }
            50%  { transform: translateY(6px);  opacity: 0; }
            100% { transform: translateY(0);    opacity: 1; }
          }
          .tick { animation: tickFlip 0.35s ease-out; }
        `}</style>

        <div className={`space-y-2 mb-10 ${isInView ? "cnt-fadeup" : "opacity-0"}`}>
          <p className="text-sm text-muted-foreground tracking-widest uppercase">Counting down to</p>
          <h2 className="font-playfair text-3xl md:text-4xl text-primary">31st July 2026</h2>
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="flex-1 max-w-24 h-px bg-accent" />
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <div className="flex-1 max-w-24 h-px bg-accent" />
          </div>
        </div>

        {/* Phase: after ceremony */}
        {activePhase === "done" && (
          <div className={`space-y-3 ${isInView ? "cnt-fadeup" : "opacity-0"}`}>
            <p className="font-playfair text-2xl text-primary">Thank you for celebrating with us</p>
          </div>
        )}

        {/* Phase: wedding day, before ceremony */}
        {activePhase === "today" && (
          <div className={`space-y-4 ${isInView ? "cnt-fadeup" : "opacity-0"}`}>
            <Flower2 className="w-10 h-10 text-accent mx-auto" strokeWidth={1.5} />
            <p className="font-playfair text-2xl text-primary">Today is the day!</p>
            <p className="text-sm text-muted-foreground">The ceremony begins at 8:50 AM</p>
            {/* Keep ticking hours/minutes/seconds */}
            <div className="flex items-start justify-center gap-3 md:gap-6 pt-2">
              {units.filter((u) => u.label !== "Days").map(({ label, value }, i, arr) => (
                <div key={label} className="flex items-start gap-3 md:gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-cream border border-border flex items-center justify-center shadow-sm">
                      <span key={value} className="font-playfair text-2xl md:text-3xl text-primary tick">
                        {value !== undefined ? String(value).padStart(2, "0") : "--"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-2 tracking-wide uppercase">{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="font-playfair text-2xl md:text-3xl text-accent/60 mt-4 md:mt-5 select-none">:</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase: before wedding day */}
        {activePhase === "before" && (
          <div className={`flex items-start justify-center gap-1.5 sm:gap-4 md:gap-6 ${isInView ? "cnt-fadeup" : "opacity-0"}`}
            style={{ animationDelay: "0.15s" }}
          >
            {units.map(({ label, value }, i) => (
              <div key={label} className="flex items-start gap-1.5 sm:gap-4 md:gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl bg-cream border border-border flex items-center justify-center shadow-sm">
                    <span key={value} className="font-playfair text-xl sm:text-2xl md:text-3xl text-primary tick">
                      {value !== undefined ? String(value).padStart(2, "0") : "--"}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground mt-2 tracking-wide uppercase">{label}</span>
                </div>
                {i < units.length - 1 && (
                  <span className="font-playfair text-xl sm:text-2xl md:text-3xl text-accent/60 mt-3 sm:mt-4 md:mt-5 select-none">:</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
