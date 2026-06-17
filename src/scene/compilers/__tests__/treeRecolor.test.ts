import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { treeCompiler } from '../../graphics/compile/treeCompile'
import { createEmptyScene } from '../../types'
import type { SceneState } from '../../types'

const dummyScript = {
  algorithm: 'red_black_tree',
  complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
  initialState: { type: 'tree', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  return applyCommands(scene, treeCompiler.compile(event, { scene, stepIndex: 0, script: dummyScript }))
}

describe('treeCompiler · 红黑树着色', () => {
  it('tree.create 携带 rbColor 时把节点 state.rbColor 着色', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'tree.create', variant: 'binary', rootId: 'a',
      nodes: [{ id: 'a', value: 13, rbColor: 'black' }, { id: 'b', value: 8, rbColor: 'red' }],
      edges: [{ parentId: 'a', childId: 'b' }],
    })
    const a = scene.entities['a'], b = scene.entities['b']
    expect(a?.type === 'node' && a.state?.rbColor).toBe('black')
    expect(b?.type === 'node' && b.state?.rbColor).toBe('red')
  })

  it('tree.recolor 动态改变节点 rbColor', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'tree.create', variant: 'binary', rootId: 'a', nodes: [{ id: 'a', value: 1, rbColor: 'red' }], edges: [] })
    scene = step(scene, { type: 'tree.recolor', nodeId: 'a', rbColor: 'black' })
    const a = scene.entities['a']
    expect(a?.type === 'node' && a.state?.rbColor).toBe('black')
  })
})
