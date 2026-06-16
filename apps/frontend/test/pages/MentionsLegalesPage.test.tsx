import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import MentionsLegalesPage from '../../src/pages/MentionsLegalesPage'

describe('MentionsLegalesPage', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <MentionsLegalesPage />
      </BrowserRouter>,
    )
  })

  it('renders main title', () => {
    expect(screen.getByText('Mentions légales')).toBeInTheDocument()
  })

  it('renders at least one section', () => {
    expect(screen.getByText('Éditeur du site')).toBeInTheDocument()
  })
})
