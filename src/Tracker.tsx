import { useEffect, useRef, useState } from 'react'
import { AccountBar } from './components/AccountBar.tsx'
import { ClosingSoonBanner } from './components/ClosingSoonBanner.tsx'
import { DataTools } from './components/DataTools.tsx'
import { OpportunityDialog } from './components/OpportunityDialog.tsx'
import { OpportunityList } from './components/OpportunityList.tsx'
import { StatusTabs } from './components/StatusTabs.tsx'
import { PlusIcon } from './components/icons.tsx'
import { Toast, type ToastMessage } from './components/Toast.tsx'
import { signOut } from './lib/auth.ts'
import { createBackup, mergeOpportunities, parseBackup } from './lib/backup.ts'
import { buildIcs } from './lib/calendar.ts'
import { todayInGMT } from './lib/dates.ts'
import { downloadFile, slugify } from './lib/files.ts'
import { cardDomId, focusCard, LIST_HEADING_ID, neighbourOf } from './lib/focus.ts'
import {
  closingSoon,
  countByStatus,
  createOpportunity,
  EMPTY_DRAFT,
  isClosed,
  matchesFilter,
  STATUS_LABELS,
  toDraft,
  updateOpportunity,
  withStatus,
  type StatusFilter,
} from './lib/opportunity.ts'
import {
  copyLocalListToAccount,
  deleteOpportunity,
  listOpportunities,
  saveOpportunities,
  saveOpportunity,
} from './lib/storage.ts'
import type { Opportunity, OpportunityDraft, Status } from './types.ts'

type LoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string }
type Editor = { mode: 'add' } | { mode: 'edit'; opportunity: Opportunity }

const TOAST_MS = 8000 // long enough to read and reach Undo (Ctrl+Z also works), short enough not to linger
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
  const [loadAttempt, setLoadAttempt] = useState(0) // bumping this reloads the list ("Try again")

  // The screen's clock. It ticks once a minute, so "Closes today, 16:00"
  // turns into "Closed" on time, and "today" rolls over at midnight GMT.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const today = todayInGMT(now)

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

  // useEffect runs code after the page first appears: here, load your list once.
  useEffect(() => {
    let cancelled = false // if the screen closes mid-load, don't update it
    async function load() {
      try {
        // One-time move from phase 1: anything this browser kept locally goes into your account.
        const copied = await copyLocalListToAccount()
        const saved = await listOpportunities()
        if (cancelled) return
        setOpportunities(saved)
        setLoad({ kind: 'ready' })
        const moved = copied ? copied.added + copied.updated : 0
        if (moved > 0) showToast(`Copied ${moved} ${moved === 1 ? 'item' : 'items'} from this browser to your account`)
      } catch (error) {
        if (!cancelled) setLoad({ kind: 'error', message: errorText(error) })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  // Coming back to this tab (say, after adding something on your phone)
  // quietly fetches the latest list, so every device stays in step.
  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState !== 'visible') return
      listOpportunities()
        .then(setOpportunities)
        .catch(() => {
          // Offline or similar: keep showing what we have; the next action will report any problem.
        })
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible)
  }, [])

  function replaceInList(updated: Opportunity) {
    setOpportunities((current) => current.map((o) => (o.id === updated.id ? updated : o)))
  }

  // Where keyboard focus should go once the list has been redrawn (after a
  // delete, move or undo). undefined = leave focus alone.
  const pendingFocus = useRef<string | null | undefined>(undefined)
  function focusAfterDraw(domId: string | null) {
    pendingFocus.current = domId
  }
  useEffect(() => {
    if (pendingFocus.current === undefined) return
    focusCard(pendingFocus.current)
    pendingFocus.current = undefined
  }, [opportunities, filter])

  // --- Actions. Each one saves first, then updates the screen, so the screen
  // never shows something that isn't actually stored.

  async function handleCreate(draft: OpportunityDraft) {
    const created = createOpportunity(draft)
    await saveOpportunity(created) // if this throws, the dialog shows the error
    setOpportunities((current) => [...current, created])
    if (filter === 'applied' || filter === 'skipped') setFilter('todo') // so you can see it
    // A past deadline goes straight under Closed, so say so rather than seeming to vanish.
    showToast(
      isClosed(created, today, new Date(created.createdAt))
        ? `Added “${created.name}” under Closed, as its deadline has passed`
        : `Added “${created.name}”`,
    )
  }

  async function handleUpdate(original: Opportunity, draft: OpportunityDraft) {
    const updated = updateOpportunity(original, draft)
    await saveOpportunity(updated)
    replaceInList(updated)
    showToast('Changes saved')
  }

  async function handleStatusChange(opportunity: Opportunity, status: Status, isUndo = false) {
    // If the card is about to leave this tab, note where focus should go next.
    const leavesTab = filter !== 'all' && status !== filter
    const nextFocus = leavesTab ? neighbourOf(opportunity.id) : null
    try {
      const updated = withStatus(opportunity, status)
      await saveOpportunity(updated)
      // Ask for focus before the redraw: the next card if this one leaves the
      // tab, or this card itself when an undo brings it back.
      if (leavesTab) focusAfterDraw(nextFocus)
      else if (isUndo) focusAfterDraw(cardDomId(opportunity.id))
      replaceInList(updated)
      // The card may leave the current tab, so say where it went and offer a way back.
      showToast(`“${opportunity.name}” moved to ${STATUS_LABELS[status]}`, () => {
        void handleStatusChange(updated, opportunity.status, true)
      })
    } catch (error) {
      showToast(errorText(error))
    }
  }

  async function handleDelete(opportunity: Opportunity) {
    const nextFocus = neighbourOf(opportunity.id)
    try {
      await deleteOpportunity(opportunity.id)
      setOpportunities((current) => current.filter((o) => o.id !== opportunity.id))
      focusAfterDraw(nextFocus) // keep keyboard users in the list, not back at the top
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
      focusAfterDraw(cardDomId(opportunity.id))
      showToast(`Restored “${opportunity.name}”`)
    } catch (error) {
      showToast(errorText(error))
    }
  }

  // Ctrl+Z (⌘Z on a Mac) undoes the last delete or move while its message is
  // showing, so nobody has to chase the Undo button. Ignored while typing.
  const undoRef = useRef<(() => void) | undefined>(undefined)
  useEffect(() => {
    undoRef.current = toast?.undo // the latest Undo, for the keyboard shortcut below
  }, [toast])
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"], dialog')) return
      const undo = undoRef.current
      if (!undo) return
      event.preventDefault()
      undo()
      setToast(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // --- Calendar and backup

  const openTodo = opportunities.filter((o) => o.status === 'todo' && !isClosed(o, today, now))

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

  const counts = countByStatus(opportunities, today, now)
  const visible = opportunities.filter((o) => matchesFilter(o, filter))
  const emptyMessage = visible.length === 0 ? EMPTY_TAB_MESSAGES[filter] : 'Nothing still open here.'
  const openAdd = () => setEditor({ mode: 'add' })

  /** From the "next 7 days" line: show that card, switching to To do if it's hidden. */
  function jumpTo(opportunity: Opportunity) {
    const domId = cardDomId(opportunity.id)
    if (document.getElementById(domId)) {
      focusCard(domId)
      return
    }
    focusAfterDraw(domId)
    setFilter('todo')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="title">Deadlines</h1>
          <p className="tagline">Open calls, residencies and grants</p>
        </div>
        <button type="button" className="button button-primary add-top" onClick={openAdd}>
          <PlusIcon /> Add
        </button>
      </header>

      <main>
        {load.kind === 'loading' && <p className="empty">Loading your list…</p>}

        {load.kind === 'error' && (
          <div className="alert load-error" role="alert">
            <p>{load.message}</p>
            <button
              type="button"
              className="button button-quiet button-small"
              onClick={() => {
                setLoad({ kind: 'loading' })
                setLoadAttempt((n) => n + 1)
              }}
            >
              Try again
            </button>
          </div>
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
            <ClosingSoonBanner
              items={closingSoon(opportunities, today, now)}
              today={today}
              now={now}
              onJump={jumpTo}
            />
            {/* tabIndex -1: focus can land here after the last card in a tab is removed */}
            <h2 className="visually-hidden" id={LIST_HEADING_ID} tabIndex={-1}>
              Your opportunities
            </h2>
            <StatusTabs value={filter} counts={counts} onChange={setFilter} />
            {(filter === 'todo' || filter === 'all') && <UrgencyLegend />}
            <OpportunityList
              opportunities={visible}
              today={today}
              now={now}
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
            isEmpty={opportunities.length === 0}
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
          draftKey="add"
          today={today}
          onSubmit={handleCreate}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.mode === 'edit' && (
        <OpportunityDialog
          title="Edit opportunity"
          submitLabel="Save changes"
          initial={toDraft(editor.opportunity)}
          draftKey={`edit:${editor.opportunity.id}`}
          today={today}
          showHearBackBy={editor.opportunity.status === 'applied'}
          onSubmit={(draft) => handleUpdate(editor.opportunity, draft)}
          onClose={() => setEditor(null)}
        />
      )}

      {/* On phones, Add floats at the bottom, within thumb reach (the header one is hidden there). */}
      {load.kind === 'ready' && (
        <button type="button" className="button button-primary add-fab" onClick={openAdd}>
          <PlusIcon /> Add
        </button>
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

/** What the coloured dots mean. Visual only: each status already says it in words. */
function UrgencyLegend() {
  return (
    <p className="legend" aria-hidden="true">
      <span className="legend-item" data-tone="urgent">
        7 days or less
      </span>
      <span className="legend-item" data-tone="soon">
        2 weeks
      </span>
      <span className="legend-item" data-tone="upcoming">
        a month
      </span>
      <span className="legend-item" data-tone="later">
        more
      </span>
    </p>
  )
}
