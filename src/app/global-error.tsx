'use client'

import { useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { theme } = useTheme()

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.error(error)
    }
  }, [error])

  const bg = theme === 'dark' ? 'bg-gray-900' : 'bg-orange-50'
  const card = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const text = theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
  const muted = theme === 'dark' ? 'text-gray-400' : 'text-gray-600'

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bg}`}>
      <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 border ${card}`}>
        <h1 className={`text-2xl font-bold mb-2 ${text}`}>Something went wrong</h1>
        <p className={`mb-6 ${muted}`}>
          An unexpected error occurred. The team has been notified.
        </p>
        <button
          onClick={reset}
          className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
