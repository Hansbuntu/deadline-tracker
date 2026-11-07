import { describe, expect, it } from 'vitest'
import { daysBetween, formatDate, isValidDate, todayInGMT } from './dates.ts'

describe('todayInGMT', () => {
  it('gives the GMT date', () => {
    expect(todayInGMT(new Date('2026-11-07T12:00:00Z'))).toBe('2026-11-07')
  })

  it('changes date exactly at midnight GMT', () => {
    expect(todayInGMT(new Date('2026-11-07T23:59:59Z'))).toBe('2026-11-07')
    expect(todayInGMT(new Date('2026-11-08T00:00:00Z'))).toBe('2026-11-08')
  })

  it('ignores the timezone a device is set to', () => {
    // 00:30 on the 8th in Lagos/Paris time (GMT+1) is still 23:30 on the 7th in Accra.
    expect(todayInGMT(new Date('2026-11-08T00:30:00+01:00'))).toBe('2026-11-07')
  })
})

describe('isValidDate', () => {
  it('accepts real dates', () => {
    expect(isValidDate('2026-12-15')).toBe(true)
    expect(isValidDate('2028-02-29')).toBe(true) // 2028 is a leap year
  })

  it('rejects impossible or badly written dates', () => {
    expect(isValidDate('2026-02-29')).toBe(false) // 2026 is not a leap year
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2026-13-01')).toBe(false)
    expect(isValidDate('2026-2-3')).toBe(false)
    expect(isValidDate('15/12/2026')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })
})

describe('daysBetween', () => {
  it('is 0 for the same day', () => {
    expect(daysBetween('2026-11-07', '2026-11-07')).toBe(0)
  })

  it('counts forwards and backwards', () => {
    expect(daysBetween('2026-11-07', '2026-11-08')).toBe(1)
    expect(daysBetween('2026-11-07', '2026-11-06')).toBe(-1)
  })

  it('crosses month and year ends', () => {
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-11-07', '2027-11-07')).toBe(365)
  })

  it('handles leap years', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1)
  })

  it('works across a European clock change', () => {
    // Europe moved its clocks on 25 Oct 2026. Many open calls are European;
    // GMT maths must not lose or gain an hour (or a day) around it.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('formatDate', () => {
  it('writes dates the way people read them', () => {
    expect(formatDate('2026-12-15')).toBe('15 Dec 2026')
    expect(formatDate('2027-01-01')).toBe('1 Jan 2027')
  })
})
