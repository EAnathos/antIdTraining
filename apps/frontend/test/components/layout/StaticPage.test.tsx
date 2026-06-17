import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  StaticPage,
  StaticSection,
  StaticP,
} from '../../../src/components/layout/StaticPage'

describe('StaticPage', () => {
  it('renders title', () => {
    render(<StaticPage title="Mon titre">contenu</StaticPage>)
    expect(screen.getByText('Mon titre')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(
      <StaticPage title="Titre" subtitle="Sous-titre">
        contenu
      </StaticPage>,
    )
    expect(screen.getByText('Sous-titre')).toBeInTheDocument()
  })

  it('does not render subtitle element when omitted', () => {
    render(<StaticPage title="Titre">contenu</StaticPage>)
    expect(screen.queryByText('Sous-titre')).not.toBeInTheDocument()
  })

  it('renders children', () => {
    render(<StaticPage title="Titre">contenu enfant</StaticPage>)
    expect(screen.getByText('contenu enfant')).toBeInTheDocument()
  })
})

describe('StaticSection', () => {
  it('renders section title and children', () => {
    render(
      <StaticSection title="Section">
        <span>texte section</span>
      </StaticSection>,
    )
    expect(screen.getByText('Section')).toBeInTheDocument()
    expect(screen.getByText('texte section')).toBeInTheDocument()
  })
})

describe('StaticP', () => {
  it('renders paragraph content', () => {
    render(<StaticP>Paragraphe de test</StaticP>)
    expect(screen.getByText('Paragraphe de test')).toBeInTheDocument()
  })
})
