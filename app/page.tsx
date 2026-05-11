import { Suspense } from "react"
import { HeroSection } from "@/components/hero-section"
import { CeremonyDetails } from "@/components/ceremony-details"
import { VenueSection } from "@/components/venue-section"
import { RSVPForm } from "@/components/rsvp-form"
import { CountdownSection } from "@/components/countdown-section"
import { FooterSection } from "@/components/footer-section"
import { DecorativeElements } from "@/components/decorative-elements"
import { BottomNav } from "@/components/bottom-nav"

export default function Home() {
  return (
    <main className="overflow-x-hidden pb-24">
      <DecorativeElements />

      {/* Hero Section */}
      <HeroSection />

      {/* Ceremony Section */}
      <CeremonyDetails />

      {/* Venue Section */}
      <VenueSection />

      {/* Countdown Section */}
      <Suspense fallback={<div className="py-20" />}>
        <CountdownSection />
      </Suspense>

      {/* RSVP Section */}
      <Suspense fallback={<div className="py-24 text-center text-muted-foreground text-sm">Loading...</div>}>
        <RSVPForm />
      </Suspense>

      {/* Footer Section */}
      <Suspense fallback={<div className="py-16" />}>
        <FooterSection />
      </Suspense>

      {/* Bottom navigation — hidden during hero section */}
      <BottomNav />
    </main>
  )
}
