import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import AboutPage from '../../src/pages/AboutPage'

describe('AboutPage', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>,
    )
  })

  it('renders main title', () => {
    expect(screen.getByText('À propos')).toBeInTheDocument()
  })

  it('renders Présentation section', () => {
    expect(screen.getByText('Présentation')).toBeInTheDocument()
  })

  it('renders contact email link', () => {
    expect(
      screen.getByRole('link', { name: 'eanathos@gmail.com' }),
    ).toBeInTheDocument()
  })
})
