import { useMemo, useState } from 'react'
import { api, backendOrigin } from '../lib/api'
import type { GameQuestion } from '../types/models'

export function GamePage() {
  const [level, setLevel] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [question, setQuestion] = useState<GameQuestion | null>(null)
  const [selectedSubfamily, setSelectedSubfamily] = useState('')
  const [selectedGenus, setSelectedGenus] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState('')
  const [result, setResult] = useState<string>('')

  async function loadQuestion(nextLevel = level) {
    const { data } = await api.get<GameQuestion>('/game/question', {
      params: { level: nextLevel },
    })
    setQuestion(data)
    setSelectedSubfamily('')
    setSelectedGenus('')
    setSelectedSpecies('')
    setResult('')
  }

  const subfamilyChoices = useMemo(() => {
    if (!question) return []
    if (Array.isArray(question.choices)) return question.choices
    return question.choices.subfamily ?? []
  }, [question])

  const genusChoices = useMemo(() => {
    if (!question || Array.isArray(question.choices)) return []
    return question.choices.genus ?? []
  }, [question])

  const speciesChoices = useMemo(() => {
    if (!question || Array.isArray(question.choices)) return []
    return question.choices.species ?? []
  }, [question])

  async function validateAnswer() {
    if (!question) return
    const { data } = await api.post<{ correct: boolean; reason?: string }>('/game/validate', {
      level,
      selected: {
        subfamily: selectedSubfamily,
        genus: selectedGenus,
        species: selectedSpecies,
      },
      answer: question.answer,
    })
    setResult(data.correct ? '✅ Correct' : `❌ Faux${data.reason ? `: ${data.reason}` : ''}`)
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Lancer un niveau</h2>
      <div className="grid gap-2 md:grid-cols-3">
        <button
          className={`rounded-lg border p-3 text-left ${level === 'easy' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
          onClick={() => setLevel('easy')}
        >
          <p className="font-semibold">Niveau facile</p>
          <p className="text-sm text-slate-600">Identification jusqu'à la sous-famille.</p>
        </button>
        <button
          className={`rounded-lg border p-3 text-left ${level === 'medium' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
          onClick={() => setLevel('medium')}
        >
          <p className="font-semibold">Niveau moyen</p>
          <p className="text-sm text-slate-600">Sous-famille puis genre.</p>
        </button>
        <button
          className={`rounded-lg border p-3 text-left ${level === 'hard' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
          onClick={() => setLevel('hard')}
        >
          <p className="font-semibold">Niveau simple (espèce)</p>
          <p className="text-sm text-slate-600">Sous-famille, genre puis espèce.</p>
        </button>
      </div>

      <div className="flex justify-center">
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white" onClick={() => loadQuestion(level)}>
          Démarrer ce niveau
        </button>
      </div>

      {question && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <p className="font-medium text-slate-800">{question.prompt}</p>
          {question.image && (
            <img className="h-52 w-full rounded-lg object-cover" src={`${backendOrigin}${question.image}`} alt="Spécimen" />
          )}

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

          {level !== 'easy' && (
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

          {level === 'hard' && (
            <label className="block text-sm text-slate-700">
              Espèce
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="">Choisir</option>
                {speciesChoices.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white" onClick={validateAnswer}>
            Valider
          </button>
          {result && <p className="font-medium">{result}</p>}
        </div>
      )}
    </section>
  )
}
