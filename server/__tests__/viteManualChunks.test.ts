import { describe, it, expect } from 'vitest'
import { manualChunks } from '../../vite.config'

const nm = (pkg: string) => `/project/node_modules/${pkg}/dist/index.js`

describe('manualChunks', () => {
  it('已安装的重型依赖各自独立 chunk', () => {
    expect(manualChunks(nm('@monaco-editor/react'))).toBe('vendor-monaco')
    expect(manualChunks(nm('monaco-editor'))).toBe('vendor-monaco')
    expect(manualChunks(nm('react-dom'))).toBe('vendor-react')
    expect(manualChunks(nm('react'))).toBe('vendor-react')
  })
  it('应用代码与其它依赖返回 undefined', () => {
    expect(manualChunks('/project/src/scene/SceneEngine.ts')).toBeUndefined()
    expect(manualChunks(nm('zustand'))).toBeUndefined()
  })
})
