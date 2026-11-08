import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_EVERY_MS = 60 * 60 * 1000 // an installed app can stay open for days

/**
 * When a new version of the app has been downloaded in the background, offer
 * to switch to it. Nothing changes until you tap Update, so a new version can
 * never reload the page in the middle of typing.
 */
export function UpdateNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="update-notice" role="status">
      <span>A new version of Deadlines is ready.</span>
      <span className="update-notice-buttons">
        <button type="button" className="button-text" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button type="button" className="button button-primary button-small" onClick={() => void updateServiceWorker(true)}>
          Update
        </button>
      </span>
    </div>
  )
}
