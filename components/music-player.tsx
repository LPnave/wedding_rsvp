"use client"

import { useRef, useState, useEffect } from "react"

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    const handleScroll = async () => {
      if (!hasStartedRef.current && audioRef.current) {
        hasStartedRef.current = true
        try {
          audioRef.current.volume = 0.3
          audioRef.current.muted = false
          await audioRef.current.play()
          setIsPlaying(true)
        } catch (error) {
          console.log("[v0] Autoplay on scroll failed")
        }
        // Remove listener after first scroll
        window.removeEventListener("scroll", handleScroll)
      }
    }

    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [])

  const toggleMusic = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }

  return (
    <>
      <audio ref={audioRef} loop src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Better%20Together%20compressed-vnhWew1MA4iYz2mZmFbgdFqGqP36tM.mp3" />

      <button
        onClick={toggleMusic}
        className="fixed left-6 bottom-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-transparent hover:bg-black/10 text-foreground shadow-lg transition-colors"
        aria-label={isPlaying ? "Pause music" : "Play music"}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.75 1.5a.5.5 0 00-.5.5v16a.5.5 0 001 0V2a.5.5 0 00-.5-.5zm8.5 0a.5.5 0 00-.5.5v16a.5.5 0 001 0V2a.5.5 0 00-.5-.5z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </button>
    </>
  )
}
