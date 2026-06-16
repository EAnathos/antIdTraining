import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import MentionsLegalesPage from '../../src/pages/MentionsLegalesPage'

describe('MentionsLegalesPage', () => {
  it('renders main title', () => {
    render(
      <BrowserRouter>
        <MentionsLegalesPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Mentions légales')).toBeInTheDocument()
  })

  it('renders at least one section', () => {
    render(
      <BrowserRouter>
        <MentionsLegalesPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Éditeur du site')).toBeInTheDocument()
  })
})
