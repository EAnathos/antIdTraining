import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, createAuthApi } from '../lib/api'
import type { Entry, ReferenceItem, Taxon } from '../types/models'

type LevelDetailsDraft = {
  subfamily: { description: string; criteria: string[] }
  genus: { description: string; criteria: string[] }
  species: { description: string; criteria: string[] }
}

const MAX_ENTRY_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const MAX_ENTRY_IMAGES = 3

export function useAdminData(token: string | null) {
  const [taxons, setTaxons] = useState<Taxon[]>([])
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [message, setMessage] = useState('')

  const [taxonForm, setTaxonForm] = useState({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '' })
  const [selectedTaxonId, setSelectedTaxonId] = useState('')

  const [referenceForm, setReferenceForm] = useState({ title: '', description: '', type: 'WEBSITE' as 'WEBSITE' | 'MYRMECOLOGY', url: '' })
  const [selectedReferenceId, setSelectedReferenceId] = useState('')

  const [entryForm, setEntryForm] = useState({ subfamily: '', genus: '', species: '', department: '', observedAt: '', biotope: '', photoCredit: '' })
  const [entryFiles, setEntryFiles] = useState<FileList | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState('')

  const adminApi = createAuthApi(token)

  async function refreshAll() {
    const [taxonRes, refRes, entryRes] = await Promise.all([
      api.get<Taxon[]>('/taxons'),
      api.get<ReferenceItem[]>('/references'),
      adminApi.get<Entry[]>('/entries'),
    ])

    setTaxons(taxonRes.data)
    setReferences(refRes.data)
    setEntries(entryRes.data)
  }

  async function runAdminAction(action: () => Promise<void>, successMessage: string, failureMessage: string) {
    setMessage('')
    try {
      await action()
      await refreshAll()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : failureMessage)
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [token])

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
          description: found.description ?? '',
          type: found.type,
          url: found.url ?? '',
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

  async function saveTaxonLevelDetails(taxonId: string, levelDetails: LevelDetailsDraft) {
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
        ...referenceForm,
        description: referenceForm.description || null,
        url: referenceForm.url || null,
      })
      setReferenceForm({ title: '', description: '', type: 'WEBSITE', url: '' })
    }, 'Référence créée.', 'Création de la référence impossible')
  }

  async function updateReference(event: FormEvent) {
    event.preventDefault()
    if (!selectedReferenceId) return
    await runAdminAction(async () => {
      await adminApi.put(`/references/${selectedReferenceId}`, {
        ...referenceForm,
        description: referenceForm.description || null,
        url: referenceForm.url || null,
      })
    }, 'Référence modifiée.', 'Modification de la référence impossible')
  }

  async function deleteReference(id: string) {
    await runAdminAction(async () => {
      await adminApi.delete(`/references/${id}`)
    }, 'Référence supprimée.', 'Suppression de la référence impossible')
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

  return {
    message,
    setMessage,

    // Taxons
    taxons,
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

    // Entries
    entries,
    entryForm,
    setEntryForm,
    entryFiles,
    setEntryFiles,
    selectedEntryId,
    setSelectedEntryId,
    createEntry,
    updateEntry,
    deleteEntry,
  }
}
