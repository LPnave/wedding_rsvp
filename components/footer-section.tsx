"use client"

import { Suspense, useEffect, useState } from "react"
import { Heart } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"

const WEDDING_DATE = new Date("2026-07-31T08:50:00+05:30")

export function FooterSection() {
  return (
    <footer id="footer-section" className="py-16 md:py-24 px-4 bg-gradient-to-b from-cream to-ivory">
      <div className="max-w-3xl mx-auto">
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .slide-up {
            animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
          }
          .float {
            animation: float 3s ease-in-out infinite;
          }
          .item-delay-1 { animation-delay: 0.1s; }
          .item-delay-2 { animation-delay: 0.2s; }
          .item-delay-3 { animation-delay: 0.3s; }
        `}</style>

        <Suspense fallback={<FooterStatic />}>
          <FooterInner />
        </Suspense>
      </div>
    </footer>
  )
}

function FooterStatic() {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <Heart className="w-12 h-12 text-accent mx-auto float" fill="currentColor" />
        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 max-w-24 h-px bg-accent" />
          <div className="w-1 h-1 rounded-full bg-accent" />
          <div className="flex-1 max-w-24 h-px bg-accent" />
        </div>
      </div>
      <div className="pt-4">
        <div className="inline-block">
          <Image
            src="/Logo only-01.png"
            alt="P & L monogram"
            width={120}
            height={120}
            className="mx-auto"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground elegant-text">
        Pabasara & Lahiru
        <br />
        Friday, 31st July 2026
      </p>
    </div>
  )
}

function FooterInner() {
  const searchParams = useSearchParams()
  const [isInView, setIsInView] = useState(false)
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const check = () => setIsPast(Date.now() >= WEDDING_DATE.getTime())
    check()
    const timer = setInterval(check, 10000)
    return () => clearInterval(timer)
  }, [])

  const showPast = isPast || searchParams.get("countdown") === "done"

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById("footer-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div className={`space-y-8 text-center ${isInView ? "slide-up" : "opacity-0"}`}>
      <div className={`space-y-4 slide-up item-delay-1 ${isInView ? "" : "opacity-0"}`}>
        <Heart className="w-12 h-12 text-accent mx-auto float" fill="currentColor" />
        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 max-w-24 h-px bg-accent" />
          <div className="w-1 h-1 rounded-full bg-accent" />
          <div className="flex-1 max-w-24 h-px bg-accent" />
        </div>
      </div>

      {!showPast && (
        <div className={`space-y-4 slide-up item-delay-2 ${isInView ? "" : "opacity-0"}`}>
          <p className="font-playfair text-xl md:text-2xl text-primary italic elegant-text">
            We look forward to celebrating with you
          </p>
        </div>
      )}

      <div className={`pt-4 slide-up item-delay-3 ${isInView ? "" : "opacity-0"}`}>
        <div className="inline-block transition-smooth hover:scale-105">
          <Image
            src="/Logo only-01.png"
            alt="P & L monogram"
            width={120}
            height={120}
            className="mx-auto"
          />
        </div>
      </div>

      <p
        className={`text-sm text-muted-foreground elegant-text slide-up ${isInView ? "" : "opacity-0"}`}
        style={{ animationDelay: "0.4s" }}
      >
        Pabasara & Lahiru
        <br />
        Friday, 31st July 2026
      </p>
    </div>
  )
}
