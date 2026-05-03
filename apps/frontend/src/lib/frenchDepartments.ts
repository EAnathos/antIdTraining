import FranceDepartmentsMap from '@svg-country-maps/france.departments'

export type FrenchDepartmentCode = string

type DepartmentInfo = {
  name: string
  label: string
}

export const FRENCH_DEPARTMENTS: Record<string, DepartmentInfo> = Object.fromEntries(
  FranceDepartmentsMap.locations.map((location: { id: string; name: string }) => [location.id, { name: location.name, label: location.id }]),
)

const DEPARTMENT_CODES = new Set(FranceDepartmentsMap.locations.map((location: { id: string }) => location.id))

export function isValidDepartmentCode(code: unknown): code is FrenchDepartmentCode {
  return typeof code === 'string' && DEPARTMENT_CODES.has(code)
}

export function getDepartmentLabel(code: FrenchDepartmentCode): string {
  return FRENCH_DEPARTMENTS[code]?.name ?? code
}

export function getDepartmentMapData() {
  return FranceDepartmentsMap
}
