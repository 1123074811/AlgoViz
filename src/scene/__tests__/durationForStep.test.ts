import { describe, it, expect } from 'vitest'
import { durationForStep } from '../SceneCanvas'

describe('durationForStep', () => {
  it('slows down structural motion (swap/move/insert/delete)', () => {
    expect(durationForStep(1, 'swap')).toBeGreaterThan(durationForStep(1, 'highlight'))
    expect(durationForStep(1, 'insert')).toBeGreaterThan(durationForStep(1, 'compare'))
  })

  it('speeds up annotations', () => {
    expect(durationForStep(1, 'annotate')).toBeLessThan(durationForStep(1, 'highlight'))
  })

  it('still scales with playback speed', () => {
    expect(durationForStep(4, 'swap')).toBeLessThan(durationForStep(0.5, 'swap'))
  })

  it('falls back to base duration without an action', () => {
    expect(durationForStep(1, undefined)).toBe(durationForStep(1, 'highlight'))
  })
})
