'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'

interface Talk {
  id: string
  speaker_name: string
  talk_title: string | null
  talk_date: string
  speaker_email: string | null
  created_at: string
  reminder_rules?: ReminderRule[]
}

interface ReminderRule {
  id: string
  offset_label: string
  is_sent: boolean
}

export default function DashboardPage() {
  const [talks, setTalks] = useState<Talk[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [runningCheck, setRunningCheck] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const { theme, toggleTheme } = useTheme()

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  useEffect(() => {
    fetchTalks()
  }, [])

  const fetchTalks = async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: talksData, error } = await supabase
      .from('talks')
      .select('*')
      .eq('user_id', user.id)
      .order('talk_date', { ascending: true })

    if (talksData) {
      const talksWithRules = await Promise.all(
        talksData.map(async (talk) => {
          const { data: rules } = await supabase
            .from('reminder_rules')
            .select('id, offset_label, is_sent')
            .eq('talk_id', talk.id)
          return { ...talk, reminder_rules: rules || [] }
        })
      )
      setTalks(talksWithRules)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await getSupabase().auth.signOut()
    router.push('/login')
  }

  const runCheck = async () => {
    setRunningCheck(true)
    setSidebarOpen(false)
    try {
      const response = await fetch('/api/check-reminders', { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        fetchTalks()
        alert(`Check complete: ${data.sent || 0} reminders processed`)
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to run check')
    }
    setRunningCheck(false)
  }

  const pendingCount = talks.reduce((acc, talk) => {
    const pending = talk.reminder_rules?.filter((r) => !r.is_sent).length || 0
    return acc + pending
  }, 0)

  const sentCount = talks.reduce((acc, talk) => {
    const sent = talk.reminder_rules?.filter((r) => r.is_sent).length || 0
    return acc + sent
  }, 0)

  const upcomingTalks = talks.filter(t => new Date(t.talk_date) > new Date())

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days < 0) return 'Past'
    return `${days} days away`
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'
      }`}>
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  const bgMain = theme === 'dark' 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
    : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'
  const bgCard = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const bgCardHover = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50/50'
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
  const textMuted = theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
  const inputBg = theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50/50 border-gray-200 text-gray-900'

  return (
    <div className={`min-h-screen ${bgMain}`}>
      <header className={`${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-md ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className={`w-6 h-6 ${textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">M</span>
                </div>
                <span className={`text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent ${theme === 'dark' ? 'text-white' : ''}`}>
                  Mate Reminder
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'}`}
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
                onClick={handleLogout}
                className={`text-sm transition flex items-center gap-2 ${textSecondary} hover:text-red-500`}
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
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 ${bgCard} shadow-2xl transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className={`p-6 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${textPrimary}`}>Quick Actions</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-1 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <svg className={`w-5 h-5 ${textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6">
              <div>
                <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Statistics</h3>
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gradient-to-r from-indigo-50 to-indigo-100'}`}>
                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Total Talks</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>{talks.length}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gradient-to-r from-amber-50 to-amber-100'}`}>
                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>Pending Reminders</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>{pendingCount}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gradient-to-r from-emerald-50 to-emerald-100'}`}>
                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Sent Reminders</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>{sentCount}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Utilities</h3>
                <button
                  onClick={runCheck}
                  disabled={runningCheck}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className={`w-5 h-5 ${runningCheck ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {runningCheck ? 'Running...' : 'Run Reminder Check'}
                </button>
              </div>

              {upcomingTalks.length > 0 && (
                <div>
                  <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Upcoming</h3>
                  <div className="space-y-2">
                    {upcomingTalks.slice(0, 3).map((talk) => (
                      <div key={talk.id} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className={`font-medium text-sm truncate ${textPrimary}`}>{talk.speaker_name}</p>
                        <p className={`text-xs ${textSecondary}`}>{getRelativeTime(talk.talk_date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${textPrimary}`}>Dashboard</h1>
            <p className={`mt-1 ${textSecondary}`}>Manage your talk reminders</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className={`${bgCard} rounded-2xl p-6 shadow-sm border ${borderColor} hover:shadow-md transition`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${textSecondary}`}>Total Talks</p>
                  <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>{talks.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={`${bgCard} rounded-2xl p-6 shadow-sm border ${borderColor} hover:shadow-md transition`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${textSecondary}`}>Pending</p>
                  <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>{pendingCount}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={`${bgCard} rounded-2xl p-6 shadow-sm border ${borderColor} hover:shadow-md transition`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${textSecondary}`}>Sent</p>
                  <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{sentCount}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto mb-8 py-4 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Talk
          </button>

          {talks.length === 0 ? (
            <div className={`${bgCard} rounded-2xl p-12 text-center shadow-sm border ${borderColor}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <svg className={`w-8 h-8 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>No talks yet</h3>
              <p className={`mb-6 ${textSecondary}`}>Create your first talk to start scheduling reminders</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-indigo-600 font-medium hover:text-indigo-700 transition"
              >
                Add your first talk
              </button>
            </div>
          ) : (
            <div className={`${bgCard} rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50/50'}>
                    <tr>
                      <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Speaker</th>
                      <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Talk</th>
                      <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Date & Time</th>
                      <th className={`text-left text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Status</th>
                      <th className={`text-right text-xs font-semibold ${textMuted} uppercase tracking-wider p-4`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderColor}`}>
                    {talks.map((talk) => (
                      <tr key={talk.id} className={`hover:${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50/50'} transition`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {talk.speaker_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium ${textPrimary}`}>{talk.speaker_name}</p>
                              <p className={`text-sm ${textSecondary}`}>{talk.speaker_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className={`font-medium ${textPrimary}`}>{talk.talk_title || '—'}</p>
                        </td>
                        <td className="p-4">
                          <p className={`font-medium ${textPrimary}`}>{formatDate(talk.talk_date)}</p>
                          <p className={`text-sm ${textSecondary}`}>{formatTime(talk.talk_date)}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {talk.reminder_rules?.map((rule) => (
                              <span
                                key={rule.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                                  rule.is_sent
                                    ? theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                    : theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {rule.is_sent ? (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                )}
                                {rule.offset_label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => deleteTalk(talk.id)}
                            className={`text-sm px-3 py-1.5 rounded-lg transition ${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' : 'text-red-500 hover:text-red-600 hover:bg-red-50'}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {showAddModal && (
        <AddTalkModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchTalks}
          theme={theme}
        />
      )}
    </div>
  )
}

function AddTalkModal({
  onClose,
  onSuccess,
  theme,
}: {
  onClose: () => void
  onSuccess: () => void
  theme: 'light' | 'dark'
}) {
  const [speakerName, setSpeakerName] = useState('')
  const [talkTitle, setTalkTitle] = useState('')
  const [speakerEmail, setSpeakerEmail] = useState('')
  const [talkDate, setTalkDate] = useState('')
  const [talkTime, setTalkTime] = useState('')
  const [offsets, setOffsets] = useState({
    oneWeek: true,
    oneDay: true,
    custom: false,
    customValue: 2,
    customUnit: 'hours',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const bgCard = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  const inputBg = theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50/50 border-gray-200 text-gray-900'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const talkDateTime = new Date(`${talkDate}T${talkTime}`)
      const talkDateTimeISO = talkDateTime.toISOString()

      const { data: talk, error: talkError } = await supabase
        .from('talks')
        .insert({
          user_id: user.id,
          speaker_name: speakerName,
          talk_title: talkTitle || null,
          talk_date: talkDateTimeISO,
          speaker_email: speakerEmail,
        })
        .select()
        .single()

      if (talkError) throw new Error(talkError.message)
      if (!talk) throw new Error('Failed to create talk')

      const rules = []
      if (offsets.oneWeek) {
        const oneWeekBefore = new Date(talkDateTime)
        oneWeekBefore.setDate(oneWeekBefore.getDate() - 7)
        rules.push({
          talk_id: talk.id,
          offset_label: '1 week',
          offset_interval: '7 days',
          scheduled_time: oneWeekBefore.toISOString(),
        })
      }
      if (offsets.oneDay) {
        const oneDayBefore = new Date(talkDateTime)
        oneDayBefore.setDate(oneDayBefore.getDate() - 1)
        rules.push({
          talk_id: talk.id,
          offset_label: '1 day',
          offset_interval: '1 day',
          scheduled_time: oneDayBefore.toISOString(),
        })
      }
      if (offsets.custom) {
        const customBefore = new Date(talkDateTime)
        const value = offsets.customValue
        const unit = offsets.customUnit
        if (unit === 'hours') {
          customBefore.setHours(customBefore.getHours() - value)
        } else if (unit === 'days') {
          customBefore.setDate(customBefore.getDate() - value)
        }
        rules.push({
          talk_id: talk.id,
          offset_label: `${value} ${unit}`,
          offset_interval: `${value} ${unit}`,
          scheduled_time: customBefore.toISOString(),
        })
      }

      if (rules.length > 0) {
        const { error: rulesError } = await supabase
          .from('reminder_rules')
          .insert(rules)
        if (rulesError) throw rulesError
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`${bgCard} rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border`}>
        <div className={`p-6 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${textPrimary}`}>Add New Talk</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <svg className={`w-5 h-5 ${textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
              Speaker Name *
            </label>
            <input
              type="text"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition ${inputBg}`}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
              Talk Title
            </label>
            <input
              type="text"
              value={talkTitle}
              onChange={(e) => setTalkTitle(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition ${inputBg}`}
              placeholder="Topic of the talk"
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
              Speaker Email *
            </label>
            <input
              type="email"
              value={speakerEmail}
              onChange={(e) => setSpeakerEmail(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition ${inputBg}`}
              placeholder="speaker@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
                Date *
              </label>
              <input
                type="date"
                value={talkDate}
                onChange={(e) => setTalkDate(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition ${inputBg}`}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
                Time *
              </label>
              <input
                type="time"
                value={talkTime}
                onChange={(e) => setTalkTime(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition ${inputBg}`}
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-3 ${textSecondary}`}>
              Reminder Offsets
            </label>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={offsets.oneWeek}
                  onChange={(e) => setOffsets({ ...offsets, oneWeek: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className={`text-sm font-medium ${textSecondary}`}>1 week before</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={offsets.oneDay}
                  onChange={(e) => setOffsets({ ...offsets, oneDay: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className={`text-sm font-medium ${textSecondary}`}>1 day before</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={offsets.custom}
                  onChange={(e) => setOffsets({ ...offsets, custom: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className={`text-sm font-medium ${textSecondary}`}>Custom:</span>
                {offsets.custom && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={offsets.customValue}
                      onChange={(e) => setOffsets({ ...offsets, customValue: parseInt(e.target.value) || 1 })}
                      className={`w-16 px-2 py-1 border rounded-lg text-sm ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`}
                    />
                    <select
                      value={offsets.customUnit}
                      onChange={(e) => setOffsets({ ...offsets, customUnit: e.target.value })}
                      className={`px-2 py-1 border rounded-lg text-sm ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`}
                    >
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                    <span className={`text-sm ${textSecondary}`}>before</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 border font-medium rounded-xl transition ${theme === 'dark' ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Talk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

async function deleteTalk(talkId: string) {
  if (confirm('Are you sure you want to delete this talk?')) {
    const supabase = createClient()
    const { error } = await supabase.from('talks').delete().eq('id', talkId)
    if (!error) {
      window.location.reload()
    }
  }
}