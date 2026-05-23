import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, apiBaseUrl, createAdminApiClient } from '../lib/api'
import type { AdminHistoryItem, AdminUserPointsItem, Entry, GameLevelStats, GameStatsPeriod, ReferenceItem, Taxon, TaxonsPageResponse } from '../types/models'
import type { FrenchDepartmentCode } from '../lib/frenchDepartments'

type LevelDetailsDraft = {
  subfamily: { description: string; sizeWorker: string; sizeQueen: string; sizeMale: string; criteria: string[] }
  genus: { description: string; sizeWorker: string; sizeQueen: string; sizeMale: string; criteria: string[] }
  subgenus: { description: string; sizeWorker: string; sizeQueen: string; sizeMale: string; criteria: string[] }
  speciesGroup: { description: string; sizeWorker: string; sizeQueen: string; sizeMale: string; criteria: string[] }
  species: { description: string; sizeWorker: string; sizeQueen: string; sizeMale: string; criteria: string[] }
}

type SwarmingPeriodDraft = {
  swarmingStartMonth: number | null
  swarmingEndMonth: number | null
}

const MAX_ENTRY_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const MAX_ENTRY_IMAGES = 3
const HISTORY_LIMIT = 12
const TAXONS_CACHE_PREFIX = 'taxons-page-cache:v1:'

function clearPublicTaxonsCache() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index)
      if (key?.startsWith(TAXONS_CACHE_PREFIX)) {
        window.sessionStorage.removeItem(key)
      }
    }
  } catch {
    // Ignore storage access failures.
  }
}

export function useAdminData(token: string | null, onUnauthorized?: () => void) {
  const [taxons, setTaxons] = useState<Taxon[]>([])
  const [subfamilies, setSubfamilies] = useState<string[]>([])
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [gameStats, setGameStats] = useState<GameLevelStats[]>([])
  const [entryStats, setEntryStats] = useState<any>(null)
  const [statsPeriod, setStatsPeriod] = useState<GameStatsPeriod>('all')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<AdminHistoryItem[]>([])
  const [users, setUsers] = useState<AdminUserPointsItem[]>([])

  const [taxonForm, setTaxonForm] = useState<{
    subfamily: string
    tribe: string
    genus: string
    subgenus: string
    speciesGroup: string
    species: string
    distribution: FrenchDepartmentCode[]
  }>({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '', distribution: [] })
  const [selectedTaxonId, setSelectedTaxonId] = useState('')

  const [referenceForm, setReferenceForm] = useState({
    title: '',
    authors: '',
    description: '',
    type: 'WEBSITE' as 'WEBSITE' | 'MYRMECOLOGY',
    url: '',
    taxonIds: [] as string[],
  })
  const [selectedReferenceId, setSelectedReferenceId] = useState('')

  const [entryForm, setEntryForm] = useState({ subfamily: '', genus: '', subgenus: '', species: '', speciesGroup: '', department: '', observedAt: '', biotope: '', photoCredit: '', caste: '' })
  const [entryFiles, setEntryFiles] = useState<FileList | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState('')
  const [suggestions, setSuggestions] = useState<import('../types/models').Suggestion[]>([])

  const adminApi = createAdminApiClient(token, onUnauthorized)


  function isUnauthorizedError(error: unknown) {
    return typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 401
  }

  function resolveAdminErrorMessage(error: unknown, fallbackMessage: string) {
    const status = typeof error === 'object' && error !== null && 'status' in error ? (error as { status?: number }).status : undefined

    if (status === 401) {
      return 'Session administrateur expirée. Merci de vous reconnecter.'
    }

    if (status === 0) {
      return 'Réseau indisponible ou serveur injoignable.'
    }

    if (error instanceof Error && error.message) {
      return error.message
    }

    return fallbackMessage
  }

  function parseAuthors(raw: string[] | string) {
    const values = Array.isArray(raw)
      ? raw
      : raw
          .split(/\n/)
          .map((value) => value.trim())
          .filter(Boolean)

    return Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    )
  }

  async function loadAdminData() {
    const listAllTaxons = async () => {
      const allItems: Taxon[] = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const { data } = await api.get<TaxonsPageResponse>('/taxons', { params: { offset } })
        allItems.push(...data.items)
        hasMore = data.hasMore
        offset = data.nextOffset

        if (data.items.length === 0) {
          break
        }
      }

      return allItems
    }

    const [taxonRes, subfamilyRes, refRes, entryRes, statsRes, entryStatsRes, usersRes] = await Promise.all([
      listAllTaxons(),
      api.get<string[]>('/taxons/subfamilies'),
      api.get<ReferenceItem[]>('/references'),
      adminApi.get<Entry[]>('/entries'),
      adminApi.get<{ period: GameStatsPeriod; levels: GameLevelStats[] }>('/stats/game', {
        params: { period: statsPeriod },
      }),
      adminApi.get<any>('/stats/entries', { params: { period: statsPeriod } }),
      adminApi.get<AdminUserPointsItem[]>('/users'),
    ])

    setTaxons(taxonRes)
    setSubfamilies(subfamilyRes.data)
    setReferences(refRes.data)
    setEntries(entryRes.data)
    setGameStats(statsRes.data.levels)
    setEntryStats(entryStatsRes.data)
    setUsers(usersRes.data)

    try {
      const { data: historyData } = await adminApi.get<AdminHistoryItem[]>('/history')
      setHistory(Array.isArray(historyData) ? historyData.slice(0, HISTORY_LIMIT) : [])
    } catch {
      setHistory([])
    }

    try {
      const { data: suggestionsData } = await adminApi.get<import('../types/models').Suggestion[]>('/suggestions')
      setSuggestions(suggestionsData)
    } catch {
      setSuggestions([])
    }
  }

  async function runAdminAction(action: () => Promise<void>, successMessage: string, failureMessage: string) {
    setMessage('')
    try {
      await action()
      await loadAdminData()
      setMessage(successMessage)
    } catch (error) {
      if (isUnauthorizedError(error)) {
        const resolvedMessage = resolveAdminErrorMessage(error, failureMessage)
        setMessage(resolvedMessage)
        return
      }
      const resolvedMessage = resolveAdminErrorMessage(error, failureMessage)
      setMessage(resolvedMessage)
    }
  }

  async function setUserPoints(id: string, points: number) {
    await runAdminAction(async () => {
      await adminApi.put(`/users/${id}/points`, { points })
      const { data } = await adminApi.get<AdminUserPointsItem[]>('/users')
      setUsers(data)
      // Dispatch event to notify LeaderboardPage to refresh
      window.dispatchEvent(new Event('antidtraining-user-points-changed'))
    }, 'Points utilisateur mis à jour.', 'Impossible de mettre à jour les points utilisateur.')
  }

  useEffect(() => {
    void loadAdminData().catch((error) => {
      if (isUnauthorizedError(error)) {
        setMessage(resolveAdminErrorMessage(error, 'Impossible de charger les données.'))
        return
      }
      setMessage(resolveAdminErrorMessage(error, 'Impossible de charger les données.'))
    })
  }, [token, statsPeriod])

  // Sync taxon form when selectedTaxonId changes
  useEffect(() => {
    if (selectedTaxonId) {
      const found = taxons.find((x) => x.id === selectedTaxonId)
      if (found) {
        setTaxonForm({
          subfamily: found.subfamily,
          tribe: found.tribe ?? '',
          genus: found.genus,
          subgenus: found.subgenus ?? '',
          speciesGroup: found.speciesGroup ?? '',
          species: found.species,
          distribution: (found.distribution?.departments ?? []).filter((c) => typeof c === 'string') as FrenchDepartmentCode[],
        })
      }
    }
  }, [selectedTaxonId, taxons])

  // Sync reference form when selectedReferenceId changes
  useEffect(() => {
    if (selectedReferenceId) {
      const found = references.find((x) => x.id === selectedReferenceId)
      if (found) {
        setReferenceForm({
          title: found.title,
          authors: found.authors.join('\n'),
          description: found.description ?? '',
          type: found.type,
          url: found.url ?? '',
          taxonIds: found.taxons.map((taxon) => taxon.id),
        })
      }
    }
  }, [selectedReferenceId, references])

  // Sync entry form when selectedEntryId changes
  useEffect(() => {
    if (selectedEntryId) {
      const found = entries.find((x) => x.id === selectedEntryId)
      if (found) {
        setEntryForm({
          subfamily: found.subfamily,
          genus: found.genus ?? '',
          subgenus: found.subgenus ?? '',
          species: found.species ?? '',
          speciesGroup: found.speciesGroup ?? '',
          department: found.department,
          observedAt: found.observedAt.slice(0, 10),
          biotope: found.biotope,
          photoCredit: found.photoCredit,
          caste: (found as any).caste ?? '',
        })
      }
    }
  }, [selectedEntryId, entries])

  async function createTaxon(event: FormEvent) {
    event.preventDefault()
    await runAdminAction(async () => {
      await adminApi.post('/taxons', {
        subfamily: taxonForm.subfamily.trim(),
        tribe: taxonForm.tribe.trim() || null,
        genus: taxonForm.genus.trim(),
        subgenus: taxonForm.subgenus.trim() || null,
        speciesGroup: taxonForm.speciesGroup.trim() || null,
        species: taxonForm.species.trim(),
        distribution: taxonForm.distribution.length > 0 ? { departments: taxonForm.distribution } : null,
      })
      setTaxonForm({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '', distribution: [] })
      clearPublicTaxonsCache()
    }, 'Taxon créé.', 'Impossible de créer le taxon.')
  }

  async function updateTaxon(event: FormEvent) {
    event.preventDefault()
    if (!selectedTaxonId) return
    await runAdminAction(async () => {
      await adminApi.put(`/taxons/${selectedTaxonId}`, {
        subfamily: taxonForm.subfamily.trim(),
        tribe: taxonForm.tribe.trim() || null,
        genus: taxonForm.genus.trim(),
        subgenus: taxonForm.subgenus.trim() || null,
        speciesGroup: taxonForm.speciesGroup.trim() || null,
        species: taxonForm.species.trim(),
        distribution: taxonForm.distribution.length > 0 ? { departments: taxonForm.distribution } : null,
      })
      clearPublicTaxonsCache()
    }, 'Taxon modifié.', 'Impossible de modifier le taxon.')
  }

  async function deleteTaxon(id: string) {
    await runAdminAction(async () => {
      await adminApi.delete(`/taxons/${id}`)
      clearPublicTaxonsCache()
    }, 'Taxon supprimé.', 'Impossible de supprimer le taxon.')
  }

  async function saveTaxonLevelDetails(
    taxonId: string,
    levelDetails: LevelDetailsDraft,
    swarmingPeriod: SwarmingPeriodDraft,
    distribution: FrenchDepartmentCode[],
  ) {
    const found = taxons.find((taxon) => taxon.id === taxonId)
    if (!found) return

    await runAdminAction(async () => {
      await adminApi.put(`/taxons/${taxonId}`, {
        subfamily: found.subfamily,
        tribe: found.tribe,
        genus: found.genus,
        subgenus: found.subgenus,
        speciesGroup: found.speciesGroup,
        species: found.species,
        swarmingStartMonth: swarmingPeriod.swarmingStartMonth,
        swarmingEndMonth: swarmingPeriod.swarmingEndMonth,
        distribution: distribution.length > 0 ? { departments: distribution } : null,
        levelDetails: {
          subfamily: {
            description: levelDetails.subfamily.description.trim() || null,
            sizeWorker: null,
            sizeQueen: null,
            sizeMale: null,
            criteria: levelDetails.subfamily.criteria.map((value) => value.trim()).filter(Boolean),
          },
          genus: {
            description: levelDetails.genus.description.trim() || null,
            sizeWorker: null,
            sizeQueen: null,
            sizeMale: null,
            criteria: levelDetails.genus.criteria.map((value) => value.trim()).filter(Boolean),
          },
          subgenus: {
            description: levelDetails.subgenus.description.trim() || null,
            sizeWorker: null,
            sizeQueen: null,
            sizeMale: null,
            criteria: levelDetails.subgenus.criteria.map((value) => value.trim()).filter(Boolean),
          },
          speciesGroup: {
            description: levelDetails.speciesGroup.description.trim() || null,
            sizeWorker: null,
            sizeQueen: null,
            sizeMale: null,
            criteria: levelDetails.speciesGroup.criteria.map((value) => value.trim()).filter(Boolean),
          },
          species: {
            description: levelDetails.species.description.trim() || null,
            sizeWorker: levelDetails.species.sizeWorker.trim() || null,
            sizeQueen: levelDetails.species.sizeQueen.trim() || null,
            sizeMale: levelDetails.species.sizeMale.trim() || null,
            criteria: levelDetails.species.criteria.map((value) => value.trim()).filter(Boolean),
          },
        },
      })
      clearPublicTaxonsCache()
    }, 'Critères et descriptions mis à jour.', 'Impossible de mettre à jour les critères.')
  }

  async function createReference(event: FormEvent) {
    event.preventDefault()
    await runAdminAction(async () => {
      await adminApi.post('/references', {
        title: referenceForm.title,
        authors: parseAuthors(referenceForm.authors),
        description: referenceForm.description || null,
        type: referenceForm.type,
        url: referenceForm.url || null,
        taxonIds: referenceForm.taxonIds,
      })
      setReferenceForm({ title: '', authors: '', description: '', type: 'WEBSITE', url: '', taxonIds: [] })
    }, 'Référence créée.', 'Impossible de créer la référence.')
  }

  async function updateReference(event: FormEvent) {
    event.preventDefault()
    if (!selectedReferenceId) return
    await runAdminAction(async () => {
      await adminApi.put(`/references/${selectedReferenceId}`, {
        title: referenceForm.title,
        authors: parseAuthors(referenceForm.authors),
        description: referenceForm.description || null,
        type: referenceForm.type,
        url: referenceForm.url || null,
        taxonIds: referenceForm.taxonIds,
      })
    }, 'Référence modifiée.', 'Impossible de modifier la référence.')
  }

  async function deleteReference(id: string) {
    await runAdminAction(async () => {
      await adminApi.delete(`/references/${id}`)
    }, 'Référence supprimée.', 'Impossible de supprimer la référence.')
  }

  async function saveReferenceAuthorsAndTaxons(authors: string[], taxonIds: string[]) {
    if (!selectedReferenceId) {
      setReferenceForm({
        ...referenceForm,
        authors: authors.join('\n'),
        taxonIds,
      })
      return true
    }

    setMessage('')
    try {
      await adminApi.put(`/references/${selectedReferenceId}`, {
        title: referenceForm.title,
        authors: parseAuthors(authors),
        description: referenceForm.description || null,
        type: referenceForm.type,
        url: referenceForm.url || null,
        taxonIds,
      })

      setReferenceForm({
        ...referenceForm,
        authors: authors.join('\n'),
        taxonIds,
      })
      await loadAdminData()
      setMessage('Référence modifiée.')
      return true
    } catch (error) {
      const resolvedMessage = resolveAdminErrorMessage(error, 'Impossible de modifier la référence.')
      setMessage(resolvedMessage)
      return false
    }
  }

  async function saveReferenceAuthorsAndTaxonsById(referenceId: string, authors: string[], taxonIds: string[]) {
    const target = references.find((reference) => reference.id === referenceId)
    if (!target) {
      setMessage('Référence introuvable.')
      return false
    }

    setMessage('')
    try {
      await adminApi.put(`/references/${referenceId}`, {
        title: target.title,
        authors: parseAuthors(authors),
        description: target.description,
        type: target.type,
        url: target.url,
        taxonIds,
      })

      await loadAdminData()
      setMessage('Référence modifiée.')
      return true
    } catch (error) {
      const resolvedMessage = resolveAdminErrorMessage(error, 'Impossible de modifier la référence.')
      setMessage(resolvedMessage)
      return false
    }
  }

  async function createEntry(event: FormEvent) {
    event.preventDefault()
    if (entryFiles) {
      if (entryFiles.length > MAX_ENTRY_IMAGES) {
        setMessage('Vous pouvez envoyer 3 images maximum.')
        return
      }

      const oversizedFile = Array.from(entryFiles).find((file) => file.size > MAX_ENTRY_IMAGE_SIZE_BYTES)
      if (oversizedFile) {
        setMessage(`Le fichier "${oversizedFile.name}" dépasse 8 Mo.`)
        return
      }
    }

    const formData = new FormData()
    if (!(entryForm as any).caste) {
      setMessage('La caste est requise.')
      return
    }
    const taxonLevel = entryForm.species ? 'SPECIES' : entryForm.genus ? 'GENUS' : 'SUBFAMILY'
    const taxonValue = entryForm.species || entryForm.genus || entryForm.subfamily
    formData.append('taxonLevel', taxonLevel)
    formData.append('taxonValue', taxonValue)
    formData.append('taxonGenus', entryForm.genus || '')
    formData.append('subgenus', entryForm.subgenus || '')
    formData.append('speciesGroup', entryForm.speciesGroup || '')
    formData.append('department', entryForm.department)
    formData.append('observedAt', entryForm.observedAt)
    formData.append('biotope', entryForm.biotope)
    formData.append('photoCredit', entryForm.photoCredit)
    formData.append('caste', (entryForm as any).caste)
    if (entryFiles) {
      Array.from(entryFiles).forEach((file) => formData.append('images', file))
    }
    setMessage('')
    try {
      await adminApi.post('/entries', formData)
      setEntryForm({ subfamily: '', genus: '', subgenus: '', species: '', speciesGroup: '', department: '', observedAt: '', biotope: '', photoCredit: '', caste: '' })
      setEntryFiles(null)
      await loadAdminData()
      setMessage('Entrée créée.')
    } catch (error) {
      const errorWithStatus = error as Error & { status?: number }
      if (errorWithStatus.status === 413) {
        setMessage('Fichiers trop volumineux (limite serveur dépassée).')
        return
      }

      const resolvedMessage = resolveAdminErrorMessage(error, 'Impossible de créer l’entrée.')
      setMessage(resolvedMessage)
    }
  }

  async function updateEntry(event: FormEvent) {
    event.preventDefault()
    if (!selectedEntryId) return
    if (!(entryForm as any).caste) {
      setMessage('La caste est requise.')
      return
    }
    await runAdminAction(async () => {
      const taxonLevel = entryForm.species ? 'SPECIES' : entryForm.genus ? 'GENUS' : 'SUBFAMILY'
      const taxonValue = entryForm.species || entryForm.genus || entryForm.subfamily
      await adminApi.put(`/entries/${selectedEntryId}`, {
        taxonLevel,
        taxonValue,
        taxonGenus: entryForm.genus || '',
        subgenus: entryForm.subgenus || '',
        speciesGroup: entryForm.speciesGroup || '',
        caste: (entryForm as any).caste,
        department: entryForm.department,
        observedAt: entryForm.observedAt,
        biotope: entryForm.biotope,
        photoCredit: entryForm.photoCredit,
      })
      setSelectedEntryId('')
      setEntryFiles(null)
    }, 'Entrée modifiée.', 'Impossible de modifier l’entrée.')
  }

  async function deleteEntry(id: string) {
    await runAdminAction(async () => {
      await adminApi.delete(`/entries/${id}`)
      if (selectedEntryId === id) {
        setSelectedEntryId('')
        setEntryFiles(null)
      }
    }, 'Entrée supprimée.', 'Impossible de supprimer l’entrée.')
  }

  async function reorderEntryImages(entryId: string, imageIds: string[]) {
    await runAdminAction(async () => {
      await adminApi.put(`/entries/${entryId}/images/order`, { imageIds })
    }, 'Ordre des images mis à jour.', 'Impossible de réordonner les images.')
  }

  async function exportDatabaseSnapshot() {
    setMessage('')
    try {
      const response = await fetch(`${apiBaseUrl}/admin/database/export/bundle`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        let message = `HTTP ${response.status}`
        try {
          const payload = (await response.json()) as { message?: string }
          if (payload.message) {
            message = payload.message
          }
        } catch {
          // Ignore non-JSON error bodies.
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateTag = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '')
      link.href = url
      link.download = `ant-id-training-bundle-${dateTag}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('Export de la base et des images terminé.')
      await loadAdminData()
    } catch (error) {
      const resolvedMessage = resolveAdminErrorMessage(error, 'Impossible d’exporter la base.')
      setMessage(resolvedMessage)
    }
  }

  async function importDatabaseSnapshot(file: File) {
    setMessage('')

    if (file.name.toLowerCase().endsWith('.zip')) {
      try {
        const formData = new FormData()
        formData.append('bundle', file)
        const { data } = await adminApi.post<{ imagesRestored?: number }>('/database/import/bundle', formData)
        await loadAdminData()
        clearPublicTaxonsCache()

        const restoredCount = typeof data?.imagesRestored === 'number' ? data.imagesRestored : 0
        setMessage(`Base et images importées (${restoredCount} image${restoredCount > 1 ? 's' : ''} restaurée${restoredCount > 1 ? 's' : ''}).`)
      } catch (error) {
        const resolvedMessage = resolveAdminErrorMessage(error, 'Impossible d’importer l’archive.')
        setMessage(resolvedMessage)
      }
      return
    }

    let payload: unknown
    try {
      const content = await file.text()
      payload = JSON.parse(content) as unknown
    } catch {
      setMessage('Fichier JSON invalide.')
      return
    }

    await runAdminAction(async () => {
      await adminApi.post('/database/import', payload)
      clearPublicTaxonsCache()
    }, 'Base importée.', 'Impossible d’importer la base.')
  }

  async function cleanupUploads() {
    setMessage('')
    try {
      const { data } = await adminApi.post<{ deletedFiles: number; generatedVariants: number; referencedImages: number }>('/database/cleanup/uploads')
      const deletedLabel = data.deletedFiles > 1 ? 'fichiers supprimés' : 'fichier supprimé'
      const generatedLabel = data.generatedVariants > 1 ? 'variantes générées' : 'variante générée'
      setMessage(`Nettoyage terminé (${data.deletedFiles} ${deletedLabel}, ${data.generatedVariants} ${generatedLabel} pour ${data.referencedImages} image${data.referencedImages > 1 ? 's' : ''} référencée${data.referencedImages > 1 ? 's' : ''}).`)
      await loadAdminData()
    } catch (error) {
      const resolvedMessage = resolveAdminErrorMessage(error, 'Impossible de nettoyer les images.')
      setMessage(resolvedMessage)
    }
  }

  async function setSuggestionStatus(id: string, status: 'PENDING' | 'PROCESSED' | 'REJECTED') {
    await runAdminAction(async () => {
      await adminApi.put(`/suggestions/${id}`, { status })
    }, 'Suggestion mise à jour.', 'Impossible de mettre à jour la suggestion.')
  }

  return {
    message,
    setMessage,

    // Taxons
    taxons,
    subfamilies,
    taxonForm,
    setTaxonForm,
    selectedTaxonId,
    setSelectedTaxonId,
    createTaxon,
    updateTaxon,
    deleteTaxon,
    saveTaxonLevelDetails,

    // References
    references,
    referenceForm,
    setReferenceForm,
    selectedReferenceId,
    setSelectedReferenceId,
    createReference,
    updateReference,
    deleteReference,
    saveReferenceAuthorsAndTaxons,
    saveReferenceAuthorsAndTaxonsById,

    // Entries
    entries,
    entryStats,
    gameStats,
    statsPeriod,
    setStatsPeriod,
    entryForm,
    setEntryForm,
    entryFiles,
    setEntryFiles,
    selectedEntryId,
    setSelectedEntryId,
    createEntry,
    updateEntry,
    deleteEntry,
    reorderEntryImages,
    suggestions,
    setSuggestionStatus,
    history,
    users,
    setUserPoints,
    exportDatabaseSnapshot,
    importDatabaseSnapshot,
    cleanupUploads,
  }
}
