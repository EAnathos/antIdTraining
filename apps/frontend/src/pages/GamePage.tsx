import { useEffect, useRef, useState } from 'react'
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

const DEPARTMENT_NAMES: Record<string, string> = {
  '01': 'Ain',
  '02': 'Aisne',
  '03': 'Allier',
  '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes',
  '06': 'Alpes-Maritimes',
  '07': 'Ardèche',
  '08': 'Ardennes',
  '09': 'Ariège',
  '10': 'Aube',
  '11': 'Aude',
  '12': 'Aveyron',
  '13': 'Bouches-du-Rhône',
  '14': 'Calvados',
  '15': 'Cantal',
  '16': 'Charente',
  '17': 'Charente-Maritime',
  '18': 'Cher',
  '19': 'Corrèze',
  '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse',
  '21': "Côte-d'Or",
  '22': "Côtes-d'Armor",
  '23': 'Creuse',
  '24': 'Dordogne',
  '25': 'Doubs',
  '26': 'Drôme',
  '27': 'Eure',
  '28': 'Eure-et-Loir',
  '29': 'Finistère',
  '30': 'Gard',
  '31': 'Haute-Garonne',
  '32': 'Gers',
  '33': 'Gironde',
  '34': 'Hérault',
  '35': 'Ille-et-Vilaine',
  '36': 'Indre',
  '37': 'Indre-et-Loire',
  '38': 'Isère',
  '39': 'Jura',
  '40': 'Landes',
  '41': 'Loir-et-Cher',
  '42': 'Loire',
  '43': 'Haute-Loire',
  '44': 'Loire-Atlantique',
  '45': 'Loiret',
  '46': 'Lot',
  '47': 'Lot-et-Garonne',
  '48': 'Lozère',
  '49': 'Maine-et-Loire',
  '50': 'Manche',
  '51': 'Marne',
  '52': 'Haute-Marne',
  '53': 'Mayenne',
  '54': 'Meurthe-et-Moselle',
  '55': 'Meuse',
  '56': 'Morbihan',
  '57': 'Moselle',
  '58': 'Nièvre',
  '59': 'Nord',
  '60': 'Oise',
  '61': 'Orne',
  '62': 'Pas-de-Calais',
  '63': 'Puy-de-Dôme',
  '64': 'Pyrénées-Atlantiques',
  '65': 'Hautes-Pyrénées',
  '66': 'Pyrénées-Orientales',
  '67': 'Bas-Rhin',
  '68': 'Haut-Rhin',
  '69': 'Rhône',
  '71': 'Saône-et-Loire',
  '72': 'Sarthe',
  '73': 'Savoie',
  '74': 'Haute-Savoie',
  '75': 'Paris',
  '76': 'Seine-Maritime',
  '77': 'Seine-et-Marne',
  '78': 'Yvelines',
  '79': 'Deux-Sèvres',
  '80': 'Somme',
  '81': 'Tarn',
  '82': 'Tarn-et-Garonne',
  '83': 'Var',
  '84': 'Vaucluse',
  '85': 'Vendée',
  '86': 'Vienne',
  '87': 'Haute-Vienne',
  '88': 'Vosges',
  '89': 'Yonne',
  '90': 'Territoire de Belfort',
  '91': 'Essonne',
  '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne',
  '95': "Val-d'Oise",
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'Guyane',
  '974': 'La Réunion',
  '976': 'Mayotte',
}

const CASTE_LABELS: Record<string, string> = {
  WORKER: 'Ouvrière',
  QUEEN: 'Reine',
  MALE: 'Mâle',
}

export function GamePage() {
  const [level, setLevel] = useState<ActiveLevel>('easy')
  const [question, setQuestion] = useState<GameQuestion | null>(null)
  const [selectedSubfamily, setSelectedSubfamily] = useState('')
  const [selectedGenus, setSelectedGenus] = useState('')
  const [result, setResult] = useState<GameValidation | null>(null)
  const [subfamilyValidation, setSubfamilyValidation] =
    useState<GameValidation | null>(null)
  const [mediumStep, setMediumStep] = useState<MediumStep>('subfamily')
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [subfamilyOptions, setSubfamilyOptions] = useState<string[]>([])
  const [dynamicGenusOptions, setDynamicGenusOptions] = useState<string[]>([])
  const [imageLoadFailed, setImageLoadFailed] = useState(false)
  const [casteRevealed, setCasteRevealed] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<{
    url: string
  } | null>(null)
  const [sessionScore, setSessionScore] = useState(0)
  const fullscreenTouchStartX = useRef<number | null>(null)
  const isConnected =
    typeof window !== 'undefined' &&
    !!window.localStorage.getItem('antidtraining-auth-role')

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
    setMediumStep('subfamily')
    setCurrentImageIndex(0)
    setDynamicGenusOptions([])
    setImageLoadFailed(false)
    setFullscreenImage(null)
  }

  function getScoreDelta(
    step: 'subfamily' | 'genus' | 'species',
    correct: boolean,
  ) {
    if (!correct) {
      return step === 'subfamily' ? -2 : -5
    }

    if (step === 'subfamily') {
      return 5
    }

    if (step === 'genus') {
      return 10
    }

    return 15
  }

  function handleLevelChange(nextLevel: ActiveLevel) {
    setLevel(nextLevel)
    resetGameState()
  }

  async function loadQuestion() {
    resetGameState()
    setIsLoadingQuestion(true)
    try {
      const { data } = await api.get<GameQuestion>('/game/question', {
        params: { level },
      })
      setQuestion(data)
      setCasteRevealed(false)
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  function goToPreviousImage() {
    if (!question || question.images.length <= 1) return
    setImageLoadFailed(false)
    setCurrentImageIndex(
      (index) => (index - 1 + question.images.length) % question.images.length,
    )
  }

  function goToNextImage() {
    if (!question || question.images.length <= 1) return
    setImageLoadFailed(false)
    setCurrentImageIndex((index) => (index + 1) % question.images.length)
  }

  useEffect(() => {
    if (!question || question.images.length <= 1) return

    const previousImageUrl = `${backendOrigin}${question.images[(currentImageIndex - 1 + question.images.length) % question.images.length]}`
    const nextImageUrl = `${backendOrigin}${question.images[(currentImageIndex + 1) % question.images.length]}`

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
    : []

  const subfamilyChoices =
    Array.isArray(subfamilyOptions) && subfamilyOptions.length > 0
      ? subfamilyOptions
      : fallbackSubfamilyChoices

  const fallbackGenusChoices =
    question &&
    !Array.isArray(question.choices) &&
    Array.isArray(question.choices?.genus)
      ? question.choices.genus
      : []
  const genusChoices =
    Array.isArray(dynamicGenusOptions) && dynamicGenusOptions.length > 0
      ? dynamicGenusOptions
      : fallbackGenusChoices

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
        setSessionScore((s) => s + getScoreDelta('subfamily', true))
        try {
          const { data: generaData } = await api.get<string[]>(
            '/taxons/genera',
            {
              params: {
                subfamily: selectedSubfamily,
              },
            },
          )
          setDynamicGenusOptions(generaData)
        } catch {
          setDynamicGenusOptions([])
        }

        setSelectedGenus('')
        setSubfamilyValidation(data)
        setMediumStep('genus')
        return
      }

      setSubfamilyValidation(null)
      setSessionScore((s) => s + getScoreDelta('subfamily', false))
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
    }
    setSessionScore(
      (s) =>
        s +
        getScoreDelta(level === 'medium' ? 'genus' : 'subfamily', data.correct),
    )
    setResult(data)
  }

  return (
    <section className="game-card">
      <div className="game-card__header flex items-center justify-between gap-4 flex-wrap">
        <h2
          className="text-xl font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Lancer un niveau
        </h2>
        <span className="game-score-badge whitespace-nowrap">
          Score de la session : {sessionScore}
        </span>
      </div>
      <div className="game-card__body space-y-4">
        <p className="ui-alert ui-alert--success text-sm">
          {isConnected ? (
            <>
              Le nombre de points gagnés ou perdus dépend du niveau de
              difficulté.
            </>
          ) : (
            <>
              Vous pouvez jouer sans être connecté. Créez un compte joueur si
              vous voulez suivre votre progression dans le classement.
            </>
          )}
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            className={`game-level-card${level === 'easy' ? ' game-level-card--active' : ''}`}
            onClick={() => handleLevelChange('easy')}
          >
            <p className="game-level-card__label">Niveau simple</p>
            <p className="game-level-card__desc">Deviner la sous-famille.</p>
          </button>
          <button
            className={`game-level-card${level === 'medium' ? ' game-level-card--active' : ''}`}
            onClick={() => handleLevelChange('medium')}
          >
            <p className="game-level-card__label">Niveau moyen</p>
            <p className="game-level-card__desc">Sous-famille puis genre.</p>
          </button>
          <button
            className="game-level-card cursor-not-allowed opacity-50"
            disabled
          >
            <p className="game-level-card__label">Niveau difficile</p>
            <p className="game-level-card__desc">Bientôt disponible.</p>
          </button>
        </div>

        {!question && (
          <div className="flex justify-center">
            <button
              className="ui-button ui-button--primary disabled:cursor-not-allowed disabled:opacity-60"
              onClick={loadQuestion}
              disabled={isLoadingQuestion}
            >
              {isLoadingQuestion ? 'Chargement...' : 'Démarrer ce niveau'}
            </button>
          </div>
        )}

        {question && (
          <div className="space-y-3 rounded-[var(--app-radius-xl)] border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] p-4">
            <p className="font-medium text-[color:var(--app-text)]">
              {question.prompt}
            </p>
            {question.images.length > 0 && (
              <div className="game-specimen-image relative p-2">
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  disabled={question.images.length <= 1}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--app-surface-strong)] p-2 text-[color:var(--app-text)] shadow-md transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Photo précédente"
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
                  onClick={() =>
                    setFullscreenImage({
                      url: question.images[currentImageIndex],
                    })
                  }
                  className="absolute right-2 top-2 z-10 rounded-lg bg-[color:var(--app-surface-strong)]/90 px-2 py-1 text-sm text-[color:var(--app-text)] shadow-sm hover:bg-[color:var(--app-surface-strong)] sm:right-12"
                  aria-label="Agrandir l'image"
                  title="Agrandir l'image"
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
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>

                <div className="flex justify-center rounded-xl bg-[color:var(--app-surface-muted)] p-2">
                  {imageLoadFailed ? (
                    <div className="flex h-[40vh] w-full max-w-3xl items-center justify-center rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 text-center text-[color:var(--app-text-muted)]">
                      Impossible de charger cette image. Passe à la suivante ou
                      recharge la question.
                    </div>
                  ) : (
                    <img
                      className="max-h-[70vh] w-auto max-w-full cursor-zoom-in rounded-lg object-contain"
                      {...getResponsiveImageProps(
                        question.images[currentImageIndex],
                        {
                          sizes: '(max-width: 768px) 100vw, 70vw',
                        },
                      )}
                      alt={`Spécimen ${currentImageIndex + 1}`}
                      loading="eager"
                      decoding="async"
                      onError={() => setImageLoadFailed(true)}
                      onLoad={() => setImageLoadFailed(false)}
                      onClick={() =>
                        setFullscreenImage({
                          url: question.images[currentImageIndex],
                        })
                      }
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={goToNextImage}
                  disabled={question.images.length <= 1}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--app-surface-strong)] p-2 text-[color:var(--app-text)] shadow-md transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Photo suivante"
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

                <p className="pt-2 text-center text-xs text-[color:var(--app-text-soft)]">
                  Photo {currentImageIndex + 1}/{question.images.length}
                </p>
              </div>
            )}

            {question.details && (
              <div className="grid gap-2 rounded-xl bg-[color:var(--app-surface-muted)] p-3 text-sm text-[color:var(--app-text-muted)] md:grid-cols-2">
                {question.details.size && (
                  <p>
                    <span className="font-semibold">Taille :</span>{' '}
                    {question.details.size}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Département :</span>{' '}
                  {(() => {
                    const code = question.details.department.padStart(2, '0')
                    const name =
                      DEPARTMENT_NAMES[code] ??
                      DEPARTMENT_NAMES[question.details.department]
                    return name ? `${code} – ${name}` : code
                  })()}
                </p>
                <p>
                  <span className="font-semibold">Date :</span>{' '}
                  {new Date(question.details.observedAt).toLocaleDateString(
                    'fr-FR',
                  )}
                </p>
                <p>
                  <span className="font-semibold">Biotope :</span>{' '}
                  {question.details.biotope}
                </p>
                {question.details.caste && (
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">Caste :</span>{' '}
                    {casteRevealed ? (
                      <span>
                        {CASTE_LABELS[question.details.caste] ??
                          question.details.caste}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="rounded bg-[color:var(--app-border)] px-2 py-0.5 text-xs text-transparent hover:opacity-80 select-none"
                        onClick={() => setCasteRevealed(true)}
                        title="Cliquer pour révéler"
                      >
                        {CASTE_LABELS[question.details.caste] ??
                          question.details.caste}
                      </button>
                    )}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Crédit photo :</span>{' '}
                  {question.details.photoCredit}
                </p>
              </div>
            )}

            {level === 'medium' &&
              mediumStep === 'genus' &&
              subfamilyValidation && (
                <div className="space-y-2 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] p-3 text-sm text-[color:var(--app-text-muted)]">
                  <p className="font-medium text-[color:var(--app-warning)]">
                    Correct : sous-famille validée
                  </p>

                  {subfamilyValidation.identification?.subfamily.value && (
                    <p>
                      <span className="font-semibold">Sous-famille :</span>{' '}
                      {subfamilyValidation.identification.subfamily.value}
                    </p>
                  )}

                  {subfamilyValidation.identification?.subfamily
                    .description && (
                    <p>
                      <span className="font-semibold">Description :</span>{' '}
                      {subfamilyValidation.identification.subfamily.description}
                    </p>
                  )}

                  {!!subfamilyValidation.identification?.subfamily.criteria
                    ?.length && (
                    <div>
                      <p className="font-semibold">
                        Critère(s) d'identification :
                      </p>
                      <ul className="list-disc pl-6">
                        {subfamilyValidation.identification.subfamily.criteria.map(
                          (criterion) => (
                            <li key={criterion}>{criterion}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            {!result && !(level === 'medium' && mediumStep !== 'subfamily') && (
              <label className="block text-sm text-[color:var(--app-text-muted)]">
                Sous-famille
                <select
                  value={selectedSubfamily}
                  onChange={(e) => setSelectedSubfamily(e.target.value)}
                  className="ui-select mt-1"
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
              <label className="block text-sm text-[color:var(--app-text-muted)]">
                Genre
                <select
                  value={selectedGenus}
                  onChange={(e) => setSelectedGenus(e.target.value)}
                  className="ui-select mt-1"
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

            {!result && (
              <button
                className="ui-button ui-button--primary disabled:cursor-not-allowed disabled:opacity-60"
                onClick={validateAnswer}
                disabled={
                  !selectedSubfamily ||
                  (level === 'medium' &&
                    mediumStep === 'genus' &&
                    !selectedGenus) ||
                  (level === 'medium' && mediumStep === 'done')
                }
              >
                {level === 'medium' && mediumStep === 'subfamily'
                  ? 'Valider la sous-famille'
                  : level === 'medium'
                    ? 'Valider le genre'
                    : 'Valider'}
              </button>
            )}

            {result && (
              <div
                className={`space-y-4 text-sm ${result.correct ? 'game-result--correct' : 'game-result--incorrect'}`}
              >
                <p className="font-semibold">
                  {result.correct
                    ? 'Correct'
                    : `Faux${result.reason ? ` : ${result.reason}` : ''}`}
                </p>

                <div className="space-y-3">
                  {result.identification?.subfamily.value && (
                    <p>
                      <span className="font-semibold">
                        Sous-famille attendue :
                      </span>{' '}
                      {result.identification.subfamily.value}
                    </p>
                  )}

                  {result.identification?.size && (
                    <p>
                      <span className="font-semibold">Taille :</span>{' '}
                      {result.identification.size}
                    </p>
                  )}

                  {result.identification?.subfamily.description && (
                    <p>
                      <span className="font-semibold">Description :</span>{' '}
                      {result.identification.subfamily.description}
                    </p>
                  )}

                  {!!result.identification?.subfamily.criteria?.length && (
                    <div>
                      <p className="font-semibold">
                        Critère(s) d'identification (sous-famille) :
                      </p>
                      <ul className="list-disc pl-6">
                        {result.identification.subfamily.criteria.map(
                          (criterion) => (
                            <li key={criterion}>{criterion}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {level === 'medium' && (
                  <div className="space-y-3 pt-2">
                    {result.identification?.genus.value && (
                      <p>
                        <span className="font-semibold">Genre attendu :</span>{' '}
                        {result.identification.genus.value}
                      </p>
                    )}

                    {result.identification?.genus.description && (
                      <p>
                        <span className="font-semibold">
                          Description du genre :
                        </span>{' '}
                        {result.identification.genus.description}
                      </p>
                    )}

                    {!!result.identification?.genus.criteria?.length && (
                      <div>
                        <p className="font-semibold">
                          Critère(s) d'identification (genre) :
                        </p>
                        <ul className="list-disc pl-6">
                          {result.identification.genus.criteria.map(
                            (criterion) => (
                              <li key={criterion}>{criterion}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="pt-2">
                <button
                  className="ui-button ui-button--primary"
                  onClick={loadQuestion}
                >
                  Question suivante
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => {
              if (event.touches.length === 1) {
                fullscreenTouchStartX.current = event.touches[0].clientX
              }
            }}
            onTouchEnd={(event) => {
              if (
                fullscreenTouchStartX.current === null ||
                event.changedTouches.length === 0
              ) {
                return
              }

              const deltaX =
                event.changedTouches[0].clientX - fullscreenTouchStartX.current
              if (Math.abs(deltaX) > 50) {
                if (deltaX < 0) {
                  goToNextImage()
                } else {
                  goToPreviousImage()
                }
              }

              fullscreenTouchStartX.current = null
            }}
          >
            <button
              type="button"
              className="absolute right-2 top-2 rounded-sm bg-[color:var(--app-surface-strong)] px-2 py-1 text-xs font-semibold text-[color:var(--app-text)] shadow hover:bg-[color:var(--app-surface-muted)]"
              onClick={() => setFullscreenImage(null)}
              aria-label="Fermer"
            >
              ✕
            </button>

            <img
              {...getResponsiveImageProps(fullscreenImage.url, {
                sizes: '(max-width: 768px) 95vw, 80vw',
              })}
              alt={`Spécimen agrandis ${currentImageIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] object-contain"
              decoding="async"
            />
          </div>
        </div>
      )}
    </section>
  )
}
