import FranceDepartmentsMap from '@svg-country-maps/france.departments'

export type FrenchDepartmentCode = string

type DepartmentInfo = {
  name: string
  label: string
}

// Special logical code for the whole Île-de-France region
export const IDF_CODE = 'IDF'
export const IDF_DEPARTMENTS = ['75', '77', '78', '91', '92', '93', '94', '95']

export const FRENCH_DEPARTMENTS: Record<string, DepartmentInfo> = Object.fromEntries(
  FranceDepartmentsMap.locations.map((location: { id: string; name: string }) => [location.id, { name: location.name, label: location.id }]),
)

// Add the grouped Île-de-France entry
FRENCH_DEPARTMENTS[IDF_CODE] = { name: 'Île-de-France', label: IDF_CODE }

const DEPARTMENT_CODES = new Set(FranceDepartmentsMap.locations.map((location: { id: string }) => location.id))
DEPARTMENT_CODES.add(IDF_CODE)

export function isValidDepartmentCode(code: unknown): code is FrenchDepartmentCode {
  return typeof code === 'string' && DEPARTMENT_CODES.has(code)
}

export function getDepartmentLabel(code: FrenchDepartmentCode): string {
  return FRENCH_DEPARTMENTS[code]?.name ?? code
}

export function getDepartmentMapData() {
  return FranceDepartmentsMap
}
