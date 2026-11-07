import { describe, expect, it } from 'vitest'
import type { Opportunity, OpportunityDraft } from '../types.ts'
import {
  closingSoon,
  countByStatus,
  createOpportunity,
  daysLeft,
  describeDaysLeft,
  describeOpens,
  matchesFilter,
  sortForDisplay,
  splitOpenAndClosed,
  toDraft,
  toneFor,
  updateOpportunity,
  urgencyFor,
  validateDraft,
  withStatus,
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

  it('matches the database length limits', () => {
    expect(validateDraft(draft({ name: 'x'.repeat(300) })).name).toBeUndefined()
    expect(validateDraft(draft({ name: 'x'.repeat(301) })).name).toBeDefined()
    expect(validateDraft(draft({ notes: 'x'.repeat(5000) })).notes).toBeUndefined()
    expect(validateDraft(draft({ notes: 'x'.repeat(5001) })).notes).toBeDefined()
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

describe('toneFor', () => {
  it('uses urgency colours only for things still to do', () => {
    const soon = opp('Soon', '2026-11-09')
    expect(toneFor(soon, TODAY)).toBe('urgent')
    expect(toneFor({ ...soon, status: 'applied' }, TODAY)).toBe('applied')
    expect(toneFor({ ...soon, status: 'skipped' }, TODAY)).toBe('skipped')
  })
})

describe('updateOpportunity', () => {
  it('applies edits but keeps id, status and creation time', () => {
    const original = { ...opp('Old name', '2026-12-01'), status: 'applied' as const }
    const edited = updateOpportunity(
      original,
      { ...toDraft(original), name: ' New name ', deadline: '2026-12-05' },
      new Date('2026-11-07T09:00:00Z'),
    )
    expect(edited).toMatchObject({
      id: original.id,
      name: 'New name',
      deadline: '2026-12-05',
      status: 'applied',
      createdAt: original.createdAt,
      updatedAt: '2026-11-07T09:00:00.000Z',
    })
  })
})

describe('withStatus', () => {
  it('changes the status and the updated time only', () => {
    const original = opp('A', '2026-12-01')
    const applied = withStatus(original, 'applied', new Date('2026-11-07T09:00:00Z'))
    expect(applied).toEqual({ ...original, status: 'applied', updatedAt: '2026-11-07T09:00:00.000Z' })
  })
})

describe('toDraft', () => {
  it('round-trips through the form without changes', () => {
    const original = createOpportunity(
      draft({ opensOn: '2026-11-10', link: 'https://example.org', notes: 'CV' }),
      new Date('2026-11-01T00:00:00Z'),
      'x',
    )
    expect(updateOpportunity(original, toDraft(original), new Date('2026-11-01T00:00:00Z'))).toEqual(original)
  })

  it('turns a missing opening date into an empty field', () => {
    expect(toDraft(opp('A', '2026-12-01')).opensOn).toBe('')
  })
})

describe('closingSoon', () => {
  it('lists to-do items closing today to 7 days from now, soonest first', () => {
    const list = [
      opp('Seven days', '2026-11-14'),
      opp('Eight days', '2026-11-15'),
      opp('Today', TODAY),
      opp('Yesterday', '2026-11-06'),
      { ...opp('Applied already', '2026-11-08'), status: 'applied' as const },
    ]
    expect(closingSoon(list, TODAY).map((o) => o.name)).toEqual(['Today', 'Seven days'])
  })
})

describe('filters', () => {
  const list = [
    opp('A', '2026-12-01'),
    { ...opp('B', '2026-12-01'), status: 'applied' as const },
    { ...opp('C', '2026-12-01'), status: 'applied' as const },
  ]

  it('counts each status and the total', () => {
    expect(countByStatus(list)).toEqual({ todo: 1, applied: 2, skipped: 0, all: 3 })
  })

  it('matches one status, or everything for "all"', () => {
    expect(list.filter((o) => matchesFilter(o, 'applied')).map((o) => o.name)).toEqual(['B', 'C'])
    expect(list.filter((o) => matchesFilter(o, 'all'))).toHaveLength(3)
  })
})

describe('splitOpenAndClosed', () => {
  it('treats a deadline of today as still open', () => {
    const { open, closed } = splitOpenAndClosed(
      [opp('Closed', '2026-11-06'), opp('Today', TODAY), opp('Later', '2026-12-01')],
      TODAY,
    )
    expect(open.map((o) => o.name)).toEqual(['Today', 'Later'])
    expect(closed.map((o) => o.name)).toEqual(['Closed'])
  })
})
