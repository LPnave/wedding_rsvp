"use client"

import { useEffect, useState } from "react"

export function FooterSection() {
  const [isInView, setIsInView] = useState(false)

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

        <div className={`space-y-8 text-center ${isInView ? "slide-up" : "opacity-0"}`}>
          {/* Decorative Divider */}
          <div className={`space-y-4 slide-up item-delay-1 ${isInView ? "" : "opacity-0"}`}>
            <svg className="w-12 h-12 text-accent mx-auto float" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.83 0 1.5-.67 1.5-1.5S8.83 8 8 8s-1.5.67-1.5 1.5S7.17 11 8 11zm8 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z" />
            </svg>
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 max-w-24 h-px bg-accent" />
              <div className="w-1 h-1 rounded-full bg-accent" />
              <div className="flex-1 max-w-24 h-px bg-accent" />
            </div>
          </div>

          {/* Closing Message */}
          <div className={`space-y-4 slide-up item-delay-2 ${isInView ? "" : "opacity-0"}`}>
            <p className="font-playfair text-xl md:text-2xl text-primary italic elegant-text">
              We look forward to celebrating with you
            </p>

            {/* Monogram */}
            <div className="py-8">
              <div className="inline-block space-y-2 transition-smooth hover:scale-105">
                <p className="font-playfair text-4xl md:text-5xl text-primary tracking-widest">
                  <span className="text-primary">P</span>
                  <span className="text-accent mx-4 font-playfair text-3xl md:text-4xl animate-float">♥</span>
                  <span className="text-primary">L</span>
                </p>
              </div>
            </div>
          </div>

          {/* Cultural Elements - Lotus Pattern */}
          <div
            className={`pt-8 flex items-center justify-center gap-6 slide-up item-delay-3 ${isInView ? "" : "opacity-0"}`}
          >
            {[0, 1, 2].map((i) => (
              <svg
                key={i}
                className="w-8 h-8 text-accent/60 hover:text-accent transition-smooth hover:scale-110 hover-lift"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            ))}
          </div>

          {/* Bottom Text */}
          <p
            className={`text-sm text-muted-foreground elegant-text slide-up ${isInView ? "" : "opacity-0"}`}
            style={{ animationDelay: "0.4s" }}
          >
            Pabasara & Lahiru
            <br />
            Friday, 31st July 2026
          </p>
        </div>
      </div>
    </footer>
  )
}
