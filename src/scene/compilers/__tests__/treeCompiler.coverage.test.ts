import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { treeCompiler } from '../treeCompiler'
import { createEmptyScene } from '../../types'
import type { SceneNode, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'tree',
  complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
  initialState: { type: 'tree', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = treeCompiler.compile(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function node(scene: SceneState, id: string): SceneNode | undefined {
  const e = scene.entities[id]
  return e?.type === 'node' ? e : undefined
}

function field(scene: SceneState, id: string, fieldId: string): unknown {
  return node(scene, id)?.fields.find(f => f.id === fieldId)?.value
}

function edgeBetween(scene: SceneState, parent: string, child: string) {
  return Object.values(scene.edges).find(e => e.from.entityId === parent && e.to.entityId === child)
}

function createBinary() {
  let scene = createEmptyScene()
  scene = step(scene, {
    type: 'tree.create',
    variant: 'bst',
    rootId: 'r',
    nodes: [
      { id: 'r', value: 5 },
      { id: 'l', value: 3 },
      { id: 'rr', value: 8 },
    ],
    edges: [
      { parentId: 'r', childId: 'l', port: 'left' },
      { parentId: 'r', childId: 'rr', port: 'right' },
    ],
  })
  return scene
}

describe('treeCompiler', () => {
  it('create：节点、父子边、root 指针', () => {
    const scene = createBinary()
    expect(field(scene, 'r', 'value')).toBe(5)
    expect(edgeBetween(scene, 'r', 'l')).toBeDefined()
    expect(edgeBetween(scene, 'r', 'rr')).toBeDefined()
    expect(scene.pointers.root?.target?.entityId).toBe('r')
  })

  it('create btree：value 解析为 keys', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'tree.create',
      variant: 'btree',
      rootId: 'b',
      nodes: [{ id: 'b', value: '3·7·9' }],
      edges: [],
    })
    const n = node(scene, 'b')
    expect(n?.variant).toBe('tree.btree')
    // 三个 key 字段
    expect(n?.fields.filter(f => f.id.startsWith('key_'))).toHaveLength(3)
  })

  it('visit 标记 visited', () => {
    let scene = createBinary()
    scene = step(scene, { type: 'tree.visit', nodeId: 'l' })
    expect(node(scene, 'l')?.state?.role).toBe('visited')
  })

  it('compare equal 标记 safe', () => {
    let scene = createBinary()
    scene = step(scene, { type: 'tree.compare', nodeId: 'r', value: 5, result: 'equal' })
    expect(node(scene, 'r')?.state?.role).toBe('safe')
  })

  it('compare 非 equal 标记 comparing', () => {
    let scene = createBinary()
    scene = step(scene, { type: 'tree.compare', nodeId: 'r', value: 9, result: 'greater' })
    expect(node(scene, 'r')?.state?.role).toBe('comparing')
  })

  it('insert 在左子位插入新节点并连父子边，清理 phantom', () => {
    let scene = createBinary()
    scene = step(scene, {
      type: 'tree.insert',
      parentId: 'l',
      node: { id: 'nx', value: 2 },
      side: 'left',
    })
    expect(field(scene, 'nx', 'value')).toBe(2)
    expect(edgeBetween(scene, 'l', 'nx')).toBeDefined()
    expect(node(scene, 'nx')?.state?.role).toBe('inserted')
    expect(Object.keys(scene.entities).some(k => k.startsWith('phantom_'))).toBe(false)
  })

  it('insert 默认端口（无 side）也能插入', () => {
    let scene = createBinary()
    scene = step(scene, {
      type: 'tree.insert',
      parentId: 'rr',
      node: { id: 'ny', value: 10 },
    })
    expect(edgeBetween(scene, 'rr', 'ny')).toBeDefined()
  })

  it('delete 移除节点及其临时单元', () => {
    let scene = createBinary()
    scene = step(scene, { type: 'tree.delete', nodeId: 'l' })
    expect(scene.entities['l']).toBeUndefined()
    expect(Object.keys(scene.entities).some(k => k.startsWith('phantom_'))).toBe(false)
  })

  it('rotate left 标记枢轴 active 并附带旋转 note', () => {
    let scene = createBinary()
    scene = step(scene, { type: 'tree.rotate', rotation: 'left', pivotId: 'r' })
    expect(node(scene, 'r')?.state?.role).toBe('active')
    expect(node(scene, 'r')?.state?.note).toBe('left')
  })

  it('rotate right-left 也能完成（双向旋转分支）', () => {
    let scene = createBinary()
    scene = step(scene, { type: 'tree.rotate', rotation: 'right-left', pivotId: 'rr' })
    expect(node(scene, 'rr')?.state?.role).toBe('active')
  })

  it('update_metadata 为 avl 节点附加 height / balanceFactor 字段', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'tree.create',
      variant: 'avl',
      rootId: 'a',
      nodes: [{ id: 'a', value: 1 }],
      edges: [],
    })
    scene = step(scene, { type: 'tree.update_metadata', nodeId: 'a', height: 2, balanceFactor: -1 })
    expect(field(scene, 'a', 'height')).toBe(2)
    expect(field(scene, 'a', 'balanceFactor')).toBe(-1)
    expect(node(scene, 'a')?.state?.role).toBe('active')
  })

  it('update_metadata 对 btree 节点用 metadata.keys 重建', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'tree.create',
      variant: 'btree',
      rootId: 'b',
      nodes: [{ id: 'b', value: '3' }],
      edges: [],
    })
    scene = step(scene, {
      type: 'tree.update_metadata',
      nodeId: 'b',
      metadata: { keys: [3, 5, 7] },
    })
    expect(node(scene, 'b')?.fields.filter(f => f.id.startsWith('key_'))).toHaveLength(3)
  })

  it('update_metadata 对不存在节点返回空操作', () => {
    let scene = createBinary()
    const before = JSON.stringify(scene.entities)
    scene = step(scene, { type: 'tree.update_metadata', nodeId: 'missing', height: 1 })
    expect(JSON.stringify(scene.entities)).toBe(before)
  })
})
