import { describe, it, expect } from 'vitest'
import { buildFallbackScene } from '../fallbackScene'
import { validateAnimationScript } from '../schema'

describe('buildFallbackScene', () => {
  it('数组输入时至少画出 initialState 并附错误说明', () => {
    const script = buildFallbackScene(
      { type: 'array', data: [5, 3, 8, 1] },
      { kind: 'runtime', message: '生成器执行超时' },
    )
    expect(script.steps.length).toBeGreaterThan(0)
    // 首步应创建数组
    const firstEvents = script.steps[0].events ?? []
    expect(firstEvents.some(e => e.type === 'array.create')).toBe(true)
    // 错误说明出现在某步描述里
    const allDesc = script.steps.map(s => s.description.zh).join(' ')
    expect(allDesc).toContain('超时')
  })

  it('无可用 initialState 时仍返回带说明的单步脚本(不为空)', () => {
    const script = buildFallbackScene(
      { type: 'array', data: [] },
      { kind: 'parse', message: '模型输出无法解析' },
    )
    expect(script.steps.length).toBeGreaterThan(0)
  })

  it('产出的脚本必须通过 validateAnimationScript 无 error', () => {
    for (const kind of ['unavailable', 'parse', 'runtime'] as const) {
      const script = buildFallbackScene(
        { type: 'array', data: [4, 2, 7] },
        { kind, message: '测试' },
      )
      const issues = validateAnimationScript(script)
      expect(issues.some(i => i.severity === 'error')).toBe(false)
    }
  })
})
