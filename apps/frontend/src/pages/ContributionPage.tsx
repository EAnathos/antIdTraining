import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { api } from '../lib/api'
import {
  AUTH_CHANGED_EVENT,
  AUTH_ROLE_KEY,
  AUTH_USERNAME_KEY,
} from '../lib/authKeys'
import { resolveImageUrl } from '../lib/imageUrl'
import { getResponsiveImageProps } from '../lib/image'
import type { EntryProposal, Suggestion } from '../types/models'

type StatusFilter = 'all' | 'pending' | 'processed' | 'rejected'

function statusLabel(status: string): string {
  if (status === 'PENDING') return 'En attente'
  if (status === 'ACCEPTED') return 'Accepté'
  if (status === 'PROCESSED') return 'Traité'
  if (status === 'REJECTED') return 'Refusé'
  return status
}

const departmentOptions = [
  { code: '01', name: 'Ain' },
  { code: '02', name: 'Aisne' },
  { code: '03', name: 'Allier' },
  { code: '04', name: 'Alpes-de-Haute-Provence' },
  { code: '05', name: 'Hautes-Alpes' },
  { code: '06', name: 'Alpes-Maritimes' },
  { code: '07', name: 'Ardèche' },
  { code: '08', name: 'Ardennes' },
  { code: '09', name: 'Ariège' },
  { code: '10', name: 'Aube' },
  { code: '11', name: 'Aude' },
  { code: '12', name: 'Aveyron' },
  { code: '13', name: 'Bouches-du-Rhône' },
  { code: '14', name: 'Calvados' },
  { code: '15', name: 'Cantal' },
  { code: '16', name: 'Charente' },
  { code: '17', name: 'Charente-Maritime' },
  { code: '18', name: 'Cher' },
  { code: '19', name: 'Corrèze' },
  { code: '2A', name: 'Corse-du-Sud' },
  { code: '2B', name: 'Haute-Corse' },
  { code: '21', name: "Côte-d'Or" },
  { code: '22', name: "Côtes-d'Armor" },
  { code: '23', name: 'Creuse' },
  { code: '24', name: 'Dordogne' },
  { code: '25', name: 'Doubs' },
  { code: '26', name: 'Drôme' },
  { code: '27', name: 'Eure' },
  { code: '28', name: 'Eure-et-Loir' },
  { code: '29', name: 'Finistère' },
  { code: '30', name: 'Gard' },
  { code: '31', name: 'Haute-Garonne' },
  { code: '32', name: 'Gers' },
  { code: '33', name: 'Gironde' },
  { code: '34', name: 'Hérault' },
  { code: '35', name: 'Ille-et-Vilaine' },
  { code: '36', name: 'Indre' },
  { code: '37', name: 'Indre-et-Loire' },
  { code: '38', name: 'Isère' },
  { code: '39', name: 'Jura' },
  { code: '40', name: 'Landes' },
  { code: '41', name: 'Loir-et-Cher' },
  { code: '42', name: 'Loire' },
  { code: '43', name: 'Haute-Loire' },
  { code: '44', name: 'Loire-Atlantique' },
  { code: '45', name: 'Loiret' },
  { code: '46', name: 'Lot' },
  { code: '47', name: 'Lot-et-Garonne' },
  { code: '48', name: 'Lozère' },
  { code: '49', name: 'Maine-et-Loire' },
  { code: '50', name: 'Manche' },
  { code: '51', name: 'Marne' },
  { code: '52', name: 'Haute-Marne' },
  { code: '53', name: 'Mayenne' },
  { code: '54', name: 'Meurthe-et-Moselle' },
  { code: '55', name: 'Meuse' },
  { code: '56', name: 'Morbihan' },
  { code: '57', name: 'Moselle' },
  { code: '58', name: 'Nièvre' },
  { code: '59', name: 'Nord' },
  { code: '60', name: 'Oise' },
  { code: '61', name: 'Orne' },
  { code: '62', name: 'Pas-de-Calais' },
  { code: '63', name: 'Puy-de-Dôme' },
  { code: '64', name: 'Pyrénées-Atlantiques' },
  { code: '65', name: 'Hautes-Pyrénées' },
  { code: '66', name: 'Pyrénées-Orientales' },
  { code: '67', name: 'Bas-Rhin' },
  { code: '68', name: 'Haut-Rhin' },
  { code: '69', name: 'Rhône' },
  { code: '71', name: 'Saône-et-Loire' },
  { code: '72', name: 'Sarthe' },
  { code: '73', name: 'Savoie' },
  { code: '74', name: 'Haute-Savoie' },
  { code: '75', name: 'Paris' },
  { code: '76', name: 'Seine-Maritime' },
  { code: '77', name: 'Seine-et-Marne' },
  { code: '78', name: 'Yvelines' },
  { code: '79', name: 'Deux-Sèvres' },
  { code: '80', name: 'Somme' },
  { code: '81', name: 'Tarn' },
  { code: '82', name: 'Tarn-et-Garonne' },
  { code: '83', name: 'Var' },
  { code: '84', name: 'Vaucluse' },
  { code: '85', name: 'Vendée' },
  { code: '86', name: 'Vienne' },
  { code: '87', name: 'Haute-Vienne' },
  { code: '88', name: 'Vosges' },
  { code: '89', name: 'Yonne' },
  { code: '90', name: 'Territoire de Belfort' },
  { code: '91', name: 'Essonne' },
  { code: '92', name: 'Hauts-de-Seine' },
  { code: '93', name: 'Seine-Saint-Denis' },
  { code: '94', name: 'Val-de-Marne' },
  { code: '95', name: "Val-d'Oise" },
  { code: '971', name: 'Guadeloupe' },
  { code: '972', name: 'Martinique' },
  { code: '973', name: 'Guyane' },
  { code: '974', name: 'La Réunion' },
  { code: '976', name: 'Mayotte' },
]

function parseDepartmentInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const matchCodeWithLabel = trimmed.match(/^(\d{1,3}|2A|2B)\s*[-–—]/i)
  if (matchCodeWithLabel) {
    const cleaned = matchCodeWithLabel[1].toUpperCase()
    if (cleaned === '2A' || cleaned === '2B') return cleaned
    if (/^\d{1,3}$/.test(cleaned)) {
      if (cleaned.length <= 2) return cleaned.padStart(2, '0')
      return cleaned
    }
  }

  if (/^(\d{1,3}|2A|2B)$/i.test(trimmed)) {
    const cleaned = trimmed.toUpperCase()
    if (cleaned === '2A' || cleaned === '2B') return cleaned
    if (/^\d{1,3}$/.test(cleaned)) {
      if (cleaned.length <= 2) return cleaned.padStart(2, '0')
      return cleaned
    }
  }

  return trimmed
}

type SpeciesMetadata = {
  subgenus?: string | null
  speciesGroup?: string | null
}

type EntryCaste = 'WORKER' | 'QUEEN' | 'MALE'

type EntryForm = {
  subfamily: string
  genus: string
  subgenus: string
  species: string
  speciesGroup: string
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
  caste: EntryCaste | ''
}

const emptyEntryForm: EntryForm = {
  subfamily: '',
  genus: '',
  subgenus: '',
  species: '',
  speciesGroup: '',
  department: '',
  observedAt: '',
  biotope: '',
  photoCredit: '',
  caste: '',
}

function ProposalFormFields({
  form,
  onPatch,
  onFiles,
  subfamilies,
  isSubmitting,
  onSubmit,
  submitLabel,
  imageRequired = false,
  onCancel,
  existingImages,
  deletedImageIds,
  onToggleDeleteImage,
}: {
  form: EntryForm
  onPatch: (patch: Partial<EntryForm>) => void
  onFiles: (f: FileList | null) => void
  subfamilies: string[]
  isSubmitting: boolean
  onSubmit: () => void
  submitLabel: string
  imageRequired?: boolean
  onCancel?: () => void
  existingImages?: { id: string; imageUrl: string }[]
  deletedImageIds?: Set<string>
  onToggleDeleteImage?: (id: string) => void
}) {
  const [generaOptions, setGeneraOptions] = useState<string[]>([])
  const [subgenusOptions, setSubgenusOptions] = useState<string[]>([])
  const [speciesGroupOptions, setSpeciesGroupOptions] = useState<string[]>([])
  const [speciesOptions, setSpeciesOptions] = useState<string[]>([])

  useEffect(() => {
    if (!form.subfamily) {
      setGeneraOptions([])
      return
    }
    let cancelled = false
    void api
      .get<string[]>('/taxons/genera', {
        params: { subfamily: form.subfamily },
      })
      .then(({ data }) => {
        if (!cancelled) setGeneraOptions(data)
      })
      .catch(() => {
        if (!cancelled) setGeneraOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [form.subfamily])

  useEffect(() => {
    if (!form.genus) {
      setSpeciesOptions([])
      setSubgenusOptions([])
      setSpeciesGroupOptions([])
      return
    }
    let cancelled = false
    void Promise.all([
      api.get<string[]>('/taxons/species', { params: { genus: form.genus } }),
      api.get<string[]>('/taxons/subgenera', { params: { genus: form.genus } }),
      api.get<string[]>('/taxons/species-groups', {
        params: { genus: form.genus },
      }),
    ])
      .then(([speciesRes, subgenusRes, groupRes]) => {
        if (!cancelled) {
          setSpeciesOptions(speciesRes.data)
          setSubgenusOptions(subgenusRes.data)
          setSpeciesGroupOptions(groupRes.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpeciesOptions([])
          setSubgenusOptions([])
          setSpeciesGroupOptions([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [form.genus])

  async function handleSpeciesChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const genus = form.genus
    onPatch({ species: value })
    if (!value || !genus) return
    try {
      const { data } = await api.get<SpeciesMetadata>(
        '/taxons/species-metadata',
        { params: { genus, species: value } },
      )
      onPatch({
        species: value,
        subgenus: data.subgenus ?? '',
        speciesGroup: data.speciesGroup ?? '',
      })
    } catch {
      // ignore
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="surface-panel surface-panel--solid p-4">
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--app-text-muted)]">
          Sélection du taxon
        </h3>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            className="ui-select"
            value={form.subfamily}
            onChange={(e) =>
              onPatch({
                subfamily: e.target.value,
                genus: '',
                species: '',
                subgenus: '',
                speciesGroup: '',
              })
            }
            required
          >
            <option value="">Sous-famille</option>
            {subfamilies.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={form.genus}
            onChange={(e) =>
              onPatch({
                genus: e.target.value,
                species: '',
                subgenus: '',
                speciesGroup: '',
              })
            }
            disabled={!form.subfamily}
          >
            <option value="">Genre (optionnel)</option>
            {generaOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={form.subgenus}
            onChange={(e) => onPatch({ subgenus: e.target.value, species: '' })}
            disabled={!form.genus}
          >
            <option value="">Sous-genre (optionnel)</option>
            {subgenusOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={form.speciesGroup}
            onChange={(e) =>
              onPatch({ speciesGroup: e.target.value, species: '' })
            }
            disabled={!form.genus}
          >
            <option value="">Groupe d'espèce (optionnel)</option>
            {speciesGroupOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={form.species}
            onChange={handleSpeciesChange}
            disabled={!form.genus}
          >
            <option value="">Espèce (optionnel)</option>
            {speciesOptions.map((v) => (
              <option key={`${form.genus}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={form.caste}
            onChange={(e) =>
              onPatch({ caste: e.target.value as EntryCaste | '' })
            }
            required
          >
            <option value="">Choisir la caste</option>
            <option value="WORKER">Ouvrière</option>
            <option value="QUEEN">Reine</option>
            <option value="MALE">Mâle</option>
          </select>
        </div>
      </div>

      <div className="surface-panel surface-panel--solid p-4">
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--app-text-muted)]">
          Détails de l'observation
        </h3>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="ui-select"
            list="department-suggestions"
            placeholder="Département (ex: 53 - Mayenne, 2A, 974)"
            value={form.department}
            onChange={(e) => onPatch({ department: e.target.value })}
            onBlur={(e) =>
              onPatch({ department: parseDepartmentInput(e.target.value) })
            }
            required
          />
          <datalist id="department-suggestions">
            {departmentOptions.map((d) => (
              <option key={d.code} value={`${d.code} - ${d.name}`} />
            ))}
          </datalist>
          <input
            className="ui-select"
            type="date"
            value={form.observedAt}
            onChange={(e) => onPatch({ observedAt: e.target.value })}
            required
          />
          <div className="space-y-1">
            <textarea
              className="ui-input min-h-[80px] resize-y"
              placeholder="Biotope (ex: forêt mixte, prairie sèche...)"
              value={form.biotope}
              maxLength={50}
              onChange={(e) => onPatch({ biotope: e.target.value })}
              required
            />
            <p className="text-right text-xs text-[color:var(--app-text-soft)]">
              {form.biotope.length}/50
            </p>
          </div>
          <input
            className="ui-input"
            placeholder="Crédit photo (votre pseudo par défaut)"
            value={form.photoCredit}
            minLength={3}
            required
            onChange={(e) => onPatch({ photoCredit: e.target.value })}
          />
          <div className="space-y-2 md:col-span-2">
            {existingImages && existingImages.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[color:var(--app-text-muted)]">
                  Photos actuelles
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingImages.map((img) => {
                    const isDeleted = deletedImageIds?.has(img.id)
                    return (
                      <div key={img.id} className="relative">
                        <img
                          src={resolveImageUrl(img.imageUrl)}
                          alt="Photo actuelle"
                          className={`h-16 w-16 rounded-lg border object-cover transition-opacity ${isDeleted ? 'opacity-30' : 'border-[color:var(--app-border)]'}`}
                          loading="lazy"
                          decoding="async"
                          width={64}
                          height={64}
                        />
                        <button
                          type="button"
                          className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shadow ${isDeleted ? 'bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)]' : 'bg-red-500 text-white'}`}
                          onClick={() => onToggleDeleteImage?.(img.id)}
                          title={
                            isDeleted ? 'Annuler la suppression' : 'Supprimer'
                          }
                        >
                          {isDeleted ? '↩' : '×'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <input
                className="ui-input"
                type="file"
                accept="image/*"
                multiple
                required={imageRequired}
                onChange={(e) => onFiles(e.target.files)}
              />
              <p className="text-xs text-[color:var(--app-text-soft)]">
                {imageRequired
                  ? "Au moins 1 photo requise · 8 Mo max par fichier (jusqu'à 3)."
                  : "Laisser vide pour conserver les photos actuelles · 8 Mo max (jusqu'à 3)."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onCancel && (
          <button type="button" className="ui-button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="ui-button ui-button--primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Envoi...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export function ContributionPage() {
  const [isConnected, setIsConnected] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.localStorage.getItem(AUTH_ROLE_KEY),
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'contributions' | 'entry' | 'suggestion'>(
    'contributions',
  )
  const [proposals, setProposals] = useState<EntryProposal[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [counts, setCounts] = useState({
    proposalCount: 0,
    proposalLimit: 20,
    suggestionCount: 0,
    suggestionLimit: 10,
  })
  const [subfamilies, setSubfamilies] = useState<string[]>([])
  const [entryFiles, setEntryFiles] = useState<FileList | null>(null)
  const [entryForm, setEntryForm] = useState<EntryForm>(() => ({
    ...emptyEntryForm,
    photoCredit:
      typeof window !== 'undefined'
        ? (window.localStorage.getItem(AUTH_USERNAME_KEY) ?? '')
        : '',
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [proposalPreview, setProposalPreview] = useState<{
    images: string[]
    index: number
    alt: string
  } | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [editingProposalId, setEditingProposalId] = useState<string | null>(
    null,
  )
  const [editingProposalForm, setEditingProposalForm] =
    useState<EntryForm>(emptyEntryForm)
  const [editingProposalFiles, setEditingProposalFiles] =
    useState<FileList | null>(null)
  const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set())
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(
    null,
  )
  const [editingSuggestionTitle, setEditingSuggestionTitle] = useState('')
  const [editingSuggestionMessage, setEditingSuggestionMessage] = useState('')
  const [newSuggestionTitle, setNewSuggestionTitle] = useState('')
  const [newSuggestionMessage, setNewSuggestionMessage] = useState('')
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  const username =
    typeof window !== 'undefined'
      ? (window.localStorage.getItem(AUTH_USERNAME_KEY) ?? '')
      : ''

  const authApi = useMemo(() => api.create({ baseURL: '/api' }), [])

  function patchEntryForm(patch: Partial<EntryForm>) {
    setEntryForm((f) => ({ ...f, ...patch }))
  }

  useEffect(() => {
    const syncAuthState = () => {
      setIsConnected(!!window.localStorage.getItem(AUTH_ROLE_KEY))
    }

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState)
    window.addEventListener('storage', syncAuthState)

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState)
      window.removeEventListener('storage', syncAuthState)
    }
  }, [])

  useEffect(() => {
    void api
      .get<string[]>('/taxons/subfamilies')
      .then(({ data }) => setSubfamilies(data))
      .catch(() => setSubfamilies([]))
  }, [])

  const load = useCallback(async () => {
    if (!isConnected) return
    setLoading(true)
    try {
      const [contribRes, countsRes] = await Promise.all([
        authApi.get<{
          proposals: EntryProposal[]
          suggestions: Suggestion[]
        }>('/entry-proposals/my-contributions'),
        authApi.get<{
          proposalCount: number
          proposalLimit: number
          suggestionCount: number
          suggestionLimit: number
        }>('/entry-proposals/user-counts'),
      ])
      setProposals(contribRes.data.proposals)
      setSuggestions(contribRes.data.suggestions)
      setCounts(countsRes.data)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les contributions.',
      )
    } finally {
      setLoading(false)
    }
  }, [authApi, isConnected])

  useEffect(() => {
    if (view !== 'contributions') return
    void load()
  }, [view, load])

  const filteredProposals = useMemo(() => {
    if (statusFilter === 'pending')
      return proposals.filter((p) => p.status === 'PENDING')
    if (statusFilter === 'processed')
      return proposals.filter((p) => p.status === 'ACCEPTED')
    if (statusFilter === 'rejected')
      return proposals.filter((p) => p.status === 'REJECTED')
    return proposals
  }, [proposals, statusFilter])

  const filteredSuggestions = useMemo(() => {
    if (statusFilter === 'pending')
      return suggestions.filter((s) => s.status === 'PENDING')
    if (statusFilter === 'processed')
      return suggestions.filter((s) => s.status === 'PROCESSED')
    if (statusFilter === 'rejected')
      return suggestions.filter((s) => s.status === 'REJECTED')
    return suggestions
  }, [suggestions, statusFilter])

  const statusCounts = useMemo(() => {
    let pending = 0,
      processed = 0,
      rejected = 0
    for (const x of [...proposals, ...suggestions]) {
      if (x.status === 'PENDING') pending++
      else if (x.status === 'ACCEPTED' || x.status === 'PROCESSED') processed++
      else if (x.status === 'REJECTED') rejected++
    }
    return {
      all: proposals.length + suggestions.length,
      pending,
      processed,
      rejected,
    }
  }, [proposals, suggestions])

  async function submitEditSuggestion(id: string) {
    setIsEditSubmitting(true)
    try {
      const { data } = await authApi.patch<Suggestion>(`/suggestions/${id}`, {
        title: editingSuggestionTitle.trim() || null,
        message: editingSuggestionMessage,
      })
      setSuggestions((prev) => prev.map((s) => (s.id === id ? data : s)))
      setEditingSuggestionId(null)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la modification.',
      )
    } finally {
      setIsEditSubmitting(false)
    }
  }

  async function submitEditProposal(id: string) {
    setIsEditSubmitting(true)
    try {
      const formData = new FormData()
      const taxonLevel = editingProposalForm.species
        ? 'SPECIES'
        : editingProposalForm.genus
          ? 'GENUS'
          : 'SUBFAMILY'
      const taxonValue = editingProposalForm.species
        ? editingProposalForm.species.trim()
        : editingProposalForm.genus
          ? editingProposalForm.genus.trim()
          : editingProposalForm.subfamily.trim()

      formData.append('taxonLevel', taxonLevel)
      formData.append('taxonValue', taxonValue)
      if (editingProposalForm.species) {
        formData.append('taxonGenus', editingProposalForm.genus.trim())
      }
      formData.append('subgenus', editingProposalForm.subgenus.trim())
      formData.append('speciesGroup', editingProposalForm.speciesGroup.trim())
      formData.append(
        'department',
        parseDepartmentInput(editingProposalForm.department),
      )
      formData.append('observedAt', editingProposalForm.observedAt)
      formData.append('biotope', editingProposalForm.biotope.trim())
      formData.append(
        'photoCredit',
        editingProposalForm.photoCredit.trim() || username,
      )
      formData.append('caste', editingProposalForm.caste || 'WORKER')
      if (editingProposalFiles) {
        Array.from(editingProposalFiles).forEach((f) =>
          formData.append('images', f),
        )
      }
      formData.append('deleteImageIds', JSON.stringify([...deletedImageIds]))

      const { data } = await authApi.patch<EntryProposal>(
        `/entry-proposals/${id}`,
        formData,
      )
      setProposals((prev) => prev.map((p) => (p.id === id ? data : p)))
      setEditingProposalId(null)
      setEditingProposalFiles(null)
      setDeletedImageIds(new Set())
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la modification.',
      )
    } finally {
      setIsEditSubmitting(false)
    }
  }

  async function submitSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      await api.post('/suggestions', {
        title: newSuggestionTitle.trim() || null,
        message: newSuggestionMessage.trim(),
      })
      setNewSuggestionTitle('')
      setNewSuggestionMessage('')
      await load()
      setView('contributions')
      setMessage('Suggestion envoyée.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer la suggestion.",
      )
    }
  }

  async function submitProposal() {
    setMessage('')
    setIsSubmitting(true)

    try {
      if (!entryFiles || entryFiles.length === 0) {
        setMessage('Au moins une photo est requise.')
        setIsSubmitting(false)
        return
      }

      const formData = new FormData()
      const taxonLevel = entryForm.species
        ? 'SPECIES'
        : entryForm.genus
          ? 'GENUS'
          : 'SUBFAMILY'
      const taxonValue = entryForm.species
        ? entryForm.species.trim()
        : entryForm.genus
          ? entryForm.genus.trim()
          : entryForm.subfamily.trim()

      formData.append('taxonLevel', taxonLevel)
      formData.append('taxonValue', taxonValue)
      if (entryForm.species) {
        formData.append('taxonGenus', entryForm.genus.trim())
      }
      formData.append('subgenus', entryForm.subgenus.trim())
      formData.append('speciesGroup', entryForm.speciesGroup.trim())
      formData.append('department', parseDepartmentInput(entryForm.department))
      formData.append('observedAt', entryForm.observedAt)
      formData.append('biotope', entryForm.biotope.trim())
      formData.append('photoCredit', entryForm.photoCredit.trim() || username)
      formData.append('caste', entryForm.caste || 'WORKER')

      if (entryFiles && entryFiles.length > 0) {
        Array.from(entryFiles).forEach((file) => {
          formData.append('images', file)
        })
      }

      await authApi.post('/entry-proposals', formData)

      setEntryForm({ ...emptyEntryForm, photoCredit: username })
      setEntryFiles(null)
      await load()
      setView('contributions')
      setMessage('Proposition envoyée.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer la proposition.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <section className="surface-panel surface-panel--solid p-6">
        <h2 className="text-2xl font-semibold text-[color:var(--app-text)]">
          Contribution
        </h2>
        <p className="ui-alert ui-alert--warning mt-4">
          Vous devez être connecté pour accéder à cette section.
        </p>
      </section>
    )
  }

  return (
    <section className="surface-panel surface-panel--solid space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-[color:var(--app-text)]">
          Contribution
        </h2>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            className={`nav-action w-full sm:w-auto ${view === 'contributions' ? 'nav-action--active' : ''}`}
            onClick={() => setView('contributions')}
          >
            Mes contributions
          </button>
          <button
            className={`nav-action w-full sm:w-auto ${view === 'entry' ? 'nav-action--active' : ''}`}
            onClick={() => setView('entry')}
          >
            Proposer une entrée
          </button>
          <button
            className={`nav-action w-full sm:w-auto ${view === 'suggestion' ? 'nav-action--active' : ''}`}
            onClick={() => setView('suggestion')}
          >
            Suggestion
          </button>
        </div>
      </div>

      {message && <p className="ui-alert text-sm">{message}</p>}

      {view === 'contributions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-3">
              <p className="text-[color:var(--app-text-muted)]">
                Entrées en attente
              </p>
              <p className="text-2xl font-bold text-[color:var(--app-text)]">
                {counts.proposalCount}/{counts.proposalLimit}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-3">
              <p className="text-[color:var(--app-text-muted)]">
                Suggestions en attente
              </p>
              <p className="text-2xl font-bold text-[color:var(--app-text)]">
                {counts.suggestionCount}/{counts.suggestionLimit}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {(
              [
                ['all', 'Tous'],
                ['pending', 'En attente'],
                ['processed', 'Accepté · Traité'],
                ['rejected', 'Refusé'],
              ] as [StatusFilter, string][]
            ).map(([f, label]) => (
              <button
                key={f}
                className={`ui-tab ${statusFilter === f ? 'ui-tab--active' : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {label}{' '}
                <span className="ml-1 opacity-70">({statusCounts[f]})</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredProposals.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-3 text-sm"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {p.subfamily} · {p.genus ?? '-'} · {p.species ?? '-'}
                    </p>
                    <p className="text-xs text-[color:var(--app-text-soft)]">
                      {p.department} · {p.caste}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {p.status === 'PENDING' &&
                      (editingProposalId === p.id ? (
                        <button
                          type="button"
                          className="ui-tab text-xs"
                          onClick={() => setEditingProposalId(null)}
                        >
                          Annuler
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ui-tab text-xs"
                          onClick={() => {
                            setEditingProposalId(p.id)
                            setEditingProposalForm({
                              subfamily: p.subfamily,
                              genus: p.genus ?? '',
                              subgenus: p.subgenus ?? '',
                              species: p.species ?? '',
                              speciesGroup: p.speciesGroup ?? '',
                              department: p.department,
                              observedAt: p.observedAt.slice(0, 10),
                              biotope: p.biotope,
                              photoCredit: p.photoCredit,
                              caste: (p.caste as EntryCaste | null) ?? '',
                            })
                            setEditingProposalFiles(null)
                            setDeletedImageIds(new Set())
                          }}
                        >
                          Modifier
                        </button>
                      ))}
                    <span
                      className={`ui-chip text-xs ${p.status === 'PENDING' ? '' : p.status === 'ACCEPTED' ? 'ui-chip--success' : 'ui-chip--danger'}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>
                </div>
                {editingProposalId === p.id && (
                  <div className="mt-3 border-t border-[color:var(--app-border)] pt-3">
                    <ProposalFormFields
                      form={editingProposalForm}
                      onPatch={(patch) =>
                        setEditingProposalForm((f) => ({ ...f, ...patch }))
                      }
                      onFiles={setEditingProposalFiles}
                      subfamilies={subfamilies}
                      isSubmitting={isEditSubmitting}
                      onSubmit={() => void submitEditProposal(p.id)}
                      submitLabel="Sauvegarder"
                      onCancel={() => setEditingProposalId(null)}
                      existingImages={p.images}
                      deletedImageIds={deletedImageIds}
                      onToggleDeleteImage={(id) =>
                        setDeletedImageIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(id)) {
                            next.delete(id)
                          } else {
                            next.add(id)
                          }
                          return next
                        })
                      }
                    />
                  </div>
                )}
                {p.images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        className="overflow-hidden rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)]"
                        onClick={() =>
                          setProposalPreview({
                            images: p.images.map((proposalImage) =>
                              resolveImageUrl(proposalImage.imageUrl),
                            ),
                            index,
                            alt: `${p.subfamily} · ${p.genus ?? '-'} · ${p.species ?? '-'}`,
                          })
                        }
                      >
                        <img
                          src={resolveImageUrl(image.imageUrl)}
                          alt={`${p.subfamily} · ${p.genus ?? '-'} · ${p.species ?? '-'}`}
                          className="h-16 w-16 object-cover"
                          loading="lazy"
                          decoding="async"
                          width={64}
                          height={64}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {p.rejectionMessage && (
                  <div className="mt-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-3 py-2 text-xs text-[color:var(--app-text-muted)]">
                    <p className="mb-1 font-semibold uppercase tracking-wide">
                      Message de l'administration
                    </p>
                    <p className="whitespace-pre-wrap">{p.rejectionMessage}</p>
                  </div>
                )}
              </div>
            ))}
            {filteredSuggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-3 text-sm"
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    {s.title && (
                      <p className="mb-1 font-medium text-[color:var(--app-text)]">
                        {s.title}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-[color:var(--app-text-muted)]">
                      {s.message}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {s.status === 'PENDING' &&
                      (editingSuggestionId === s.id ? (
                        <button
                          type="button"
                          className="ui-tab text-xs"
                          onClick={() => setEditingSuggestionId(null)}
                        >
                          Annuler
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ui-tab text-xs"
                          onClick={() => {
                            setEditingSuggestionId(s.id)
                            setEditingSuggestionTitle(s.title ?? '')
                            setEditingSuggestionMessage(s.message)
                          }}
                        >
                          Modifier
                        </button>
                      ))}
                    <span
                      className={`ui-chip text-xs ${s.status === 'PENDING' ? '' : s.status === 'PROCESSED' ? 'ui-chip--success' : 'ui-chip--danger'}`}
                    >
                      {statusLabel(s.status)}
                    </span>
                  </div>
                </div>
                {editingSuggestionId === s.id && (
                  <div className="mt-3 space-y-2 border-t border-[color:var(--app-border)] pt-3">
                    <input
                      className="ui-input"
                      placeholder="Titre (optionnel)"
                      value={editingSuggestionTitle}
                      maxLength={150}
                      onChange={(e) =>
                        setEditingSuggestionTitle(e.target.value)
                      }
                    />
                    <textarea
                      className="ui-textarea"
                      value={editingSuggestionMessage}
                      minLength={10}
                      maxLength={5000}
                      onChange={(e) =>
                        setEditingSuggestionMessage(e.target.value)
                      }
                      required
                    />
                    <button
                      type="button"
                      className="ui-button ui-button--primary disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isEditSubmitting}
                      onClick={() => void submitEditSuggestion(s.id)}
                    >
                      {isEditSubmitting ? 'Enregistrement...' : 'Sauvegarder'}
                    </button>
                  </div>
                )}
                {s.rejectionMessage && (
                  <div className="mt-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-3 py-2 text-xs text-[color:var(--app-text-muted)]">
                    <p className="mb-1 font-semibold uppercase tracking-wide">
                      Message de l'administration
                    </p>
                    <p className="whitespace-pre-wrap">{s.rejectionMessage}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'entry' && (
        <ProposalFormFields
          form={entryForm}
          onPatch={patchEntryForm}
          onFiles={setEntryFiles}
          subfamilies={subfamilies}
          isSubmitting={isSubmitting}
          onSubmit={() => void submitProposal()}
          submitLabel="Envoyer la proposition"
          imageRequired
        />
      )}

      {view === 'suggestion' && (
        <form className="space-y-3" onSubmit={submitSuggestion}>
          <input
            className="ui-input"
            placeholder="Titre (optionnel)"
            maxLength={150}
            value={newSuggestionTitle}
            onChange={(e) => setNewSuggestionTitle(e.target.value)}
          />
          <textarea
            className="ui-textarea"
            placeholder="Votre suggestion"
            required
            value={newSuggestionMessage}
            onChange={(e) => setNewSuggestionMessage(e.target.value)}
          />
          <button
            className="ui-button ui-button--primary"
            type="submit"
            disabled={loading}
          >
            Envoyer la suggestion
          </button>
        </form>
      )}

      {proposalPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setProposalPreview(null)}
        >
          <div
            className="relative flex max-w-[95vw] flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-2 top-2 rounded-sm bg-[color:var(--app-surface-strong)] px-2 py-1 text-xs font-semibold text-[color:var(--app-text)] shadow"
              onClick={() => setProposalPreview(null)}
            >
              Fermer
            </button>

            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-sm bg-[color:var(--app-surface-strong)] px-3 py-2 text-lg font-semibold text-[color:var(--app-text)] shadow disabled:cursor-not-allowed disabled:opacity-40 sm:-left-14"
              onClick={() =>
                setProposalPreview((current) =>
                  !current || current.images.length <= 1
                    ? current
                    : {
                        ...current,
                        index:
                          (current.index - 1 + current.images.length) %
                          current.images.length,
                      },
                )
              }
              disabled={proposalPreview.images.length <= 1}
              aria-label="Image précédente"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm bg-[color:var(--app-surface-strong)] px-3 py-2 text-lg font-semibold text-[color:var(--app-text)] shadow disabled:cursor-not-allowed disabled:opacity-40 sm:-right-14"
              onClick={() =>
                setProposalPreview((current) =>
                  !current || current.images.length <= 1
                    ? current
                    : {
                        ...current,
                        index: (current.index + 1) % current.images.length,
                      },
                )
              }
              disabled={proposalPreview.images.length <= 1}
              aria-label="Image suivante"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <img
              {...getResponsiveImageProps(
                proposalPreview.images[proposalPreview.index],
                {
                  sizes: '(max-width: 768px) 90vw, 50vw',
                },
              )}
              alt={proposalPreview.alt}
              className="max-h-[85vh] max-w-[92vw] rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] object-contain"
              decoding="async"
            />

            <p className="mt-2 text-center text-xs text-[color:var(--app-text-inverse)]">
              Image {proposalPreview.index + 1}/{proposalPreview.images.length}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
