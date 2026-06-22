export function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const get = (type: string) => {
    const v = parts.find((p) => p.type === type)?.value
    if (!v) throw new Error(`tzOffsetMinutes: missing part ${type}`)
    return parseInt(v, 10)
  }
  let hour = get('hour')
  if (hour === 24) hour = 0
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  )
  return Math.round((asUtc - date.getTime()) / 60000)
}

export function parseInTz(
  dateStr: string,
  timeStr: string,
  tz: string
): Date {
  if (!dateStr || !timeStr) {
    throw new Error('parseInTz: dateStr and timeStr are required')
  }
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10))
  const [hh, mm] = timeStr.split(':').map((n) => parseInt(n, 10))
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) {
    throw new Error('parseInTz: invalid date or time format')
  }
  const naiveUtc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0))
  const offset = tzOffsetMinutes(naiveUtc, tz)
  return new Date(naiveUtc.getTime() - offset * 60000)
}

export function offsetDate(base: Date, days: number, hours: number): Date {
  const d = new Date(base.getTime())
  if (days) d.setUTCDate(d.getUTCDate() - days)
  if (hours) d.setUTCHours(d.getUTCHours() - hours)
  return d
}

export function resolveTz(fallback = 'Asia/Manila'): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TIMEZONE) {
    return process.env.NEXT_PUBLIC_TIMEZONE
  }
  return fallback
}