import { useState } from 'react'

type Props = {
  exportDatabaseSnapshot: () => Promise<void>
  importDatabaseSnapshot: (file: File) => Promise<void>
  cleanupUploads: () => Promise<void>
}

export function DatabaseToolsPanel({ exportDatabaseSnapshot, importDatabaseSnapshot, cleanupUploads }: Props) {
  const [importFile, setImportFile] = useState<File | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isCleaningUploads, setIsCleaningUploads] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportDatabaseSnapshot()
    } finally {
      setIsExporting(false)
    }
  }

  async function handleImport() {
    if (!importFile || !confirmReplace) {
      return
    }

    setIsImporting(true)
    try {
      await importDatabaseSnapshot(importFile)
      setImportFile(null)
      setConfirmReplace(false)
    } finally {
      setIsImporting(false)
    }
  }

  async function handleCleanupUploads() {
    setIsCleaningUploads(true)
    try {
      await cleanupUploads()
    } finally {
      setIsCleaningUploads(false)
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-slate-900">Export / Import base de données</h3>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-700">Télécharge une archive ZIP contenant la base et les images.</p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void handleExport()}
          disabled={isExporting}
        >
          {isExporting ? 'Export en cours...' : 'Exporter la base'}
        </button>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">Import (remplacement complet)</p>
        <p className="mt-1 text-sm text-amber-800">
          Cette action supprime les données actuelles et restaure le contenu du fichier sélectionné (format ZIP).
        </p>

        <input
          type="file"
          accept="application/zip,.zip,application/json,.json"
          className="mt-3 block w-full rounded-lg border border-amber-300 bg-white p-2 text-sm"
          onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
        />

        <label className="mt-3 flex items-start gap-2 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={confirmReplace}
            onChange={(event) => setConfirmReplace(event.target.checked)}
            className="mt-0.5"
          />
          <span>Je confirme vouloir remplacer toute la base de données.</span>
        </label>

        <button
          type="button"
          className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void handleImport()}
          disabled={!importFile || !confirmReplace || isImporting}
        >
          {isImporting ? 'Import en cours...' : 'Importer la base'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-900">Nettoyage des images</p>
        <p className="mt-1 text-sm text-slate-700">
          Supprime les fichiers non utilisés dans /uploads et recrée les variantes responsives manquantes pour les images référencées.
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void handleCleanupUploads()}
          disabled={isCleaningUploads}
        >
          {isCleaningUploads ? 'Nettoyage en cours...' : 'Nettoyer /uploads'}
        </button>
      </div>
    </div>
  )
}
