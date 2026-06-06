import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAnimationEngine } from '../useAnimationEngine'
import type { AnimationScript, AnimationStep } from '@/types/animation'

interface HookSnapshot {
  currentStep: number
  totalSteps: number
  isPlaying: boolean
  visualData: number[]
  stepForward: () => void
  goToEnd: () => void
  togglePlay: () => void
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function makeStep(stepId: number, targets: number[] = [0]): AnimationStep {
  return {
    stepId,
    codeLine: stepId,
    description: { zh: `第 ${stepId} 步`, en: `Step ${stepId}` },
    action: {
      type: 'compare',
      targets,
      color: 'warning',
    },
    stats: { comparisons: stepId, swaps: 0, accesses: targets.length },
  }
}

function makeScript(algorithm: string, data: number[], stepCount: number): AnimationScript {
  return {
    algorithm,
    initialState: { type: 'array', data },
    complexity: {
      time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
      space: 'O(1)',
    },
    steps: Array.from({ length: stepCount }, (_, index) => makeStep(index + 1)),
  }
}

function renderHook(script: AnimationScript | null, onSnapshot: (snapshot: HookSnapshot) => void) {
  function Harness({ currentScript }: { currentScript: AnimationScript | null }) {
    const hook = useAnimationEngine(currentScript)
    onSnapshot({
      currentStep: hook.currentStep,
      totalSteps: hook.totalSteps,
      isPlaying: hook.isPlaying,
      visualData: hook.visualState.arrayData,
      stepForward: hook.stepForward,
      goToEnd: hook.goToEnd,
      togglePlay: hook.togglePlay,
    })
    return null
  }

  if (!host) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  }

  act(() => {
    root!.render(<Harness currentScript={script} />)
  })
}

function latest(snapshots: HookSnapshot[]): HookSnapshot {
  return snapshots[snapshots.length - 1]!
}

afterEach(() => {
  vi.useRealTimers()
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('useAnimationEngine', () => {
  it('resets playback state when the script changes', () => {
    const snapshots: HookSnapshot[] = []
    const scriptA = makeScript('a', [1, 2, 3], 3)
    const scriptB = makeScript('b', [9, 8], 1)

    renderHook(scriptA, (snapshot) => snapshots.push(snapshot))

    act(() => {
      latest(snapshots).stepForward()
      latest(snapshots).stepForward()
    })

    expect(latest(snapshots).currentStep).toBe(2)

    renderHook(scriptB, (snapshot) => snapshots.push(snapshot))

    expect(latest(snapshots)).toMatchObject({
      currentStep: 0,
      totalSteps: 1,
      isPlaying: false,
      visualData: [9, 8],
    })
  })

  it('restarts from the beginning when play is toggled at the end', () => {
    vi.useFakeTimers()
    const snapshots: HookSnapshot[] = []
    const script = makeScript('restartable', [4, 2], 2)

    renderHook(script, (snapshot) => snapshots.push(snapshot))

    act(() => {
      latest(snapshots).goToEnd()
    })
    expect(latest(snapshots).currentStep).toBe(2)
    expect(latest(snapshots).isPlaying).toBe(false)

    act(() => {
      latest(snapshots).togglePlay()
    })
    expect(latest(snapshots)).toMatchObject({ currentStep: 0, isPlaying: true })

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(latest(snapshots).currentStep).toBe(1)
  })
})
