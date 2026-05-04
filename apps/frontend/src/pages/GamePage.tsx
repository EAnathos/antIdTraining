import { useEffect, useState } from 'react'
import { api, backendOrigin } from '../lib/api'
import { getResponsiveImageProps } from '../lib/image'
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
    size?: string | null
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
  const [imageLoadFailed, setImageLoadFailed] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; index: number } | null>(null)
  const [sessionScore, setSessionScore] = useState(0)
  const isConnected = typeof window !== 'undefined' && !!window.localStorage.getItem('antidtraining-auth-token')

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
    setImageLoadFailed(false)
    setFullscreenImage(null)
  }

  function applyScoreDelta(correct: boolean) {
    setSessionScore((current) => current + (correct ? 5 : -2))
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
      setImageLoadFailed(false)
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  function goToPreviousImage() {
    if (!question || !Array.isArray(question.images) || question.images.length <= 1) return
    setImageLoadFailed(false)
    setCurrentImageIndex((index) => (index - 1 + question.images.length) % question.images.length)
  }

  function goToNextImage() {
    if (!question || !Array.isArray(question.images) || question.images.length <= 1) return
    setImageLoadFailed(false)
    setCurrentImageIndex((index) => (index + 1) % question.images.length)
  }

  useEffect(() => {
    if (!question || !Array.isArray(question.images) || question.images.length <= 1) {
      return
    }

    const currentImageUrl = `${backendOrigin}${question.images[currentImageIndex]}`
    const previousImageUrl = `${backendOrigin}${question.images[(currentImageIndex - 1 + question.images.length) % question.images.length]}`
    const nextImageUrl = `${backendOrigin}${question.images[(currentImageIndex + 1) % question.images.length]}`

    const preloadCurrent = new Image()
    preloadCurrent.src = currentImageUrl

    const preloadPrevious = new Image()
    preloadPrevious.src = previousImageUrl

    const preloadNext = new Image()
    preloadNext.src = nextImageUrl
  }, [currentImageIndex, question])

  const fallbackSubfamilyChoices = question
    ? Array.isArray(question.choices)
      ? question.choices
      : Array.isArray(question.choices?.subfamily)
        ? question.choices.subfamily
        : []
    : [];

  const subfamilyChoices = Array.isArray(subfamilyOptions) && subfamilyOptions.length > 0 ? subfamilyOptions : fallbackSubfamilyChoices;

  const fallbackGenusChoices = question && !Array.isArray(question.choices) && Array.isArray(question.choices?.genus)
    ? question.choices.genus
    : [];
  const genusChoices = Array.isArray(dynamicGenusOptions) && dynamicGenusOptions.length > 0 ? dynamicGenusOptions : fallbackGenusChoices;

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
        applyScoreDelta(true)
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
      applyScoreDelta(false)
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
    applyScoreDelta(data.correct)
    setResult(data)
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Lancer un niveau</h2>
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {isConnected ? (
          <>
            Chaque bonne réponse vaut 5 points, chaque mauvaise réponse enlève 2 points.
          </>
        ) : (
          <>
            Vous pouvez jouer sans être connecté. Créez un compte joueur si vous voulez suivre votre progression dans le classement. Chaque bonne réponse vaut 5 points, chaque mauvaise réponse enlève 2 points.
          </>
        )}
      </p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Score de la session : <span className="font-semibold text-slate-900">{sessionScore}</span>
      </div>

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

              <button
                type="button"
                onClick={() => setFullscreenImage({ url: question.images[currentImageIndex], index: currentImageIndex })}
                className="absolute right-12 top-2 z-10 rounded-lg bg-white/90 px-2 py-1 text-sm text-slate-900 shadow-sm hover:bg-white"
                aria-label="Agrandir l'image"
                title="Agrandir l'image"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>

              <div className="flex justify-center rounded-lg bg-slate-50 p-2">
                {imageLoadFailed ? (
                  <div className="flex h-[40vh] w-full max-w-3xl items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-center text-slate-600">
                    Impossible de charger cette image. Passe à la suivante ou recharge la question.
                  </div>
                ) : (
                  <img
                    className="max-h-[70vh] w-auto max-w-full cursor-zoom-in rounded-lg object-contain"
                    {...getResponsiveImageProps(question.images[currentImageIndex], {
                      sizes: '(max-width: 768px) 100vw, 70vw',
                    })}
                    alt={`Spécimen ${currentImageIndex + 1}`}
                    loading="eager"
                    decoding="async"
                    onError={() => setImageLoadFailed(true)}
                    onLoad={() => setImageLoadFailed(false)}
                    onClick={() => setFullscreenImage({ url: question.images[currentImageIndex], index: currentImageIndex })}
                  />
                )}
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
              {question.details.size && (
                <p>
                  <span className="font-semibold">Taille :</span> {question.details.size}
                </p>
              )}
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
              <p className="font-medium text-amber-600">Correct : sous-famille validée</p>

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
              <p className={`font-medium ${result.correct ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.correct ? 'Correct' : `Faux${result.reason ? ` : ${result.reason}` : ''}`}
              </p>

              <div className="space-y-3">
                {result.identification?.subfamily.value && (
                  <p>
                    <span className="font-semibold">Sous-famille attendue :</span> {result.identification.subfamily.value}
                  </p>
                )}

                {result.identification?.size && (
                  <p>
                    <span className="font-semibold">Taille :</span> {result.identification.size}
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

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50"
              onClick={() => setFullscreenImage(null)}
              aria-label="Fermer"
            >
              ✕
            </button>

            <img
              {...getResponsiveImageProps(fullscreenImage.url, {
                sizes: '(max-width: 768px) 95vw, 80vw',
              })}
              alt={`Spécimen agrandis ${fullscreenImage.index + 1}`}
              className="max-h-[90vh] max-w-[90vw] rounded-lg border border-slate-200 bg-white object-contain"
              decoding="async"
            />
          </div>
        </div>
      )}
    </section>
  )
}
