import { useState } from 'react'

type Props = {
  exportDatabaseSnapshot: () => Promise<void>
  importDatabaseSnapshot: (file: File) => Promise<void>
  cleanupUploads: () => Promise<void>
}

export function DatabaseToolsPanel({
  exportDatabaseSnapshot,
  importDatabaseSnapshot,
  cleanupUploads,
}: Props) {
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
      <h3 className="text-lg font-semibold text-[color:var(--app-text)]">
        Export / Import base de données
      </h3>

      <div className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] p-4">
        <p className="text-sm text-[color:var(--app-text-muted)]">
          Télécharge une archive ZIP contenant la base et les images.
        </p>
        <button
          type="button"
          className="ui-button ui-button--primary mt-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void handleExport()}
          disabled={isExporting}
        >
          {isExporting ? 'Export en cours...' : 'Exporter la base'}
        </button>
      </div>

      <div className="ui-alert ui-alert--warning rounded-xl p-4">
        <p className="text-sm font-medium">Import (remplacement complet)</p>
        <p className="mt-1 text-sm opacity-90">
          Cette action supprime les données actuelles et restaure le contenu du
          fichier sélectionné (format ZIP).
        </p>

        <input
          type="file"
          accept="application/zip,.zip,application/json,.json"
          className="ui-input mt-3 block w-full p-2 text-sm"
          onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
        />

        <label className="mt-3 flex items-start gap-2 text-sm">
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
          className="ui-button ui-button--danger mt-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void handleImport()}
          disabled={!importFile || !confirmReplace || isImporting}
        >
          {isImporting ? 'Import en cours...' : 'Importer la base'}
        </button>
      </div>

      <div className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] p-4">
        <p className="text-sm font-medium text-[color:var(--app-text)]">
          Nettoyage des images
        </p>
        <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
          Supprime les fichiers non utilisés dans /uploads et recrée les
          variantes responsives manquantes pour les images référencées.
        </p>
        <button
          type="button"
          className="ui-button ui-button--primary mt-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void handleCleanupUploads()}
          disabled={isCleaningUploads}
        >
          {isCleaningUploads ? 'Nettoyage en cours...' : 'Nettoyer /uploads'}
        </button>
      </div>
    </div>
  )
}
