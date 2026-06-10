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
