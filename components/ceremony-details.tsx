"use client"

import { useEffect, useState } from "react"

export function CeremonyDetails() {
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

    const element = document.getElementById("ceremony-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const timeline = [
    { time: "8:50 AM", event: "Registration" },
    { time: "10:00 AM", event: "Poruwa Ceremony" },
    { time: "12:00 PM", event: "Bar Opens" },
    { time: "1:00 PM", event: "Lunch" },
    { time: "2:00 PM", event: "Dance Away" },
    { time: "4:00 PM", event: "Sparkle Send Off" },
  ]

  return (
    <section id="ceremony-section" className="py-16 md:py-24 px-4 bg-cream">
      <div className="max-w-2xl mx-auto">
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
          @keyframes slideUpItem {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .slide-up-item {
            animation: slideUpItem 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .item-delay-1 { animation-delay: 0.1s; }
          .item-delay-2 { animation-delay: 0.2s; }
          .item-delay-3 { animation-delay: 0.3s; }
        `}</style>

        <div className={`space-y-8 ${isInView ? "slide-up" : "opacity-0"}`}>
          <div
            className={`bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border hover-lift transition-smooth slide-up-item item-delay-1 ${isInView ? "" : "opacity-0"}`}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-playfair text-2xl md:text-3xl text-primary">Poruwa Ceremony at 10.30 am</h3>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border transition-smooth slide-up-item item-delay-2 ${isInView ? "" : "opacity-0"}`}
          >
            <h3 className="font-playfair text-xl md:text-2xl text-primary mb-8">The Finer Details</h3>
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center border-b border-border/30 pb-4 last:border-b-0 transition-smooth hover:translate-x-1 ${isInView ? "opacity-100" : "opacity-0"}`}
                  style={{
                    animation: isInView
                      ? `slideUpItem 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards ${0.3 + index * 0.08}s`
                      : "none",
                  }}
                >
                  <span className="text-sm md:text-base font-medium text-primary/60 min-w-24">{item.time}</span>
                  <span className="text-sm md:text-base text-primary tracking-wide">{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
