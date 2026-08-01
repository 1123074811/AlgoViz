import { describe, expect, it } from 'vitest'
import {
  formatRuntimeOutput,
  normalizeRuntimeValue,
} from '../runtimeContract'

describe('runtime contract', () => {
  it('normalizes non-JSON worker values', () => {
    expect(normalizeRuntimeValue({
      distance: Infinity,
      visited: new Set([1, 2]),
      parents: new Map([['B', 'A']]),
    })).toEqual({
      distance: 'Infinity',
      visited: [1, 2],
      parents: [['B', 'A']],
    })
    expect(formatRuntimeOutput(12n)).toBe('12')
  })
})
