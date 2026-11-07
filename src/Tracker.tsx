import { useEffect, useRef, useState } from 'react'
import { AccountBar } from './components/AccountBar.tsx'
import { ClosingSoonBanner } from './components/ClosingSoonBanner.tsx'
import { DataTools } from './components/DataTools.tsx'
import { OpportunityDialog } from './components/OpportunityDialog.tsx'
import { OpportunityList } from './components/OpportunityList.tsx'
import { StatusTabs } from './components/StatusTabs.tsx'
import { Toast, type ToastMessage } from './components/Toast.tsx'
import { signOut } from './lib/auth.ts'
import { createBackup, mergeOpportunities, parseBackup } from './lib/backup.ts'
import { buildIcs } from './lib/calendar.ts'
import { todayInGMT } from './lib/dates.ts'
import { downloadFile, slugify } from './lib/files.ts'
import {
  closingSoon,
  countByStatus,
  createOpportunity,
  EMPTY_DRAFT,
  matchesFilter,
  STATUS_LABELS,
  toDraft,
  updateOpportunity,
  withStatus,
  type StatusFilter,
} from './lib/opportunity.ts'
import { deleteOpportunity, listOpportunities, saveOpportunities, saveOpportunity } from './lib/storage.ts'
import type { Opportunity, OpportunityDraft, Status } from './types.ts'

type LoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string }
type Editor = { mode: 'add' } | { mode: 'edit'; opportunity: Opportunity }

const TOAST_MS = 6000 // long enough to reach the Undo button, short enough not to linger
const MAX_BACKUP_BYTES = 5_000_000 // a real backup is a few kilobytes; refuse anything huge

const EMPTY_TAB_MESSAGES: Record<StatusFilter, string> = {
  todo: 'Nothing on your to-do list.',
  applied: 'Nothing marked as applied yet.',
  skipped: 'Nothing skipped.',
  all: 'Nothing here yet.',
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function Tracker({ accountEmail }: { accountEmail: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [filter, setFilter] = useState<StatusFilter>('todo')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [toastHeld, setToastHeld] = useState(false)
  const toastCount = useRef(0)
  const today = todayInGMT()

  // useEffect runs code after the page first appears: here, load saved data once.
  useEffect(() => {
    listOpportunities()
      .then((saved) => {
        setOpportunities(saved)
        setLoad({ kind: 'ready' })
      })
      .catch((error: unknown) => setLoad({ kind: 'error', message: errorText(error) }))
  }, [])

  // Hide the message after a few seconds. A new message restarts the timer,
  // and it waits while you're pointing at or tabbed onto it.
  useEffect(() => {
    if (!toast || toastHeld) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast, toastHeld])

  function showToast(text: string, undo?: () => void) {
    toastCount.current += 1
    setToastHeld(false)
    setToast({ id: toastCount.current, text, undo })
  }

  function replaceInList(updated: Opportunity) {
    setOpportunities((current) => current.map((o) => (o.id === updated.id ? updated : o)))
  }

  // --- Actions. Each one saves first, then updates the screen, so the screen
  // never shows something that isn't actually stored.

  async function handleCreate(draft: OpportunityDraft) {
    const created = createOpportunity(draft)
    await saveOpportunity(created) // if this throws, the dialog shows the error
    setOpportunities((current) => [...current, created])
    if (filter === 'applied' || filter === 'skipped') setFilter('todo') // so you can see it
    showToast(`Added “${created.name}”`)
  }

  async function handleUpdate(original: Opportunity, draft: OpportunityDraft) {
    const updated = updateOpportunity(original, draft)
    await saveOpportunity(updated)
    replaceInList(updated)
    showToast('Changes saved')
  }

  async function handleStatusChange(opportunity: Opportunity, status: Status) {
    try {
      const updated = withStatus(opportunity, status)
      await saveOpportunity(updated)
      replaceInList(updated)
      // The card may leave the current tab, so say where it went and offer a way back.
      showToast(`“${opportunity.name}” moved to ${STATUS_LABELS[status]}`, () => {
        void handleStatusChange(updated, opportunity.status)
      })
    } catch (error) {
      showToast(errorText(error))
    }
  }

  async function handleDelete(opportunity: Opportunity) {
    try {
      await deleteOpportunity(opportunity.id)
      setOpportunities((current) => current.filter((o) => o.id !== opportunity.id))
      // Undo instead of "Are you sure?": quicker, and mistakes are easy to reverse.
      showToast(`Deleted “${opportunity.name}”`, () => void restore(opportunity))
    } catch (error) {
      showToast(errorText(error))
    }
  }

  async function restore(opportunity: Opportunity) {
    try {
      await saveOpportunity(opportunity)
      setOpportunities((current) => [...current, opportunity])
    } catch (error) {
      showToast(errorText(error))
    }
  }

  // --- Calendar and backup

  const openTodo = opportunities.filter((o) => o.status === 'todo' && o.deadline >= today)

  function handleDownloadIcs(opportunity: Opportunity) {
    downloadFile(`${slugify(opportunity.name)}.ics`, buildIcs([opportunity], today), 'text/calendar')
  }

  function handleExportCalendar() {
    downloadFile(`deadlines-${today}.ics`, buildIcs(openTodo, today), 'text/calendar')
    showToast(`Calendar file with ${openTodo.length} ${openTodo.length === 1 ? 'deadline' : 'deadlines'} downloaded`)
  }

  function handleBackup() {
    downloadFile(`deadlines-backup-${today}.json`, createBackup(opportunities), 'application/json')
    showToast('Backup downloaded')
  }

  async function handleRestore(file: File) {
    if (file.size > MAX_BACKUP_BYTES) {
      showToast('That file is too big to be a Deadlines backup.')
      return
    }
    const parsed = parseBackup(await file.text())
    if (!parsed.ok) {
      showToast(`Nothing restored. ${parsed.error}`)
      return
    }
    try {
      const merge = mergeOpportunities(opportunities, parsed.opportunities)
      await saveOpportunities(merge.toSave)
      setOpportunities(await listOpportunities()) // show exactly what is stored now
      showToast(`Restored: ${merge.added} added, ${merge.updated} updated, ${merge.unchanged} already up to date`)
    } catch (error) {
      showToast(errorText(error))
    }
  }

  // --- What to show

  const counts = countByStatus(opportunities)
  const visible = opportunities.filter((o) => matchesFilter(o, filter))
  const emptyMessage = visible.length === 0 ? EMPTY_TAB_MESSAGES[filter] : 'Nothing still open here.'
  const openAdd = () => setEditor({ mode: 'add' })

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="title">Deadlines</h1>
          <p className="tagline">Open calls, residencies and grants</p>
        </div>
        <button type="button" className="button button-primary" onClick={openAdd}>
          <PlusIcon /> Add
        </button>
      </header>

      <main>
        {load.kind === 'loading' && <p className="empty">Loading…</p>}

        {load.kind === 'error' && (
          <p className="alert" role="alert">
            {load.message}
          </p>
        )}

        {load.kind === 'ready' && opportunities.length === 0 && (
          <div className="empty-start">
            <p className="empty-start-title">Nothing tracked yet</p>
            <p className="empty">Add an open call, residency or grant and its deadline. The days are counted for you.</p>
            <button type="button" className="button button-primary" onClick={openAdd}>
              Add your first opportunity
            </button>
          </div>
        )}

        {load.kind === 'ready' && opportunities.length > 0 && (
          <>
            <ClosingSoonBanner items={closingSoon(opportunities, today)} today={today} />
            <h2 className="visually-hidden">Your opportunities</h2>
            <StatusTabs value={filter} counts={counts} onChange={setFilter} />
            <OpportunityList
              opportunities={visible}
              today={today}
              emptyMessage={emptyMessage}
              onStatusChange={(o, status) => void handleStatusChange(o, status)}
              onEdit={(o) => setEditor({ mode: 'edit', opportunity: o })}
              onDelete={(o) => void handleDelete(o)}
              onDownloadIcs={handleDownloadIcs}
            />
          </>
        )}

        {load.kind === 'ready' && (
          <DataTools
            exportCount={openTodo.length}
            canBackUp={opportunities.length > 0}
            onBackup={handleBackup}
            onRestore={(file) => void handleRestore(file)}
            onExportCalendar={handleExportCalendar}
          />
        )}

        <AccountBar
          email={accountEmail}
          onSignOut={() => {
            // Signing out changes the session; the app then shows the sign-in screen.
            signOut().catch((error: unknown) => showToast(errorText(error)))
          }}
        />
      </main>

      {editor?.mode === 'add' && (
        <OpportunityDialog
          title="Add an opportunity"
          submitLabel="Add"
          initial={EMPTY_DRAFT}
          onSubmit={handleCreate}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.mode === 'edit' && (
        <OpportunityDialog
          title="Edit opportunity"
          submitLabel="Save changes"
          initial={toDraft(editor.opportunity)}
          onSubmit={(draft) => handleUpdate(editor.opportunity, draft)}
          onClose={() => setEditor(null)}
        />
      )}

      <Toast
        toast={toast}
        onDismiss={() => {
          setToast(null)
          setToastHeld(false)
        }}
        onHoldChange={setToastHeld}
      />
    </div>
  )
}

function PlusIcon() {
  // Decorative: the button's text already says "Add", so screen readers skip this.
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
