import { describe, expect, it } from 'vitest'
import type { Opportunity, OpportunityDraft } from '../types.ts'
import {
  createOpportunity,
  daysLeft,
  describeDaysLeft,
  describeOpens,
  sortForDisplay,
  urgencyFor,
  validateDraft,
} from './opportunity.ts'

const TODAY = '2026-11-07'

function draft(overrides: Partial<OpportunityDraft> = {}): OpportunityDraft {
  return { name: 'Gasworks residency', opensOn: null, deadline: '2026-12-01', link: '', notes: '', ...overrides }
}

function opp(name: string, deadline: string): Opportunity {
  return createOpportunity(draft({ name, deadline }), new Date('2026-11-01T00:00:00Z'), name)
}

describe('daysLeft', () => {
  it('counts days from today to the deadline', () => {
    expect(daysLeft({ deadline: '2026-11-14' }, TODAY)).toBe(7)
    expect(daysLeft({ deadline: TODAY }, TODAY)).toBe(0)
    expect(daysLeft({ deadline: '2026-11-06' }, TODAY)).toBe(-1)
  })
})

describe('urgencyFor', () => {
  it('uses the agreed colour bands, checked at every edge', () => {
    expect(urgencyFor(-1)).toBe('closed')
    expect(urgencyFor(0)).toBe('urgent')
    expect(urgencyFor(7)).toBe('urgent')
    expect(urgencyFor(8)).toBe('soon')
    expect(urgencyFor(14)).toBe('soon')
    expect(urgencyFor(15)).toBe('upcoming')
    expect(urgencyFor(30)).toBe('upcoming')
    expect(urgencyFor(31)).toBe('later')
  })
})

describe('describeDaysLeft', () => {
  it('reads naturally', () => {
    expect(describeDaysLeft(12)).toBe('12 days left')
    expect(describeDaysLeft(1)).toBe('1 day left')
    expect(describeDaysLeft(0)).toBe('Closes today')
    expect(describeDaysLeft(-1)).toBe('Closed yesterday')
    expect(describeDaysLeft(-5)).toBe('Closed 5 days ago')
  })
})

describe('describeOpens', () => {
  it('only says something while applications are not open yet', () => {
    expect(describeOpens(null, TODAY)).toBeNull()
    expect(describeOpens('2026-11-01', TODAY)).toBeNull()
    expect(describeOpens(TODAY, TODAY)).toBe('Opens today')
    expect(describeOpens('2026-11-08', TODAY)).toBe('Opens tomorrow')
    expect(describeOpens('2026-11-17', TODAY)).toBe('Opens in 10 days')
  })
})

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(draft({ link: 'https://example.org/call', opensOn: '2026-11-10' }))).toEqual({})
  })

  it('needs a name and a real deadline', () => {
    expect(validateDraft(draft({ name: '   ' })).name).toBeDefined()
    expect(validateDraft(draft({ deadline: '' })).deadline).toBeDefined()
    expect(validateDraft(draft({ deadline: '2026-02-30' })).deadline).toBeDefined()
  })

  it('rejects an opening date after the deadline', () => {
    expect(validateDraft(draft({ opensOn: '2026-12-02' })).opensOn).toBeDefined()
    expect(validateDraft(draft({ opensOn: '2026-12-01' })).opensOn).toBeUndefined()
  })

  it('only accepts normal web links', () => {
    expect(validateDraft(draft({ link: 'example.org' })).link).toBeDefined()
    expect(validateDraft(draft({ link: 'javascript:alert(1)' })).link).toBeDefined()
    expect(validateDraft(draft({ link: 'http://example.org' })).link).toBeUndefined()
  })
})

describe('createOpportunity', () => {
  it('tidies the input and fills in the rest', () => {
    const result = createOpportunity(
      draft({ name: '  Gasworks  ', opensOn: '', notes: ' bring CV ' }),
      new Date('2026-11-07T10:00:00Z'),
      'abc',
    )
    expect(result).toEqual({
      id: 'abc',
      name: 'Gasworks',
      opensOn: null,
      deadline: '2026-12-01',
      link: '',
      status: 'todo',
      notes: 'bring CV',
      createdAt: '2026-11-07T10:00:00.000Z',
      updatedAt: '2026-11-07T10:00:00.000Z',
    })
  })
})

describe('sortForDisplay', () => {
  it('puts open ones first by soonest deadline, then closed ones newest first', () => {
    const list = [
      opp('Later', '2027-01-10'),
      opp('Closed long ago', '2026-10-01'),
      opp('Soonest', '2026-11-09'),
      opp('Closed recently', '2026-11-05'),
      opp('Today', TODAY),
    ]
    expect(sortForDisplay(list, TODAY).map((o) => o.name)).toEqual([
      'Today',
      'Soonest',
      'Later',
      'Closed recently',
      'Closed long ago',
    ])
  })

  it('does not change the original list', () => {
    const list = [opp('B', '2026-12-01'), opp('A', '2026-11-20')]
    sortForDisplay(list, TODAY)
    expect(list.map((o) => o.name)).toEqual(['B', 'A'])
  })
})
