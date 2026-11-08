import { useRef } from 'react'

interface Props {
  /** How many open to-do deadlines "Add all to your calendar" would export. */
  exportCount: number
  /** True when there's nothing in the list yet: then only "restore" is offered, quietly. */
  isEmpty: boolean
  onBackup: () => void
  onRestore: (file: File) => void
  onExportCalendar: () => void
}

export function DataTools({ exportCount, isEmpty, onBackup, onRestore, onExportCalendar }: Props) {
  // The real file picker is hidden; a normal button opens it, so it looks and
  // behaves like the other buttons (and keyboard focus stays visible).
  const fileInput = useRef<HTMLInputElement>(null)
  const picker = (
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
  )

  // First run: one small way back in, not a section about files.
  if (isEmpty) {
    return (
      <p className="data-tools-compact">
        Have a backup file?{' '}
        <button type="button" className="button-link" onClick={() => fileInput.current?.click()}>
          Restore it
        </button>
        {picker}
      </p>
    )
  }

  return (
    <section className="data-tools" aria-labelledby="data-tools-title">
      <h2 id="data-tools-title" className="data-tools-title">
        Calendar and backup
      </h2>
      <div className="data-tools-buttons">
        <button type="button" className="button button-quiet" onClick={onExportCalendar} disabled={exportCount === 0}>
          Add all to your calendar
        </button>
        <button type="button" className="button button-quiet" onClick={onBackup}>
          Download a backup
        </button>
        <button type="button" className="button button-quiet" onClick={() => fileInput.current?.click()}>
          Restore a backup…
        </button>
      </div>
      <p className="data-tools-hint">
        The calendar file holds your {exportCount === 1 ? 'open deadline' : `${exportCount} open deadlines`} with
        reminders. Your list already syncs across your devices; a backup file is your own copy. Restoring never
        deletes anything and keeps the newest version of each item.
      </p>
      {picker}
    </section>
  )
}
