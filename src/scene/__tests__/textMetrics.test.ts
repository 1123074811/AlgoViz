import { describe, it, expect } from 'vitest'
import { measureTextWidth, measureNodeWidth, truncateToWidth, measureNodeRenderWidth } from '../textMetrics'

describe('measureTextWidth', () => {
  it('scales with text length and font size', () => {
    expect(measureTextWidth('ab', 10)).toBeCloseTo(2 * 10 * 0.6)
    expect(measureTextWidth('', 14)).toBe(0)
    expect(measureTextWidth('abcd', 14)).toBeGreaterThan(measureTextWidth('ab', 14))
  })
})

describe('measureNodeWidth', () => {
  it('returns the minimum for short text', () => {
    expect(measureNodeWidth('a')).toBe(48)
    expect(measureNodeWidth('')).toBe(48)
  })

  it('grows with text length', () => {
    const short = measureNodeWidth('ab')
    const long = measureNodeWidth('abcdefghijklmnop')
    expect(long).toBeGreaterThan(short)
  })

  it('is capped at the maximum', () => {
    const veryLong = measureNodeWidth('x'.repeat(500))
    expect(veryLong).toBe(260)
  })

  it('honors custom min/max', () => {
    expect(measureNodeWidth('a', { min: 36, max: 180 })).toBe(36)
    expect(measureNodeWidth('x'.repeat(500), { min: 36, max: 180 })).toBe(180)
  })
})

describe('truncateToWidth', () => {
  it('returns text unchanged when it fits', () => {
    expect(truncateToWidth('abc', 1000)).toBe('abc')
  })

  it('adds an ellipsis when too long', () => {
    const out = truncateToWidth('abcdefghijklmnop', 30, 12)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThan('abcdefghijklmnop'.length)
  })

  it('never returns empty for positive width', () => {
    expect(truncateToWidth('abcdef', 1).length).toBeGreaterThan(0)
  })
})

describe('measureNodeRenderWidth', () => {
  it('returns at least the base width for short fields', () => {
    expect(measureNodeRenderWidth([{ value: 1 }], 96)).toBe(96)
  })

  it('grows with multiple wide fields', () => {
    const wide = measureNodeRenderWidth(
      [{ value: '1=Alice' }, { value: '5=Bob' }, { value: '9=Carol' }],
      96
    )
    expect(wide).toBeGreaterThan(96)
  })

  it('handles empty field list without throwing', () => {
    expect(measureNodeRenderWidth([], 96)).toBe(96)
  })
})
