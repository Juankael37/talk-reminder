'use client'

import { useTheme } from '@/components/ThemeProvider'

export default function PrivacyPolicyPage() {
  const { theme } = useTheme()

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
  const bgMain = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
  const bgCard = theme === 'dark' ? 'bg-gray-800' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200'

  return (
    <div className={`min-h-screen ${bgMain} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-3xl mx-auto ${bgCard} rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
        <div className={`px-6 py-8 sm:p-10 border-b ${borderColor}`}>
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Privacy Policy</h1>
          <p className={`${textMuted}`}>Last updated: May 9, 2026</p>
        </div>

        <div className={`px-6 py-8 sm:p-10 space-y-8 ${textSecondary} leading-relaxed`}>
          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>1. Introduction</h2>
            <p>
              Welcome to Talk Reminder, brought to you by <strong>Ortuma</strong>. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you use our web application, email reminders, Meta Messenger bots, and Telegram bots.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>2. The Data We Collect</h2>
            <p>
              We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li><strong>Identity Data:</strong> Includes your name or the name of the speaker.</li>
              <li><strong>Contact Data:</strong> Includes your email address.</li>
              <li><strong>Technical/Platform Data:</strong> Includes Meta Messenger PSID (Page-Scoped ID) and Telegram Chat IDs if you opt-in to receive notifications via these platforms.</li>
              <li><strong>Talk Data:</strong> Includes details about your scheduled talks (title, date, time).</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>3. How We Use Your Data</h2>
            <p>
              We will only use your personal data for the purpose of providing the Talk Reminder service. Specifically, we use your data to:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>Schedule and send automated reminders regarding your upcoming talks.</li>
              <li>Send notifications via your preferred channel (Email, Meta Messenger, or Telegram).</li>
              <li>Manage your opt-in status for third-party messaging platforms.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>4. Third-Party Platforms</h2>
            <p>
              Our service integrates with third-party platforms such as Meta (Facebook Messenger) and Telegram to deliver notifications. When you interact with our bots on these platforms, you are also subject to their respective Privacy Policies and Terms of Service. We do not use the data collected from these platforms for any purpose other than delivering your scheduled reminders.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>5. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. Our database is securely hosted and requires authentication for access.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>6. Your Legal Rights</h2>
            <p>
              Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, or restriction of processing. If you wish to exercise any of these rights, or if you simply wish to opt-out of our reminders, please contact the user who scheduled your reminder or contact us directly.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>7. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact Ortuma.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
