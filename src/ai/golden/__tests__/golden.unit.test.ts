import { describe, it, expect } from 'vitest'
import { GOLDEN_GENERATORS, type AlgorithmCategory } from '../index'
import { parseGeneratorResponse } from '@/ai/generatorParser'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'
import { CATEGORY_RULES } from '@/ai/quality/rules/category'
import { buildQualityContext } from '@/ai/quality/types'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene/eventTypes'

// 每个类别的金样例 sample input（与生成器 @sample 注释保持一致；供 WS6 复用）。
const SAMPLE_INPUTS: Record<AlgorithmCategory, unknown> = {
  linear: [5, 2, 9, 1, 5, 6],
  recursion: { grid: [[1, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 1], [0, 0, 0, 1]] },
  grid: {
    grid: [[0, 0, 0, 0], [1, 1, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]],
    start: [0, 0],
    target: [3, 3],
  },
  graph: {
    nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
    edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']],
    start: 'A',
  },
  tree: { values: [8, 3, 10, 1, 6, 14, 4, 7, 13] },
  dp: { a: 'AGCAT', b: 'GAC' },
  structure: { temperatures: [73, 74, 75, 71, 69, 72, 76, 73] },
}

const CATEGORIES = Object.keys(GOLDEN_GENERATORS) as AlgorithmCategory[]

/** 把金样例字符串包成 ```js 代码块，借 parseGeneratorResponse 取出 body + type。 */
function parseGolden(source: string) {
  const r = parseGeneratorResponse('```js\n' + source + '\n```')
  expect(r.success).toBe(true)
  expect(r.generator).toBeDefined()
  return r.generator!
}

describe('GOLDEN_GENERATORS · 七类别金样例可执行', () => {
  it('每个类别都有金样例', () => {
    expect(CATEGORIES.sort()).toEqual(
      ['dp', 'graph', 'grid', 'linear', 'recursion', 'structure', 'tree'],
    )
  })

  for (const category of CATEGORIES) {
    it(`[${category}] 在沙箱中执行成功且产出非空步骤`, async () => {
      const g = parseGolden(GOLDEN_GENERATORS[category])
      const result = await runGeneratorSandboxed(g.body, SAMPLE_INPUTS[category], {
        algorithm: g.algorithm,
        type: g.type,
      })
      expect(result.error).toBeUndefined()
      expect(result.ok).toBe(true)
      expect(result.script).toBeDefined()
      expect(result.script!.steps.length).toBeGreaterThan(0)
      // 每步都应有非空、非占位的描述（金样例质量底线）。
      for (const step of result.script!.steps) {
        expect(step.description.zh.trim().length).toBeGreaterThan(0)
        expect(step.description.zh).not.toMatch(/^步骤 \d+$/)
      }
    })
  }
})

// ── 类别规则的命中/不命中夹具 ──

let sid = 0
function step(events: AlgorithmEvent[]): AnimationStep {
  return {
    stepId: ++sid,
    codeLine: 0,
    description: { zh: 'x', en: 'x' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    events,
  }
}

function script(events: AlgorithmEvent[][]): AnimationScript {
  return {
    algorithm: 'fixture',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [] },
    steps: events.map(step),
  }
}

/** 某类别的全部规则都通过(无 issue)则视为 pass。 */
function passes(category: AlgorithmCategory, s: AnimationScript): boolean {
  const ctx = buildQualityContext(s, category)
  return CATEGORY_RULES[category].every(r => r.check(ctx).length === 0)
}

describe('CATEGORY_RULES · 类别专属质量规则', () => {
  it('每个类别都有至少一条规则', () => {
    for (const c of CATEGORIES) {
      expect(CATEGORY_RULES[c].length).toBeGreaterThan(0)
    }
  })

  it('每个类别的金样例满足该类别全部规则', async () => {
    for (const category of CATEGORIES) {
      const g = parseGolden(GOLDEN_GENERATORS[category])
      const result = await runGeneratorSandboxed(g.body, SAMPLE_INPUTS[category], {
        algorithm: g.algorithm,
        type: g.type,
      })
      expect(result.ok, category).toBe(true)
      expect(passes(category, result.script!), `${category} golden 应满足类别规则`).toBe(true)
    }
  })

  // graph
  it('[graph] 命中：有 graph 结构 + 操作', () => {
    const s = script([
      [{ type: 'graph.create', nodes: [{ id: 'A' }], edges: [] } as unknown as AlgorithmEvent],
      [{ type: 'graph.visit_node', nodeId: 'A' } as unknown as AlgorithmEvent],
    ])
    expect(passes('graph', s)).toBe(true)
  })
  it('[graph] 不命中：把图算法画成数组', () => {
    const s = script([
      [{ type: 'array.create', values: [1, 2] } as unknown as AlgorithmEvent],
      [{ type: 'array.compare', indices: [0, 1] } as unknown as AlgorithmEvent],
    ])
    expect(passes('graph', s)).toBe(false)
  })
  it('[graph] 不命中：只 create 无图操作', () => {
    const s = script([[{ type: 'graph.create', nodes: [], edges: [] } as unknown as AlgorithmEvent]])
    expect(passes('graph', s)).toBe(false)
  })

  // dp
  it('[dp] 命中：dp 表 + dp.set', () => {
    const s = script([
      [{ type: 'dp.create', id: 't', rows: 2, cols: 2 } as unknown as AlgorithmEvent],
      [{ type: 'dp.set', id: 't', row: 1, col: 1, value: 1 } as unknown as AlgorithmEvent],
    ])
    expect(passes('dp', s)).toBe(true)
  })
  it('[dp] 不命中：dp 表但从未 set', () => {
    const s = script([
      [{ type: 'dp.create', id: 't', rows: 2, cols: 2 } as unknown as AlgorithmEvent],
      [{ type: 'dp.highlight', id: 't', cells: [], kind: 'current' } as unknown as AlgorithmEvent],
    ])
    expect(passes('dp', s)).toBe(false)
  })

  // recursion
  it('[recursion] 命中：有 callstack.push', () => {
    const s = script([
      [{ type: 'callstack.create', id: 'c', title: 'c' } as unknown as AlgorithmEvent],
      [{ type: 'callstack.push', frame: { functionName: 'f' } } as unknown as AlgorithmEvent],
    ])
    expect(passes('recursion', s)).toBe(true)
  })
  it('[recursion] 不命中：无调用栈', () => {
    const s = script([[{ type: 'grid.visit', row: 0, col: 0 } as unknown as AlgorithmEvent]])
    expect(passes('recursion', s)).toBe(false)
  })

  // grid
  it('[grid] 命中：有 grid.visit', () => {
    const s = script([
      [{ type: 'grid.create', rows: 1, cols: 1, values: [[0]] } as unknown as AlgorithmEvent],
      [{ type: 'grid.visit', row: 0, col: 0 } as unknown as AlgorithmEvent],
    ])
    expect(passes('grid', s)).toBe(true)
  })
  it('[grid] 命中：有 grid.set_cell', () => {
    const s = script([[{ type: 'grid.set_cell', row: 0, col: 0, value: 1 } as unknown as AlgorithmEvent]])
    expect(passes('grid', s)).toBe(true)
  })
  it('[grid] 不命中：只 create 无格子操作', () => {
    const s = script([[{ type: 'grid.create', rows: 1, cols: 1, values: [[0]] } as unknown as AlgorithmEvent]])
    expect(passes('grid', s)).toBe(false)
  })

  // tree
  it('[tree] 命中：有 tree 结构', () => {
    const s = script([
      [{ type: 'tree.create', variant: 'bst', rootId: 'r', nodes: [{ id: 'r', value: 1 }], edges: [] } as unknown as AlgorithmEvent],
    ])
    expect(passes('tree', s)).toBe(true)
  })
  it('[tree] 不命中：无 tree 结构', () => {
    const s = script([[{ type: 'array.create', values: [1] } as unknown as AlgorithmEvent]])
    expect(passes('tree', s)).toBe(false)
  })

  // structure
  it('[structure] 命中：栈 + 操作', () => {
    const s = script([
      [{ type: 'stack.create', values: [] } as unknown as AlgorithmEvent],
      [{ type: 'stack.push', value: 1 } as unknown as AlgorithmEvent],
    ])
    expect(passes('structure', s)).toBe(true)
  })
  it('[structure] 命中：哈希表 + 操作', () => {
    const s = script([
      [{ type: 'hashtable.create', capacity: 8 } as unknown as AlgorithmEvent],
      [{ type: 'hashtable.put', key: 'a', value: 1, bucket: 0 } as unknown as AlgorithmEvent],
    ])
    expect(passes('structure', s)).toBe(true)
  })
  it('[structure] 不命中：只用数组', () => {
    const s = script([
      [{ type: 'array.create', values: [1] } as unknown as AlgorithmEvent],
      [{ type: 'array.compare', indices: [0, 0] } as unknown as AlgorithmEvent],
    ])
    expect(passes('structure', s)).toBe(false)
  })
  it('[structure] 不命中：只 create 栈无操作', () => {
    const s = script([[{ type: 'stack.create', values: [] } as unknown as AlgorithmEvent]])
    expect(passes('structure', s)).toBe(false)
  })

  // linear
  it('[linear] 命中：数组 + compare', () => {
    const s = script([
      [{ type: 'array.create', values: [1, 2] } as unknown as AlgorithmEvent],
      [{ type: 'array.compare', indices: [0, 1] } as unknown as AlgorithmEvent],
    ])
    expect(passes('linear', s)).toBe(true)
  })
  it('[linear] 不命中：数组但只 create', () => {
    const s = script([[{ type: 'array.create', values: [1, 2] } as unknown as AlgorithmEvent]])
    expect(passes('linear', s)).toBe(false)
  })
})
