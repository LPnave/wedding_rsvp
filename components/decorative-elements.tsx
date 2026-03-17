"use client"

export function DecorativeElements() {
  return (
    <>
      {/* Top Decorative Element */}
      <svg
        className="fixed top-6 right-6 w-24 h-24 text-primary/5 pointer-events-none animate-float-slow"
        fill="currentColor"
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <path d="M50 10 L75 25 L75 75 L50 90 L25 75 L25 25 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      {/* Bottom Decorative Element */}
      <svg
        className="fixed bottom-6 left-6 w-32 h-32 text-primary/5 pointer-events-none animate-float"
        fill="currentColor"
        viewBox="0 0 100 100"
      >
        {/* Lotus flower pattern */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            <ellipse cx="50" cy="20" rx="8" ry="12" fill="currentColor" opacity="0.3" />
          </g>
        ))}
        <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.4" />
      </svg>
    </>
  )
}
