import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimationEngine } from '../useAnimationEngine'
import type { AnimationScript } from '@/types/animation'

function makeScript(stepCount: number): AnimationScript {
  return {
    algorithm: 'test',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [1, 2, 3] },
    steps: Array.from({ length: stepCount }, (_, i) => ({
      stepId: i + 1,
      codeLine: 0,
      description: { zh: `步骤 ${i + 1}`, en: `Step ${i + 1}` },
      action: { type: 'highlight' as const, targets: [], color: 'primary' as const },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    })),
  }
}

describe('goToStep', () => {
  it('jumps to an arbitrary step and pauses playback', () => {
    const script = makeScript(10)
    const { result } = renderHook(() => useAnimationEngine(script))
    act(() => result.current.togglePlay())
    act(() => result.current.goToStep(7))
    expect(result.current.currentStep).toBe(7)
    expect(result.current.isPlaying).toBe(false)
  })

  it('clamps to [0, totalSteps]', () => {
    const script = makeScript(5)
    const { result } = renderHook(() => useAnimationEngine(script))
    act(() => result.current.goToStep(99))
    expect(result.current.currentStep).toBe(5)
    act(() => result.current.goToStep(-3))
    expect(result.current.currentStep).toBe(0)
  })

  it('floors non-integer input', () => {
    const script = makeScript(10)
    const { result } = renderHook(() => useAnimationEngine(script))
    act(() => result.current.goToStep(4.7))
    expect(result.current.currentStep).toBe(4)
  })
})
