"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export function OpeningGreeting() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div id="hero-section" className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Background photo */}
      <Image
        src="/photo.jpg"
        alt="Pabasara & Lahiru"
        fill
        priority
        className="object-cover"
        style={{ objectPosition: "center 20%" }}
      />
      {/* Overlay — slightly stronger for legibility */}
      <div className="absolute inset-0 bg-white/60" />
      {/* Soft dark radial vignette behind the text centre */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(0,0,0,0.08)_0%,transparent_100%)]" />
      {/* Bottom fade into page background */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#f5f0e8] to-transparent pointer-events-none z-10" />
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .fade-in-scale {
          animation: fadeInScale 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes slideUpText {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .slide-up-text {
          animation: slideUpText 0.8s ease-out forwards;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .text-shadow-soft { text-shadow: 0 1px 4px rgba(255,255,255,0.3); }
        .text-shadow-heading { text-shadow: 0 1px 6px rgba(255,255,255,0.35); }
      `}</style>

      <div className={`relative z-10 max-w-2xl text-center space-y-4 ${isVisible ? "fade-in-scale" : ""}`}>
        <div className="space-y-3">
          <p
            className={`text-lg md:text-xl text-primary tracking-wide elegant-text slide-up-text stagger-1 text-shadow-soft ${isVisible ? "" : "opacity-0"}`}
          >
            With the blessings of our families, we invite you to celebrate our union
          </p>

          <div
            className={`flex items-center justify-center gap-3 py-4 slide-up-text stagger-2 ${isVisible ? "" : "opacity-0"}`}
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
            <svg className="w-6 h-6 text-accent animate-float" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 17a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-accent to-transparent" />
          </div>

          <h1
            className={`font-playfair text-5xl md:text-7xl text-primary elegant-text slide-up-text stagger-3 text-shadow-heading ${isVisible ? "" : "opacity-0"}`}
          >
            Pabasara & Lahiru
          </h1>

          <p
            className={`text-2xl md:text-3xl text-primary/80 font-light tracking-wide slide-up-text text-shadow-soft ${isVisible ? "" : "opacity-0"}`}
            style={{ animationDelay: "0.4s" }}
          >
            Friday, 31st July 2026
          </p>
        </div>
      </div>
    </div>
  )
}
