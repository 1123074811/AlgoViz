import { describe, it, expect } from 'vitest'
import type { AlgorithmEvent } from '@/scene'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmCategory } from '../../categories'
import { runQualityGate } from '../index'

// ─── 夹具工具 ──────────────────────────────────────────────────────────────

let stepIdSeq = 0

/** 构造一个最小步骤；可覆盖 events / description.zh / codeLine。 */
function makeStep(opts: {
  events?: AlgorithmEvent[]
  zh?: string
  codeLine?: number
} = {}): AnimationStep {
  stepIdSeq += 1
  return {
    stepId: stepIdSeq,
    codeLine: opts.codeLine ?? 0,
    description: { zh: opts.zh ?? `执行第 ${stepIdSeq} 步`, en: '' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    ...(opts.events ? { events: opts.events } : {}),
  }
}

/** 构造一个最小可用脚本。 */
function makeScript(steps: AnimationStep[]): AnimationScript {
  return {
    algorithm: 'test',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}

/** 返回 runQualityGate 中出现的所有 issue code。 */
function codesOf(script: AnimationScript, category: AlgorithmCategory = 'linear'): string[] {
  return runQualityGate(script, category).issues.map(i => i.code)
}

/** 一段「健康」的 array 操作序列：array.create + 3 个非 create 操作。 */
function healthyArrayEvents(): AlgorithmEvent[] {
  return [
    { type: 'array.create', values: [3, 1, 2] },
    { type: 'array.compare', indices: [0, 1] },
    { type: 'array.swap', indices: [0, 1] },
    { type: 'array.compare', indices: [1, 2] },
  ]
}

// ─── empty-structure ──────────────────────────────────────────────────────

describe('empty-structure', () => {
  it('命中：创建 stack 但从未操作', () => {
    const script = makeScript([
      makeStep({ events: [{ type: 'stack.create', values: [] }] }),
      makeStep({ events: [{ type: 'array.create', values: [1, 2, 3] }] }),
      makeStep({ events: [{ type: 'array.compare', indices: [0, 1] }] }),
      makeStep({ events: [{ type: 'array.swap', indices: [0, 1] }] }),
      makeStep({ events: [{ type: 'array.compare', indices: [1, 2] }] }),
    ])
    expect(codesOf(script)).toContain('empty-structure')
  })

  it('不命中：结构创建后有操作', () => {
    const script = makeScript([makeStep({ events: healthyArrayEvents() })])
    expect(codesOf(script)).not.toContain('empty-structure')
  })

  it('不命中：scene/pointer 不算结构', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'pointer.create', pointerId: 'p' },
          ...healthyArrayEvents(),
        ],
      }),
    ])
    expect(codesOf(script)).not.toContain('empty-structure')
  })
})

// ─── no-operations ────────────────────────────────────────────────────────

describe('no-operations', () => {
  it('命中：排除 scene 后操作事件 < 3', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'array.create', values: [1, 2] },
          { type: 'array.compare', indices: [0, 1] },
          { type: 'scene.note', text: 'x' },
          { type: 'scene.wait', duration: 1 },
        ],
      }),
    ])
    const codes = codesOf(script)
    expect(codes).toContain('no-operations')
  })

  it('不命中：操作事件 >= 3', () => {
    const script = makeScript([makeStep({ events: healthyArrayEvents() })])
    expect(codesOf(script)).not.toContain('no-operations')
  })
})

// ─── empty-desc ───────────────────────────────────────────────────────────

describe('empty-desc', () => {
  it('error：空描述占比 > 0.3', () => {
    // 4 步，2 步空描述 → 0.5 > 0.3
    const script = makeScript([
      makeStep({ zh: '比较 a 与 b', events: healthyArrayEvents() }),
      makeStep({ zh: '交换元素' }),
      makeStep({ zh: '' }),
      makeStep({ zh: '步骤 4' }),
    ])
    const report = runQualityGate(script, 'linear')
    const issue = report.issues.find(i => i.code === 'empty-desc')
    expect(issue?.severity).toBe('error')
    expect(report.passed).toBe(false)
  })

  it('warn：空描述占比 <= 0.3 但 > 0', () => {
    // 5 步，1 步空描述 → 0.2 <= 0.3
    const script = makeScript([
      makeStep({ zh: '描述一', events: healthyArrayEvents() }),
      makeStep({ zh: '描述二' }),
      makeStep({ zh: '描述三' }),
      makeStep({ zh: '描述四' }),
      makeStep({ zh: '' }),
    ])
    const report = runQualityGate(script, 'linear')
    const issue = report.issues.find(i => i.code === 'empty-desc')
    expect(issue?.severity).toBe('warn')
  })

  it('不命中：全部有描述', () => {
    const script = makeScript([
      makeStep({ zh: '描述一', events: healthyArrayEvents() }),
      makeStep({ zh: '描述二' }),
    ])
    expect(codesOf(script)).not.toContain('empty-desc')
  })

  it('跳过：stepCount === 0', () => {
    const script = makeScript([])
    expect(codesOf(script)).not.toContain('empty-desc')
  })
})

// ─── low-codeline ─────────────────────────────────────────────────────────

describe('low-codeline', () => {
  it('warn：codeLine 覆盖率 < 0.4', () => {
    // 5 步，仅 1 步有效 codeLine → 0.2 < 0.4
    const script = makeScript([
      makeStep({ codeLine: 1, zh: 'a', events: healthyArrayEvents() }),
      makeStep({ codeLine: -1, zh: 'b' }),
      makeStep({ codeLine: -1, zh: 'c' }),
      makeStep({ codeLine: -1, zh: 'd' }),
      makeStep({ codeLine: -1, zh: 'e' }),
    ])
    const report = runQualityGate(script, 'linear')
    const issue = report.issues.find(i => i.code === 'low-codeline')
    expect(issue?.severity).toBe('warn')
    // warn 不影响通过
    expect(report.issues.some(i => i.code === 'low-codeline')).toBe(true)
  })

  it('不命中：codeLine 覆盖率 >= 0.4', () => {
    const script = makeScript([
      makeStep({ codeLine: 1, zh: 'a', events: healthyArrayEvents() }),
      makeStep({ codeLine: 2, zh: 'b' }),
    ])
    expect(codesOf(script)).not.toContain('low-codeline')
  })
})

// ─── grid-uniform ─────────────────────────────────────────────────────────

describe('grid-uniform', () => {
  it('命中：grid.create 全同值', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'grid.create', rows: 2, cols: 2, values: [[0, 0], [0, 0]] },
          { type: 'grid.visit', row: 0, col: 0 },
          { type: 'grid.visit', row: 0, col: 1 },
          { type: 'grid.visit', row: 1, col: 0 },
        ],
      }),
    ])
    const report = runQualityGate(script, 'grid')
    expect(report.issues.map(i => i.code)).toContain('grid-uniform')
    expect(report.passed).toBe(false)
  })

  it('命中：matrix.create 全同值', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'matrix.create', rows: 2, cols: 2, values: [[1, 1], [1, 1]] },
          { type: 'matrix.visit_cell', row: 0, col: 0 },
          { type: 'matrix.visit_cell', row: 0, col: 1 },
          { type: 'matrix.update_cell', row: 1, col: 1, value: 2 },
        ],
      }),
    ])
    expect(codesOf(script, 'grid')).toContain('grid-uniform')
  })

  it('不命中：grid 值非全同', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'grid.create', rows: 2, cols: 2, values: [[1, 0], [0, 1]] },
          { type: 'grid.visit', row: 0, col: 0 },
          { type: 'grid.visit', row: 0, col: 1 },
          { type: 'grid.visit', row: 1, col: 0 },
        ],
      }),
    ])
    expect(codesOf(script, 'grid')).not.toContain('grid-uniform')
  })

  it('不命中：values 缺省', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'grid.create', rows: 2, cols: 2 },
          { type: 'grid.visit', row: 0, col: 0 },
          { type: 'grid.visit', row: 0, col: 1 },
          { type: 'grid.visit', row: 1, col: 0 },
        ],
      }),
    ])
    expect(codesOf(script, 'grid')).not.toContain('grid-uniform')
  })

  it('不命中：values 为空数组', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'grid.create', rows: 0, cols: 0, values: [] },
          { type: 'grid.visit', row: 0, col: 0 },
          { type: 'grid.visit', row: 0, col: 1 },
          { type: 'grid.visit', row: 1, col: 0 },
        ],
      }),
    ])
    expect(codesOf(script, 'grid')).not.toContain('grid-uniform')
  })
})

// ─── recursion-no-callstack ───────────────────────────────────────────────

describe('recursion-no-callstack', () => {
  it('命中：recursion 类但无 callstack', () => {
    const script = makeScript([makeStep({ events: healthyArrayEvents() })])
    const report = runQualityGate(script, 'recursion')
    expect(report.issues.map(i => i.code)).toContain('recursion-no-callstack')
    expect(report.passed).toBe(false)
  })

  it('不命中：recursion 类且有 callstack', () => {
    const script = makeScript([
      makeStep({
        events: [
          { type: 'callstack.create', frames: [] },
          { type: 'callstack.push', frame: { id: 'f1', functionName: 'dfs' } },
          { type: 'callstack.pop' },
          { type: 'callstack.push', frame: { id: 'f2', functionName: 'dfs' } },
        ],
      }),
    ])
    expect(codesOf(script, 'recursion')).not.toContain('recursion-no-callstack')
  })

  it('不命中：非 recursion 类（appliesTo 过滤）', () => {
    const script = makeScript([makeStep({ events: healthyArrayEvents() })])
    expect(codesOf(script, 'linear')).not.toContain('recursion-no-callstack')
  })
})

// ─── passed 综合 ──────────────────────────────────────────────────────────

describe('runQualityGate passed', () => {
  it('健康脚本：无 error → passed=true', () => {
    const script = makeScript([
      makeStep({ codeLine: 1, zh: '初始化数组', events: healthyArrayEvents() }),
      makeStep({ codeLine: 2, zh: '比较相邻元素' }),
    ])
    const report = runQualityGate(script, 'linear')
    expect(report.passed).toBe(true)
    expect(report.issues.filter(i => i.severity === 'error')).toHaveLength(0)
  })
})
