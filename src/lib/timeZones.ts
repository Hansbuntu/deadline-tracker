// Time zones for closing times. Open calls state their deadline in their own
// local time ("17:00 CET"), so the form lets you pick that zone and the app
// works out the moment in GMT (Accra time).

/** null or one of these means GMT. */
const GMT_ZONES = new Set(['Africa/Accra', 'Etc/GMT', 'GMT', 'UTC', 'Etc/UTC'])

export function isGmt(timeZone: string | null): boolean {
  return timeZone === null || GMT_ZONES.has(timeZone)
}

/** Zones art calls often use, offered first. The full list follows in the menu. */
export const COMMON_ZONES: string[] = [
  'Africa/Accra',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Oslo',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Asia/Dubai',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
]

/** Every zone the browser knows, for the "All time zones" part of the menu. */
export function allZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  return intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : COMMON_ZONES
}

/** "Europe/Paris" → "Paris", "America/Los_Angeles" → "Los Angeles"; GMT zones → "GMT". */
export function zoneCity(timeZone: string | null): string {
  if (isGmt(timeZone)) return 'GMT'
  const last = (timeZone as string).split('/').pop() ?? (timeZone as string)
  return last.replaceAll('_', ' ')
}

/** "GMT+1" for Paris in winter: the zone's offset on a given date. */
export function zoneOffsetLabel(timeZone: string, onDate: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(onDate)
      .find((p) => p.type === 'timeZoneName')
    // Some engines write "GMT+0" for zero; show plain "GMT" everywhere.
    return (part?.value ?? '').replace(/^GMT[+-]0$/, 'GMT')
  } catch {
    return ''
  }
}

/** The menu label: "Accra (GMT)", "Paris (GMT+1)". */
export function zoneOptionLabel(timeZone: string, onDate?: Date): string {
  const city = timeZone === 'Africa/Accra' ? 'Accra' : zoneCity(timeZone)
  const offset = zoneOffsetLabel(timeZone, onDate)
  return offset ? `${city} (${offset})` : city
}
