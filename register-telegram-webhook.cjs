const fs = require('node:fs')
const path = require('node:path')

const envPath = path.join(__dirname, '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found at', envPath)
  process.exit(1)
}

const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    })
)

const token = env.TELEGRAM_BOT_TOKEN
const secret = env.TELEGRAM_WEBHOOK_SECRET
const webhookUrl =
  env.TELEGRAM_WEBHOOK_URL ||
  'https://talk-reminder.vercel.app/api/telegram/webhook'

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN missing in .env.local')
  process.exit(1)
}
if (!secret) {
  console.error('TELEGRAM_WEBHOOK_SECRET missing in .env.local (add it before running)')
  process.exit(1)
}

const url =
  `https://api.telegram.org/bot${token}/setWebhook` +
  `?url=${encodeURIComponent(webhookUrl)}` +
  `&secret_token=${encodeURIComponent(secret)}` +
  `&allowed_updates=${encodeURIComponent(JSON.stringify(['message']))}` +
  `&drop_pending_updates=true`

;(async () => {
  try {
    const res = await fetch(url, { method: 'GET' })
    const data = await res.json().catch(() => ({}))
    console.log('setWebhook ->', JSON.stringify(data, null, 2))

    if (!data.ok) process.exit(1)

    const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json())
    console.log('getWebhookInfo ->', JSON.stringify(info, null, 2))
  } catch (err) {
    console.error('Failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
})()
