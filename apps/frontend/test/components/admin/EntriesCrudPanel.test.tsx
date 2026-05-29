import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock api.get used by the component effects
vi.mock('../../../src/lib/api', () => ({
  api: {
    get: vi.fn((path: string) => {
      if (path.includes('/taxons/genera'))
        return Promise.resolve({ data: ['Lasius'] })
      if (path.includes('/taxons/species'))
        return Promise.resolve({ data: ['niger'] })
      if (path.includes('/taxons/subgenera'))
        return Promise.resolve({ data: ['Subgenus'] })
      if (path.includes('/taxons/species-groups'))
        return Promise.resolve({ data: ['Group'] })
      if (path.includes('/taxons/species-metadata'))
        return Promise.resolve({ data: { subgenus: 'MetaSub', speciesGroup: 'MetaGroup' } })
      return Promise.resolve({ data: [] })
    }),
  },
  backendOrigin: '',
}))

import { EntriesCrudPanel } from '../../../src/components/admin/EntriesCrudPanel'

const makeEntry = () => ({
  id: 'entry-1',
  subfamily: 'Formicidae',
  genus: 'Lasius',
  species: 'niger',
  taxonLevel: 'SPECIES',
  taxonValue: 'Lasius niger',
  department: '75',
  observedAt: new Date().toISOString(),
  biotope: 'Jardin',
  photoCredit: 'Alice',
  caste: 'WORKER',
  images: [
    { id: 'img-1', imageUrl: '/uploads/1.jpg' },
    { id: 'img-2', imageUrl: '/uploads/2.jpg' },
  ],
})

function renderComponent(overrides = {}) {
  const entry = makeEntry()
  const props = {
    entries: [entry],
    entriesPage: 1,
    entriesLimit: 25,
    entriesTotal: 1,
    entriesPages: 1,
    setEntriesPage: vi.fn(),
    setEntriesLimit: vi.fn(),
    subfamilies: ['Formicidae'],
    entryForm: {
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
    },
    setEntryForm: vi.fn(),
    selectedEntryId: '',
    setSelectedEntryId: vi.fn(),
    setEntryFiles: vi.fn(),
    createEntry: vi.fn(async () => {}),
    updateEntry: vi.fn(async () => {}),
    deleteEntry: vi.fn(async () => {}),
    reorderEntryImages: vi.fn(async () => {}),
    ...overrides,
  }

  const utils = render(<EntriesCrudPanel {...props} />)
  return { ...utils, props, entry }
}

describe('EntriesCrudPanel', () => {
  beforeAll(() => {
    // JSDOM doesn't implement scrollIntoView; provide a no-op for tests
    ;(Element.prototype as any).scrollIntoView = () => {}
  })
  it('opens preview and navigates images', async () => {
    renderComponent()

    // Click the first thumbnail image
    const thumbs = await screen.findAllByAltText('Lasius niger')
    const thumb = thumbs[0]
    fireEvent.click(thumb)

    // Preview should open with Image 1/2
    expect(await screen.findByText(/Image 1\/2/)).toBeTruthy()

    // Click next
    const next = screen.getByLabelText('Image suivante')
    fireEvent.click(next)

    await waitFor(() => expect(screen.getByText(/Image 2\/2/)).toBeTruthy())

    // Close preview
    const close = screen.getByText('Fermer')
    fireEvent.click(close)

    expect(screen.queryByText(/Image 2\/2/)).toBeNull()
  })

  it('loads an entry into the form when clicking the list button', async () => {
    const { props } = renderComponent()

    const button = await screen.findByRole('button', { name: /Lasius niger/ })
    fireEvent.click(button)

    expect(props.setSelectedEntryId).toHaveBeenCalled()
    expect(props.setEntryForm).toHaveBeenCalled()
  })

  it('reorders images on drop and calls reorderEntryImages', async () => {
    const reorderMock = vi.fn(async () => {})
    const { props } = renderComponent({ reorderEntryImages: reorderMock })

    // find the draggable container for the first image
    const imgs = await screen.findAllByAltText('Lasius niger')
    const img = imgs[0]
    const container = img.closest('div')!

    // create a fake DataTransfer
    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(key: string, value: string) {
        this.data[key] = value
      },
      getData(key: string) {
        return this.data[key]
      },
      effectAllowed: 'move',
    }

    // simulate dragStart with index 0
    fireEvent.dragStart(container, { dataTransfer })
    dataTransfer.setData('text/plain', '0')

    // drop onto the second image container
    const allImgs = await screen.findAllByAltText('Lasius niger')
    const target = allImgs[1].closest('div')!
    fireEvent.drop(target, { dataTransfer })

    await waitFor(() => expect(reorderMock).toHaveBeenCalled())
    // ensure it was called with the entry id and an array of ids
    expect(reorderMock.mock.calls[0][0]).toBe(props.entries[0].id)
    expect(Array.isArray(reorderMock.mock.calls[0][1])).toBe(true)
  })

  it('loads genera when subfamily is set', async () => {
    // render with entryForm.subfamily to trigger genera fetch
    renderComponent({
      entryForm: {
        ...undefined,
        subfamily: 'Formicidae',
        genus: '',
        subgenus: '',
        species: '',
        speciesGroup: '',
        department: '',
        observedAt: '',
        biotope: '',
        photoCredit: '',
        caste: '',
      } as any,
    })
    // the genera select should eventually contain the mocked option
    await waitFor(() => expect(screen.getByText('Lasius')).toBeTruthy())
  })

  it('loads species/subgenera/species-groups when genus is set', async () => {
    renderComponent({
      entryForm: {
        ...undefined,
        subfamily: 'Formicidae',
        genus: 'Lasius',
        subgenus: '',
        species: '',
        speciesGroup: '',
        department: '',
        observedAt: '',
        biotope: '',
        photoCredit: '',
        caste: '',
      } as any,
    })
    await waitFor(() => expect(screen.getByText('niger')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('Subgenus')).toBeTruthy())
  })

  it('filters, sorts and changes pagination controls', async () => {
    const { props } = renderComponent()

    const searchInput = screen.getByPlaceholderText('Rechercher une entrée')
    fireEvent.change(searchInput, { target: { value: 'Lasius' } })
    await waitFor(() => {
      const strongs = document.querySelectorAll('strong')
      expect(strongs[0].textContent).toBe('1')
    })

    const sortSelect = screen.getByLabelText('Trier')
    fireEvent.change(sortSelect, { target: { value: 'taxon' } })

    const orderButton = screen.getByTitle("Inverser l'ordre")
    fireEvent.click(orderButton)

    // change per page
    const perPageSelect = screen
      .getByText('Par page')
      .closest('label')!
      .querySelector('select')!
    fireEvent.change(perPageSelect, { target: { value: '50' } })
    expect(props.setEntriesPage).toHaveBeenCalledWith(1)
    expect(props.setEntriesLimit).toHaveBeenCalledWith(50)
  })

  it('deletes an entry when confirmed', async () => {
    const deleteMock = vi.fn(async () => {})
    const { props } = renderComponent({ deleteEntry: deleteMock })

    // mock confirm to true
    const orig = window.confirm
    // @ts-expect-error - override confirm for test
    window.confirm = () => true
    const deleteBtn = await screen.findByTitle('Supprimer')
    fireEvent.click(deleteBtn)
    await waitFor(() => expect(deleteMock).toHaveBeenCalled())
    // restore
    window.confirm = orig
  })

  it('calls setEntryFiles when adding files and can cancel modification', async () => {
    const setEntryFiles = vi.fn()
    const setEntryForm = vi.fn()
    const setSelectedEntryId = vi.fn()
    const { props } = renderComponent({
      setEntryFiles,
      setEntryForm,
      setSelectedEntryId,
      selectedEntryId: 'entry-1',
    })

    // file input change
    const fileInput = document.querySelector('input[type=file]')!
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(setEntryFiles).toHaveBeenCalled()

    // cancel modification button should call resetEntryForm (setSelectedEntryId + setEntryForm)
    const cancelBtn = await screen.findByText('Annuler la modification')
    fireEvent.click(cancelBtn)
    expect(setSelectedEntryId).toHaveBeenCalled()
    expect(setEntryForm).toHaveBeenCalled()
  })

  it('calls createEntry on submit and modifier button loads entry in form', async () => {
    const createMock = vi.fn(async () => {})
    const setEntryForm = vi.fn()
    const setSelectedEntryId = vi.fn()
    const { props } = renderComponent({
      createEntry: createMock,
      setEntryForm,
      setSelectedEntryId,
      entryForm: {
        subfamily: 'Formicidae',
        genus: 'Lasius',
        subgenus: '',
        species: '',
        speciesGroup: '',
        department: '75',
        observedAt: new Date().toISOString().slice(0, 10),
        biotope: 'Jardin',
        photoCredit: 'Alice',
        caste: 'WORKER',
      },
    })

    const submitBtn = screen.getByRole('button', { name: /Créer entrée/ })
    fireEvent.click(submitBtn)
    await waitFor(() => expect(createMock).toHaveBeenCalled())

    // click the Modifier AdminIconButton
    const modifyBtn = screen.getByTitle('Modifier')
    fireEvent.click(modifyBtn)
    expect(setSelectedEntryId).toHaveBeenCalled()
    expect(setEntryForm).toHaveBeenCalled()
  })

  it('parses department input on blur and updates form', async () => {
    const setEntryForm = vi.fn()
    renderComponent({ setEntryForm })

    const deptInput = screen.getByPlaceholderText('Département (ex: 53 - Mayenne, 2A, 974)')
    fireEvent.change(deptInput, { target: { value: '75 - Paris' } })
    fireEvent.blur(deptInput)

    await waitFor(() => expect(setEntryForm).toHaveBeenCalled())
    const calledWith = setEntryForm.mock.calls[0][0]
    expect(calledWith).toEqual(expect.objectContaining({ department: '75 - Paris' }))
  })

  it('loads species metadata when selecting a species', async () => {
    const setEntryForm = vi.fn()
    renderComponent({ setEntryForm, entryForm: { ...undefined, genus: 'Lasius' } as any })

    // wait for species options to load
    await waitFor(() => expect(screen.getByText('niger')).toBeTruthy())

    // locate the species select by finding the select that contains the 'Espèce (optionnel)' option
    const selects = screen.getAllByRole('combobox')
    const speciesSelect = selects.find((s) => s.innerHTML.includes('Espèce (optionnel)'))!
    fireEvent.change(speciesSelect, { target: { value: 'niger' } })

    // wait until the species value was applied to the form
    await waitFor(() => {
      const calls = setEntryForm.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall).toEqual(expect.objectContaining({ species: 'niger' }))
    })
  })

  it('shows reordering indicator while reorderEntryImages is pending', async () => {
    let resolvePromise: () => void
    const reorderMock = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolvePromise = res
        }),
    )
    const { props } = renderComponent({ reorderEntryImages: reorderMock })

    const imgs = await screen.findAllByAltText('Lasius niger')
    const container = imgs[0].closest('div')!
    const target = imgs[1].closest('div')!

    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(k: string, v: string) {
        this.data[k] = v
      },
      getData(k: string) {
        return this.data[k]
      },
      effectAllowed: 'move',
    }
    await act(async () => {
      fireEvent.dragStart(container, { dataTransfer })
      dataTransfer.setData('text/plain', '0')
      fireEvent.drop(target, { dataTransfer })
    })

    // while promise unresolved, reordering span should appear
    await waitFor(() =>
      expect(screen.getByText('Réordonnancement…')).toBeTruthy(),
    )

    // resolve the reorder promise
    resolvePromise!()
  })
})
