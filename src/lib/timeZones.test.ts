import { describe, expect, it } from 'vitest'
import { COMMON_ZONES, isGmt, zoneCity, zoneOffsetLabel, zoneOptionLabel } from './timeZones.ts'

describe('time zone names', () => {
  it('treats no zone, Accra and UTC as GMT', () => {
    expect(isGmt(null)).toBe(true)
    expect(isGmt('Africa/Accra')).toBe(true)
    expect(isGmt('UTC')).toBe(true)
    expect(isGmt('Europe/London')).toBe(false) // London has summer time
  })

  it('turns zone ids into city names', () => {
    expect(zoneCity('Europe/Paris')).toBe('Paris')
    expect(zoneCity('America/Los_Angeles')).toBe('Los Angeles')
    expect(zoneCity(null)).toBe('GMT')
  })

  it('labels menu options with the offset on that date', () => {
    expect(zoneOffsetLabel('Europe/Paris', new Date('2026-12-01T12:00:00Z'))).toBe('GMT+1')
    expect(zoneOffsetLabel('Europe/Paris', new Date('2026-07-01T12:00:00Z'))).toBe('GMT+2')
    expect(zoneOptionLabel('Africa/Accra', new Date('2026-12-01T12:00:00Z'))).toBe('Accra (GMT)')
  })

  it('only offers zones the browser knows', () => {
    for (const zone of COMMON_ZONES) expect(zoneOffsetLabel(zone)).not.toBe('')
  })
})
