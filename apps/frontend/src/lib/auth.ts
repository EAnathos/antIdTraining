import {
  AUTH_CHANGED_EVENT,
  AUTH_EMAIL_KEY,
  AUTH_ROLE_KEY,
  AUTH_USERNAME_KEY,
} from './authKeys'

export function persistAuth(
  role: 'ADMIN' | 'USER',
  username: string,
  email: string | null,
) {
  window.localStorage.setItem(AUTH_ROLE_KEY, role)
  window.localStorage.setItem(AUTH_USERNAME_KEY, username)
  if (email) {
    window.localStorage.setItem(AUTH_EMAIL_KEY, email)
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function clearAuth() {
  window.localStorage.removeItem(AUTH_ROLE_KEY)
  window.localStorage.removeItem(AUTH_USERNAME_KEY)
  window.localStorage.removeItem(AUTH_EMAIL_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}
