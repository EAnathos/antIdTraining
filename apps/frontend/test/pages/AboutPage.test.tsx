import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import AboutPage from '../../src/pages/AboutPage'

describe('AboutPage', () => {
  it('renders main title', () => {
    render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('À propos')).toBeInTheDocument()
  })

  it('renders Présentation section', () => {
    render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Présentation')).toBeInTheDocument()
  })

  it('renders contact email link', () => {
    render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>,
    )
    expect(
      screen.getByRole('link', { name: 'eanathos@gmail.com' }),
    ).toBeInTheDocument()
  })
})
