'use client'

import { useState, useEffect } from 'react'

export function BetaBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem('beta-banner-dismissed') === 'true')
  }, [])

  const dismiss = () => {
    localStorage.setItem('beta-banner-dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="relative bg-[#FF6B00] px-4 py-2.5 text-center">
      <p className="text-sm font-medium text-[#0F0F0F]">
        Talk Reminder is in active beta — fully working, free to use, and being improved weekly.
      </p>
      <button
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#0F0F0F]/60 hover:text-[#0F0F0F] transition-colors"
        aria-label="Dismiss banner"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
