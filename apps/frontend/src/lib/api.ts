export const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'
export const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN ?? ''

interface RequestConfig {
  params?: Record<string, string | number | undefined>
  headers?: Record<string, string>
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null

type ApiErrorPayload = {
  message?: string
  errors?: Record<string, string[] | undefined>
  formErrors?: string[]
}

type ApiError = Error & {
  status?: number
  payload?: ApiErrorPayload | unknown
  errors?: Record<string, string[] | undefined>
  formErrors?: string[]
}

interface RequestMethods {
  get<T = unknown>(url: string, config?: RequestConfig): Promise<{ data: T }>
  post<T = unknown>(url: string, body?: JsonBody | FormData, config?: RequestConfig): Promise<{ data: T }>
  put<T = unknown>(url: string, body?: JsonBody | FormData, config?: RequestConfig): Promise<{ data: T }>
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<{ data: T }>
}

type ApiClientConfig = {
  baseURL?: string
  headers?: Record<string, string>
  onUnauthorized?: () => void
}

function createApiClient(
  baseURL: string,
  defaultHeaders: Record<string, string> = {},
  onUnauthorized?: () => void,
): RequestMethods & { create: (config: ApiClientConfig) => RequestMethods } {
  const makeRequest = async (method: HttpMethod, url: string, body?: JsonBody | FormData, config?: RequestConfig) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`
    const fullUrl = new URL(`${normalizedBaseURL}${normalizedUrl}`, origin)

    if (config?.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined) fullUrl.searchParams.append(key, String(value))
      })
    }

    const isFormData = body instanceof FormData
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...defaultHeaders,
      ...config?.headers,
    }

    let response: Response
    try {
      response = await fetch(fullUrl.toString(), {
        method,
        credentials: 'include',
        headers,
        body: body && !(body instanceof FormData) ? JSON.stringify(body) : body instanceof FormData ? body : undefined,
      })
    } catch {
      const networkError = new Error('Réseau indisponible ou serveur injoignable.')
      ;(networkError as Error & { status?: number }).status = 0
      throw networkError
    }

    if (!response.ok) {
      if (response.status === 401) {
        onUnauthorized?.()
      }

      let message = `HTTP ${response.status}`
      let payload: ApiErrorPayload | null = null
      try {
        const parsedPayload = (await response.json()) as ApiErrorPayload
        payload = parsedPayload
        if (payload?.message) {
          message = payload.message
        }
      } catch {
        // Ignore non-JSON error bodies.
      }

      const error = new Error(message) as ApiError
      error.status = response.status
      error.payload = payload
      if (payload) {
        if (payload.errors) {
          error.errors = payload.errors
        }
        if (payload.formErrors) {
          error.formErrors = payload.formErrors
        }
      }
      throw error
    }

    if (response.status === 204) {
      return { data: undefined as unknown }
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength === '0') {
      return { data: undefined as unknown }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return { data: undefined as unknown }
    }

    const data = await response.json()
    return { data }
  }

  return {
    get(url, config) {
      return makeRequest('GET', url, undefined, config)
    },
    post(url, body, config) {
      return makeRequest('POST', url, body, config)
    },
    put(url, body, config) {
      return makeRequest('PUT', url, body, config)
    },
    delete(url, config) {
      return makeRequest('DELETE', url, undefined, config)
    },
    create(newConfig) {
      return createApiClient(
        newConfig.baseURL ?? baseURL,
        newConfig.headers ?? defaultHeaders,
        newConfig.onUnauthorized ?? onUnauthorized,
      )
    },
  }
}

export const api = createApiClient(apiBaseUrl)

export function createAdminApiClient(token: string | null, onUnauthorized?: () => void) {
  return api.create({
    baseURL: `${apiBaseUrl}/admin`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onUnauthorized,
  })
}

export const createAuthApi = createAdminApiClient
