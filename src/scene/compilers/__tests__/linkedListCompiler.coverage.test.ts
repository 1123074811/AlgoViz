import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { linkedListCompiler } from '../linkedListCompiler'
import { createEmptyScene } from '../../types'
import type { SceneNode, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'linked_list',
  complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
  initialState: { type: 'linked_list', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = linkedListCompiler.compile(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function node(scene: SceneState, id: string): SceneNode | undefined {
  const e = scene.entities[id]
  return e?.type === 'node' ? e : undefined
}

function edgeBetween(scene: SceneState, from: string, to: string, port = 'next') {
  return Object.values(scene.edges).find(
    e => e.from.entityId === from && e.to.entityId === to && e.from.portId === port,
  )
}

function createList(variant: 'singly' | 'doubly' | 'circular', ids: string[]) {
  let scene = createEmptyScene()
  scene = step(scene, {
    type: 'linked_list.create',
    variant,
    nodes: ids.map((id, i) => ({ id, value: i + 1 })),
    headId: ids[0],
    tailId: ids[ids.length - 1],
  })
  return scene
}

describe('linkedListCompiler', () => {
  it('create singly：节点、next 边、head/tail 指针', () => {
    const scene = createList('singly', ['n0', 'n1', 'n2'])
    expect(node(scene, 'n0')?.fields.find(f => f.id === 'data')?.value).toBe(1)
    expect(edgeBetween(scene, 'n0', 'n1')).toBeDefined()
    expect(edgeBetween(scene, 'n1', 'n2')).toBeDefined()
    expect(scene.pointers.head?.target?.entityId).toBe('n0')
    expect(scene.pointers.tail?.target?.entityId).toBe('n2')
  })

  it('create doubly：额外生成 prev 反向边', () => {
    const scene = createList('doubly', ['n0', 'n1'])
    expect(edgeBetween(scene, 'n0', 'n1')).toBeDefined()
    // prev 边从 n1 指回 n0，端口为 prev
    expect(edgeBetween(scene, 'n1', 'n0', 'prev')).toBeDefined()
  })

  it('create circular：尾节点 next 连回头节点', () => {
    const scene = createList('circular', ['n0', 'n1', 'n2'])
    expect(edgeBetween(scene, 'n2', 'n0')).toBeDefined()
  })

  it('visit 标记 visited 并可移动具名指针', () => {
    let scene = createList('singly', ['n0', 'n1'])
    scene = step(scene, { type: 'linked_list.visit', nodeId: 'n1', pointerId: 'cur' })
    expect(node(scene, 'n1')?.state?.role).toBe('visited')
    expect(scene.pointers.cur?.target?.entityId).toBe('n1')
  })

  it('move_pointer 可移动到目标或置空', () => {
    let scene = createList('singly', ['n0', 'n1'])
    scene = step(scene, { type: 'linked_list.move_pointer', pointerId: 'p', toNodeId: 'n1' })
    expect(scene.pointers.p?.target?.entityId).toBe('n1')
    scene = step(scene, { type: 'linked_list.move_pointer', pointerId: 'p', toNodeId: null })
    expect(scene.pointers.p?.target).toBeNull()
  })

  it('insert_after 在中间插入：重接 next 边，phantom 临时单元被清理', () => {
    let scene = createList('singly', ['n0', 'n1'])
    scene = step(scene, {
      type: 'linked_list.insert_after',
      targetNodeId: 'n0',
      newNode: { id: 'nx', value: 99 },
    })
    expect(node(scene, 'nx')?.fields.find(f => f.id === 'data')?.value).toBe(99)
    // n0 -> nx -> n1
    expect(edgeBetween(scene, 'n0', 'nx')).toBeDefined()
    expect(edgeBetween(scene, 'nx', 'n1')).toBeDefined()
    // 旧 n0 -> n1 边断开
    expect(edgeBetween(scene, 'n0', 'n1')).toBeUndefined()
    expect(node(scene, 'nx')?.state?.role).toBe('inserted')
    // phantom 临时单元已移除
    expect(Object.keys(scene.entities).some(k => k.startsWith('phantom_'))).toBe(false)
  })

  it('insert_after 在 doubly 上同时重接 prev 边', () => {
    let scene = createList('doubly', ['n0', 'n1'])
    scene = step(scene, {
      type: 'linked_list.insert_after',
      targetNodeId: 'n0',
      newNode: { id: 'nx', value: 5 },
    })
    expect(edgeBetween(scene, 'nx', 'n0', 'prev')).toBeDefined()
    expect(edgeBetween(scene, 'n1', 'nx', 'prev')).toBeDefined()
  })

  it('insert_before 有前驱时复用 insert_after 逻辑', () => {
    let scene = createList('singly', ['n0', 'n1', 'n2'])
    scene = step(scene, {
      type: 'linked_list.insert_before',
      targetNodeId: 'n2',
      newNode: { id: 'nx', value: 7 },
    })
    // 插在 n1 之后、n2 之前
    expect(edgeBetween(scene, 'n1', 'nx')).toBeDefined()
    expect(edgeBetween(scene, 'nx', 'n2')).toBeDefined()
  })

  it('insert_before 无前驱（头插）：新节点成为 head', () => {
    let scene = createList('singly', ['n0', 'n1'])
    scene = step(scene, {
      type: 'linked_list.insert_before',
      targetNodeId: 'n0',
      newNode: { id: 'nh', value: 0 },
    })
    expect(edgeBetween(scene, 'nh', 'n0')).toBeDefined()
    expect(scene.pointers.head?.target?.entityId).toBe('nh')
  })

  it('delete 移除节点与其临时单元', () => {
    let scene = createList('singly', ['n0', 'n1', 'n2'])
    scene = step(scene, { type: 'linked_list.delete', nodeId: 'n1' })
    expect(scene.entities['n1']).toBeUndefined()
    expect(Object.keys(scene.entities).some(k => k.startsWith('phantom_'))).toBe(false)
  })

  it('reverse_link 断开旧 next 并连出反向 next', () => {
    let scene = createList('singly', ['n0', 'n1'])
    scene = step(scene, { type: 'linked_list.reverse_link', fromNodeId: 'n1', toNodeId: 'n0' })
    // 旧 n0->n1 是 from n0，这里反转的是从 n1 出发的边；create 时 n1 无 next
    // 因此应连出 n1 -> n0
    expect(edgeBetween(scene, 'n1', 'n0')).toBeDefined()
    expect(node(scene, 'n1')?.state?.role).toBe('active')
  })

  it('reverse_link toNodeId 为 null 时不连新边', () => {
    let scene = createList('singly', ['n0', 'n1'])
    scene = step(scene, { type: 'linked_list.reverse_link', fromNodeId: 'n0', toNodeId: null })
    // 旧 n0->n1 被断开，且没有新的 next 边从 n0 出
    expect(edgeBetween(scene, 'n0', 'n1')).toBeUndefined()
  })

  it('set_head / set_tail 更新对应指针', () => {
    let scene = createList('singly', ['n0', 'n1'])
    scene = step(scene, { type: 'linked_list.set_head', nodeId: 'n1' })
    expect(scene.pointers.head?.target?.entityId).toBe('n1')
    scene = step(scene, { type: 'linked_list.set_tail', nodeId: null })
    expect(scene.pointers.tail?.target).toBeNull()
  })
})
