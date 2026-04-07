import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, apiBaseUrl } from '../lib/api'
import type { Entry, ReferenceItem, Taxon } from '../types/models'

type LevelDetailsDraft = {
  subfamily: { description: string; criteria: string[] }
  genus: { description: string; criteria: string[] }
  species: { description: string; criteria: string[] }
}

export function useAdminData(token: string | null) {
  const [taxons, setTaxons] = useState<Taxon[]>([])
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [message, setMessage] = useState('')

  const [taxonForm, setTaxonForm] = useState({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '' })
  const [selectedTaxonId, setSelectedTaxonId] = useState('')

  const [referenceForm, setReferenceForm] = useState({ title: '', description: '', type: 'WEBSITE' as 'WEBSITE' | 'MYRMECOLOGY', url: '' })
  const [selectedReferenceId, setSelectedReferenceId] = useState('')

  const [entryForm, setEntryForm] = useState({ taxonId: '', department: '', observedAt: '', biotope: '', photoCredit: '' })
  const [entryFiles, setEntryFiles] = useState<FileList | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState('')

  const adminApi = api.create({
    baseURL: `${apiBaseUrl}/admin`,
    headers: { Authorization: `Bearer ${token}` },
  })

  async function loadAll() {
    const [taxonRes, refRes, entryRes] = await Promise.all([
      api.get<Taxon[]>('/taxons'),
      api.get<ReferenceItem[]>('/references'),
      adminApi.get<Entry[]>('/entries'),
    ])
    setTaxons(taxonRes.data)
    setReferences(refRes.data)
    setEntries(entryRes.data)
  }

  useEffect(() => {
    void loadAll()
  }, [])

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
          taxonId: found.taxonId,
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
    setMessage('')
    try {
      await adminApi.post('/taxons', {
        subfamily: taxonForm.subfamily.trim(),
        tribe: taxonForm.tribe.trim() || null,
        genus: taxonForm.genus.trim(),
        subgenus: taxonForm.subgenus.trim() || null,
        speciesGroup: taxonForm.speciesGroup.trim() || null,
        species: taxonForm.species.trim(),
      })
      setTaxonForm({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '' })
      await loadAll()
      setMessage('Taxon créé.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Création du taxon impossible')
    }
  }

  async function updateTaxon(event: FormEvent) {
    event.preventDefault()
    if (!selectedTaxonId) return
    setMessage('')
    try {
      await adminApi.put(`/taxons/${selectedTaxonId}`, {
        subfamily: taxonForm.subfamily.trim(),
        tribe: taxonForm.tribe.trim() || null,
        genus: taxonForm.genus.trim(),
        subgenus: taxonForm.subgenus.trim() || null,
        speciesGroup: taxonForm.speciesGroup.trim() || null,
        species: taxonForm.species.trim(),
      })
      await loadAll()
      setMessage('Taxon modifié.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Modification du taxon impossible')
    }
  }

  async function deleteTaxon(id: string) {
    setMessage('')
    try {
      await adminApi.delete(`/taxons/${id}`)
      await loadAll()
      setMessage('Taxon supprimé.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Suppression du taxon impossible')
    }
  }

  async function saveTaxonLevelDetails(taxonId: string, levelDetails: LevelDetailsDraft) {
    const found = taxons.find((taxon) => taxon.id === taxonId)
    if (!found) return

    setMessage('')
    try {
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
      await loadAll()
      setMessage('Critères et descriptions mis à jour.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mise à jour des critères impossible')
    }
  }

  async function createReference(event: FormEvent) {
    event.preventDefault()
    await adminApi.post('/references', {
      ...referenceForm,
      description: referenceForm.description || null,
      url: referenceForm.url || null,
    })
    setReferenceForm({ title: '', description: '', type: 'WEBSITE', url: '' })
    await loadAll()
  }

  async function updateReference(event: FormEvent) {
    event.preventDefault()
    if (!selectedReferenceId) return
    await adminApi.put(`/references/${selectedReferenceId}`, {
      ...referenceForm,
      description: referenceForm.description || null,
      url: referenceForm.url || null,
    })
    await loadAll()
  }

  async function deleteReference(id: string) {
    await adminApi.delete(`/references/${id}`)
    await loadAll()
  }

  async function createEntry(event: FormEvent) {
    event.preventDefault()
    const formData = new FormData()
    formData.append('taxonId', entryForm.taxonId)
    formData.append('department', entryForm.department)
    formData.append('observedAt', entryForm.observedAt)
    formData.append('biotope', entryForm.biotope)
    formData.append('photoCredit', entryForm.photoCredit)
    if (entryFiles) {
      Array.from(entryFiles).forEach((file) => formData.append('images', file))
    }
    await adminApi.post('/entries', formData)
    setEntryForm({ taxonId: '', department: '', observedAt: '', biotope: '', photoCredit: '' })
    setEntryFiles(null)
    await loadAll()
  }

  async function updateEntry(event: FormEvent) {
    event.preventDefault()
    if (!selectedEntryId) return
    await adminApi.put(`/entries/${selectedEntryId}`, entryForm)
    await loadAll()
  }

  async function deleteEntry(id: string) {
    await adminApi.delete(`/entries/${id}`)
    await loadAll()
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
