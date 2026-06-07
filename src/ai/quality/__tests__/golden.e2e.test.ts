import { describe, it, expect } from 'vitest'
import { GOLDEN_GENERATORS } from '@/ai/golden'
import { parseGeneratorResponse } from '@/ai/generatorParser'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'
import { runQualityGate, buildQualityContext } from '@/ai/quality'
import { CATEGORY_PROFILES, type AlgorithmCategory } from '@/ai/categories'

/**
 * WS6 金样例端到端回归测试台（确定性，不调 LLM）。
 * 对每个类别的金样例：沙箱执行 → 跑质量门(通用+类别规则) → 断言 0 error + 关键不变量。
 */

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

function parseGolden(source: string) {
  const r = parseGeneratorResponse('```js\n' + source + '\n```')
  expect(r.success, r.error).toBe(true)
  return r.generator!
}

async function runGolden(category: AlgorithmCategory) {
  const g = parseGolden(GOLDEN_GENERATORS[category])
  const result = await runGeneratorSandboxed(g.body, SAMPLE_INPUTS[category], {
    algorithm: g.algorithm,
    type: g.type,
  })
  expect(result.ok, `${category}: ${result.error ?? ''}`).toBe(true)
  expect(result.script).toBeDefined()
  return result.script!
}

describe('WS6 金样例端到端回归（质量门 + 不变量）', () => {
  for (const category of CATEGORIES) {
    it(`[${category}] 金样例通过质量门(0 error)`, async () => {
      const script = await runGolden(category)
      const report = runQualityGate(script, category, CATEGORY_PROFILES[category].rules)
      const errors = report.issues.filter(i => i.severity === 'error')
      expect(errors, `${category} 仍有 error: ${JSON.stringify(errors)}`).toHaveLength(0)
      expect(report.passed).toBe(true)
    })

    it(`[${category}] 满足关键不变量`, async () => {
      const script = await runGolden(category)
      const ctx = buildQualityContext(script, category)
      // 结构存在 + 操作数 > 0
      expect(ctx.structuresCreated.size).toBeGreaterThan(0)
      const totalOps = Object.entries(ctx.opCountByFamily)
        .filter(([fam]) => fam !== 'scene')
        .reduce((s, [, n]) => s + n, 0)
      expect(totalOps, `${category} 应有实质操作`).toBeGreaterThan(0)
      // 每步非空、非占位描述
      for (const step of script.steps) {
        expect(step.description.zh.trim().length).toBeGreaterThan(0)
        expect(step.description.zh).not.toMatch(/^步骤\s*\d+$/)
      }
      // 代码行覆盖率达标
      expect(ctx.codeLineCoverage).toBeGreaterThanOrEqual(0.4)
      // 类别专属不变量
      if (category === 'recursion') expect(ctx.structuresCreated.has('callstack')).toBe(true)
    })
  }
})
