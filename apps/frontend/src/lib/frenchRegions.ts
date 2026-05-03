export type FrenchRegionCode = 
  | 'ARA' // Auvergne-Rhône-Alpes
  | 'BFC' // Bourgogne-Franche-Comté
  | 'BRE' // Bretagne
  | 'CVL' // Centre-Val de Loire
  | 'COR' // Corse
  | 'GES' // Grand Est
  | 'HDF' // Hauts-de-France
  | 'IDF' // Île-de-France
  | 'NAQ' // Nouvelle-Aquitaine
  | 'NOR' // Normandie
  | 'OCC' // Occitanie
  | 'PDL' // Pays de la Loire
  | 'PAC' // Provence-Alpes-Côte d'Azur

export const FRENCH_REGIONS: Record<FrenchRegionCode, {
  name: string
  label: string
}> = {
  ARA: { name: 'Auvergne-Rhône-Alpes', label: 'ARA' },
  BFC: { name: 'Bourgogne-Franche-Comté', label: 'BFC' },
  BRE: { name: 'Bretagne', label: 'BRE' },
  CVL: { name: 'Centre-Val de Loire', label: 'CVL' },
  COR: { name: 'Corse', label: 'COR' },
  GES: { name: 'Grand Est', label: 'GES' },
  HDF: { name: 'Hauts-de-France', label: 'HDF' },
  IDF: { name: 'Île-de-France', label: 'IDF' },
  NAQ: { name: 'Nouvelle-Aquitaine', label: 'NAQ' },
  NOR: { name: 'Normandie', label: 'NOR' },
  OCC: { name: 'Occitanie', label: 'OCC' },
  PDL: { name: 'Pays de la Loire', label: 'PDL' },
  PAC: { name: 'Provence-Alpes-Côte d\'Azur', label: 'PAC' },
}

export function isValidRegionCode(code: unknown): code is FrenchRegionCode {
  return typeof code === 'string' && code in FRENCH_REGIONS
}

export function getRegionLabel(code: FrenchRegionCode): string {
  return FRENCH_REGIONS[code]?.name || code
}
