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
      <CountdownSection />

      {/* RSVP Section */}
      <RSVPForm />

      {/* Footer Section */}
      <FooterSection />

      {/* Bottom navigation — hidden during hero section */}
      <BottomNav />
    </main>
  )
}
