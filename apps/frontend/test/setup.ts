import '@testing-library/jest-dom'

// Mock localStorage
class LocalStorageMock {
  private store: Record<string, string> = {}

  clear(): void {
    this.store = {}
  }

  getItem(key: string): string | null {
    return this.store[key] || null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString()
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store)
    return keys[index] || null
  }

  get length(): number {
    return Object.keys(this.store).length
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new LocalStorageMock(),
  configurable: true,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: new LocalStorageMock(),
  configurable: true,
})
