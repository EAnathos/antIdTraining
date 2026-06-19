import {
  AUTH_CHANGED_EVENT,
  AUTH_ROLE_KEY,
  AUTH_USERNAME_KEY,
} from './authKeys'

export function persistAuth(role: 'ADMIN' | 'USER', username: string) {
  window.localStorage.setItem(AUTH_ROLE_KEY, role)
  window.localStorage.setItem(AUTH_USERNAME_KEY, username)
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function clearAuth() {
  window.localStorage.removeItem(AUTH_ROLE_KEY)
  window.localStorage.removeItem(AUTH_USERNAME_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}
