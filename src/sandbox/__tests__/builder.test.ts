import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('AnimationBuilder — array', () => {
  it('arrayCreate + compare + swap 产出含对应 events 的脚本', () => {
    const b = new AnimationBuilder('bubble_sort', 'array')
    b.arrayCreate([3, 1, 2])
    b.desc('比较').compare(0, 1)
    b.desc('交换').swap(0, 1)
    const script = b.build()
    expect(script.algorithm).toBe('bubble_sort')
    expect(script.presentation?.engine).toBe('scene')
    expect(script.initialState.type).toBe('array')
    expect(script.initialState.data).toEqual([3, 1, 2])
    expect(script.steps).toHaveLength(3)
    expect(script.steps[0].events?.[0]).toEqual({ type: 'array.create', values: [3, 1, 2] })
    expect(script.steps[1].events?.[0]).toEqual({ type: 'array.compare', indices: [0, 1] })
    expect(script.steps[2].events?.[0]).toEqual({ type: 'array.swap', indices: [0, 1] })
  })

  it('desc 设置当前步骤描述，用后即清', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1])
    b.desc('我的描述').compare(0, 0)
    b.compare(0, 0)
    const script = b.build()
    expect(script.steps[1].description.zh).toBe('我的描述')
    expect(script.steps[2].description.zh).not.toBe('我的描述')
  })

  it('超过步数上限抛错', () => {
    const b = new AnimationBuilder('x', 'array')
    expect(() => {
      for (let i = 0; i < 1000; i++) b.compare(0, 0)
    }).toThrow(/步数超过上限/)
  })

  it('没有任何步骤时 build 抛错', () => {
    const b = new AnimationBuilder('x', 'array')
    expect(() => b.build()).toThrow(/没有产生任何步骤/)
  })
})

describe('AnimationBuilder — graph', () => {
  it('graphCreate 写入 initialState.nodes/edges', () => {
    const b = new AnimationBuilder('bfs', 'graph')
    b.graphCreate([{ id: 'A' }, { id: 'B' }], [{ source: 'A', target: 'B' }])
    b.visitNode('A')
    const script = b.build()
    expect(script.initialState.type).toBe('graph')
    expect(script.initialState.nodes).toHaveLength(2)
    expect(script.initialState.edges).toHaveLength(1)
    expect(script.steps[1].events?.[0]).toEqual({ type: 'graph.visit_node', nodeId: 'A' })
  })
})

describe('AnimationBuilder — tree', () => {
  it('treeCreate 写入 root/children/treeNodes', () => {
    const b = new AnimationBuilder('bst', 'tree')
    b.treeCreate('bst', 'r', [{ id: 'r', value: 5 }, { id: 'l', value: 3 }], [{ parentId: 'r', childId: 'l' }])
    const script = b.build()
    expect(script.initialState.type).toBe('tree')
    expect(script.initialState.root).toBe('r')
    expect(script.initialState.children?.r).toContain('l')
  })
})
