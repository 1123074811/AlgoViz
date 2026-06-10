import { buildJsCallSource, runUserJsSandboxed } from '../runUserCode'

describe('buildJsCallSource', () => {
  it('builds a call for function declarations with named-object input', () => {
    const code = 'function twoSum(nums, target) { return [0, 1] }'
    const src = buildJsCallSource(code, { nums: [2, 7], target: 9 })
    expect(src).toContain('return twoSum([2,7], 9)')
  })
  it('passes bare array input as a single argument', () => {
    const code = 'function sortArr(nums) { return nums.slice().sort((a,b)=>a-b) }'
    const src = buildJsCallSource(code, [3, 1, 2])
    expect(src).toContain('return sortArr([3,1,2])')
  })
  it('supports arrow function assignments', () => {
    const code = 'const maxVal = (nums) => Math.max(...nums)'
    const src = buildJsCallSource(code, [1, 9, 4])
    expect(src).toContain('return maxVal([1,9,4])')
  })
  it('returns null when no callable entry is found', () => {
    expect(buildJsCallSource('const x = 1', [1])).toBeNull()
  })
})

describe('runUserJsSandboxed (inline fallback in jsdom)', () => {
  it('executes user JS and returns the real value', async () => {
    const code = 'function add(nums, target) { return nums[0] + target }'
    const result = await runUserJsSandboxed(code, { nums: [5], target: 4 })
    expect(result).toEqual({ ok: true, value: 9 })
  })
  it('reports failure when the entry cannot be built', async () => {
    const result = await runUserJsSandboxed('const a = 1', [1])
    expect(result.ok).toBe(false)
  })
  it('reports failure when user code throws', async () => {
    const result = await runUserJsSandboxed('function boom(x) { throw new Error("nope") }', [1])
    expect(result.ok).toBe(false)
    expect(result.error).toContain('nope')
  })
})
