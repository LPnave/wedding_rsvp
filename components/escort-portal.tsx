"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, ScanLine, X } from "lucide-react"

interface GuestResult {
  code: string
  family_name: string
  max_guests: number
  table_number: string | null
  confirmed_guests: number
}

export function EscortPortal() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GuestResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()

  const lookup = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    setResults(null)

    const res = await fetch(`/api/escort/lookup?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      setResults(data)
      if (data.length === 0) setError("No guest found.")
    } else {
      setError("Lookup failed. Please try again.")
    }
    setLoading(false)
  }, [])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  const startCamera = async () => {
    setCameraError(null)
    setResults(null)
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      setScanning(true)
    } catch {
      setCameraError("Camera access denied. Please allow camera permission and try again.")
    }
  }

  // Attach stream to video element once scanning starts
  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return
    videoRef.current.srcObject = streamRef.current
    videoRef.current.play()
  }, [scanning])

  // QR decode loop
  const tick = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tick)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const jsQR = (await import("jsqr")).default
    const code = jsQR(imageData.data, canvas.width, canvas.height)

    if (code) {
      stopCamera()
      // Extract invite code from URL or use raw data directly
      let inviteCode = code.data
      try {
        const url = new URL(code.data)
        const param = url.searchParams.get("invite")
        if (param) inviteCode = param
      } catch {
        // not a URL, use raw value
      }
      setQuery(inviteCode)
      lookup(inviteCode)
      return
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [stopCamera, lookup])

  useEffect(() => {
    if (scanning) {
      animFrameRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [scanning, tick])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    lookup(q)
  }

  const handleLogout = async () => {
    await fetch("/api/escort/auth", { method: "DELETE" })
    router.push("/escort/login")
  }

  const handleClear = () => {
    setQuery("")
    setResults(null)
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl text-primary">Escort Portal</h1>
          <p className="text-sm text-muted-foreground">Pabasara &amp; Lahiru — 31 July 2026</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-cream transition-smooth"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-6">
        {/* Camera scanner */}
        {scanning ? (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-white/40" />
                  </div>
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-smooth"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Point the camera at the guest&apos;s QR code
            </p>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : (
          <>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or invite code..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                {loading ? "..." : "Find"}
              </button>
              <button
                type="button"
                onClick={startCamera}
                title="Scan QR code"
                className="px-4 py-3 rounded-xl border border-border text-primary hover:bg-cream transition-smooth"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            </form>

            {cameraError && (
              <p className="text-sm text-center text-red-500">{cameraError}</p>
            )}
          </>
        )}

        {error && !scanning && (
          <p className="text-sm text-center text-muted-foreground">{error}</p>
        )}

        {loading && (
          <p className="text-sm text-center text-muted-foreground">Looking up guest...</p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            {results.map((guest) => (
              <div
                key={guest.code}
                className="bg-white rounded-2xl border border-border p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-playfair text-xl text-primary">{guest.family_name}</h2>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{guest.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Guests</p>
                    <p className="text-lg font-semibold text-primary">
                      {Number(guest.confirmed_guests) > 0 ? guest.confirmed_guests : guest.max_guests}
                    </p>
                  </div>
                </div>

                {guest.table_number ? (
                  <div className="bg-cream rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Table Number</p>
                    <p className="font-playfair text-6xl text-primary">{guest.table_number}</p>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-amber-700">Table not assigned yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {results && results.length > 0 && (
          <div className="text-center">
            <button
              onClick={handleClear}
              className="text-sm text-muted-foreground hover:text-primary transition-smooth"
            >
              Search again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
