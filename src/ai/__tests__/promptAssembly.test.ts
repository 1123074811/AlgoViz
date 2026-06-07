import { describe, it, expect } from 'vitest'
import { buildGeneratorSystemPrompt } from '../prompt'

describe('buildGeneratorSystemPrompt（core + 类别装配）', () => {
  it('grid 类别包含网格 builder 方法', () => {
    const prompt = buildGeneratorSystemPrompt('java', 'grid')
    expect(prompt).toContain('gridCreate')
  })

  it('recursion 类别包含调用栈 builder 方法', () => {
    const prompt = buildGeneratorSystemPrompt('java', 'recursion')
    expect(prompt).toContain('callStackCreate')
    expect(prompt).toContain('callPush')
  })

  it('dp 类别包含状态表 builder 方法', () => {
    const prompt = buildGeneratorSystemPrompt('java', 'dp')
    expect(prompt).toContain('dpCreate')
  })

  it('无 category 时仍包含核心输出格式片段', () => {
    const prompt = buildGeneratorSystemPrompt('python')
    expect(prompt).toContain('输出格式（严格遵守）')
    expect(prompt).toContain('@sample')
    expect(prompt).toContain('b.pointerCreate')
  })

  it('核心通用章节始终存在（任意 category）', () => {
    const prompt = buildGeneratorSystemPrompt('java', 'graph')
    expect(prompt).toContain('硬性要求')
    expect(prompt).toContain('graphCreate')
  })
})
