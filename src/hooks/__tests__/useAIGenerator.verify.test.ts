import { describe, it, expect } from 'vitest'
import { verifyAndTag } from '../useAIGenerator'
import type { AnimationScript } from '@/types/animation'

function scriptWithResult(result: AnimationScript['result']): AnimationScript {
  return {
    algorithm: 'two_sum',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
    initialState: { type: 'array', data: [2, 7] },
    result,
    steps: [{
      stepId: 1, codeLine: 0,
      description: { zh: 's', en: 's' },
      action: { type: 'highlight', targets: [], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    }],
  }
}

describe('verifyAndTag', () => {
  it('tags pass when @expect matches script.result', async () => {
    const script = scriptWithResult([0, 1])
    const outcome = await verifyAndTag(script, {
      expectRaw: '[0,1]', language: 'python', userCode: 'def f(): pass', input: [2, 7], sourceCode: 'def f(): pass',
    })
    expect(outcome.status).toBe('pass')
    expect(script.verification?.status).toBe('pass')
    expect(script.verification?.source).toBe('expect')
  })

  it('prefers JS ground-truth over @expect for javascript code', async () => {
    const script = scriptWithResult(9)
    const userCode = 'function add(nums, target) { return nums[0] + target }'
    const outcome = await verifyAndTag(script, {
      expectRaw: '999', language: 'javascript', userCode, input: { nums: [5], target: 4 }, sourceCode: userCode,
    })
    expect(outcome.status).toBe('pass')
    expect(script.verification?.source).toBe('js-exec')
  })

  it('tags fail with formatted expected/actual on mismatch', async () => {
    const script = scriptWithResult([1, 0])
    await verifyAndTag(script, {
      expectRaw: '[0,1]', language: 'python', userCode: 'x', input: [2, 7], sourceCode: 'x',
    })
    expect(script.verification?.status).toBe('fail')
    expect(script.verification?.expected).toBe('[0,1]')
    expect(script.verification?.actual).toBe('[1,0]')
  })

  it('sanitizes out-of-range codeLine values', async () => {
    const script = scriptWithResult([0, 1])
    script.steps[0].codeLine = 999
    await verifyAndTag(script, {
      expectRaw: '[0,1]', language: 'python', userCode: 'one line', input: [], sourceCode: 'one line',
    })
    expect(script.steps[0].codeLine).toBe(-1)
  })
})

describe('verifyAndTag for live-regen (no @expect)', () => {
  it('verifies via JS ground truth alone when expectRaw is omitted', async () => {
    const script = scriptWithResult(9)
    const userCode = 'function add(nums, target) { return nums[0] + target }'
    const outcome = await verifyAndTag(script, {
      language: 'javascript', userCode, input: { nums: [5], target: 4 }, sourceCode: userCode,
    })
    expect(outcome.status).toBe('pass')
    expect(script.verification?.source).toBe('js-exec')
  })

  it('tags skipped (not fail) for non-JS code without expectRaw', async () => {
    const script = scriptWithResult(9)
    const outcome = await verifyAndTag(script, {
      language: 'python', userCode: 'def f(): pass', input: [], sourceCode: 'def f(): pass',
    })
    expect(outcome.status).toBe('skipped')
  })
})
