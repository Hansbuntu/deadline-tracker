import { useRef } from 'react'

interface Props {
  /** How many open to-do deadlines "Add all to calendar" would export. */
  exportCount: number
  canBackUp: boolean
  onBackup: () => void
  onRestore: (file: File) => void
  onExportCalendar: () => void
}

export function DataTools({ exportCount, canBackUp, onBackup, onRestore, onExportCalendar }: Props) {
  // The real file picker is hidden; a normal button opens it, so it looks and
  // behaves like the other buttons (and keyboard focus stays visible).
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <section className="data-tools" aria-labelledby="data-tools-title">
      <h2 id="data-tools-title" className="data-tools-title">
        Backup and calendar
      </h2>
      <p className="empty">
        Your list is saved to your account and shows on every device you sign in on. A backup file is still a good
        idea now and then, as your own copy. Restoring never deletes anything: it adds what’s missing and keeps the
        most recently edited version of each item.
      </p>
      <div className="data-tools-buttons">
        <button type="button" className="button button-quiet" onClick={onBackup} disabled={!canBackUp}>
          Download backup
        </button>
        <button type="button" className="button button-quiet" onClick={() => fileInput.current?.click()}>
          Restore backup…
        </button>
        <button type="button" className="button button-quiet" onClick={onExportCalendar} disabled={exportCount === 0}>
          Add all to calendar (.ics)
        </button>
      </div>
      <p className="data-tools-hint">
        “Add all to calendar” exports your {exportCount === 1 ? '1 open to-do deadline' : `${exportCount} open to-do deadlines`}{' '}
        with their reminders.
      </p>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onRestore(file)
          event.target.value = '' // so choosing the same file again still works
        }}
      />
    </section>
  )
}
