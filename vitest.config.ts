import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const localStorageFile = resolve(__dirname, 'node_modules/.vitest-localstorage')

export default defineConfig({
  test: {
    environment: 'jsdom',
    execArgv: [`--localstorage-file=${localStorageFile}`],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/scene/**', 'src/ai/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
