import { useEffect, useState } from 'react'
import { api, backendOrigin } from '../lib/api'
import type { GameQuestion } from '../types/models'

type GameValidation = {
  correct: boolean
  reason?: string
  identification?: {
    subfamily: {
      value: string | null
      description: string | null
      criteria: string[]
    }
    genus: {
      value: string | null
      description: string | null
      criteria: string[]
    }
  }
}

type ActiveLevel = 'easy' | 'medium'
type MediumStep = 'subfamily' | 'genus' | 'done'

function formatDepartment(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return ''

  const hyphenMatch = normalized.match(/^([0-9]{1,3}[A-Za-z]?)\s*-\s*(.+)$/)
  if (hyphenMatch) {
    const [, code, label] = hyphenMatch
    const formattedCode = /^\d+$/.test(code) ? code.padStart(2, '0') : code.toUpperCase()
    return `${formattedCode} - ${label.toLowerCase()}`
  }

  const spacedMatch = normalized.match(/^([0-9]{1,3}[A-Za-z]?)\s+(.+)$/)
  if (spacedMatch) {
    const [, code, label] = spacedMatch
    const formattedCode = /^\d+$/.test(code) ? code.padStart(2, '0') : code.toUpperCase()
    return `${formattedCode} - ${label.toLowerCase()}`
  }

  return normalized
}

export function GamePage() {
  const [level, setLevel] = useState<ActiveLevel>('easy')
  const [question, setQuestion] = useState<GameQuestion | null>(null)
  const [selectedSubfamily, setSelectedSubfamily] = useState('')
  const [selectedGenus, setSelectedGenus] = useState('')
  const [result, setResult] = useState<GameValidation | null>(null)
  const [subfamilyValidation, setSubfamilyValidation] = useState<GameValidation | null>(null)
  const [mediumStep, setMediumStep] = useState<MediumStep>('subfamily')
  const [stepFeedback, setStepFeedback] = useState('')
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [subfamilyOptions, setSubfamilyOptions] = useState<string[]>([])
  const [dynamicGenusOptions, setDynamicGenusOptions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    void api
      .get<string[]>('/taxons/subfamilies')
      .then(({ data }) => {
        if (!cancelled) {
          setSubfamilyOptions(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubfamilyOptions([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  function resetGameState() {
    setQuestion(null)
    setSelectedSubfamily('')
    setSelectedGenus('')
    setResult(null)
    setSubfamilyValidation(null)
    setStepFeedback('')
    setMediumStep('subfamily')
    setCurrentImageIndex(0)
    setDynamicGenusOptions([])
  }

  function handleLevelChange(nextLevel: ActiveLevel) {
    setLevel(nextLevel)
    resetGameState()
  }

  async function loadQuestion() {
    setIsLoadingQuestion(true)
    try {
      const { data } = await api.get<GameQuestion>('/game/question', {
        params: { level },
      })
      setQuestion(data)
      setSelectedSubfamily('')
      setSelectedGenus('')
      setResult(null)
      setSubfamilyValidation(null)
      setStepFeedback('')
      setMediumStep('subfamily')
      setCurrentImageIndex(0)
      setDynamicGenusOptions([])
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  function goToPreviousImage() {
    if (!question || question.images.length <= 1) return
    setCurrentImageIndex((index) => (index - 1 + question.images.length) % question.images.length)
  }

  function goToNextImage() {
    if (!question || question.images.length <= 1) return
    setCurrentImageIndex((index) => (index + 1) % question.images.length)
  }

  const fallbackSubfamilyChoices = question
    ? Array.isArray(question.choices)
      ? question.choices
      : question.choices.subfamily ?? []
    : []

  const subfamilyChoices = subfamilyOptions.length > 0 ? subfamilyOptions : fallbackSubfamilyChoices

  const fallbackGenusChoices = question && !Array.isArray(question.choices) ? question.choices.genus ?? [] : []
  const genusChoices = dynamicGenusOptions.length > 0 ? dynamicGenusOptions : fallbackGenusChoices

  async function validateAnswer() {
    if (!question || !selectedSubfamily) return

    if (level === 'medium' && mediumStep === 'subfamily') {
      const { data } = await api.post<GameValidation>('/game/validate', {
        level: 'easy',
        sessionId: question.sessionId,
        entryId: question.entryId,
        selected: {
          subfamily: selectedSubfamily,
        },
      })

      if (data.correct) {
        try {
          const { data: generaData } = await api.get<string[]>('/taxons/genera', {
            params: {
              subfamily: selectedSubfamily,
            },
          })
          setDynamicGenusOptions(generaData)
        } catch {
          setDynamicGenusOptions([])
        }

        setSelectedGenus('')
        setSubfamilyValidation(data)
        setStepFeedback('')
        setMediumStep('genus')
        return
      }

      setSubfamilyValidation(null)
      setStepFeedback('')
      setMediumStep('done')
      setResult(data)
      return
    }

    if (level === 'medium' && mediumStep === 'genus' && !selectedGenus) {
      return
    }

    const { data } = await api.post<GameValidation>('/game/validate', {
      level,
      sessionId: question.sessionId,
      entryId: question.entryId,
      selected: {
        subfamily: selectedSubfamily,
        genus: level === 'medium' ? selectedGenus : undefined,
      },
    })
    if (level === 'medium') {
      setMediumStep('done')
      setStepFeedback('')
    }
    setResult(data)
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Lancer un niveau</h2>

      <div className="grid gap-2 md:grid-cols-3">
        <button
          className={`rounded-lg border p-3 text-left ${level === 'easy' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
          onClick={() => handleLevelChange('easy')}
        >
          <p className="font-semibold">Niveau simple</p>
          <p className="text-sm text-slate-600">Deviner la sous-famille.</p>
        </button>
        <button
          className={`rounded-lg border p-3 text-left ${level === 'medium' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
          onClick={() => handleLevelChange('medium')}
        >
          <p className="font-semibold">Niveau moyen</p>
          <p className="text-sm text-slate-600">Sous-famille puis genre.</p>
        </button>
        <button className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 p-3 text-left opacity-60" disabled>
          <p className="font-semibold">Niveau difficile</p>
          <p className="text-sm text-slate-600">Bientôt disponible.</p>
        </button>
      </div>

      {!question && (
        <div className="flex justify-center">
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={loadQuestion}
            disabled={isLoadingQuestion}
          >
            {isLoadingQuestion ? 'Chargement...' : 'Démarrer ce niveau'}
          </button>
        </div>
      )}

      {question && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <p className="font-medium text-slate-800">{question.prompt}</p>
          {question.images.length > 0 && (
            <div className="relative rounded-lg bg-slate-100 p-2">
              <button
                type="button"
                onClick={goToPreviousImage}
                disabled={question.images.length <= 1}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Photo précédente"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <div className="flex justify-center rounded-lg bg-slate-50 p-2">
                <img
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
                  src={`${backendOrigin}${question.images[currentImageIndex]}`}
                  alt={`Spécimen ${currentImageIndex + 1}`}
                />
              </div>

              <button
                type="button"
                onClick={goToNextImage}
                disabled={question.images.length <= 1}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Photo suivante"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>

              <p className="pt-2 text-center text-xs text-slate-600">
                Photo {currentImageIndex + 1}/{question.images.length}
              </p>
            </div>
          )}

          {question.details && (
            <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-semibold">Département :</span> {formatDepartment(question.details.department)}
              </p>
              <p>
                <span className="font-semibold">Date :</span>{' '}
                {new Date(question.details.observedAt).toLocaleDateString('fr-FR')}
              </p>
              <p>
                <span className="font-semibold">Biotope :</span> {question.details.biotope}
              </p>
              <p>
                <span className="font-semibold">Crédit photo :</span> {question.details.photoCredit}
              </p>
            </div>
          )}

          {level === 'medium' && mediumStep === 'genus' && subfamilyValidation && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">✅ Correct — sous-famille validée</p>

              {subfamilyValidation.identification?.subfamily.value && (
                <p>
                  <span className="font-semibold">Sous-famille :</span> {subfamilyValidation.identification.subfamily.value}
                </p>
              )}

              {subfamilyValidation.identification?.subfamily.description && (
                <p>
                  <span className="font-semibold">Description :</span> {subfamilyValidation.identification.subfamily.description}
                </p>
              )}

              {!!subfamilyValidation.identification?.subfamily.criteria?.length && (
                <div>
                  <p className="font-semibold">Critère(s) d'identification :</p>
                  <ul className="list-disc pl-6">
                    {subfamilyValidation.identification.subfamily.criteria.map((criterion) => (
                      <li key={criterion}>{criterion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!result && !(level === 'medium' && mediumStep !== 'subfamily') && (
            <label className="block text-sm text-slate-700">
              Sous-famille
              <select
                value={selectedSubfamily}
                onChange={(e) => setSelectedSubfamily(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="">Choisir</option>
                {subfamilyChoices.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}

          {level === 'medium' && mediumStep !== 'subfamily' && !result && (
            <label className="block text-sm text-slate-700">
              Genre
              <select
                value={selectedGenus}
                onChange={(e) => setSelectedGenus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="">Choisir</option>
                {genusChoices.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}

          {stepFeedback && <p className="font-medium text-slate-900">{stepFeedback}</p>}

          {!result && (
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={validateAnswer}
              disabled={
                !selectedSubfamily ||
                (level === 'medium' && mediumStep === 'genus' && !selectedGenus) ||
                (level === 'medium' && mediumStep === 'done')
              }
            >
              {level === 'medium' && mediumStep === 'subfamily' ? 'Valider la sous-famille' : level === 'medium' ? 'Valider le genre' : 'Valider'}
            </button>
          )}

          {result && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                {result.correct ? '✅ Correct' : `❌ Faux${result.reason ? ` : ${result.reason}` : ''}`}
              </p>

              <div className="space-y-3">
                {result.identification?.subfamily.value && (
                  <p>
                    <span className="font-semibold">Sous-famille attendue :</span> {result.identification.subfamily.value}
                  </p>
                )}

                {result.identification?.subfamily.description && (
                  <p>
                    <span className="font-semibold">Description :</span> {result.identification.subfamily.description}
                  </p>
                )}

                {!!result.identification?.subfamily.criteria?.length && (
                  <div>
                    <p className="font-semibold">Critère(s) d'identification (sous-famille) :</p>
                    <ul className="list-disc pl-6">
                      {result.identification.subfamily.criteria.map((criterion) => (
                        <li key={criterion}>{criterion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {level === 'medium' && (
                <div className="space-y-3 pt-2">
                  {result.identification?.genus.value && (
                    <p>
                      <span className="font-semibold">Genre attendu :</span> {result.identification.genus.value}
                    </p>
                  )}

                  {result.identification?.genus.description && (
                    <p>
                      <span className="font-semibold">Description du genre :</span> {result.identification.genus.description}
                    </p>
                  )}

                  {!!result.identification?.genus.criteria?.length && (
                    <div>
                      <p className="font-semibold">Critère(s) d'identification (genre) :</p>
                      <ul className="list-disc pl-6">
                        {result.identification.genus.criteria.map((criterion) => (
                          <li key={criterion}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="pt-2">
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white" onClick={loadQuestion}>
                Question suivante
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
