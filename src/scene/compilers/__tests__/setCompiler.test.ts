import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'set',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = compileEvent(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function setCells(scene: SceneState): SceneCell[] {
  return Object.keys(scene.entities)
    .filter(k => k.startsWith('set_'))
    .map(k => scene.entities[k])
    .filter((e): e is SceneCell => e?.type === 'cell')
}

function liveSetCells(scene: SceneState): SceneCell[] {
  return setCells(scene).filter(c => c.state?.role !== 'deleted')
}

describe('setCompiler', () => {
  it('create 为每个元素产出一个 set_ cell', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'set.create', values: [1, 2, 3] })

    const cells = setCells(scene)
    expect(cells).toHaveLength(3)
    expect(cells.map(c => c.value).sort()).toEqual([1, 2, 3])
  })

  it('create 去重重复初始值', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'set.create', values: [1, 2, 2, 3, 1] })

    expect(setCells(scene)).toHaveLength(3)
    expect(liveSetCells(scene).map(c => c.value).sort()).toEqual([1, 2, 3])
  })

  it('add 新值追加一个成员', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'set.create', values: [1, 2, 3] })
    scene = step(scene, { type: 'set.add', value: 4 })

    const live = liveSetCells(scene)
    expect(live).toHaveLength(4)
    const four = live.find(c => c.value === 4)
    expect(four?.state?.role).toBe('inserted')
    expect(four?.state?.pulse).toBe(true)
  })

  it('add 已存在的值不新增成员（去重），并标 conflict', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'set.create', values: [1, 2, 3] })
    scene = step(scene, { type: 'set.add', value: 2 })

    // still 3 live members — no duplicate inserted
    expect(liveSetCells(scene)).toHaveLength(3)
    const two = liveSetCells(scene).find(c => c.value === 2)
    expect(two?.state?.role).toBe('conflict')
  })

  it('contains 命中标 visited/success，未命中只发 note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'set.create', values: [1, 2, 3] })

    scene = step(scene, { type: 'set.contains', value: 2, found: true })
    const two = liveSetCells(scene).find(c => c.value === 2)
    expect(two?.state?.role).toBe('visited')
    expect(two?.state?.color).toBe('success')

    scene = step(scene, { type: 'set.contains', value: 99, found: false })
    expect(scene.notes?.[scene.notes.length - 1]).toContain('未命中')
  })

  it('remove 标记目标为 deleted 并淡出', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'set.create', values: [1, 2, 3] })
    scene = step(scene, { type: 'set.remove', value: 2 })

    const two = setCells(scene).find(c => c.value === 2)
    expect(two?.state?.role).toBe('deleted')
    // a subsequent step cleans up the deleted cell
    scene = step(scene, { type: 'set.contains', value: 1, found: true })
    expect(setCells(scene).find(c => c.value === 2)).toBeUndefined()
    expect(liveSetCells(scene)).toHaveLength(2)
  })
})
