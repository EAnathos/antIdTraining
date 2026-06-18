export function persistAuth(
  role: 'ADMIN' | 'USER',
  username: string,
  email: string | null,
) {
  window.localStorage.setItem('antidtraining-auth-role', role)
  window.localStorage.setItem('antidtraining-auth-username', username)
  if (email) {
    window.localStorage.setItem('antidtraining-auth-email', email)
  }
  window.dispatchEvent(new Event('antidtraining-auth-changed'))
}

export function clearAuth() {
  window.localStorage.removeItem('antidtraining-auth-role')
  window.localStorage.removeItem('antidtraining-auth-username')
  window.localStorage.removeItem('antidtraining-auth-email')
  window.dispatchEvent(new Event('antidtraining-auth-changed'))
}
