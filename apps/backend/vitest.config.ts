import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: './coverage',
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 75,
        functions: 65,
        branches: 55,
        statements: 73,
      },
    },
    environment: 'node',
    globals: true,
    include: ['test/**/*.{test,spec}.ts'],
  },
})