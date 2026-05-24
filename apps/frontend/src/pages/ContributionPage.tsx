import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { api, backendOrigin } from '../lib/api'
import { getResponsiveImageProps } from '../lib/image'
import type { EntryProposal, Suggestion } from '../types/models'

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

export function ContributionPage() {
  const [isConnected, setIsConnected] = useState(() => typeof window !== 'undefined' && !!window.localStorage.getItem('antidtraining-auth-token'))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'contributions' | 'entry' | 'suggestion'>('contributions')
  const [proposals, setProposals] = useState<EntryProposal[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [counts, setCounts] = useState({ proposalCount: 0, proposalLimit: 20, suggestionCount: 0, suggestionLimit: 10 })
  const [subfamilies, setSubfamilies] = useState<string[]>([])
  const [generaOptions, setGeneraOptions] = useState<string[]>([])
  const [subgenusOptions, setSubgenusOptions] = useState<string[]>([])
  const [speciesGroupOptions, setSpeciesGroupOptions] = useState<string[]>([])
  const [speciesOptions, setSpeciesOptions] = useState<string[]>([])
  const [entryFiles, setEntryFiles] = useState<FileList | null>(null)
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntryForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [proposalPreview, setProposalPreview] = useState<{ images: string[]; index: number; alt: string } | null>(null)
  const suggestionFormRef = useRef<HTMLFormElement | null>(null)

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('antidtraining-auth-token') : null
  const username = typeof window !== 'undefined' ? window.localStorage.getItem('antidtraining-auth-username') ?? '' : ''

  const authApi = useMemo(() => api.create({ baseURL: '/api', headers: token ? { Authorization: `Bearer ${token}` } : {} }), [token])

  function resolveImageUrl(imageUrl: string) {
    if (!imageUrl) return imageUrl

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }

    return `${backendOrigin}${imageUrl}`
  }

  function patchEntryForm(patch: Partial<EntryForm>) {
    setEntryForm({ ...entryForm, ...patch })
  }

  async function handleSpeciesSelectChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const genus = entryForm.genus
    const baseForm = { ...entryForm, species: value }
    setEntryForm(baseForm)

    if (!value || !genus) return

    try {
      const { data } = await api.get<SpeciesMetadata>('/taxons/species-metadata', {
        params: { genus, species: value },
      })
      setEntryForm({
        ...baseForm,
        subgenus: data.subgenus ?? '',
        speciesGroup: data.speciesGroup ?? '',
      })
    } catch {
      // ignore errors
    }
  }

  useEffect(() => {
    const syncAuthState = () => {
      setIsConnected(!!window.localStorage.getItem('antidtraining-auth-token'))
    }

    window.addEventListener('antidtraining-auth-changed', syncAuthState)
    window.addEventListener('storage', syncAuthState)

    return () => {
      window.removeEventListener('antidtraining-auth-changed', syncAuthState)
      window.removeEventListener('storage', syncAuthState)
    }
  }, [])

  useEffect(() => {
    void api.get<string[]>('/taxons/subfamilies').then(({ data }) => setSubfamilies(data)).catch(() => setSubfamilies([]))
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!entryForm.subfamily) {
      setGeneraOptions([])
      return () => {
        cancelled = true
      }
    }

    void api
      .get<string[]>('/taxons/genera', {
        params: { subfamily: entryForm.subfamily },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setGeneraOptions(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneraOptions([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [entryForm.subfamily])

  useEffect(() => {
    let cancelled = false
    if (!entryForm.genus) {
      setSpeciesOptions([])
      setSubgenusOptions([])
      setSpeciesGroupOptions([])
      return () => {
        cancelled = true
      }
    }

    void Promise.all([
      api.get<string[]>('/taxons/species', { params: { genus: entryForm.genus } }),
      api.get<string[]>('/taxons/subgenera', { params: { genus: entryForm.genus } }),
      api.get<string[]>('/taxons/species-groups', { params: { genus: entryForm.genus } }),
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
  }, [entryForm.genus])

  const load = useMemo(() => async () => {
    if (!token) return
    setLoading(true)
    try {
      const [contribRes, countsRes] = await Promise.all([
        authApi.get<{ proposals: EntryProposal[]; suggestions: Suggestion[] }>('/entry-proposals/my-contributions'),
        authApi.get<{ proposalCount: number; proposalLimit: number; suggestionCount: number; suggestionLimit: number }>('/entry-proposals/user-counts'),
      ])
      setProposals(contribRes.data.proposals)
      setSuggestions(contribRes.data.suggestions)
      setCounts(countsRes.data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible de charger les contributions.')
    } finally {
      setLoading(false)
    }
  }, [authApi, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (view !== 'contributions') {
      return
    }

    void load()
  }, [view, load])

  async function submitSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    const formElement = suggestionFormRef.current
    if (!formElement) {
      setMessage('Impossible de retrouver le formulaire de suggestion.')
      return
    }
    const form = new FormData(formElement)
    try {
      await api.post('/suggestions', {
        name: username || null,
        email: null,
        message: String(form.get('message') ?? '').trim(),
      })
      formElement.reset()
      await load()
      setView('contributions')
      setMessage('Suggestion envoyée.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’envoyer la suggestion.')
    }
  }

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      const taxonLevel = entryForm.species ? 'SPECIES' : entryForm.genus ? 'GENUS' : 'SUBFAMILY'
      const taxonValue = entryForm.species ? entryForm.species.trim() : entryForm.genus ? entryForm.genus.trim() : entryForm.subfamily.trim()

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

      setEntryForm(emptyEntryForm)
      setEntryFiles(null)
      await load()
      setView('contributions')
      setMessage('Proposition envoyée.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’envoyer la proposition.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Contribution</h2>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">Vous devez être connecté pour accéder à cette section.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Contribution</h2>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-end">
          <button className={`w-full rounded-lg px-3 py-2 text-left sm:w-auto ${view === 'contributions' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`} onClick={() => setView('contributions')}>Mes contributions</button>
          <button className={`w-full rounded-lg px-3 py-2 text-left sm:w-auto ${view === 'entry' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`} onClick={() => setView('entry')}>Proposer une entrée</button>
          <button className={`w-full rounded-lg px-3 py-2 text-left sm:w-auto ${view === 'suggestion' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`} onClick={() => setView('suggestion')}>Suggestion</button>
        </div>
      </div>

      {message && <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{message}</p>}

      {view === 'contributions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-slate-600">Entrées proposées</p><p className="text-2xl font-bold text-slate-900">{counts.proposalCount}/{counts.proposalLimit}</p></div>
            <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-slate-600">Suggestions</p><p className="text-2xl font-bold text-slate-900">{counts.suggestionCount}/{counts.suggestionLimit}</p></div>
          </div>

          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.subfamily} · {p.genus ?? '-'} · {p.species ?? '-'}</p>
                    <p className="text-xs text-slate-600">{p.department} · {p.caste}</p>
                  </div>
                  <span className={`rounded border px-2 py-1 text-xs ${p.status === 'PENDING' ? 'border-slate-200 bg-slate-100 text-slate-700' : p.status === 'ACCEPTED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{p.status}</span>
                </div>
                {p.images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        className="overflow-hidden rounded border border-slate-200 bg-slate-50"
                        onClick={() =>
                          setProposalPreview({
                            images: p.images.map((proposalImage) => resolveImageUrl(proposalImage.imageUrl)),
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
                  <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <p className="mb-1 font-semibold uppercase tracking-wide">Message de l'administration</p>
                    <p className="whitespace-pre-wrap">{p.rejectionMessage}</p>
                  </div>
                )}
              </div>
            ))}
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <p className="whitespace-pre-wrap">{s.message}</p>
                  <span className={`rounded border px-2 py-1 text-xs ${s.status === 'PENDING' ? 'border-slate-200 bg-slate-100 text-slate-700' : s.status === 'PROCESSED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{s.status}</span>
                </div>
                {s.rejectionMessage && (
                  <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <p className="mb-1 font-semibold uppercase tracking-wide">Message de l'administration</p>
                    <p className="whitespace-pre-wrap">{s.rejectionMessage}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'entry' && (
        <form className="space-y-4" onSubmit={submitProposal}>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Sélection du taxon</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="rounded border p-2"
                value={entryForm.subfamily}
                onChange={(e) => patchEntryForm({ subfamily: e.target.value, genus: '', species: '', subgenus: '', speciesGroup: '' })}
                required
              >
                <option value="">Sous-famille</option>
                {subfamilies.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.genus}
                onChange={(e) => patchEntryForm({ genus: e.target.value, species: '', subgenus: '', speciesGroup: '' })}
                disabled={!entryForm.subfamily}
              >
                <option value="">Genre (optionnel)</option>
                {generaOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.subgenus}
                onChange={(e) => patchEntryForm({ subgenus: e.target.value, species: '' })}
                disabled={!entryForm.genus}
              >
                <option value="">Sous-genre (optionnel)</option>
                {subgenusOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.speciesGroup}
                onChange={(e) => patchEntryForm({ speciesGroup: e.target.value, species: '' })}
                disabled={!entryForm.genus}
              >
                <option value="">Groupe d'espèce (optionnel)</option>
                {speciesGroupOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.species}
                onChange={handleSpeciesSelectChange}
                disabled={!entryForm.genus}
              >
                <option value="">Espèce (optionnel)</option>
                {speciesOptions.map((value) => (
                  <option key={`${entryForm.genus}-${value}`} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.caste}
                onChange={(e) => patchEntryForm({ caste: e.target.value as EntryCaste | '' })}
                required
              >
                <option value="">Choisir la caste</option>
                <option value="WORKER">Ouvrière</option>
                <option value="QUEEN">Reine</option>
                <option value="MALE">Mâle</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Détails de l'observation</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded border p-2"
                list="department-suggestions"
                placeholder="Département (ex: 53 - Mayenne, 2A, 974)"
                value={entryForm.department}
                onChange={(e) => patchEntryForm({ department: e.target.value })}
                onBlur={(e) => patchEntryForm({ department: parseDepartmentInput(e.target.value) })}
                required
              />
              <datalist id="department-suggestions">
                {departmentOptions.map((department) => (
                  <option key={department.code} value={`${department.code} - ${department.name}`} />
                ))}
              </datalist>
              <input className="rounded border p-2" type="date" value={entryForm.observedAt} onChange={(e) => patchEntryForm({ observedAt: e.target.value })} required />
              <input className="rounded border border-slate-200 p-2" placeholder="Biotope" value={entryForm.biotope} onChange={(e) => patchEntryForm({ biotope: e.target.value })} required />
              <input className="rounded border border-slate-200 p-2" placeholder="Crédit photo" value={entryForm.photoCredit} onChange={(e) => patchEntryForm({ photoCredit: e.target.value })} />
              <div className="space-y-1">
                <input className="w-full rounded border border-slate-200 p-2" type="file" accept="image/*" multiple onChange={(e) => setEntryFiles(e.target.files)} />
                <p className="text-xs text-slate-500">Images: 8 Mo max par fichier (jusqu'à 3).</p>
              </div>
            </div>
          </div>

          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer la proposition'}
          </button>
        </form>
      )}

      {view === 'suggestion' && (
        <form ref={suggestionFormRef} className="space-y-3" onSubmit={submitSuggestion}>
          <textarea name="message" className="min-h-32 w-full rounded-lg border border-slate-200 p-2" placeholder="Votre suggestion" required />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit" disabled={loading}>Envoyer la suggestion</button>
        </form>
      )}

      {proposalPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setProposalPreview(null)}
        >
          <div className="relative flex max-w-[95vw] flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow"
              onClick={() => setProposalPreview(null)}
            >
              Fermer
            </button>

            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-lg font-semibold text-slate-700 shadow disabled:cursor-not-allowed disabled:opacity-40 sm:-left-14"
              onClick={() =>
                setProposalPreview((current) =>
                  !current || current.images.length <= 1
                    ? current
                    : { ...current, index: (current.index - 1 + current.images.length) % current.images.length },
                )
              }
              disabled={proposalPreview.images.length <= 1}
              aria-label="Image précédente"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-lg font-semibold text-slate-700 shadow disabled:cursor-not-allowed disabled:opacity-40 sm:-right-14"
              onClick={() =>
                setProposalPreview((current) =>
                  !current || current.images.length <= 1
                    ? current
                    : { ...current, index: (current.index + 1) % current.images.length },
                )
              }
              disabled={proposalPreview.images.length <= 1}
              aria-label="Image suivante"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <img
              {...getResponsiveImageProps(proposalPreview.images[proposalPreview.index], {
                sizes: '(max-width: 768px) 90vw, 50vw',
              })}
              alt={proposalPreview.alt}
              className="max-h-[85vh] max-w-[92vw] rounded-lg border border-slate-200 bg-white object-contain"
              decoding="async"
            />

            <p className="mt-2 text-center text-xs text-slate-200">
              Image {proposalPreview.index + 1}/{proposalPreview.images.length}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

