import { describe, it, expect } from 'vitest'
import { classifyAlgorithm } from '../categories'

describe('classifyAlgorithm', () => {
  it.each([
    [{ algorithm: 'num_islands_dfs', type: 'matrix' }, 'grid'],
    [{ algorithm: 'quick_sort', type: 'array' }, 'linear'],
    [{ algorithm: 'dijkstra', type: 'graph' }, 'graph'],
    [{ algorithm: 'lcs', type: 'array' }, 'dp'],
    [{ algorithm: 'bst_insert', type: 'tree' }, 'tree'],
    [{ algorithm: 'n_queens', type: 'array' }, 'recursion'],
    // 纯回溯（无 memo）仍归 recursion（递归树）
    [{ algorithm: 'subsets', type: 'array' }, 'recursion'],
    // 记忆化搜索（有 memo 表，如数位 DP / fib memo）归 dp（DP 状态表），优先于 recursion 判断
    [{ algorithm: 'digit_dp', type: 'array', code: 'const memo = []' }, 'dp'],
    [{ algorithm: 'fibonacci_memo', type: 'array' }, 'dp'],
    [{ algorithm: 'count_numbers', code: 'let memo = new Array(16)' }, 'dp'],
    [{ algorithm: '记忆化搜索', type: 'array' }, 'dp'],
    [{ algorithm: 'monotonic_stack', type: 'array' }, 'structure'],
    [{ declaredCategory: 'recursion', algorithm: 'x' }, 'recursion'],
  ] as const)('%o → %s', (input, expected) => {
    expect(classifyAlgorithm(input)).toBe(expected)
  })
})
