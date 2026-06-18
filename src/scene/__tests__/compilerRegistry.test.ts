import { describe, it, expect } from 'vitest'
import { sceneEventCompilers } from '../compilerRegistry'
import { pointerCompiler } from '../graphics/compile/pointerCompile'
import { linkedListCompiler } from '../graphics/compile/linkedListCompile'
import { treeCompiler } from '../graphics/compile/treeCompile'
import { unionFindCompiler } from '../graphics/compile/unionFindCompile'
import { arrayCompiler } from '../graphics/compile/arrayCompile'
import { graphAnalysisCompiler } from '../graphics/compile/graphAnalysisCompile'

describe('sceneEventCompilers 注册表', () => {
  it('包含全部 22 个编译器', () => {
    expect(sceneEventCompilers).toHaveLength(22)
  })

  it('每个编译器都实现 supports() 与 compile()', () => {
    for (const c of sceneEventCompilers) {
      expect(typeof c.supports).toBe('function')
      expect(typeof c.compile).toBe('function')
    }
  })

  it('保留关键匹配顺序（窄匹配在前）', () => {
    const idx = (c: unknown) => sceneEventCompilers.indexOf(c as never)
    // pointer/linkedList/tree/unionFind 必须排在通用的 array 之前
    expect(idx(pointerCompiler)).toBeLessThan(idx(arrayCompiler))
    expect(idx(linkedListCompiler)).toBeLessThan(idx(arrayCompiler))
    expect(idx(treeCompiler)).toBeLessThan(idx(arrayCompiler))
    expect(idx(unionFindCompiler)).toBeLessThan(idx(arrayCompiler))
    // graphAnalysis 是最后一个
    expect(idx(graphAnalysisCompiler)).toBe(sceneEventCompilers.length - 1)
  })
})
