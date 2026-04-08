export type TaxonCriterion = {
  id: string
  label: string
  position: number
}

export type TaxonLevelDetail = {
  description: string | null
  criteria: TaxonCriterion[]
}

export type Taxon = {
  id: string
  subfamily: string
  tribe: string | null
  genus: string
  subgenus: string | null
  speciesGroup: string | null
  species: string
  swarmingStartMonth: number | null
  swarmingEndMonth: number | null
  levelDetails: {
    subfamily: TaxonLevelDetail
    genus: TaxonLevelDetail
    species: TaxonLevelDetail
  }
}

export type TaxonsPageResponse = {
  items: Taxon[]
  offset: number
  limit: number
  nextOffset: number
  hasMore: boolean
  total: number
}

export type ReferenceItem = {
  id: string
  title: string
  authors: string[]
  description: string | null
  type: 'WEBSITE' | 'MYRMECOLOGY'
  url: string | null
  taxons: {
    id: string
    subfamily: string
    tribe: string | null
    genus: string
    subgenus: string | null
    speciesGroup: string | null
    species: string
  }[]
}

export type Entry = {
  id: string
  taxonId: string | null
  taxonLevel: 'SUBFAMILY' | 'GENUS' | 'SPECIES'
  taxonValue: string
  subfamily: string
  genus: string | null
  species: string | null
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
  images: { id: string; imageUrl: string }[]
}

export type GameQuestion = {
  level: 'easy' | 'medium' | 'hard'
  entryId: string
  sessionId: string
  images: string[]
  prompt: string
  details?: {
    department: string
    observedAt: string
    biotope: string
    photoCredit: string
  }
  choices: string[] | { subfamily: string[]; genus?: string[]; species?: string[] }
  answer: { subfamily?: string; genus?: string; species?: string }
}

export type GameLevelStats = {
  level: 'easy' | 'medium' | 'hard'
  launchedCount: number
  finalizedCount: number
  finalCorrectCount: number
  finalCorrectRate: number
}

export type GameStatsPeriod = '7d' | '30d' | 'all'

export type CrudMode = 'create' | 'update' | 'delete'
export type AdminSection = 'taxons' | 'references' | 'entries' | 'stats' | 'database'
