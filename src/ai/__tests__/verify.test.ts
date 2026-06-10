import { describe, it, expect } from 'vitest'
import { parseExpectValue, resultsMatch, verifyAgainstExpect, verifyAgainstGroundTruth, sanitizeLineMapping, formatVerifyValue } from '../verify'
import type { AnimationScript } from '@/types/animation'

function makeScript(result?: AnimationScript['result'], codeLines: number[] = [0]): AnimationScript {
  return {
    algorithm: 'test',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [1, 2] },
    ...(result !== undefined && { result }),
    steps: codeLines.map((codeLine, i) => ({
      stepId: i + 1,
      codeLine,
      description: { zh: 's', en: 's' },
      action: { type: 'highlight', targets: [], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    })),
  }
}

describe('parseExpectValue', () => {
  it('parses JSON payloads', () => {
    expect(parseExpectValue('[0,1]')).toEqual({ ok: true, value: [0, 1] })
    expect(parseExpectValue('true')).toEqual({ ok: true, value: true })
    expect(parseExpectValue('42')).toEqual({ ok: true, value: 42 })
    expect(parseExpectValue('"abc"')).toEqual({ ok: true, value: 'abc' })
  })
  it('falls back to plain string for non-JSON payloads', () => {
    expect(parseExpectValue('abc')).toEqual({ ok: true, value: 'abc' })
  })
  it('rejects empty/undefined', () => {
    expect(parseExpectValue(undefined).ok).toBe(false)
    expect(parseExpectValue('  ').ok).toBe(false)
  })
})

describe('resultsMatch', () => {
  it('matches numbers with tolerance', () => {
    expect(resultsMatch(0.1 + 0.2, 0.3)).toBe(true)
    expect(resultsMatch(3, 4)).toBe(false)
  })
  it('matches arrays element-wise', () => {
    expect(resultsMatch([0, 1], [0, 1])).toBe(true)
    expect(resultsMatch([0, 1], [1, 0])).toBe(false)
    expect(resultsMatch([0, 1], [0, 1, 2])).toBe(false)
  })
  it('coerces string/number cross-type comparison', () => {
    expect(resultsMatch('42', 42)).toBe(true)
    expect(resultsMatch(true, 'true')).toBe(true)
  })
  it('treats NaN as equal to NaN', () => {
    expect(resultsMatch(NaN, NaN)).toBe(true)
  })
  it('matches nested arrays recursively', () => {
    expect(resultsMatch([[1, 2]], [[1, 2]])).toBe(true)
    expect(resultsMatch([[1, 2]], [[1, 3]])).toBe(false)
  })
  it('matches empty arrays', () => {
    expect(resultsMatch([], [])).toBe(true)
  })
})

describe('verifyAgainstExpect', () => {
  it('passes when script.result equals @expect', () => {
    const outcome = verifyAgainstExpect(makeScript([0, 1]), '[0,1]')
    expect(outcome.status).toBe('pass')
    expect(outcome.source).toBe('expect')
  })
  it('fails on mismatch and carries both values', () => {
    const outcome = verifyAgainstExpect(makeScript([1, 0]), '[0,1]')
    expect(outcome.status).toBe('fail')
    expect(outcome.actual).toEqual([1, 0])
    expect(outcome.expected).toEqual([0, 1])
  })
  it('skips when the generator never called b.result', () => {
    expect(verifyAgainstExpect(makeScript(undefined), '[0,1]').status).toBe('skipped')
  })
  it('skips when @expect is missing or unparseable-empty', () => {
    expect(verifyAgainstExpect(makeScript([0, 1]), undefined).status).toBe('skipped')
  })
})

describe('sanitizeLineMapping', () => {
  it('clears codeLine beyond the source line count', () => {
    const script = makeScript([0], [0, 2, 99])
    const fixed = sanitizeLineMapping(script, 'line1\nline2\nline3')
    expect(fixed).toBe(1)
    expect(script.steps.map(s => s.codeLine)).toEqual([0, 2, -1])
  })
  it('returns 0 when all lines are valid', () => {
    const script = makeScript([0], [0, 1])
    expect(sanitizeLineMapping(script, 'a\nb\nc')).toBe(0)
  })
})

describe('verifyAgainstGroundTruth', () => {
  it('passes when script.result equals the ground truth', () => {
    const outcome = verifyAgainstGroundTruth(makeScript(42), 42)
    expect(outcome.status).toBe('pass')
    expect(outcome.source).toBe('js-exec')
  })
  it('fails on mismatch', () => {
    expect(verifyAgainstGroundTruth(makeScript(42), 99).status).toBe('fail')
  })
  it('skips when generator never called b.result', () => {
    expect(verifyAgainstGroundTruth(makeScript(undefined), 99).status).toBe('skipped')
  })
})

describe('formatVerifyValue', () => {
  it('returns JSON for plain values', () => {
    expect(formatVerifyValue([1, 2])).toBe('[1,2]')
  })
  it('truncates long strings beyond 120 chars', () => {
    const long = Array(200).fill('a').join('')
    const result = formatVerifyValue(long)
    expect(result.length).toBe(120)
    expect(result.endsWith('...')).toBe(true)
  })
})

describe('formatVerifyValue edge cases', () => {
  it('does not throw on undefined and falls back to String()', () => {
    expect(formatVerifyValue(undefined)).toBe('undefined')
  })
})
