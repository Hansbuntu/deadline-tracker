interface Props {
  email: string
  onSignOut: () => void
}

export function AccountBar({ email, onSignOut }: Props) {
  return (
    <div className="account-bar">
      <span className="account-email">
        Signed in as <strong>{email}</strong>
      </span>
      <button type="button" className="button-text" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  )
}
