import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DatabaseToolsPanel } from '../../../src/components/admin/DatabaseToolsPanel'

describe('DatabaseToolsPanel', () => {
  it('exports database, accepts import file and cleans uploads', async () => {
    const exportDatabaseSnapshot = vi.fn().mockResolvedValue(undefined)
    const importDatabaseSnapshot = vi.fn().mockResolvedValue(undefined)
    const cleanupUploads = vi.fn().mockResolvedValue(undefined)

    const { container } = render(
      <DatabaseToolsPanel
        exportDatabaseSnapshot={exportDatabaseSnapshot}
        importDatabaseSnapshot={importDatabaseSnapshot}
        cleanupUploads={cleanupUploads}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Exporter la base' }))
    await waitFor(() => expect(exportDatabaseSnapshot).toHaveBeenCalled())

    const file = new File(['{}'], 'db.json', { type: 'application/json' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(fileInput).not.toBeNull()
    fireEvent.click(screen.getByRole('checkbox'))
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
    } as unknown as FileList
    fireEvent.change(fileInput!, { target: { files: fileList } })
    fireEvent.click(screen.getByRole('button', { name: 'Importer la base' }))
    await waitFor(() => expect(importDatabaseSnapshot).toHaveBeenCalledWith(file))

    fireEvent.click(screen.getByRole('button', { name: 'Nettoyer /uploads' }))
    await waitFor(() => expect(cleanupUploads).toHaveBeenCalled())
  })
})
