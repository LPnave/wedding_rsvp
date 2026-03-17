"use client"

import type React from "react"

import { useState } from "react"

interface FormData {
  name: string
  attendance: string
}

export function RSVPForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    attendance: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, attending: formData.attendance }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Something went wrong")
      }

      setSubmitted(true)
      setTimeout(() => {
        setFormData({ name: "", attendance: "" })
        setSubmitted(false)
      }, 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-16 md:py-24 px-4 bg-cream">
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
          @keyframes successPulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          .success-pulse {
            animation: successPulse 0.6s ease-out;
          }
          @keyframes inputFocus {
            from {
              box-shadow: 0 0 0 0 rgba(212, 175, 142, 0.1);
            }
            to {
              box-shadow: 0 0 0 3px rgba(212, 175, 142, 0.2);
            }
          }
          .input-focus:focus {
            animation: inputFocus 0.3s ease-out;
          }
        `}</style>

        <div className="text-center space-y-2 mb-10">
          <h2 className="font-playfair text-4xl md:text-5xl text-primary">RSVP</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 max-w-32 h-px bg-accent" />
            <svg className="w-4 h-4 text-accent animate-float" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 1a9 9 0 100 18 9 9 0 000-18zM9 5h2v2H9V5zm0 4h2v6H9V9z" />
            </svg>
            <div className="flex-1 max-w-32 h-px bg-accent" />
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="slide-up">
            <div className="bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border space-y-6 hover-lift transition-smooth-slow">
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="input-focus w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-smooth"
                />
              </div>

              {/* Attendance Confirmation */}
              <div>
                <label className="block text-sm font-medium text-primary mb-3">Will you be able to join us?</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, attendance: "yes" }))}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-smooth border-2 ${
                      formData.attendance === "yes"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-primary border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    Yes, I will attend
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, attendance: "no" }))}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-smooth border-2 ${
                      formData.attendance === "no"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-primary border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    No, I cannot attend
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-center text-red-500">{error}</p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
              >
                {isSubmitting ? "Submitting..." : "Submit RSVP"}
              </button>

              <p className="text-sm text-center text-muted-foreground">
                We appreciate your response and look forward to celebrating with you!
              </p>
            </div>
          </form>
        ) : (
          <div
            className={`bg-white rounded-lg p-8 md:p-10 shadow-sm border border-border text-center space-y-4 success-pulse hover-lift transition-smooth`}
          >
            <svg className="w-16 h-16 text-accent mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="font-playfair text-2xl md:text-3xl text-primary">Thank you for sharing in our joy</h3>
            <p className="text-primary/70 elegant-text">
              We have received your RSVP and truly appreciate your response.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
