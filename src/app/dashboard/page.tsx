'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { TextLogo } from '@/components/TextLogo'
import { parseInTz, offsetDate, resolveTz } from '@/lib/datetime'

interface Talk {
  id: string
  speaker_name: string
  talk_title: string | null
  talk_date: string
  speaker_email: string | null
  notification_channel: string
  messenger_opted_in: boolean
  telegram_opted_in: boolean
  created_at: string
  reminder_rules?: ReminderRule[]
}

interface ReminderRule {
  id: string
  offset_label: string
  is_sent: boolean
  scheduled_time?: string
}

type ToastVariant = 'success' | 'error' | 'info'

interface ToastState {
  id: number
  message: string
  variant: ToastVariant
}

export default function DashboardPage() {
  const [talks, setTalks] = useState<Talk[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [runningCheck, setRunningCheck] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    body: string
    confirmLabel: string
    danger: boolean
    onConfirm: () => void
  } | null>(null)
  const [talkToDelete, setTalkToDelete] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const { theme, toggleTheme } = useTheme()

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    setToast({ id: Date.now(), message, variant })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchUserEmail = async () => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (user?.email) setUserEmail(user.email)
  }

  const fetchTalks = async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: talksData, error } = await supabase
      .from('talks')
      .select('*, reminder_rules(*)')
      .eq('user_id', user.id)
      .order('talk_date', { ascending: true })

    if (talksData) {
      setTalks(talksData)
    }
    if (error) {
      showToast('Failed to load talks', 'error')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTalks()
    fetchUserEmail()
  }, [])

  const handleLogout = async () => {
    setSettingsOpen(false)
    await getSupabase().auth.signOut()
    router.push('/login')
  }

  const runCheck = async () => {
    setRunningCheck(true)
    setSidebarOpen(false)
    try {
      const { data } = await getSupabase().auth.getSession()
      const token = data.session?.access_token
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch('/api/check-reminders', {
        method: 'POST',
        headers,
      })
      const responseData = await response.json()
      if (response.ok) {
        await fetchTalks()
        const sent = responseData.sent ?? 0
        const failed = responseData.failed ?? 0
        if (failed > 0) {
          showToast(
            `Check complete: ${sent} sent, ${failed} failed. See Logs.`,
            'error'
          )
        } else if (sent > 0) {
          showToast(`Check complete: ${sent} reminder${sent === 1 ? '' : 's'} sent.`, 'success')
        } else {
          showToast('No reminders due right now.', 'info')
        }
      } else {
        showToast(responseData.error || 'Failed to run check', 'error')
      }
    } catch {
      showToast('Failed to run check', 'error')
    }
    setRunningCheck(false)
  }

  const onDeleteTalk = (talkId: string) => {
    setTalkToDelete(talkId)
  }

  const confirmDeleteTalk = async () => {
    if (!talkToDelete) return
    const id = talkToDelete
    setTalkToDelete(null)
    const { error } = await getSupabase().from('talks').delete().eq('id', id)
    if (error) {
      showToast('Failed to delete talk', 'error')
      return
    }
    showToast('Talk deleted', 'success')
    setTalks((prev) => prev.filter((t) => t.id !== id))
  }

  const onDeleteAccount = () => {
    setSettingsOpen(false)
    setConfirmState({
      open: true,
      title: 'Delete your account?',
      body: 'This permanently deletes your account, talks, reminders, and logs. This action cannot be undone.',
      confirmLabel: 'Delete account',
      danger: true,
      onConfirm: async () => {
        setConfirmState(null)
        try {
          const { data } = await getSupabase().auth.getSession()
          const token = data.session?.access_token
          if (!token) throw new Error('Not authenticated')
          const res = await fetch('/api/delete-account', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) throw new Error('Failed to delete account')
          showToast('Account deleted', 'success')
          await getSupabase().auth.signOut()
          router.push('/login')
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Failed to delete account', 'error')
        }
      },
    })
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
      timeZone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
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
          ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900'
          : 'bg-gradient-to-br from-orange-50 via-white to-orange-50'
      }`}>
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  const bgMain = theme === 'dark'
    ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900'
    : 'bg-gradient-to-br from-orange-50 via-white to-orange-50'
  const bgCard = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
  const textMuted = theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-100'

  return (
    <div className={`min-h-screen ${bgMain}`}>
      <header className={`${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-md ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label="Open menu"
              >
                <svg className={`w-6 h-6 ${textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                onClick={() => setSettingsOpen(true)}
                className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                aria-label="Open settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
                  aria-label="Close menu"
                >
                  <svg className={`w-5 h-5 ${textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div>
                <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Statistics</h3>
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gradient-to-r from-orange-50 to-orange-100'}`}>
                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>Total Talks</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>{talks.length}</p>
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
                  className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-600 text-white font-medium rounded-xl hover:from-orange-700 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className={`w-5 h-5 ${runningCheck ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {runningCheck ? 'Running...' : 'Run Reminder Check'}
                </button>
              </div>

              <div>
                <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Navigate</h3>
                <button
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/logs')
                  }}
                  className={`w-full py-3 px-4 rounded-xl transition flex items-center gap-2 ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Reminder Logs
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
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${textPrimary}`}>Dashboard</h1>
              <p className={`mt-1 ${textSecondary}`}>Manage your talk reminders</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-orange-600 to-orange-600 text-white font-semibold rounded-2xl hover:from-orange-700 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Talk
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className={`${bgCard} rounded-2xl p-6 shadow-sm border ${borderColor} hover:shadow-md transition`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${textSecondary}`}>Total Talks</p>
                  <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>{talks.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="text-orange-600 font-medium hover:text-orange-700 transition"
              >
                Add your first talk
              </button>
            </div>
          ) : (
            <>
              <div className={`hidden md:block ${bgCard} rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
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
                        <tr key={talk.id} className={`${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50/50'} transition`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                {talk.speaker_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={`font-medium truncate ${textPrimary}`}>{talk.speaker_name}</p>
                                <p className={`text-sm truncate ${textSecondary}`}>{talk.speaker_email}</p>
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    talk.notification_channel === 'messenger'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                      : talk.notification_channel === 'telegram'
                                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {talk.notification_channel === 'messenger' ? 'Messenger' : talk.notification_channel === 'telegram' ? 'Telegram' : 'Email'}
                                  </span>
                                  {talk.notification_channel === 'messenger' && !talk.messenger_opted_in && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Opt-in</span>
                                  )}
                                  {talk.notification_channel === 'telegram' && !talk.telegram_opted_in && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Opt-in</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={`p-4 font-medium ${textPrimary}`}>{talk.talk_title || '—'}</td>
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
                              onClick={() => onDeleteTalk(talk.id)}
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

              <div className="md:hidden space-y-3">
                {talks.map((talk) => (
                  <div key={talk.id} className={`${bgCard} rounded-2xl p-4 shadow-sm border ${borderColor}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {talk.speaker_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold truncate ${textPrimary}`}>{talk.speaker_name}</p>
                        <p className={`text-xs truncate ${textSecondary}`}>{talk.speaker_email}</p>
                      </div>
                      <button
                        onClick={() => onDeleteTalk(talk.id)}
                        className={`p-2 rounded-lg transition ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}`}
                        aria-label="Delete talk"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {talk.talk_title && (
                      <p className={`mt-2 text-sm font-medium ${textPrimary}`}>{talk.talk_title}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                      <span className={`${textSecondary}`}>
                        {formatDate(talk.talk_date)} · {formatTime(talk.talk_date)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        talk.notification_channel === 'messenger'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : talk.notification_channel === 'telegram'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {talk.notification_channel === 'messenger' ? 'Messenger' : talk.notification_channel === 'telegram' ? 'Telegram' : 'Email'}
                      </span>
                      {talk.notification_channel === 'messenger' && !talk.messenger_opted_in && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Opt-in</span>
                      )}
                      {talk.notification_channel === 'telegram' && !talk.telegram_opted_in && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Opt-in</span>
                      )}
                    </div>
                    {talk.reminder_rules && talk.reminder_rules.length > 0 && (
                      <div className="mt-3 flex gap-1.5 flex-wrap">
                        {talk.reminder_rules.map((rule) => (
                          <span
                            key={rule.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                              rule.is_sent
                                ? theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                : theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {rule.is_sent ? '✓ ' : '○ '}
                            {rule.offset_label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {showAddModal && (
        <AddTalkModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchTalks()
            showToast('Talk created', 'success')
          }}
          theme={theme}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onLogout={handleLogout}
          onDeleteAccount={onDeleteAccount}
          userEmail={userEmail}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {confirmState?.open && (
        <ConfirmModal
          title={confirmState.title}
          body={confirmState.body}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onCancel={() => setConfirmState(null)}
          onConfirm={confirmState.onConfirm}
          theme={theme}
        />
      )}

      {talkToDelete && (
        <ConfirmModal
          title="Delete this talk?"
          body="This will remove the talk and all its scheduled reminders. This action cannot be undone."
          confirmLabel="Delete talk"
          danger
          onCancel={() => setTalkToDelete(null)}
          onConfirm={confirmDeleteTalk}
          theme={theme}
        />
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} theme={theme} />}
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
  const [notificationChannel, setNotificationChannel] = useState('email')
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

  const tz = typeof window !== 'undefined' ? resolveTz() : 'Asia/Manila'

  const bgCard = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  const inputBg = theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50/50 border-gray-200 text-gray-900'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const talkDateTime = parseInTz(talkDate, talkTime, tz)

      const { data: talk, error: talkError } = await supabase
        .from('talks')
        .insert({
          user_id: user.id,
          speaker_name: speakerName,
          talk_title: talkTitle || null,
          talk_date: talkDateTime.toISOString(),
          speaker_email: speakerEmail,
          notification_channel: notificationChannel,
        })
        .select()
        .single()

      if (talkError) throw new Error(talkError.message)
      if (!talk) throw new Error('Failed to create talk')

      const rules = []
      if (offsets.oneWeek) {
        const oneWeekBefore = offsetDate(talkDateTime, 7, 0)
        rules.push({
          talk_id: talk.id,
          offset_label: '1 week',
          offset_interval: '7 days',
          scheduled_time: oneWeekBefore.toISOString(),
        })
      }
      if (offsets.oneDay) {
        const oneDayBefore = offsetDate(talkDateTime, 1, 0)
        rules.push({
          talk_id: talk.id,
          offset_label: '1 day',
          offset_interval: '1 day',
          scheduled_time: oneDayBefore.toISOString(),
        })
      }
      if (offsets.custom) {
        const value = offsets.customValue
        const unit = offsets.customUnit
        let customBefore: Date
        if (unit === 'hours') {
          customBefore = offsetDate(talkDateTime, 0, value)
        } else {
          customBefore = offsetDate(talkDateTime, value, 0)
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className={`${bgCard} rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border`} onClick={(e) => e.stopPropagation()}>
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
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${inputBg}`}
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${inputBg}`}
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${inputBg}`}
              placeholder="speaker@example.com"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
              Notification Channel
            </label>
            <div className="flex gap-2 sm:gap-4 flex-wrap">
              <label className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${notificationChannel === 'email' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <input type="radio" name="channel" value="email" checked={notificationChannel === 'email'} onChange={(e) => setNotificationChannel(e.target.value)} className="hidden" />
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span className={`font-medium ${textPrimary}`}>Email</span>
              </label>
              <label className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${notificationChannel === 'messenger' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <input type="radio" name="channel" value="messenger" checked={notificationChannel === 'messenger'} onChange={(e) => setNotificationChannel(e.target.value)} className="hidden" />
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.9 1.442 5.485 3.708 7.151v3.298c0 .285.293.468.544.331l3.35-1.84c.767.21 1.573.32 2.398.32 5.523 0 10-4.145 10-9.259C22 6.145 17.523 2 12 2zm1.09 12.215l-2.656-2.83-5.18 2.83 5.67-6.024 2.684 2.848 5.143-2.848-5.661 6.024z"/></svg>
                <span className={`font-medium ${textPrimary}`}>Messenger</span>
              </label>
              <label className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${notificationChannel === 'telegram' ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <input type="radio" name="channel" value="telegram" checked={notificationChannel === 'telegram'} onChange={(e) => setNotificationChannel(e.target.value)} className="hidden" />
                <svg className="w-5 h-5 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.664l19.088-7.442c.523-.204.814.07.666.587l-5.632 19.646c-.149.52-.456.634-.698.397l-4.52-4.42-3.177 3.06a.71.71 0 0 1-.502.214l.445-5.91L18.42 5.093c.31-.274-.066-.425-.48-.148L5.12 13.01l-3.174-.995z"/></svg>
                <span className={`font-medium ${textPrimary}`}>Telegram</span>
              </label>
            </div>
            {notificationChannel === 'messenger' && (
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                <strong>Action Required:</strong> After saving, ask the speaker to send their email address to your Facebook Page in Messenger to opt-in.
              </p>
            )}
            {notificationChannel === 'telegram' && (
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
                <strong>Action Required:</strong> After saving, ask the speaker to send their email address to your Telegram Bot to opt-in.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
                Date * <span className={`text-xs font-normal ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>({tz})</span>
              </label>
              <input
                type="date"
                value={talkDate}
                onChange={(e) => setTalkDate(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${inputBg}`}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
                Time * <span className={`text-xs font-normal ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>({tz})</span>
              </label>
              <input
                type="time"
                value={talkTime}
                onChange={(e) => setTalkTime(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${inputBg}`}
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
                  className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                />
                <span className={`text-sm font-medium ${textSecondary}`}>1 week before</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={offsets.oneDay}
                  onChange={(e) => setOffsets({ ...offsets, oneDay: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                />
                <span className={`text-sm font-medium ${textSecondary}`}>1 day before</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={offsets.custom}
                  onChange={(e) => setOffsets({ ...offsets, custom: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
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
              className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-600 text-white font-medium rounded-xl hover:from-orange-700 hover:to-orange-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Talk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SettingsModal({
  onClose,
  onLogout,
  onDeleteAccount,
  userEmail,
  theme,
  toggleTheme,
}: {
  onClose: () => void
  onLogout: () => void
  onDeleteAccount: () => void
  userEmail: string | null
  theme: 'light' | 'dark'
  toggleTheme: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const bgCard = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  const textMuted = theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-100'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className={`${bgCard} rounded-2xl w-full max-w-md shadow-2xl border`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 ${borderColor} border-b`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${textPrimary}`}>Settings</h2>
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

        <div className="p-6 space-y-5">
          <div>
            <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Profile</h3>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-xs font-medium ${textMuted} mb-1`}>Email</p>
              <p className={`text-sm font-medium ${textPrimary} break-all`}>{userEmail || 'Unknown'}</p>
            </div>
          </div>

          <div>
            <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Appearance</h3>
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
                <span className={`font-medium ${textPrimary}`}>Dark Mode</span>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition ${theme === 'dark' ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`}></div>
              </div>
            </button>
          </div>

          <div>
            <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Session</h3>
            <button
              onClick={onLogout}
              className={`w-full py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log out
            </button>
          </div>

          <div>
            <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Danger Zone</h3>
            <button
              onClick={onDeleteAccount}
              className="w-full py-3 px-4 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-all border border-red-200 flex items-center justify-center gap-2 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
  theme,
}: {
  title: string
  body: string
  confirmLabel: string
  danger: boolean
  onCancel: () => void
  onConfirm: () => void
  theme: 'light' | 'dark'
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const bgCard = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-700'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className={`${bgCard} rounded-2xl w-full max-w-sm shadow-2xl border`} onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              {danger ? (
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <h2 className={`text-lg font-bold ${textPrimary}`}>{title}</h2>
              <p className={`mt-1 text-sm ${textSecondary}`}>{body}</p>
            </div>
          </div>
        </div>
        <div className={`px-6 pb-6 flex gap-3 justify-end`}>
          <button
            onClick={onCancel}
            className={`py-2.5 px-4 border font-medium rounded-xl transition ${theme === 'dark' ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`py-2.5 px-4 font-medium rounded-xl transition text-white ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-700 hover:to-orange-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({
  message,
  variant,
  onClose,
  theme,
}: {
  message: string
  variant: ToastVariant
  onClose: () => void
  theme: 'light' | 'dark'
}) {
  const styles =
    variant === 'success'
      ? theme === 'dark'
        ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : variant === 'error'
        ? theme === 'dark'
          ? 'bg-red-900/90 border-red-700 text-red-100'
          : 'bg-red-50 border-red-200 text-red-900'
        : theme === 'dark'
          ? 'bg-gray-800 border-gray-700 text-gray-100'
          : 'bg-white border-gray-200 text-gray-900'

  const icon =
    variant === 'success' ? (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : variant === 'error' ? (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm">
      <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md ${styles}`}>
        <div className="shrink-0 mt-0.5">{icon}</div>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 opacity-60 hover:opacity-100 transition"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}