import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminIconButton, ArrowDownIcon, EditIcon, TrashIcon } from '../../../src/components/admin/AdminIconButton'

describe('AdminIconButton', () => {
  it('renders a default button and handles click', () => {
    const onClick = vi.fn()

    render(
      <AdminIconButton title="Modifier" icon={<EditIcon />} onClick={onClick} />,
    )

    const button = screen.getByRole('button', { name: 'Modifier' })
    expect(button).toHaveAttribute('data-tone', 'default')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a danger button as disabled', () => {
    render(
      <AdminIconButton title="Supprimer" tone="danger" icon={<TrashIcon />} onClick={() => undefined} disabled />,
    )

    const button = screen.getByRole('button', { name: 'Supprimer' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('data-tone', 'danger')
  })

  it('accepts other icons', () => {
    render(
      <AdminIconButton title="Monter" icon={<ArrowDownIcon />} onClick={() => undefined} />,
    )

    expect(screen.getByRole('button', { name: 'Monter' })).toBeInTheDocument()
  })
})
