export interface ToastMessage {
  id: number
  text: string
  /** Shows an Undo button when present. */
  undo?: () => void
}

interface Props {
  toast: ToastMessage | null
  onDismiss: () => void
  /** Called with true while the pointer or keyboard focus is on the message, so it doesn't vanish mid-reach. */
  onHoldChange: (held: boolean) => void
}

/**
 * A short message at the bottom of the screen ("Deleted X. Undo").
 * The wrapper is always on the page with aria-live="polite", so screen readers
 * announce new messages without moving the user's focus.
 */
export function Toast({ toast, onDismiss, onHoldChange }: Props) {
  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div
          className="toast"
          key={toast.id}
          onPointerEnter={() => onHoldChange(true)}
          onPointerLeave={() => onHoldChange(false)}
          onFocus={() => onHoldChange(true)}
          onBlur={() => onHoldChange(false)}
        >
          <span>
            {toast.text}
            {/* Read out, not shown: keyboard users can undo without reaching the button. */}
            {toast.undo && <span className="visually-hidden">. Press Control Z to undo.</span>}
          </span>
          {toast.undo && (
            <button
              type="button"
              className="toast-undo"
              onClick={() => {
                toast.undo?.()
                onDismiss()
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
