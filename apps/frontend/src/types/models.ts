export type TaxonCriterion = {
  id: string
  label: string
  position: number
}

export type TaxonConfusion = {
  id: string
  detail: string
  confusedTaxon: {
    id: string
    subfamily: string
    tribe: string | null
    genus: string
    subgenus: string | null
    speciesGroup: string | null
    species: string
  }
}

export type TaxonLevelDetail = {
  description: string | null
  sizeWorker: string | null
  sizeQueen: string | null
  sizeMale: string | null
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
  distribution: { departments?: string[] } | null
  invasive: boolean
  confusions: TaxonConfusion[]
  levelDetails: {
    subfamily: TaxonLevelDetail
    genus: TaxonLevelDetail
    subgenus: TaxonLevelDetail | null
    speciesGroup: TaxonLevelDetail | null
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
  subgenus: string | null
  species: string | null
  speciesGroup: string | null
  size: string | null
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
  caste?: 'WORKER' | 'QUEEN' | 'MALE' | null
  images: { id: string; imageUrl: string; position?: number | null }[]
}

export type EntryPageResponse = {
  items: Entry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export type GameQuestion = {
  level: 'easy' | 'medium' | 'hard'
  entryId: string
  sessionId: string
  images: string[]
  prompt: string
  details?: {
    size: string | null
    caste: string | null
    department: string
    observedAt: string
    biotope: string
    photoCredit: string
  }
  choices:
    | string[]
    | { subfamily: string[]; genus?: string[]; species?: string[] }
}

export type GameLevelStats = {
  level: 'easy' | 'medium' | 'hard'
  launchedCount: number
  finalizedCount: number
  finalCorrectCount: number
  finalCorrectRate: number
}

export type GameStatsPeriod = '7d' | '30d' | 'all'

export type LeaderboardItem = {
  userId: string
  username: string
  avatar: string | null
  bio: string | null
  gamesPlayed: number
  correctCount: number
  wrongCount: number
  points: number
}

export type LeaderboardResponse = {
  items: LeaderboardItem[]
}

export type AuthUser = {
  id: string
  username: string
  email: string | null
  role: 'ADMIN' | 'USER'
}

export type AuthResponse = {
  token: string
  role: 'ADMIN' | 'USER'
  user: AuthUser
}

export type AuthRegistrationResponse = {
  requiresEmailVerification: true
  email: string
}

export type AuthMeResponse = {
  userId: string
  role: 'ADMIN' | 'USER'
  username: string | null
  email: string | null
  avatar: string | null
  bio: string | null
  createdAt: string | null
  points: number
}

export type AdminUserPointsItem = {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  points: number
  createdAt: string
}

export type CrudMode = 'create' | 'update' | 'delete'
export type AdminHistoryItem = {
  id: string
  at: string
  title: string
  detail: string
  tone: 'success' | 'error' | 'info'
}

export type EntryProposal = {
  id: string
  userId: string
  taxonLevel: 'SUBFAMILY' | 'GENUS' | 'SPECIES'
  taxonValue: string
  subfamily: string
  genus: string | null
  subgenus: string | null
  species: string | null
  speciesGroup: string | null
  size: string | null
  caste: 'WORKER' | 'QUEEN' | 'MALE' | null
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  rejectionMessage: string | null
  createdAt: string
  processedAt: string | null
  images: { id: string; imageUrl: string; position?: number | null }[]
  user?: { username: string }
}

export type Suggestion = {
  id: string
  userId?: string | null
  title?: string | null
  message: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  rejectionMessage?: string | null
  createdAt: string
  processedAt?: string | null
  user?: { username: string }
}
export type UserProfile = {
  username: string
  avatar: string | null
  bio: string | null
  points: number
}

export type AdminSection =
  | 'taxons'
  | 'references'
  | 'entries'
  | 'stats'
  | 'database'
  | 'suggestions'
  | 'points'
  | 'history'
