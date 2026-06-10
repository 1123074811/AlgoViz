import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { mapCompiler, mapNodeId } from '../mapCompiler'
import { createEmptyScene } from '../../types'
import type { SceneNode, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'map',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = mapCompiler.compile(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function node(scene: SceneState, id: string): SceneNode | undefined {
  const e = scene.entities[id]
  return e?.type === 'node' ? e : undefined
}

function valueField(n: SceneNode | undefined): unknown {
  return n?.fields.find(f => f.id === 'value')?.value
}

function mapIds(scene: SceneState): string[] {
  return Object.keys(scene.entities).filter(k => /^map_\d+$/.test(k))
}

describe('mapCompiler', () => {
  it('create 产出 map_<i> 节点，携带 key/value', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'map.create',
      entries: [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ],
    })

    expect(mapIds(scene)).toHaveLength(2)
    expect(node(scene, 'map_0')?.meta?.key).toBe('a')
    expect(valueField(node(scene, 'map_0'))).toBe(1)
    expect(node(scene, 'map_1')?.meta?.key).toBe('b')
  })

  it('put 新键追加节点并写 inserted note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'map.create', entries: [{ key: 'a', value: 1 }] })
    scene = step(scene, { type: 'map.put', key: 'c', value: 3 })

    expect(mapIds(scene)).toHaveLength(2)
    expect(node(scene, 'map_1')?.meta?.key).toBe('c')
    expect(node(scene, 'map_1')?.state?.role).toBe('inserted')
    expect(scene.notes).toContain('put(c, 3) → inserted')
  })

  it('put 已存在键就地更新 value 字段并写 updated note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'map.create', entries: [{ key: 'a', value: 1 }] })
    scene = step(scene, { type: 'map.put', key: 'a', value: 99 })

    // 没有新增节点
    expect(mapIds(scene)).toHaveLength(1)
    expect(valueField(node(scene, 'map_0'))).toBe(99)
    expect(node(scene, 'map_0')?.state?.role).toBe('inserted')
    expect(scene.notes).toContain('put(a, 99) → updated')
  })

  it('get 命中：标记 visited 并写 note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'map.create', entries: [{ key: 'a', value: 1 }] })
    scene = step(scene, { type: 'map.get', key: 'a', value: 1, found: true })

    expect(node(scene, 'map_0')?.state?.role).toBe('visited')
    expect(scene.notes).toContain('get(a) → 1')
  })

  it('get 存在键但 found=false 标记 conflict', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'map.create', entries: [{ key: 'a', value: 1 }] })
    scene = step(scene, { type: 'map.get', key: 'a', found: false })

    expect(node(scene, 'map_0')?.state?.role).toBe('conflict')
  })

  it('get 缺失键写 null note 且不改任何节点', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'map.create', entries: [{ key: 'a', value: 1 }] })
    scene = step(scene, { type: 'map.get', key: 'z', found: false })

    expect(scene.notes).toContain('get(z) → null')
    expect(node(scene, 'map_0')?.state?.role).not.toBe('conflict')
  })

  it('remove 命中：标记 deleted，下一步清理移除', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'map.create',
      entries: [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ],
    })
    scene = step(scene, { type: 'map.remove', key: 'a' })

    expect(node(scene, 'map_0')?.state?.role).toBe('deleted')
    expect(scene.notes).toContain('remove(a)')

    // 后续事件清理 deleted 节点与 phantom
    scene = step(scene, { type: 'map.get', key: 'b', value: 2, found: true })
    expect(scene.entities['map_0']).toBeUndefined()
    expect(Object.keys(scene.entities).some(k => k.startsWith('phantom_'))).toBe(false)
  })

  it('remove 缺失键写 not found note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'map.create', entries: [{ key: 'a', value: 1 }] })
    scene = step(scene, { type: 'map.remove', key: 'z' })

    expect(scene.notes).toContain('remove(z) → not found')
    expect(mapIds(scene)).toHaveLength(1)
  })

  it('mapNodeId 生成稳定 id', () => {
    expect(mapNodeId(2)).toBe('map_2')
  })
})
