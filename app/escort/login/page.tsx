"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function EscortLoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/escort/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push("/escort")
    } else {
      const data = await res.json()
      setError(data.error ?? "Invalid password")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-playfair text-2xl text-primary">Escort Portal</h1>
          <p className="text-sm text-muted-foreground">Pabasara & Lahiru — 31 July 2026</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-smooth disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}
