import { describe, it, expect } from 'vitest'
import { searchTreeRule } from '../rules/category'
import { buildQualityContext } from '../types'
import type { AnimationScript } from '@/types/animation'

function scriptWithEvents(
  eventsPerStep: Array<Array<{ type: string } & Record<string, unknown>>>,
  algorithm = 'n_queens',
): AnimationScript {
  return {
    algorithm,
    complexity: { time: { best: 'O(n!)', average: 'O(n!)', worst: 'O(n!)' }, space: 'O(n)' },
    initialState: { type: 'array', data: [] },
    steps: eventsPerStep.map((events, i) => ({
      stepId: i + 1,
      codeLine: 0,
      description: { zh: 's', en: 's' },
      action: { type: 'highlight' as const, targets: [], color: 'primary' as const },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: events as never,
    })),
  }
}

const BACKTRACK_CODE = 'def solve(board):\n    # backtrack\n    pass'

describe('searchTreeRule', () => {
  it('flags backtracking scripts that drive the call stack but never build a search tree', () => {
    const script = scriptWithEvents([
      [{ type: 'callstack.create' }],
      [{ type: 'callstack.push', frame: { functionName: '回溯' } }],
      [{ type: 'callstack.pop' }],
    ])
    const ctx = buildQualityContext(script, 'recursion', BACKTRACK_CODE)
    const issues = searchTreeRule.check(ctx)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('recursion.missing-search-tree')
    expect(issues[0].severity).toBe('error')
  })

  it('passes when tree events are present', () => {
    const script = scriptWithEvents([
      [{ type: 'callstack.create' }],
      [{ type: 'tree.create', variant: 'binary', rootId: 'st_0', nodes: [{ id: 'st_0', value: '根' }], edges: [] }],
      [{ type: 'callstack.push', frame: { functionName: '回溯' } }],
      [{ type: 'tree.insert', parentId: 'st_0', node: { id: 'st_1', value: 'x' } }],
    ])
    const ctx = buildQualityContext(script, 'recursion', BACKTRACK_CODE)
    expect(searchTreeRule.check(ctx)).toHaveLength(0)
  })

  it('does not fire for non-backtracking recursion (e.g. plain tree DFS)', () => {
    const script = scriptWithEvents([
      [{ type: 'callstack.create' }],
      [{ type: 'callstack.push', frame: { functionName: '深度搜索' } }],
    ], 'tree_dfs')
    const ctx = buildQualityContext(script, 'recursion', 'def dfs(root):\n    if not root: return\n    dfs(root.left)')
    expect(searchTreeRule.check(ctx)).toHaveLength(0)
  })
})
