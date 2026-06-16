import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import CguPage from '../../src/pages/CguPage'

describe('CguPage', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <CguPage />
      </BrowserRouter>,
    )
  })

  it('renders main title', () => {
    expect(
      screen.getByText("Conditions générales d'utilisation"),
    ).toBeInTheDocument()
  })

  it('renders Objet section', () => {
    expect(screen.getByText('Objet')).toBeInTheDocument()
  })
})
