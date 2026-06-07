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
    [{ algorithm: 'monotonic_stack', type: 'array' }, 'structure'],
    [{ declaredCategory: 'recursion', algorithm: 'x' }, 'recursion'],
  ] as const)('%o → %s', (input, expected) => {
    expect(classifyAlgorithm(input)).toBe(expected)
  })
})
