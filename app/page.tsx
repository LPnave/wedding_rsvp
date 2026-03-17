import { HeroSection } from "@/components/hero-section"
import { CeremonyDetails } from "@/components/ceremony-details"
import { VenueSection } from "@/components/venue-section"
import { RSVPForm } from "@/components/rsvp-form"
import { FooterSection } from "@/components/footer-section"
import { DecorativeElements } from "@/components/decorative-elements"

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <DecorativeElements />

      {/* Hero Section */}
      <HeroSection />

      {/* Ceremony Section */}
      <CeremonyDetails />

      {/* Venue Section */}
      <VenueSection />

      {/* RSVP Section */}
      <RSVPForm />

      {/* Footer Section */}
      <FooterSection />
    </main>
  )
}
