'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Talk {
  id: string
  speaker_name: string
  talk_title: string | null
  talk_date: string
  phone_number: string | null
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
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchTalks()
  }, [])

  const fetchTalks = async () => {
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
    await supabase.auth.signOut()
    router.push('/login')
  }

  const runCheck = async () => {
    setRunningCheck(true)
    try {
      const response = await fetch('/api/check-reminders', { method: 'POST' })
      const data = await response.json()
      console.log('Check result:', data)
      if (response.ok) {
        fetchTalks()
        alert(`Check complete: ${data.sent || 0} reminders processed`)
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error running check:', error)
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

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    )
  }

  return (
    <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm">Manage your talk reminders</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <p className="text-text-secondary text-sm">Total Talks</p>
          <p className="text-2xl font-semibold text-text-primary">{talks.length}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <p className="text-text-secondary text-sm">Pending</p>
          <p className="text-2xl font-semibold text-warning">{pendingCount}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <p className="text-text-secondary text-sm">Sent</p>
          <p className="text-2xl font-semibold text-success">{sentCount}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition text-center"
        >
          + Add Talk
        </button>
        <button
          onClick={runCheck}
          disabled={runningCheck}
          className="flex-1 py-3 px-4 bg-surface border border-gray-200 text-text-primary font-medium rounded-lg hover:bg-gray-50 transition text-center disabled:opacity-50"
        >
          {runningCheck ? 'Running...' : '↻ Run Check'}
        </button>
      </div>

      {talks.length === 0 ? (
        <div className="bg-surface rounded-xl p-8 text-center">
          <p className="text-text-secondary mb-4">No talks yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-primary font-medium hover:underline"
          >
            Add your first talk
          </button>
        </div>
      ) : (
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-text-secondary uppercase p-4">
                  Speaker
                </th>
                <th className="text-left text-xs font-medium text-text-secondary uppercase p-4">
                  Date & Time
                </th>
                <th className="text-left text-xs font-medium text-text-secondary uppercase p-4">
                  Reminders
                </th>
                <th className="text-right text-xs font-medium text-text-secondary uppercase p-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {talks.map((talk) => (
                <tr key={talk.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-text-primary">
                      {talk.speaker_name}
                    </p>
                    {talk.talk_title && (
                      <p className="text-sm text-text-secondary">
                        {talk.talk_title}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="text-text-primary">{formatDate(talk.talk_date)}</p>
                    <p className="text-sm text-text-secondary">
                      {formatTime(talk.talk_date)}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {talk.reminder_rules?.map((rule) => (
                        <span
                          key={rule.id}
                          className={`px-2 py-1 text-xs rounded-full ${
                            rule.is_sent
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {rule.is_sent ? '✓' : '○'} {rule.offset_label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => deleteTalk(talk.id)}
                      className="text-sm text-error hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddTalkModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchTalks}
        />
      )}
    </main>
  )
}

function AddTalkModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
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

      if (talkError) {
        console.error('Talk insert error:', talkError)
        throw new Error(talkError.message)
      }
      if (!talk) {
        console.error('No talk returned')
        throw new Error('Failed to create talk')
      }
      console.log('Talk created:', talk)

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Add Talk</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Speaker Name *
            </label>
            <input
              type="text"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Talk Title (optional)
            </label>
            <input
              type="text"
              value={talkTitle}
              onChange={(e) => setTalkTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="Topic of the talk"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Speaker Email * (for reminders)
            </label>
            <input
              type="email"
              value={speakerEmail}
              onChange={(e) => setSpeakerEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="speaker@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Date *
              </label>
              <input
                type="date"
                value={talkDate}
                onChange={(e) => setTalkDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Time *
              </label>
              <input
                type="time"
                value={talkTime}
                onChange={(e) => setTalkTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Reminder Offsets
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={offsets.oneWeek}
                  onChange={(e) =>
                    setOffsets({ ...offsets, oneWeek: e.target.checked })
                  }
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">1 week before</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={offsets.oneDay}
                  onChange={(e) =>
                    setOffsets({ ...offsets, oneDay: e.target.checked })
                  }
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">1 day before</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={offsets.custom}
                  onChange={(e) =>
                    setOffsets({ ...offsets, custom: e.target.checked })
                  }
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Custom:</span>
                {offsets.custom && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={offsets.customValue}
                      onChange={(e) =>
                        setOffsets({
                          ...offsets,
                          customValue: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                    <select
                      value={offsets.customUnit}
                      onChange={(e) =>
                        setOffsets({
                          ...offsets,
                          customUnit: e.target.value,
                        })
                      }
                      className="px-2 py-1 border border-gray-200 rounded text-sm"
                    >
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                    before
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 text-text-primary font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
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
  const supabase = createClient()
  const { error } = await supabase.from('talks').delete().eq('id', talkId)
  if (!error) {
    window.location.reload()
  }
}