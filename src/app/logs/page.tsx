'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { TextLogo } from '@/components/TextLogo'
import { resolveTz } from '@/lib/datetime'

interface LogRow {
  id: string
  rule_id: string
  status: 'success' | 'failed' | 'skipped'
  error_message: string | null
  channel: string | null
  recipient: string | null
  kind: string | null
  created_at: string
  organizer_notified_at: string | null
  reminder_rules: {
    id: string
    offset_label: string
    scheduled_time: string
    talks: {
      id: string
      speaker_name: string
      talk_title: string | null
      talk_date: string
    } | null
  } | null
}

type FilterType = 'all' | 'failed' | 'success' | 'skipped'
const PAGE_SIZE = 20

export default function LogsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900'
        : 'bg-gradient-to-br from-orange-50 via-white to-orange-50'
    }`}>
      <header className={`${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-md ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label="Open menu"
              >
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <TextLogo size="md" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'}`}
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className={`text-sm transition flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:text-red-500`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-2xl transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className={`p-6 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} border-b`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Navigation</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-1 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  aria-label="Close menu"
                >
                  <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 space-y-3">
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push('/dashboard')
                }}
                className={`w-full text-left py-3 px-4 rounded-xl transition flex items-center gap-3 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium">Dashboard</span>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`w-full text-left py-3 px-4 rounded-xl transition flex items-center gap-3 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-orange-50 text-orange-700'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="font-medium">Reminder Logs</span>
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reminder Logs</h1>
              <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Track every send attempt. Failed logs are emailed to you automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`inline-flex rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} overflow-hidden`}>
                {(['all', 'failed', 'success'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setPage(0)
                      setFilter(f)
                    }}
                    className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                      filter === f
                        ? theme === 'dark'
                          ? 'bg-orange-600 text-white'
                          : 'bg-orange-500 text-white'
                        : theme === 'dark'
                          ? 'text-gray-400 hover:bg-gray-700'
                          : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <LogsContent key={`${filter}-${page}`} filter={filter} page={page} setPage={setPage} />
        </main>
      </div>
    </div>
  )
}

function LogsContent({
  filter,
  page,
  setPage,
}: {
  filter: FilterType
  page: number
  setPage: (n: number) => void
}) {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const router = useRouter()
  const { theme } = useTheme()

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let query = supabase
        .from('reminder_logs')
        .select(
          '*, reminder_rules(id, offset_label, scheduled_time, talks(id, speaker_name, talk_title, talk_date))',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (!error && data) {
        setLogs(data as LogRow[])
        setHasMore((count ?? 0) > to + 1)
        setTotalCount(count ?? 0)
      }
      setLoading(false)
    }
    loadLogs()
  }, [])

  const failedCount = logs.filter((l) => l.status === 'failed').length
  const successCount = logs.filter((l) => l.status === 'success').length

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: resolveTz(),
    })

  const bgCard = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
  const textMuted = theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-100'

  const statusBadge = (status: LogRow['status']) => {
    if (status === 'success') {
      return theme === 'dark'
        ? 'bg-emerald-900/30 text-emerald-400'
        : 'bg-emerald-100 text-emerald-700'
    }
    if (status === 'failed') {
      return theme === 'dark'
        ? 'bg-red-900/30 text-red-400'
        : 'bg-red-100 text-red-700'
    }
    return theme === 'dark'
      ? 'bg-gray-700 text-gray-300'
      : 'bg-gray-200 text-gray-700'
  }

  const channelLabel = (ch: string | null) => {
    if (ch === 'email') return 'Email'
    if (ch === 'messenger') return 'Messenger'
    if (ch === 'telegram') return 'Telegram'
    return ch || '—'
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`${bgCard} rounded-2xl p-4 shadow-sm border ${borderColor}`}>
          <p className={`text-xs font-medium ${textSecondary} uppercase tracking-wider`}>Total Logs</p>
          <p className={`text-2xl font-bold mt-1 ${textPrimary}`}>{totalCount}</p>
        </div>
        <div className={`${bgCard} rounded-2xl p-4 shadow-sm border ${borderColor}`}>
          <p className={`text-xs font-medium ${textSecondary} uppercase tracking-wider`}>Successful</p>
          <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{successCount}</p>
        </div>
        <div className={`${bgCard} rounded-2xl p-4 shadow-sm border ${borderColor}`}>
          <p className={`text-xs font-medium ${textSecondary} uppercase tracking-wider`}>Failed (page)</p>
          <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{failedCount}</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className={`${bgCard} rounded-2xl p-12 text-center shadow-sm border ${borderColor}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <svg className={`w-8 h-8 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>No logs yet</h3>
          <p className={textSecondary}>
            {filter === 'failed'
              ? 'No failed reminders. Nice!'
              : 'Logs appear here once reminders start firing.'}
          </p>
        </div>
      ) : (
        <>
          <div className={`hidden md:block ${bgCard} rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50/50'}>
                  <tr>
                    <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>When</th>
                    <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Talk</th>
                    <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Offset</th>
                    <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Channel</th>
                    <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Status</th>
                    <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Detail</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                  {logs.map((log) => (
                    <tr key={log.id} className={theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50/50'}>
                      <td className={`p-4 text-sm ${textSecondary} whitespace-nowrap`}>{formatDate(log.created_at)}</td>
                      <td className="p-4">
                        <p className={`font-medium ${textPrimary}`}>{log.reminder_rules?.talks?.speaker_name ?? '—'}</p>
                        <p className={`text-xs ${textMuted}`}>{log.reminder_rules?.talks?.talk_title ?? ''}</p>
                      </td>
                      <td className={`p-4 text-sm ${textPrimary}`}>{log.reminder_rules?.offset_label ?? '—'}</td>
                      <td className={`p-4 text-sm ${textPrimary}`}>{channelLabel(log.channel)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className={`p-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {log.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div key={log.id} className={`${bgCard} rounded-2xl p-4 shadow-sm border ${borderColor}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${textPrimary}`}>
                      {log.reminder_rules?.talks?.speaker_name ?? '—'}
                    </p>
                    <p className={`text-xs ${textMuted}`}>{formatDate(log.created_at)}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge(log.status)}`}>
                    {log.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                    {channelLabel(log.channel)}
                  </span>
                  <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                    {log.reminder_rules?.offset_label ?? '—'}
                  </span>
                </div>
                {log.error_message && (
                  <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {log.error_message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${page === 0 ? 'opacity-40 cursor-not-allowed' : ''} ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              ← Previous
            </button>
            <span className={`text-sm ${textSecondary}`}>Page {page + 1}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasMore}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!hasMore ? 'opacity-40 cursor-not-allowed' : ''} ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </>
  )
}