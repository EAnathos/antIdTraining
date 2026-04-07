import { useState } from 'react'
import { api, backendOrigin } from '../lib/api'
import type { GameQuestion } from '../types/models'

type GameValidation = {
  correct: boolean
  reason?: string
  identification?: {
    subfamily: string | null
    description: string | null
    criteria: string[]
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
  const [mediumStep, setMediumStep] = useState<MediumStep>('subfamily')
  const [stepFeedback, setStepFeedback] = useState('')
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  function resetGameState() {
    setQuestion(null)
    setSelectedSubfamily('')
    setSelectedGenus('')
    setResult(null)
    setStepFeedback('')
    setMediumStep('subfamily')
    setCurrentImageIndex(0)
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
      setStepFeedback('')
      setMediumStep('subfamily')
      setCurrentImageIndex(0)
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

  const subfamilyChoices = question
    ? Array.isArray(question.choices)
      ? question.choices
      : question.choices.subfamily ?? []
    : []

  const genusChoices = question && !Array.isArray(question.choices) ? question.choices.genus ?? [] : []

  async function validateAnswer() {
    if (!question || !selectedSubfamily) return

    if (level === 'medium' && mediumStep === 'subfamily') {
      if (selectedSubfamily === question.answer.subfamily) {
        setStepFeedback('✅ Sous-famille correcte. Trouve maintenant le genre.')
        setMediumStep('genus')
        return
      }

      const { data } = await api.post<GameValidation>('/game/validate', {
        level: 'easy',
        entryId: question.entryId,
        selected: {
          subfamily: selectedSubfamily,
        },
      })
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
                ←
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
                →
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
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                {result.correct ? '✅ Correct' : `❌ Faux${result.reason ? ` : ${result.reason}` : ''}`}
              </p>

              {result.identification?.subfamily && (
                <p>
                  <span className="font-semibold">Sous-famille attendue :</span> {result.identification.subfamily}
                </p>
              )}

              {result.identification?.description && (
                <p>
                  <span className="font-semibold">Description :</span> {result.identification.description}
                </p>
              )}

              {!!result.identification?.criteria?.length && (
                <div>
                  <p className="font-semibold">Critère(s) d'identification :</p>
                  <ul className="list-disc pl-6">
                    {result.identification.criteria.map((criterion) => (
                      <li key={criterion}>{criterion}</li>
                    ))}
                  </ul>
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
