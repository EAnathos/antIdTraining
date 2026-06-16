import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import PolitiqueConfidentialitePage from '../../src/pages/PolitiqueConfidentialitePage'

describe('PolitiqueConfidentialitePage', () => {
  it('renders main title', () => {
    render(
      <BrowserRouter>
        <PolitiqueConfidentialitePage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Politique de confidentialité')).toBeInTheDocument()
  })

  it('renders at least one section', () => {
    render(
      <BrowserRouter>
        <PolitiqueConfidentialitePage />
      </BrowserRouter>,
    )
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(1)
  })
})
