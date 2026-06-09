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
      reporter: ['text', 'lcov', 'json', 'json-summary'],
      // 覆盖率统计全部源码，排除测试、类型声明、纯入口/数据与 i18n 文案，
      // 避免覆盖率报告因 include 过窄而失真。
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        ...configDefaults.coverage.exclude ?? [],
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/i18n/locales/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
