import { describe, it, expect } from 'vitest'
import { clampForDemo } from '../utils'
import { generateLeetCode } from '../leetcode'

describe('clampForDemo', () => {
  it('passes small arrays through untouched', () => {
    expect(clampForDemo([1, 2, 3], 12)).toEqual({ data: [1, 2, 3], truncated: false, original: 3 })
  })
  it('truncates and reports the original length', () => {
    const result = clampForDemo(Array.from({ length: 20 }, (_, i) => i), 12)
    expect(result.data).toHaveLength(12)
    expect(result.truncated).toBe(true)
    expect(result.original).toBe(20)
  })
})

describe('generateLeetCode input truncation notice', () => {
  it('prepends a visible truncation notice when input exceeds the demo cap', () => {
    const nums = Array.from({ length: 20 }, (_, i) => i + 1)
    const script = generateLeetCode({ nums, target: 3 })
    const first = script.steps[0]
    expect(first.description.zh).toContain('20')
    expect(first.description.zh).toContain('12')
    expect(first.description.en).toContain('20')
  })
  it('emits no notice for small inputs', () => {
    const script = generateLeetCode({ nums: [2, 7, 11, 15], target: 9 })
    expect(script.steps[0].description.zh).not.toContain('截断')
  })
})

describe('generateLeetCode stats are real running counts (not i+1 estimates)', () => {
  it('accumulates accesses faster than comparisons (2 accesses + 1 compare per round)', () => {
    // 旧实现硬编码 comparisons === accesses === i+1;真实累加下 accesses > comparisons。
    const script = generateLeetCode({ nums: [2, 7, 11, 15], target: 9 })
    const last = script.steps[script.steps.length - 1]
    expect(last.stats.accesses).toBeGreaterThan(last.stats.comparisons)
  })

  it('stats are monotonically non-decreasing across steps', () => {
    const script = generateLeetCode({ nums: [3, 1, 4, 1, 5, 9, 2, 6], target: 8 })
    let prevComp = -1
    let prevAcc = -1
    for (const step of script.steps) {
      expect(step.stats.comparisons).toBeGreaterThanOrEqual(prevComp)
      expect(step.stats.accesses).toBeGreaterThanOrEqual(prevAcc)
      prevComp = step.stats.comparisons
      prevAcc = step.stats.accesses
    }
  })
})
