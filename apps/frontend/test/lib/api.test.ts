import { afterEach, describe, expect, it, vi } from 'vitest'

import { api, createAdminApiClient } from '../../src/lib/api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api client', () => {
  it('performs a JSON GET request with query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await api.get<{ ok: boolean }>('/health', {
      params: { page: 2, search: 'queen', ignored: undefined },
    })

    expect(response.data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [requestUrl, requestInit] = fetchMock.mock.calls[0]
    expect(String(requestUrl)).toContain('/api/health?page=2&search=queen')
    expect(requestInit).toMatchObject({
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('returns undefined data for 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    const response = await api.delete('/resource/1')

    expect(response.data).toBeUndefined()
  })

  it('returns undefined data for zero-length or non-json payloads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('', {
          status: 200,
          headers: { 'content-length': '0' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('OK', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      )

    const first = await api.get('/empty')
    const second = await api.get('/text')

    expect(first.data).toBeUndefined()
    expect(second.data).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('wraps network failures with status 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('NetworkError'))

    await expect(api.get('/offline')).rejects.toMatchObject({
      message: 'Réseau indisponible ou serveur injoignable.',
      status: 0,
    })
  })

  it('builds API errors with payload metadata and triggers unauthorized callback', async () => {
    const onUnauthorized = vi.fn()
    const adminApi = createAdminApiClient('token-123', onUnauthorized)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Forbidden',
          errors: { username: ['Invalid'] },
          formErrors: ['Try again'],
        }),
        {
          status: 401,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await expect(adminApi.get('/users')).rejects.toMatchObject({
      message: 'Forbidden',
      status: 401,
      errors: { username: ['Invalid'] },
      formErrors: ['Try again'],
    })

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('keeps default HTTP status message when error payload is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server down', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    )

    await expect(api.get('/fail')).rejects.toMatchObject({
      message: 'HTTP 500',
      status: 500,
    })
  })

  it('sends form data without forcing JSON content-type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ created: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const formData = new FormData()
    formData.append('name', 'queen')

    const adminApi = createAdminApiClient('token-123')
    const response = await adminApi.post<{ created: boolean }>('/entries', formData)

    expect(response.data).toEqual({ created: true })
    const [, requestInit] = fetchMock.mock.calls[0]
    expect(requestInit).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: 'Bearer token-123' },
    })
  })
})
