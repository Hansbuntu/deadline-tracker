import { useId, useState } from 'react'
import { validateDraft, type DraftErrors } from '../lib/opportunity.ts'
import type { OpportunityDraft } from '../types.ts'

const EMPTY_DRAFT: OpportunityDraft = { name: '', opensOn: '', deadline: '', link: '', notes: '' }

interface Props {
  /** Called with a checked draft. If it throws, the form shows the error and keeps what you typed. */
  onAdd: (draft: OpportunityDraft) => Promise<void>
}

export function OpportunityForm({ onAdd }: Props) {
  // State: what this form remembers between redraws.
  const [draft, setDraft] = useState<OpportunityDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // useId makes ids that are unique on the page, used to link each label and
  // error message to its input (this is what screen readers rely on).
  const baseId = useId()
  const idFor = (field: keyof OpportunityDraft) => `${baseId}-${field}`
  const errorId = (field: keyof OpportunityDraft) => `${idFor(field)}-error`
  const a11yProps = (field: keyof OpportunityDraft) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': errorId(field) } : {}

  function update(field: keyof OpportunityDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function submit() {
    const found = validateDraft(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    setSaveError(null)
    try {
      await onAdd(draft)
      setDraft(EMPTY_DRAFT) // only clear the form once it is safely saved
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="form"
      noValidate // we show our own clearer messages instead of the browser's pop-ups
      onSubmit={(event) => {
        event.preventDefault() // stop the browser's old habit of reloading the page
        void submit()
      }}
    >
      <div className="field">
        <label htmlFor={idFor('name')}>Name</label>
        <input
          id={idFor('name')}
          value={draft.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g. Gasworks residency 2027"
          autoComplete="off"
          {...a11yProps('name')}
        />
        <FieldError id={errorId('name')} message={errors.name} />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor={idFor('deadline')}>Deadline</label>
          <input
            id={idFor('deadline')}
            type="date"
            value={draft.deadline}
            onChange={(e) => update('deadline', e.target.value)}
            {...a11yProps('deadline')}
          />
          <FieldError id={errorId('deadline')} message={errors.deadline} />
        </div>

        <div className="field">
          <label htmlFor={idFor('opensOn')}>
            Opens <span className="optional">(optional)</span>
          </label>
          <input
            id={idFor('opensOn')}
            type="date"
            value={draft.opensOn ?? ''}
            onChange={(e) => update('opensOn', e.target.value)}
            {...a11yProps('opensOn')}
          />
          <FieldError id={errorId('opensOn')} message={errors.opensOn} />
        </div>
      </div>

      <div className="field">
        <label htmlFor={idFor('link')}>
          Link <span className="optional">(optional)</span>
        </label>
        <input
          id={idFor('link')}
          type="url"
          inputMode="url"
          value={draft.link}
          onChange={(e) => update('link', e.target.value)}
          placeholder="https://"
          {...a11yProps('link')}
        />
        <FieldError id={errorId('link')} message={errors.link} />
      </div>

      <div className="field">
        <label htmlFor={idFor('notes')}>
          Notes <span className="optional">(optional)</span>
        </label>
        <textarea
          id={idFor('notes')}
          value={draft.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Fee, what to send, who to ask for a reference…"
          rows={3}
        />
      </div>

      {saveError && (
        <p className="alert" role="alert">
          {saveError}
        </p>
      )}

      <button className="button" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Add opportunity'}
      </button>
    </form>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p className="field-error" id={id}>
      {message}
    </p>
  )
}
