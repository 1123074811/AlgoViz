import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { SceneState } from '../../types'

const dummyScript = {
  algorithm: 'pointer',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = compileEvent(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

describe('pointerCompiler', () => {
  it('create creates a pointer targeting an entity and port', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'pointer.create', pointerId: 'slow', label: 'slow', targetId: 'node_1', portId: 'next' })

    expect(scene.pointers.slow?.label).toBe('slow')
    expect(scene.pointers.slow?.target).toEqual({ entityId: 'node_1', portId: 'next' })
  })

  it('move retargets an existing pointer and can update its label', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'pointer.create', pointerId: 'cur', label: 'cur', targetId: 'node_1' })
    scene = step(scene, { type: 'pointer.move', pointerId: 'cur', targetId: 'node_2', label: 'current' })

    expect(scene.pointers.cur?.label).toBe('current')
    expect(scene.pointers.cur?.target).toEqual({ entityId: 'node_2', portId: undefined })
  })

  it('clear keeps the pointer but clears its target', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'pointer.create', pointerId: 'tail', label: 'tail', targetId: 'node_3' })
    scene = step(scene, { type: 'pointer.clear', pointerId: 'tail' })

    expect(scene.pointers.tail?.label).toBe('tail')
    expect(scene.pointers.tail?.target).toBeNull()
  })

  it('highlight marks an existing pointer active with the requested color', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'pointer.create', pointerId: 'fast', targetId: 'node_1' })
    scene = step(scene, { type: 'pointer.highlight', pointerId: 'fast', color: 'warning' })

    expect(scene.pointers.fast?.state?.role).toBe('active')
    expect(scene.pointers.fast?.state?.color).toBe('warning')
    expect(scene.pointers.fast?.state?.pulse).toBe(true)
  })
})
