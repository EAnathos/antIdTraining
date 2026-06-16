import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import PolitiqueConfidentialitePage from '../../src/pages/PolitiqueConfidentialitePage'

describe('PolitiqueConfidentialitePage', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <PolitiqueConfidentialitePage />
      </BrowserRouter>,
    )
  })

  it('renders main title', () => {
    expect(screen.getByText('Politique de confidentialité')).toBeInTheDocument()
  })

  it('renders at least one section', () => {
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(1)
  })
})
