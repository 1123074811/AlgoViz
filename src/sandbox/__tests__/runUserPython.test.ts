import { describe, it, expect } from 'vitest'
import { buildPyCallSource, runUserPySandboxed } from '../runUserPython'

describe('buildPyCallSource', () => {
  it('builds a json-printing call for def with named-object input', () => {
    const code = 'def two_sum(nums, target):\n    return [0, 1]'
    const src = buildPyCallSource(code, { nums: [2, 7], target: 9 })
    expect(src).toContain('two_sum([2, 7], 9)')
    expect(src).toContain('json.dumps')
  })

  it('passes bare array input as a single argument', () => {
    const src = buildPyCallSource('def sort_arr(nums):\n    return sorted(nums)', [3, 1, 2])
    expect(src).toContain('sort_arr([3, 1, 2])')
  })

  it('returns null without a def', () => {
    expect(buildPyCallSource('x = 1', [1])).toBeNull()
  })

  it('serializes nested structures and booleans as Python literals', () => {
    const src = buildPyCallSource('def f(grid, flag):\n    return 1', { grid: [[1, 0], [0, 1]], flag: true })
    expect(src).toContain('f([[1, 0], [0, 1]], True)')
  })
})

describe('runUserPySandboxed', () => {
  it('reports unavailable in environments without Worker (no crash, graceful skip)', async () => {
    const result = await runUserPySandboxed('def f(x):\n    return x', [1])
    expect(result.ok).toBe(false)
  })
})
