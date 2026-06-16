import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import CguPage from '../../src/pages/CguPage'

describe('CguPage', () => {
  it('renders main title', () => {
    render(
      <BrowserRouter>
        <CguPage />
      </BrowserRouter>,
    )
    expect(
      screen.getByText("Conditions générales d'utilisation"),
    ).toBeInTheDocument()
  })

  it('renders Objet section', () => {
    render(
      <BrowserRouter>
        <CguPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Objet')).toBeInTheDocument()
  })
})
