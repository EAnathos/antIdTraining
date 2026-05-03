import type { AdminHistoryItem } from '../../types/models'

type Props = {
  history: AdminHistoryItem[]
}

const toneClasses: Record<AdminHistoryItem['tone'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function AdminHistoryPanel({ history }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Historique admin</h3>
        <p className="mt-1 text-sm text-slate-600">
          Les dernières actions réalisées dans le panneau d’administration sont affichées ici.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Aucun événement enregistré pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {history.map((item) => (
            <li key={item.id} className={`rounded-xl border p-4 ${toneClasses[item.tone]}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm opacity-90">{item.detail}</p>
                </div>
                <time className="text-xs font-medium uppercase tracking-wide opacity-70" dateTime={item.at}>
                  {new Date(item.at).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
