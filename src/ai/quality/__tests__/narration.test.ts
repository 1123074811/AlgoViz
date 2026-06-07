import { describe, it, expect } from 'vitest'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'
import { buildQualityContext } from '../types'
import {
  NARRATION_RULES,
  repetitiveDescRule,
  keyOpNoCodeLineRule,
} from '../rules/narration'

let nextId = 1
function step(opts: {
  zh?: string
  codeLine?: number
  events?: AlgorithmEvent[]
}): AnimationStep {
  return {
    stepId: nextId++,
    codeLine: opts.codeLine ?? -1,
    description: { zh: opts.zh ?? '', en: opts.zh ?? '' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: opts.events ?? [],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  }
}

function scriptOf(steps: AnimationStep[]): AnimationScript {
  return {
    algorithm: 'test',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}

function codes(steps: AnimationStep[]): string[] {
  const ctx = buildQualityContext(scriptOf(steps), 'linear')
  return NARRATION_RULES.flatMap(r => r.check(ctx)).map(i => i.code)
}

describe('repetitive-desc', () => {
  it('连续相同描述超过 3 步 → 命中 warn', () => {
    const steps = Array.from({ length: 5 }, () => step({ zh: '继续遍历' }))
    const ctx = buildQualityContext(scriptOf(steps), 'linear')
    const issues = repetitiveDescRule.check(ctx)
    expect(issues.map(i => i.code)).toContain('repetitive-desc')
    expect(issues[0].severity).toBe('warn')
  })

  it('恰好 3 步相同 → 不命中（阈值为 >3）', () => {
    const steps = Array.from({ length: 3 }, () => step({ zh: '继续遍历' }))
    expect(codes(steps)).not.toContain('repetitive-desc')
  })

  it('描述不同则不命中', () => {
    const steps = [
      step({ zh: '比较 0、1' }),
      step({ zh: '交换 0、1' }),
      step({ zh: '比较 1、2' }),
      step({ zh: '交换 1、2' }),
      step({ zh: '标记已排序' }),
    ]
    expect(codes(steps)).not.toContain('repetitive-desc')
  })

  it('连续空描述不计入重复（交给 empty-desc）', () => {
    const steps = Array.from({ length: 6 }, () => step({ zh: '' }))
    expect(codes(steps)).not.toContain('repetitive-desc')
  })

  it('被打断的重复不累加', () => {
    const steps = [
      step({ zh: 'A' }), step({ zh: 'A' }), step({ zh: 'A' }),
      step({ zh: 'B' }),
      step({ zh: 'A' }), step({ zh: 'A' }), step({ zh: 'A' }),
    ]
    expect(codes(steps)).not.toContain('repetitive-desc')
  })
})

describe('keyop-no-codeline', () => {
  const keyEv: AlgorithmEvent = { type: 'array.compare', indices: [0, 1] }
  const createEv: AlgorithmEvent = { type: 'array.create', values: [1, 2] }
  const sceneEv: AlgorithmEvent = { type: 'scene.note', text: 'hi' }

  it('关键操作步多数无 codeLine → 命中 warn', () => {
    const steps = [
      step({ codeLine: -1, events: [keyEv] }),
      step({ codeLine: -1, events: [keyEv] }),
      step({ codeLine: 5, events: [keyEv] }),
    ]
    const ctx = buildQualityContext(scriptOf(steps), 'linear')
    const issues = keyOpNoCodeLineRule.check(ctx)
    expect(issues.map(i => i.code)).toContain('keyop-no-codeline')
    expect(issues[0].severity).toBe('warn')
  })

  it('关键操作步都有 codeLine → 不命中', () => {
    const steps = [
      step({ codeLine: 3, events: [keyEv] }),
      step({ codeLine: 4, events: [keyEv] }),
      step({ codeLine: 5, events: [keyEv] }),
    ]
    expect(codes(steps)).not.toContain('keyop-no-codeline')
  })

  it('恰好一半无 codeLine → 不命中（阈值为 >0.5）', () => {
    const steps = [
      step({ codeLine: -1, events: [keyEv] }),
      step({ codeLine: 5, events: [keyEv] }),
    ]
    expect(codes(steps)).not.toContain('keyop-no-codeline')
  })

  it('create / scene 步不计入关键操作分母', () => {
    // 只有 create/scene 步缺 codeLine，没有任何关键操作步 → 不命中
    const steps = [
      step({ codeLine: -1, events: [createEv] }),
      step({ codeLine: -1, events: [sceneEv] }),
    ]
    expect(codes(steps)).not.toContain('keyop-no-codeline')
  })

  it('create/scene 无 codeLine 不拉高关键操作步的缺失占比', () => {
    const steps = [
      step({ codeLine: -1, events: [createEv] }), // 不计入
      step({ codeLine: -1, events: [sceneEv] }),  // 不计入
      step({ codeLine: 5, events: [keyEv] }),     // 关键步且有行
      step({ codeLine: 6, events: [keyEv] }),     // 关键步且有行
    ]
    expect(codes(steps)).not.toContain('keyop-no-codeline')
  })
})
