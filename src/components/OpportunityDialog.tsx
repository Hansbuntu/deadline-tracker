import { useEffect, useId, useRef, useState } from 'react'
import { validateDraft, type DraftErrors } from '../lib/opportunity.ts'
import type { OpportunityDraft } from '../types.ts'

// Field order on screen, used to move focus to the first problem.
const FIELD_ORDER: (keyof OpportunityDraft)[] = ['name', 'deadline', 'opensOn', 'link', 'notes']

interface Props {
  title: string
  submitLabel: string
  initial: OpportunityDraft
  /** Save the draft. If it throws, the dialog stays open and shows the error. */
  onSubmit: (draft: OpportunityDraft) => Promise<void>
  onClose: () => void
}

/**
 * The add/edit form, shown in the browser's built-in <dialog> element.
 * showModal() gives us for free: a dimmed backdrop, Esc to close, keyboard
 * focus kept inside, and the page behind made inactive.
 */
export function OpportunityDialog({ title, submitLabel, initial, onSubmit, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<OpportunityDraft>(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const baseId = useId()
  const idFor = (field: keyof OpportunityDraft) => `${baseId}-${field}`
  const errorId = (field: keyof OpportunityDraft) => `${idFor(field)}-error`
  const a11yProps = (field: keyof OpportunityDraft) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': errorId(field) } : {}

  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial)

  // Open as a modal when this component appears; close it when it goes away.
  // React removes the dialog from the page before the browser can return focus,
  // so we remember which button opened it and put focus back there ourselves.
  // Otherwise keyboard and screen-reader users get thrown back to the top of the page.
  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      dialog?.close()
      opener?.focus()
    }
  }, [])

  function requestClose() {
    if (saving) return
    if (isDirty && !window.confirm('Discard your changes?')) return
    onClose()
  }

  function update(field: keyof OpportunityDraft, value: string) {
    const next = { ...draft, [field]: value }
    setDraft(next)
    // After a failed submit, re-check as you type so errors disappear once fixed.
    if (triedSubmit) setErrors(validateDraft(next))
  }

  async function submit() {
    const found = validateDraft(draft)
    setErrors(found)
    setTriedSubmit(true)
    const firstProblem = FIELD_ORDER.find((field) => found[field])
    if (firstProblem) {
      document.getElementById(idFor(firstProblem))?.focus()
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await onSubmit(draft)
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Something went wrong while saving.')
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={`${baseId}-title`}
      onCancel={(event) => {
        // Esc key: ask first if there is unsaved typing.
        event.preventDefault()
        requestClose()
      }}
      onClick={(event) => {
        // A click on the dim backdrop lands on the <dialog> itself.
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <form
        className="sheet-body form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h2 className="sheet-title" id={`${baseId}-title`}>
          {title}
        </h2>

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

        <div className="sheet-actions">
          <button type="button" className="button button-quiet" onClick={requestClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
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
