import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'heap',
  complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = compileEvent(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function cell(scene: SceneState, id: string): SceneCell | undefined {
  const e = scene.entities[id]
  return e?.type === 'cell' ? e : undefined
}

function heapNodeIds(scene: SceneState): string[] {
  return Object.keys(scene.entities).filter(k => /^heap_\d+$/.test(k))
}

describe('heapCompiler', () => {
  it('create 产出 heap_<i> 节点 + 父子边', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'heap.create', values: [1, 3, 5, 7], variant: 'min' })

    const nodes = heapNodeIds(scene)
    expect(nodes).toHaveLength(4)
    expect(cell(scene, 'heap_0')?.value).toBe(1)
    expect(cell(scene, 'heap_3')?.value).toBe(7)

    // 父子边：child 1..3 各一条，连向 parent floor((i-1)/2)
    expect(scene.edges['heapedge_1']?.from.entityId).toBe('heap_0')
    expect(scene.edges['heapedge_1']?.to.entityId).toBe('heap_1')
    expect(scene.edges['heapedge_3']?.from.entityId).toBe('heap_1') // parent of 3 = 1
    // root 无父边
    expect(scene.edges['heapedge_0']).toBeUndefined()

    // variant 记录在节点 meta 上
    expect((cell(scene, 'heap_0')?.meta as { variant?: string })?.variant).toBe('min')
  })

  it('完全二叉树布局：父 x = 两子 x 的中点，层 y 递增', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'heap.create', values: [1, 2, 3], variant: 'min' })

    const root = cell(scene, 'heap_0')!
    const left = cell(scene, 'heap_1')!
    const right = cell(scene, 'heap_2')!
    expect(root.position.x).toBeCloseTo((left.position.x + right.position.x) / 2)
    expect(left.position.y).toBeGreaterThan(root.position.y)
    expect(left.position.y).toBe(right.position.y)
  })

  it('push 追加到末尾 index 并连父子边', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'heap.create', values: [2, 4], variant: 'min' })
    scene = step(scene, { type: 'heap.push', value: 6 })

    expect(heapNodeIds(scene)).toHaveLength(3)
    expect(cell(scene, 'heap_2')?.value).toBe(6)
    expect(scene.edges['heapedge_2']?.from.entityId).toBe('heap_0') // parent of 2 = 0
  })

  it('pop 移除堆顶：末尾补位到根、移除末尾节点', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'heap.create', values: [1, 3, 5], variant: 'min' })
    scene = step(scene, { type: 'heap.pop' })

    // 节点数 3 → 2，末尾 heap_2 被移除
    expect(heapNodeIds(scene)).toHaveLength(2)
    expect(cell(scene, 'heap_2')).toBeUndefined()
    // 根被末尾值 5 覆盖
    expect(cell(scene, 'heap_0')?.value).toBe(5)
    // 末尾节点的父子边随之移除
    expect(scene.edges['heapedge_2']).toBeUndefined()
  })

  it('pop 单元素堆清空', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'heap.create', values: [9], variant: 'max' })
    scene = step(scene, { type: 'heap.pop' })
    expect(heapNodeIds(scene)).toHaveLength(0)
  })

  it('sift 交换两槽位的值', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'heap.create', values: [5, 1], variant: 'min' })
    // 上浮：交换 index 1 与 0
    scene = step(scene, { type: 'heap.sift', from: 1, to: 0 })
    expect(cell(scene, 'heap_0')?.value).toBe(1)
    expect(cell(scene, 'heap_1')?.value).toBe(5)
  })
})
