"use client"

import { useEffect, useState } from "react"

export function VenueSection() {
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

    const element = document.getElementById("venue-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const handleGetDirections = () => {
    window.open("https://www.google.com/maps/search/?api=1&query=7.281879731688009,80.66960584487906", "_blank")
  }

  return (
    <section id="venue-section" className="py-16 md:py-24 px-4 bg-gradient-to-b from-ivory to-cream">
      <div className="max-w-3xl mx-auto">
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .fade-in {
            animation: fadeIn 1s ease-out forwards;
          }
          @keyframes slideUpSmooth {
            from {
              opacity: 0;
              transform: translateY(25px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .slide-up-smooth {
            animation: slideUpSmooth 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .item-delay-1 { animation-delay: 0.1s; }
          .item-delay-2 { animation-delay: 0.25s; }
          .item-delay-3 { animation-delay: 0.4s; }
        `}</style>

        <div className={`space-y-8 ${isInView ? "fade-in" : "opacity-0"}`}>
          <div className={`text-center space-y-2 slide-up-smooth ${isInView ? "" : "opacity-0"}`}>
            <h2 className="font-playfair text-4xl md:text-5xl text-primary">Venue</h2>
            <div className="flex items-center justify-center gap-2">
              <div className="flex-1 max-w-32 h-px bg-accent" />
              <svg className="w-4 h-4 text-accent animate-float" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.5 1.5H9.5V.5h1v1zm0 17H9.5v-1h1v1zm8-8.5v1h-1v-1h1zm-18 0v1H0v-1h.5zm14.5-5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <div className="flex-1 max-w-32 h-px bg-accent" />
            </div>
          </div>

          {/* Venue Card */}
          <div
            className={`bg-white rounded-lg overflow-hidden shadow-sm border border-border hover-lift transition-smooth-slow slide-up-smooth item-delay-1 ${isInView ? "" : "opacity-0"}`}
          >
            {/* Map Placeholder */}
            <div className="w-full h-64 md:h-80 bg-muted relative overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                // src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.8715280930507!2d80.66960584487906!3d7.281879731688009!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2596c8e8e8e8d%3A0x8e8e8e8e8e8e8e8e!2sEarls%20Regency%20Hotel%20Kandy!5e0!3m2!1sen!2slk!4v1234567890"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3957.638753074287!2d80.6696058!3d7.281879699999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae366c3a19400f9%3A0x3eb8b1d79173d61a!2sEarl&#39;s%20Regency%20Hotel!5e0!3m2!1sen!2slk!4v1773747501406!5m2!1sen!2slk"
                allowFullScreen
                aria-hidden="false"
                tabIndex={0}
              />
            </div>

            {/* Venue Info */}
            <div className="p-8 md:p-10 space-y-6">
              <div className={`slide-up-smooth item-delay-2 ${isInView ? "" : "opacity-0"}`}>
                <h3 className="font-playfair text-2xl md:text-3xl text-primary">
                  Regent Ballroom at Earls Regency Hotel
                </h3>
                <p className="text-lg text-primary/70 mb-4">Kandy, Sri Lanka</p>
              </div>

              <div className="space-y-4">
                <div
                  className={`flex items-start gap-4 transition-smooth hover:translate-x-1 ${isInView ? "" : "opacity-0"}`}
                  style={{
                    animation: isInView ? "slideUpSmooth 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards 0.3s" : "none",
                  }}
                >
                  <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.94 8.75 8.75 8.75.32 0 .64-.02.95-.05 3.71.64 6.3 3.23 6.94 6.94.03.31.05.63.05.95C21.06 20.06 21.06 2 12 2zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                  </svg>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="text-primary font-medium">Regent Ballroom, Earls Regency Hotel, Kandy</p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-4 transition-smooth hover:translate-x-1 ${isInView ? "" : "opacity-0"}`}
                  style={{
                    animation: isInView ? "slideUpSmooth 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards 0.4s" : "none",
                  }}
                >
                  <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54h3.97l4.24-5.13L12 9l-3.04 3.29z" />
                  </svg>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                    <p className="text-primary font-medium">Friday, 31st July 2026</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGetDirections}
                className={`w-full md:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-smooth hover-lift slide-up-smooth item-delay-3 ${isInView ? "" : "opacity-0"}`}
              >
                Get Directions
              </button>
            </div>
          </div>

          {/* Optional Story Section */}
          <div
            className={`mt-12 pt-12 border-t border-border slide-up-smooth ${isInView ? "" : "opacity-0"}`}
            style={{ animationDelay: "0.5s" }}
          >
            <h2 className="font-playfair text-4xl md:text-5xl text-primary mb-8 text-center">Our Story</h2>
            <div className="bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border space-y-4 hover-lift transition-smooth-slow">
              <p className="text-lg text-primary/70 elegant-text leading-relaxed">
                Our love story began with a shared dream and has blossomed into a beautiful journey. From the moment we
                met, we knew this was something special. We are grateful for every moment together and excited to
                celebrate this milestone with all of you.
              </p>
              <p className="text-lg text-primary/70 elegant-text leading-relaxed">
                With your blessings and support, we look forward to starting a new chapter of our lives together.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
