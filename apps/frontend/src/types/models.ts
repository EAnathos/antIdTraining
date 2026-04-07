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
  levelDetails: {
    subfamily: TaxonLevelDetail
    genus: TaxonLevelDetail
    species: TaxonLevelDetail
  }
}

export type ReferenceItem = {
  id: string
  title: string
  description: string | null
  type: 'WEBSITE' | 'MYRMECOLOGY'
  url: string | null
}

export type Entry = {
  id: string
  taxonId: string
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
  taxon: Taxon
  images: { id: string; imageUrl: string }[]
}

export type GameQuestion = {
  level: 'easy' | 'medium' | 'hard'
  entryId: string
  image: string | null
  prompt: string
  choices: string[] | { subfamily: string[]; genus?: string[]; species?: string[] }
  answer: { subfamily?: string; genus?: string; species?: string }
}

export type CrudMode = 'create' | 'update' | 'delete'
export type AdminSection = 'taxons' | 'references' | 'entries'
