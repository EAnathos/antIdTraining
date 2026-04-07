import type { ReactNode } from 'react'

type Props = {
  title: string
  tone?: 'default' | 'danger'
  onClick: () => void
  icon: ReactNode
}

export function AdminIconButton({ title, tone = 'default', onClick, icon }: Props) {
  const classes =
    tone === 'danger'
      ? 'rounded bg-red-100 px-2 py-1 text-red-700'
      : 'rounded bg-slate-100 px-2 py-1 text-slate-700'

  return (
    <button className={classes} type="button" title={title} onClick={onClick} aria-label={title}>
      {icon}
    </button>
  )
}

export function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}
