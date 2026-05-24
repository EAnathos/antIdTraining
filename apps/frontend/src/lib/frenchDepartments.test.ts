import { describe, expect, it } from 'vitest'

import { FRENCH_DEPARTMENTS, IDF_CODE, getDepartmentLabel } from './frenchDepartments'

describe('french departments', () => {
  it('exposes the Île-de-France grouped entry', () => {
    expect(IDF_CODE).toBe('IDF')
    expect(FRENCH_DEPARTMENTS[IDF_CODE].name).toBe('Île-de-France')
  })

  it('returns the department label when the code is known', () => {
    expect(getDepartmentLabel('75')).toBe('Ville de Paris')
  })

  it('falls back to the code for unknown departments', () => {
    expect(getDepartmentLabel('ZZ')).toBe('ZZ')
  })
})