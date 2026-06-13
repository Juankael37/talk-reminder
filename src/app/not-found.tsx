import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-md w-full rounded-2xl shadow-xl p-8 border bg-white border-gray-100 text-center">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">404</h1>
        <p className="mb-6 text-gray-600">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-block w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
