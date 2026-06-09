import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import type { AnimationScript, AnimationStep, StepAction } from '@/types/animation'

function step(stepId: number, action: StepAction): AnimationStep {
  return {
    stepId,
    codeLine: stepId,
    description: { zh: `第 ${stepId} 步`, en: `Step ${stepId}` },
    action,
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  }
}

function arrayScript(data: number[], actions: StepAction[]): AnimationScript {
  return {
    algorithm: 'test',
    initialState: { type: 'array', data },
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    steps: actions.map((a, i) => step(i + 1, a)),
  }
}

describe('useAnimationEngine — playback control', () => {
  it('starts at step 0 with empty visual state when script is null', () => {
    const { result } = renderHook(() => useAnimationEngine(null))
    expect(result.current.currentStep).toBe(0)
    expect(result.current.totalSteps).toBe(0)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.visualState.arrayData).toEqual([])
    expect(result.current.currentStepData).toBeNull()
  })

  it('loadScript resets playback to step 0 when the same script also drives the prop', () => {
    const script = arrayScript([3, 1, 2], [
      { type: 'compare', targets: [0, 1], color: 'warning' },
      { type: 'compare', targets: [1, 2], color: 'warning' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    act(() => result.current.stepForward())
    expect(result.current.currentStep).toBe(2)

    // loadScript with the active script re-seats playback at step 0.
    act(() => result.current.loadScript(script))
    expect(result.current.currentStep).toBe(0)
    expect(result.current.totalSteps).toBe(2)
    expect(result.current.visualState.arrayData).toEqual([3, 1, 2])
  })

  it('stepForward / stepBackward honor [0, totalSteps] bounds', () => {
    const script = arrayScript([1, 2], [
      { type: 'compare', targets: [0], color: 'primary' },
      { type: 'compare', targets: [1], color: 'primary' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    expect(result.current.currentStep).toBe(1)
    act(() => result.current.stepForward())
    expect(result.current.currentStep).toBe(2)
    // Cannot exceed totalSteps
    act(() => result.current.stepForward())
    expect(result.current.currentStep).toBe(2)

    act(() => result.current.stepBackward())
    expect(result.current.currentStep).toBe(1)
    act(() => result.current.stepBackward())
    expect(result.current.currentStep).toBe(0)
    // Cannot go below 0
    act(() => result.current.stepBackward())
    expect(result.current.currentStep).toBe(0)
  })

  it('goToEnd jumps to totalSteps and reset returns to 0', () => {
    const script = arrayScript([1, 2, 3], [
      { type: 'compare', targets: [0], color: 'primary' },
      { type: 'compare', targets: [1], color: 'primary' },
      { type: 'compare', targets: [2], color: 'primary' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.goToEnd())
    expect(result.current.currentStep).toBe(3)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentStepData?.stepId).toBe(3)

    act(() => result.current.reset())
    expect(result.current.currentStep).toBe(0)
  })

  it('togglePlay toggles isPlaying and auto-advances on a timer', () => {
    vi.useFakeTimers()
    const script = arrayScript([1, 2, 3], [
      { type: 'compare', targets: [0], color: 'primary' },
      { type: 'compare', targets: [1], color: 'primary' },
      { type: 'compare', targets: [2], color: 'primary' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.togglePlay())
    expect(result.current.isPlaying).toBe(true)

    act(() => { vi.advanceTimersByTime(1500) })
    expect(result.current.currentStep).toBe(1)
    act(() => { vi.advanceTimersByTime(1500) })
    expect(result.current.currentStep).toBe(2)

    // Pause mid-way
    act(() => result.current.togglePlay())
    expect(result.current.isPlaying).toBe(false)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.currentStep).toBe(2)
    vi.useRealTimers()
  })

  it('togglePlay at the end restarts from step 0', () => {
    vi.useFakeTimers()
    const script = arrayScript([1, 2], [
      { type: 'compare', targets: [0], color: 'primary' },
      { type: 'compare', targets: [1], color: 'primary' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.goToEnd())
    expect(result.current.currentStep).toBe(2)

    act(() => result.current.togglePlay())
    expect(result.current.currentStep).toBe(0)
    expect(result.current.isPlaying).toBe(true)
    vi.useRealTimers()
  })

  it('faster speed shortens the auto-play interval', () => {
    vi.useFakeTimers()
    const script = arrayScript([1, 2, 3], [
      { type: 'compare', targets: [0], color: 'primary' },
      { type: 'compare', targets: [1], color: 'primary' },
      { type: 'compare', targets: [2], color: 'primary' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.setSpeed(3))
    expect(result.current.speed).toBe(3)

    act(() => result.current.togglePlay())
    // interval = 1500 / 3 = 500ms
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.currentStep).toBe(1)
    vi.useRealTimers()
  })
})

describe('useAnimationEngine — array replay derivation', () => {
  it('replays a swap step (swaps both data and elementIds)', () => {
    const script = arrayScript([5, 9, 1], [
      { type: 'swap', targets: [0, 2], color: 'danger' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    expect(result.current.visualState.arrayData).toEqual([1, 9, 5])
    expect(result.current.visualState.elementIds).toEqual([2, 1, 0])
  })

  it('replays a move step copying value/source into the target index', () => {
    const script = arrayScript([4, 7, 2], [
      { type: 'move', targets: [0, 2], color: 'primary', value: 99 },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    expect(result.current.visualState.arrayData).toEqual([4, 7, 99])
  })

  it('replays an insert step growing the array at position', () => {
    const script = arrayScript([1, 2, 3], [
      { type: 'insert', targets: [1], color: 'success', value: 42, to: 1 },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    expect(result.current.visualState.arrayData).toEqual([1, 42, 2, 3])
    expect(result.current.visualState.elementIds).toHaveLength(4)
  })

  it('replays a delete step shrinking the array at index', () => {
    const script = arrayScript([1, 2, 3], [
      { type: 'delete', targets: [1], color: 'danger' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    expect(result.current.visualState.arrayData).toEqual([1, 3])
    expect(result.current.visualState.elementIds).toEqual([0, 2])
  })

  it('accumulates persistent mark colors across replayed steps', () => {
    const script = arrayScript([1, 2, 3], [
      { type: 'mark', targets: [0], color: 'success' },
      { type: 'mark', targets: [2], color: 'danger' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    act(() => result.current.stepForward())
    const colorMap = result.current.visualState.colorMap
    expect(colorMap.get(0)).toBe('success')
    expect(colorMap.get(2)).toBe('danger')
  })

  it('current step action overrides colors on its targets', () => {
    const script = arrayScript([1, 2, 3], [
      { type: 'compare', targets: [1], color: 'warning' },
    ])
    const { result } = renderHook(() => useAnimationEngine(script))

    act(() => result.current.stepForward())
    expect(result.current.visualState.colorMap.get(1)).toBe('warning')
  })
})
