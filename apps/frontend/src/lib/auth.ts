export function persistAuth(
  role: 'ADMIN' | 'USER',
  _token: string,
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
