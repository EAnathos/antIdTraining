import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FranceMap } from '../../src/components/FranceMap'

beforeEach(() => {
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  })
})

describe('FranceMap', () => {
  it('renders interactive department paths', () => {
    const onToggleDepartment = vi.fn()

    render(
      <FranceMap selectedDepartments={['75']} onToggleDepartment={onToggleDepartment} />,
    )

    expect(screen.getByRole('group', { name: 'Carte interactive de la France' })).toBeInTheDocument()
    const parisPath = screen.getByLabelText('Ville de Paris')
    expect(parisPath).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(parisPath)
    expect(onToggleDepartment).toHaveBeenCalled()
  })

  it('renders readonly map image', () => {
    render(<FranceMap selectedDepartments={[]} readonly />)

    expect(screen.getByRole('img', { name: 'Aire de répartition' })).toBeInTheDocument()
  })
})
