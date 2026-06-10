import { describe, it, expect } from 'vitest'
import { usesSceneEngine, getSceneEventStats, getAdaptiveCircleLayout } from '@/scene'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmEvent } from '../eventTypes'

// ── Fixture helpers ────────────────────────────────────────────────────────────

function step(id: number, events?: AlgorithmEvent[]): AnimationStep {
  return {
    stepId: id,
    codeLine: 0,
    description: { zh: 's', en: 's' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    ...(events && { events }),
  }
}

function script(steps: AnimationStep[], presentation?: AnimationScript['presentation']): AnimationScript {
  return {
    algorithm: 'x',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [] },
    steps,
    ...(presentation && { presentation }),
  }
}

// ── usesSceneEngine ─────────────────────────────────────────────────────────────

describe('usesSceneEngine', () => {
  it('returns false for null / undefined', () => {
    expect(usesSceneEngine(null)).toBe(false)
    expect(usesSceneEngine(undefined)).toBe(false)
  })

  it('returns true when presentation.engine === "scene"', () => {
    expect(usesSceneEngine(script([step(1)], { engine: 'scene' }))).toBe(true)
  })

  it('returns true when any step carries events', () => {
    expect(usesSceneEngine(script([step(1), step(2, [{ type: 'scene.wait' }])]))).toBe(true)
  })

  it('returns false when engine is classic and no step has events', () => {
    expect(usesSceneEngine(script([step(1), step(2)], { engine: 'classic' }))).toBe(false)
  })

  it('returns false when a step has an empty events array', () => {
    expect(usesSceneEngine(script([step(1, [])]))).toBe(false)
  })
})

// ── getSceneEventStats ──────────────────────────────────────────────────────────

describe('getSceneEventStats', () => {
  it('returns zeros for null script', () => {
    expect(getSceneEventStats(null)).toEqual({ eventSteps: 0, totalEvents: 0 })
  })

  it('counts steps with events and total events', () => {
    const s = script([
      step(1, [{ type: 'scene.wait' }, { type: 'scene.note', text: 'a' }]),
      step(2),
      step(3, [{ type: 'scene.note', text: 'b' }]),
    ])
    expect(getSceneEventStats(s)).toEqual({ eventSteps: 2, totalEvents: 3 })
  })

  it('treats empty events arrays as non-event steps', () => {
    const s = script([step(1, []), step(2)])
    expect(getSceneEventStats(s)).toEqual({ eventSteps: 0, totalEvents: 0 })
  })
})

// ── getAdaptiveCircleLayout ─────────────────────────────────────────────────────

describe('getAdaptiveCircleLayout', () => {
  it('handles empty string', () => {
    expect(getAdaptiveCircleLayout('')).toEqual({ r: 18, fontSize: 14 })
  })

  it('handles single-character value', () => {
    expect(getAdaptiveCircleLayout('7')).toEqual({ r: 18, fontSize: 16 })
  })

  it('handles two-character value', () => {
    expect(getAdaptiveCircleLayout('42')).toEqual({ r: 20, fontSize: 15 })
  })

  it('handles three-character value', () => {
    expect(getAdaptiveCircleLayout('100')).toEqual({ r: 23, fontSize: 13 })
  })

  it('expands radius and shrinks font for 4 chars', () => {
    // r = max(24, 23 + (4-3)*3) = 26 ; fontSize = max(10, 13 - 0.8) = 12.2
    expect(getAdaptiveCircleLayout('1000')).toEqual({ r: 26, fontSize: 12.2 })
  })

  it('clamps font size to a minimum of 10 for very long values', () => {
    const layout = getAdaptiveCircleLayout('1234567890123')
    // valLen = 13 -> r = 23 + 10*3 = 53 ; fontSize = max(10, 13 - 10*0.8 = 5) = 10
    expect(layout.r).toBe(53)
    expect(layout.fontSize).toBe(10)
  })
})
