import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminMobileMenu } from '../../../src/components/admin/AdminMobileMenu'

describe('AdminMobileMenu', () => {
  it('opens, changes section, and closes the menu', () => {
    const setAdminMenuOpen = vi.fn()
    const setSection = vi.fn()

    const { rerender } = render(
      <AdminMobileMenu
        adminMenuOpen={false}
        setAdminMenuOpen={setAdminMenuOpen}
        section="taxons"
        setSection={setSection}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Taxons/ }))
    expect(setAdminMenuOpen).toHaveBeenCalledWith(expect.any(Function))

    rerender(
      <AdminMobileMenu
        adminMenuOpen
        setAdminMenuOpen={setAdminMenuOpen}
        section="taxons"
        setSection={setSection}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Références' }))
    expect(setSection).toHaveBeenCalledWith('references')
    expect(setAdminMenuOpen).toHaveBeenCalledWith(false)
  })
})
