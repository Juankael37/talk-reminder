'use client'

import { useTheme } from '@/components/ThemeProvider'

export default function TermsOfServicePage() {
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
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Terms of Service</h1>
          <p className={`${textMuted}`}>Last updated: May 9, 2026</p>
        </div>

        <div className={`px-6 py-8 sm:p-10 space-y-8 ${textSecondary} leading-relaxed`}>
          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Talk Reminder, a service provided by <strong>Ortuma</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>2. Description of Service</h2>
            <p>
              Talk Reminder is a tool designed to help schedule and send automated reminders to speakers via email and third-party messaging platforms such as Meta Messenger and Telegram. We reserve the right to modify, suspend, or discontinue the service at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>3. User Responsibilities</h2>
            <p>
              When using Talk Reminder, you agree to:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>Provide accurate and complete information when scheduling talks.</li>
              <li>Only send reminders to individuals who have consented to receive them.</li>
              <li>Not use the service for spamming, harassment, or any illegal activities.</li>
              <li>Maintain the security of your account credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>4. Third-Party Integrations</h2>
            <p>
              Our service relies on third-party APIs (such as Meta Messenger API and Telegram Bot API) to deliver messages. We do not control these platforms and are not responsible for their availability, reliability, or changes to their policies. Your use of these platforms is governed by their respective Terms of Service.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Ortuma shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Talk Reminder service, including but not limited to missed notifications, lost data, or platform downtime.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>6. Changes to Terms</h2>
            <p>
              We reserve the right to update or modify these Terms of Service at any time. We will notify users of any significant changes by updating the "Last updated" date at the top of this page. Your continued use of the service after any changes constitutes your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>7. Contact Information</h2>
            <p>
              If you have any questions or concerns regarding these Terms of Service, please contact Ortuma.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
