'use client'

import { useTheme } from '@/components/ThemeProvider'
import { useRouter } from 'next/navigation'

export default function DataDeletionPage() {
  const { theme } = useTheme()
  const router = useRouter()

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
  const bgMain = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
  const bgCard = theme === 'dark' ? 'bg-gray-800' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200'

  return (
    <div className={`min-h-screen ${bgMain} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-3xl mx-auto mb-6">
        <button 
          onClick={() => router.back()}
          className={`flex items-center gap-2 ${textSecondary} hover:text-indigo-500 transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="font-medium">Go Back</span>
        </button>
      </div>
      <div className={`max-w-3xl mx-auto ${bgCard} rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
        <div className={`px-6 py-8 sm:p-10 border-b ${borderColor}`}>
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Data Deletion Instructions</h1>
          <p className={`${textMuted}`}>Last updated: May 9, 2026</p>
        </div>

        <div className={`px-6 py-8 sm:p-10 space-y-8 ${textSecondary} leading-relaxed`}>
          <section>
            <p>
              Talk Reminder (by Ortuma) respects your privacy and your right to manage your data. According to Meta, Telegram, and international privacy guidelines, we provide a clear method for you to request the deletion of your personal data.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>For Speakers Receiving Reminders</h2>
            <p>
              If you are a speaker who opted into receiving reminders via Email, Meta Messenger, or Telegram and you wish to have your data (including your email address, Meta PSID, or Telegram Chat ID) removed from our systems:
            </p>
            <ol className="list-decimal pl-5 mt-4 space-y-3">
              <li><strong>Contact the Scheduler:</strong> Reach out to the person or organization who scheduled your talk. They can delete the talk record directly from their Talk Reminder dashboard, which immediately permanently removes your data from our active database.</li>
              <li><strong>Contact Us Directly:</strong> If you are unable to reach the scheduler, you can contact Ortuma support directly. Please provide the email address you used to opt-in, and we will manually locate and erase your records from our systems within 48 hours.</li>
            </ol>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>For Registered Account Holders</h2>
            <p>
              If you have registered an account on Talk Reminder to schedule talks and you wish to delete your entire account and all associated data:
            </p>
            <ol className="list-decimal pl-5 mt-4 space-y-3">
              <li>Please contact our support team from the email address associated with your account.</li>
              <li>State in your email that you would like your Talk Reminder account and all associated data permanently deleted.</li>
              <li>Upon verification, we will permanently delete your account, including all scheduled talks, reminder rules, and logs, within 48 hours.</li>
            </ol>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>Data That Will Be Deleted</h2>
            <p>
              When a data deletion request is processed, the following information is permanently erased from our Supabase database:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>Your Name and Email Address</li>
              <li>Meta Messenger Page-Scoped ID (PSID)</li>
              <li>Telegram Chat ID</li>
              <li>Talk schedules, titles, and automated reminder rules associated with your record</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>Contact Us</h2>
            <p>
              To submit a data deletion request or if you have any questions regarding this process, please contact Ortuma at our designated support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
