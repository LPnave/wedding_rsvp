"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

type Layout = "full" | "left" | "right" | "center"

interface Props {
  src: string
  alt: string
  layout?: Layout
  quote?: string
  id: string
}

function useInView(id: string) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = document.getElementById(id)
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [id])
  return visible
}

export function PhotoMoment({ src, alt, layout = "center", quote, id }: Props) {
  const visible = useInView(id)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  // Parallax scroll effect for full-bleed layout
  useEffect(() => {
    if (layout !== "full") return
    const handleScroll = () => {
      if (!containerRef.current || !imageRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const viewportH = window.innerHeight
      // Offset by half viewport so image starts centred when section enters
      imageRef.current.style.transform = `translateY(${(rect.top - viewportH / 2) * 0.2}px)`
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [layout])

  if (layout === "full") {
    return (
      <div
        id={id}
        ref={containerRef}
        className={`w-full bg-black transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ height: "50vh" }}
      >
        <div className="relative w-full h-full overflow-hidden">
          {/* Image is taller than container so there's room to parallax */}
          <div
            ref={imageRef}
            className="absolute inset-x-0 will-change-transform"
            style={{ top: "-50%", height: "200%" }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
              style={{ objectPosition: "center 15%" }}
            />
          </div>
          {quote && (
            <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-10 px-6 z-10">
              <p className="font-playfair text-white text-xl md:text-3xl text-center italic max-w-xl">
                &ldquo;{quote}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (layout === "left") {
    return (
      <div
        id={id}
        className={`py-10 md:py-14 px-4 transition-all duration-1000 ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-8 md:gap-12">
          <div className="relative w-56 md:w-80 h-72 md:h-96 shrink-0 rounded-2xl overflow-hidden shadow-lg">
            <Image src={src} alt={alt} fill className="object-cover" />
          </div>
          {quote && (
            <p className="font-playfair text-primary/70 text-xl md:text-2xl italic leading-relaxed">
              &ldquo;{quote}&rdquo;
            </p>
          )}
        </div>
      </div>
    )
  }

  if (layout === "right") {
    return (
      <div
        id={id}
        className={`py-10 md:py-14 px-4 transition-all duration-1000 ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-8 md:gap-12 flex-row-reverse">
          <div className="relative w-56 md:w-80 h-72 md:h-96 shrink-0 rounded-2xl overflow-hidden shadow-lg">
            <Image src={src} alt={alt} fill className="object-cover" />
          </div>
          {quote && (
            <p className="font-playfair text-primary/70 text-xl md:text-2xl italic leading-relaxed text-right">
              &ldquo;{quote}&rdquo;
            </p>
          )}
        </div>
      </div>
    )
  }

  // center
  return (
    <div
      id={id}
      className={`py-10 md:py-14 px-4 transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="max-w-lg mx-auto">
        <div className="relative w-full h-80 md:h-[420px] rounded-2xl overflow-hidden shadow-lg">
          <Image src={src} alt={alt} fill className="object-cover hover:scale-105 transition-transform duration-700" />
        </div>
        {quote && (
          <p className="font-playfair text-primary/60 text-lg italic text-center mt-4">
            &ldquo;{quote}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
