import { describe, it, expect } from 'vitest'
import { deriveSceneState } from '../SceneEngine'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmEvent } from '../eventTypes'

function step(id: number, events: AlgorithmEvent[]): AnimationStep {
  return {
    stepId: id,
    codeLine: 0,
    description: { zh: 's', en: 's' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    events,
  }
}

const script: AnimationScript = {
  algorithm: 'custom',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
  initialState: { type: 'array', data: [] },
  presentation: { engine: 'scene', module: 'array' },
  steps: [
    step(1, [{ type: 'math.init', vars: [{ name: 'i', value: 0 }, { name: 'flag', value: -1 }] }]),
    step(2, [{ type: 'math.set', name: 'i', value: 1, delta: '+1' }]),
    step(3, [{ type: 'scene.note', text: '非数学步骤（如数组操作）' }]),
  ],
}

function deltaOf(scene: ReturnType<typeof deriveSceneState>, name: string): string | undefined {
  const cell = scene.entities[`mathvar_${name}`] as { meta?: { delta?: string } } | undefined
  return cell?.meta?.delta
}

describe('变量 delta/pulse 仅在发生变化的那一步显示', () => {
  it('变化当步显示 delta', () => {
    const scene = deriveSceneState(script, 2) // activeStep = step2(set i)
    expect(deltaOf(scene, 'i')).toBe('+1')
  })

  it('下一步(非数学步)不再残留 delta', () => {
    const scene = deriveSceneState(script, 3) // activeStep = step3(note),未触碰任何变量
    expect(deltaOf(scene, 'i')).toBeUndefined()
    const cell = scene.entities['mathvar_i'] as { state?: { pulse?: boolean } } | undefined
    expect(cell?.state?.pulse).toBeFalsy()
  })
})
