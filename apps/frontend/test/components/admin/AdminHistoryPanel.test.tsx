import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminHistoryPanel } from '../../../src/components/admin/AdminHistoryPanel'

describe('AdminHistoryPanel', () => {
  it('shows the empty state when there is no history', () => {
    render(<AdminHistoryPanel history={[]} />)

    expect(
      screen.getByText('Aucun événement enregistré pour le moment.'),
    ).toBeInTheDocument()
  })

  it('renders history items when events are available', () => {
    render(
      <AdminHistoryPanel
        history={[
          {
            id: 'event_1',
            at: '2026-05-29T10:00:00.000Z',
            title: 'Taxon créé',
            detail: 'Formica rufa (par Admin).',
            tone: 'success',
          },
        ]}
      />,
    )

    expect(screen.getByText('Historique admin')).toBeInTheDocument()
    expect(screen.getByText('Taxon créé')).toBeInTheDocument()
    expect(screen.getByText('Formica rufa (par Admin).')).toBeInTheDocument()
    expect(
      screen.queryByText('Aucun événement enregistré pour le moment.'),
    ).not.toBeInTheDocument()
  })
})
