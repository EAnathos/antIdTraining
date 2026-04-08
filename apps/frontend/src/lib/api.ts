export const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'
export const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN ?? ''

interface RequestConfig {
  params?: Record<string, string | number | undefined>
  headers?: Record<string, string>
}

interface RequestMethods {
  get<T = unknown>(url: string, config?: RequestConfig): Promise<{ data: T }>
  post<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<{ data: T }>
  put<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<{ data: T }>
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
  const makeRequest = async (method: string, url: string, body?: unknown, config?: RequestConfig) => {
    const fullUrl = new URL(`${baseURL}${url}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')

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

    const response = await fetch(fullUrl.toString(), {
      method,
      headers,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body instanceof FormData ? body : undefined,
    })

    if (!response.ok) {
      if (response.status === 401) {
        onUnauthorized?.()
      }

      let message = `HTTP ${response.status}`
      try {
        const payload = (await response.json()) as { message?: string }
        if (payload?.message) {
          message = payload.message
        }
      } catch {
        // Ignore non-JSON error bodies.
      }

      const error = new Error(message)
      ;(error as Error & { status?: number }).status = response.status
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

export function createAuthApi(token: string | null, onUnauthorized?: () => void) {
  return api.create({
    baseURL: `${apiBaseUrl}/admin`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onUnauthorized,
  })
}
