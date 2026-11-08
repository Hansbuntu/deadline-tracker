import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { isValidDate, isValidTime } from '../lib/dates.ts'
import { clearDraft, loadDraft, saveDraft } from '../lib/drafts.ts'
import {
  createOpportunity,
  describeClosingTime,
  draftWarnings,
  validateDraft,
  type DraftErrors,
} from '../lib/opportunity.ts'
import { allZones, COMMON_ZONES, zoneOptionLabel } from '../lib/timeZones.ts'
import type { DateString, OpportunityDraft } from '../types.ts'

// Field order on screen, used to move focus to the first problem.
const FIELD_ORDER: (keyof OpportunityDraft)[] = [
  'name',
  'deadline',
  'closingTime',
  'timeZone',
  'opensOn',
  'link',
  'notes',
  'hearBackBy',
]

interface Props {
  title: string
  submitLabel: string
  initial: OpportunityDraft
  /** Where an unfinished version of this form is kept ("add", or "edit:<id>"). */
  draftKey: string
  today: DateString
  /** Ask "Hear back by?" (only for things you've applied for). */
  showHearBackBy?: boolean
  /** Save the draft. If it throws, the dialog stays open and shows the error. */
  onSubmit: (draft: OpportunityDraft) => Promise<void>
  onClose: () => void
}

/**
 * The add/edit form, shown in the browser's built-in <dialog> element.
 * showModal() gives us for free: a dimmed backdrop, Esc to close, keyboard
 * focus kept inside, and the page behind made inactive.
 */
export function OpportunityDialog({
  title,
  submitLabel,
  initial,
  draftKey,
  today,
  showHearBackBy = false,
  onSubmit,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const keepEditingRef = useRef<HTMLButtonElement>(null)

  // If you were part-way through this form before (say the app reloaded after
  // switching apps), carry on from there.
  const [restored] = useState(() => {
    const saved = loadDraft(draftKey)
    return saved && JSON.stringify(saved) !== JSON.stringify(initial) ? saved : null
  })
  const [draft, setDraft] = useState<OpportunityDraft>(() => ({ ...initial, ...(restored ?? {}) }))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  const baseId = useId()
  const idFor = (field: keyof OpportunityDraft) => `${baseId}-${field}`
  const errorId = (field: keyof OpportunityDraft) => `${idFor(field)}-error`
  const hintId = (field: keyof OpportunityDraft) => `${idFor(field)}-hint`

  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const warnings = draftWarnings(draft, today)

  /** Accessibility wiring: mark invalid fields and link them to their error and hint text. */
  function describe(field: keyof OpportunityDraft, extraHint = false) {
    const ids = [errors[field] && errorId(field), (warnings[field] || extraHint) && hintId(field)].filter(Boolean)
    return {
      ...(errors[field] ? { 'aria-invalid': true } : {}),
      ...(ids.length ? { 'aria-describedby': ids.join(' ') } : {}),
    }
  }

  // Keep unfinished typing on this device; forget it once it matches what's saved.
  useEffect(() => {
    if (isDirty) saveDraft(draftKey, draft)
    else clearDraft(draftKey)
  }, [draft, draftKey, isDirty])

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

  // When the "Discard your changes?" question appears, put focus on the safe answer.
  useEffect(() => {
    if (confirmingDiscard) keepEditingRef.current?.focus()
  }, [confirmingDiscard])

  function requestClose() {
    if (saving) return
    if (isDirty) setConfirmingDiscard(true) // ask inside the form, not with a browser pop-up
    else onClose()
  }

  function discard() {
    clearDraft(draftKey)
    onClose()
  }

  function update(field: keyof OpportunityDraft, value: string) {
    const next = { ...draft, [field]: value }
    setDraft(next)
    setConfirmingDiscard(false)
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
      clearDraft(draftKey)
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Something went wrong while saving.')
      setSaving(false)
    }
  }

  // Time zone menu: the zones calls often use first, then every zone. Offsets
  // are worked out for the deadline date, so summer time shows correctly.
  const zoneOptions = useMemo(() => {
    const onDate = isValidDate(draft.deadline) ? new Date(`${draft.deadline}T12:00:00Z`) : new Date(`${today}T12:00:00Z`)
    const common = COMMON_ZONES.filter((zone) => zone !== 'Africa/Accra').map((zone) => ({
      value: zone,
      label: zoneOptionLabel(zone, onDate),
    }))
    const everyOther = allZones()
      .filter((zone) => !COMMON_ZONES.includes(zone))
      .map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') }))
    return { common, everyOther, accra: zoneOptionLabel('Africa/Accra', onDate) }
  }, [draft.deadline, today])

  // A live check of the conversion: "Closes at 17:00 Paris time (16:00 GMT)".
  const closingPreview =
    isValidDate(draft.deadline) && isValidTime(draft.closingTime)
      ? describeClosingTime(createOpportunity(draft, new Date(0), 'preview'))
      : null

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={`${baseId}-title`}
      onCancel={(event) => {
        // Esc key: ask first if there is unsaved typing; a second Esc keeps editing.
        event.preventDefault()
        if (confirmingDiscard) setConfirmingDiscard(false)
        else requestClose()
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

        {restored && (
          <p className="form-note" role="status">
            This is what you were typing last time.
          </p>
        )}

        <div className="field">
          <label htmlFor={idFor('name')}>Name</label>
          <input
            id={idFor('name')}
            aria-required="true"
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Gasworks residency 2027"
            autoComplete="off"
            {...describe('name')}
          />
          <FieldError id={errorId('name')} message={errors.name} />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor={idFor('deadline')}>Deadline</label>
            <input
              id={idFor('deadline')}
              aria-required="true"
              type="date"
              value={draft.deadline}
              onChange={(e) => update('deadline', e.target.value)}
              {...describe('deadline')}
            />
            <FieldError id={errorId('deadline')} message={errors.deadline} />
            {!errors.deadline && warnings.deadline && (
              <p className="field-hint field-hint-warning" id={hintId('deadline')}>
                {warnings.deadline}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor={idFor('closingTime')}>
              Closing time <span className="optional">(optional)</span>
            </label>
            <input
              id={idFor('closingTime')}
              type="time"
              value={draft.closingTime}
              onChange={(e) => update('closingTime', e.target.value)}
              {...describe('closingTime')}
            />
            <FieldError id={errorId('closingTime')} message={errors.closingTime} />
          </div>
        </div>

        {/* Only asked once there's a time, so the form stays short when there isn't. */}
        {draft.closingTime && (
          <div className="field">
            <label htmlFor={idFor('timeZone')}>Time zone of that time</label>
            <select
              id={idFor('timeZone')}
              className="field-select"
              value={draft.timeZone}
              onChange={(e) => update('timeZone', e.target.value)}
              {...describe('timeZone', true)}
            >
              <option value="">{zoneOptions.accra}</option>
              <optgroup label="Often used by open calls">
                {zoneOptions.common.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All time zones">
                {zoneOptions.everyOther.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <FieldError id={errorId('timeZone')} message={errors.timeZone} />
            <p className="field-hint" id={hintId('timeZone')}>
              {closingPreview
                ? `Closes at ${closingPreview}.`
                : 'As the call states it. For example, “17:00 CET” is Paris.'}
            </p>
          </div>
        )}

        <div className="field">
          <label htmlFor={idFor('opensOn')}>
            Applications open <span className="optional">(optional)</span>
          </label>
          <input
            id={idFor('opensOn')}
            type="date"
            value={draft.opensOn ?? ''}
            onChange={(e) => update('opensOn', e.target.value)}
            {...describe('opensOn')}
          />
          <FieldError id={errorId('opensOn')} message={errors.opensOn} />
        </div>

        <div className="field">
          <label htmlFor={idFor('link')}>
            Link to the call <span className="optional">(optional)</span>
          </label>
          <input
            id={idFor('link')}
            type="url"
            inputMode="url"
            value={draft.link}
            onChange={(e) => update('link', e.target.value)}
            placeholder="https://"
            {...describe('link')}
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
            {...describe('notes')}
          />
          <FieldError id={errorId('notes')} message={errors.notes} />
        </div>

        {showHearBackBy && (
          <div className="field">
            <label htmlFor={idFor('hearBackBy')}>
              Results expected by <span className="optional">(optional)</span>
            </label>
            <input
              id={idFor('hearBackBy')}
              type="date"
              value={draft.hearBackBy}
              onChange={(e) => update('hearBackBy', e.target.value)}
              {...describe('hearBackBy')}
            />
            <FieldError id={errorId('hearBackBy')} message={errors.hearBackBy} />
          </div>
        )}

        {saveError && (
          <p className="alert" role="alert">
            {saveError}
          </p>
        )}

        {confirmingDiscard ? (
          <div className="sheet-actions sheet-actions-confirm" role="group" aria-labelledby={`${baseId}-discard`}>
            <p className="sheet-confirm-text" id={`${baseId}-discard`}>
              Discard your changes?
            </p>
            <button
              ref={keepEditingRef}
              type="button"
              className="button button-quiet"
              onClick={() => setConfirmingDiscard(false)}
            >
              Keep editing
            </button>
            <button type="button" className="button button-danger-solid" onClick={discard}>
              Discard
            </button>
          </div>
        ) : (
          <div className="sheet-actions">
            <button type="button" className="button button-quiet" onClick={requestClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        )}
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
