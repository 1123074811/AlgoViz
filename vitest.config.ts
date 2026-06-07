import { defineConfig, configDefaults } from 'vitest/config'
import { resolve } from 'path'

const localStorageFile = resolve(__dirname, 'node_modules/.vitest-localstorage')

export default defineConfig({
  test: {
    environment: 'jsdom',
    execArgv: [`--localstorage-file=${localStorageFile}`],
    globals: true,
    // 排除 git worktree 目录，避免主仓库测试扫描进并行 agent 的工作区
    exclude: [...configDefaults.exclude, '.claude/**'],
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
