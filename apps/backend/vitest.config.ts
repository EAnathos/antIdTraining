import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: './coverage',
      provider: 'v8',
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
})