import { describe, it, expect } from 'vitest'
import { buildGeneratorSystemPrompt } from '../generatorPrompt'

describe('buildGeneratorSystemPrompt', () => {
  it('包含通用 pointer builder 方法与适用语义', () => {
    const prompt = buildGeneratorSystemPrompt('python')

    expect(prompt).toContain('b.pointerCreate')
    expect(prompt).toContain('b.pointerMove')
    expect(prompt).toContain('b.pointerClear')
    expect(prompt).toContain('b.pointerHighlight')
    expect(prompt).toContain('双指针')
    expect(prompt).toContain('快慢指针')
    expect(prompt).toContain('滑动窗口')
    expect(prompt).toContain('窗口边界')
    expect(prompt).toContain('链表指针')
    expect(prompt).toContain('不要只用 `b.note`')
  })
})
