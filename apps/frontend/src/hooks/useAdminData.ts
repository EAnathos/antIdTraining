import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, createAuthApi } from '../lib/api'
import type { Entry, GameLevelStats, GameStatsPeriod, ReferenceItem, Taxon } from '../types/models'

type LevelDetailsDraft = {
  subfamily: { description: string; criteria: string[] }
  genus: { description: string; criteria: string[] }
  species: { description: string; criteria: string[] }
}

type SwarmingPeriodDraft = {
  swarmingStartMonth: number | null
  swarmingEndMonth: number | null
}

const MAX_ENTRY_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const MAX_ENTRY_IMAGES = 3

export function useAdminData(token: string | null, onUnauthorized?: () => void) {
  const [taxons, setTaxons] = useState<Taxon[]>([])
  const [subfamilies, setSubfamilies] = useState<string[]>([])
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [gameStats, setGameStats] = useState<GameLevelStats[]>([])
  const [statsPeriod, setStatsPeriod] = useState<GameStatsPeriod>('all')
  const [message, setMessage] = useState('')

  const [taxonForm, setTaxonForm] = useState({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '' })
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

  const [entryForm, setEntryForm] = useState({ subfamily: '', genus: '', species: '', department: '', observedAt: '', biotope: '', photoCredit: '' })
  const [entryFiles, setEntryFiles] = useState<FileList | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState('')

  const adminApi = createAuthApi(token, onUnauthorized)

  function isUnauthorizedError(error: unknown) {
    return typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 401
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

  async function refreshAll() {
    const [taxonRes, subfamilyRes, refRes, entryRes, statsRes] = await Promise.all([
      api.get<Taxon[]>('/taxons'),
      api.get<string[]>('/taxons/subfamilies'),
      api.get<ReferenceItem[]>('/references'),
      adminApi.get<Entry[]>('/entries'),
      adminApi.get<{ period: GameStatsPeriod; levels: GameLevelStats[] }>('/stats/game', {
        params: { period: statsPeriod },
      }),
    ])

    setTaxons(taxonRes.data)
    setSubfamilies(subfamilyRes.data)
    setReferences(refRes.data)
    setEntries(entryRes.data)
    setGameStats(statsRes.data.levels)
  }

  async function runAdminAction(action: () => Promise<void>, successMessage: string, failureMessage: string) {
    setMessage('')
    try {
      await action()
      await refreshAll()
      setMessage(successMessage)
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return
      }
      setMessage(error instanceof Error ? error.message : failureMessage)
    }
  }

  useEffect(() => {
    void refreshAll().catch((error) => {
      if (isUnauthorizedError(error)) {
        return
      }
      setMessage(error instanceof Error ? error.message : 'Chargement des données impossible')
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
          species: found.species ?? '',
          department: found.department,
          observedAt: found.observedAt.slice(0, 10),
          biotope: found.biotope,
          photoCredit: found.photoCredit,
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
      })
      setTaxonForm({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '' })
    }, 'Taxon créé.', 'Création du taxon impossible')
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
      })
    }, 'Taxon modifié.', 'Modification du taxon impossible')
  }

  async function deleteTaxon(id: string) {
    await runAdminAction(async () => {
      await adminApi.delete(`/taxons/${id}`)
    }, 'Taxon supprimé.', 'Suppression du taxon impossible')
  }

  async function saveTaxonLevelDetails(taxonId: string, levelDetails: LevelDetailsDraft, swarmingPeriod: SwarmingPeriodDraft) {
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
        levelDetails: {
          subfamily: {
            description: levelDetails.subfamily.description.trim() || null,
            criteria: levelDetails.subfamily.criteria.map((value) => value.trim()).filter(Boolean),
          },
          genus: {
            description: levelDetails.genus.description.trim() || null,
            criteria: levelDetails.genus.criteria.map((value) => value.trim()).filter(Boolean),
          },
          species: {
            description: levelDetails.species.description.trim() || null,
            criteria: levelDetails.species.criteria.map((value) => value.trim()).filter(Boolean),
          },
        },
      })
    }, 'Critères et descriptions mis à jour.', 'Mise à jour des critères impossible')
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
    }, 'Référence créée.', 'Création de la référence impossible')
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
    }, 'Référence modifiée.', 'Modification de la référence impossible')
  }

  async function deleteReference(id: string) {
    await runAdminAction(async () => {
      await adminApi.delete(`/references/${id}`)
    }, 'Référence supprimée.', 'Suppression de la référence impossible')
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
      await refreshAll()
      setMessage('Référence modifiée.')
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Modification de la référence impossible')
      return false
    }
  }

  async function saveReferenceAuthorsAndTaxonsById(referenceId: string, authors: string[], taxonIds: string[]) {
    const target = references.find((reference) => reference.id === referenceId)
    if (!target) {
      setMessage('Référence introuvable')
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

      await refreshAll()
      setMessage('Référence modifiée.')
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Modification de la référence impossible')
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
    const taxonLevel = entryForm.species ? 'SPECIES' : entryForm.genus ? 'GENUS' : 'SUBFAMILY'
    const taxonValue = entryForm.species || entryForm.genus || entryForm.subfamily
    formData.append('taxonLevel', taxonLevel)
    formData.append('taxonValue', taxonValue)
    formData.append('taxonGenus', entryForm.genus || '')
    formData.append('department', entryForm.department)
    formData.append('observedAt', entryForm.observedAt)
    formData.append('biotope', entryForm.biotope)
    formData.append('photoCredit', entryForm.photoCredit)
    if (entryFiles) {
      Array.from(entryFiles).forEach((file) => formData.append('images', file))
    }
    setMessage('')
    try {
      await adminApi.post('/entries', formData)
      setEntryForm({ subfamily: '', genus: '', species: '', department: '', observedAt: '', biotope: '', photoCredit: '' })
      setEntryFiles(null)
      await refreshAll()
      setMessage('Entrée créée.')
    } catch (error) {
      const errorWithStatus = error as Error & { status?: number }
      if (errorWithStatus.status === 413) {
        setMessage('Fichiers trop volumineux (limite serveur dépassée).')
        return
      }

      setMessage(error instanceof Error ? error.message : 'Création de l’entrée impossible')
    }
  }

  async function updateEntry(event: FormEvent) {
    event.preventDefault()
    if (!selectedEntryId) return
    await runAdminAction(async () => {
      const taxonLevel = entryForm.species ? 'SPECIES' : entryForm.genus ? 'GENUS' : 'SUBFAMILY'
      const taxonValue = entryForm.species || entryForm.genus || entryForm.subfamily
      await adminApi.put(`/entries/${selectedEntryId}`, {
        taxonLevel,
        taxonValue,
        taxonGenus: entryForm.genus || '',
        department: entryForm.department,
        observedAt: entryForm.observedAt,
        biotope: entryForm.biotope,
        photoCredit: entryForm.photoCredit,
      })
      setSelectedEntryId('')
      setEntryFiles(null)
    }, 'Entrée modifiée.', 'Modification de l’entrée impossible')
  }

  async function deleteEntry(id: string) {
    await runAdminAction(async () => {
      await adminApi.delete(`/entries/${id}`)
      if (selectedEntryId === id) {
        setSelectedEntryId('')
        setEntryFiles(null)
      }
    }, 'Entrée supprimée.', 'Suppression de l’entrée impossible')
  }

  async function exportDatabase() {
    setMessage('')
    try {
      const { data } = await adminApi.get<unknown>('/database/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateTag = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '')
      link.href = url
      link.download = `ant-id-training-db-${dateTag}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('Export de la base terminé.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export de la base impossible')
    }
  }

  async function importDatabase(file: File) {
    setMessage('')

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
    }, 'Base importée.', 'Import de la base impossible')
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
    exportDatabase,
    importDatabase,
  }
}
