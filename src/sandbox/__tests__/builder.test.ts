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

  it('超过步数上限时软截断而不是抛错', () => {
    const b = new AnimationBuilder('x', 'array')
    for (let i = 0; i < 1000; i++) b.compare(0, 0)
    const script = b.build()
    expect(script.steps).toHaveLength(600)
    expect(script.steps[599].description.zh).toContain('后续重复搜索/回溯步骤已省略')
  })

  it('没有任何步骤时 build 抛错', () => {
    const b = new AnimationBuilder('x', 'array')
    expect(() => b.build()).toThrow(/没有产生任何步骤/)
  })
})

describe('AnimationBuilder — geometry', () => {
  it('builder geometry 方法产出 geometry.* 事件', () => {
    const b = new AnimationBuilder('geo', 'array')
    b.geoPlane([0, 10], [0, 10])
    b.geoPoint('A', 3, 4)
    const script = b.build()
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'geometry.plane')).toBe(true)
    expect(evs.some(e => e.type === 'geometry.point')).toBe(true)
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

  it('treeCreate 修正重复值节点被同一 childId 引用的问题', () => {
    const b = new AnimationBuilder('symmetric_tree', 'tree')
    b.treeCreate(
      'binary',
      '1',
      [
        { id: '1', value: 1 },
        { id: '2', value: 2 },
        { id: '2_1', value: 2 },
      ],
      [
        { parentId: '1', childId: '2' },
        { parentId: '1', childId: '2' },
      ],
    )

    const script = b.build()
    expect(script.initialState.children?.['1']).toEqual(['2', '2_1'])
    expect(script.steps[0].events?.[0]).toMatchObject({
      type: 'tree.create',
      edges: [
        { parentId: '1', childId: '2' },
        { parentId: '1', childId: '2_1' },
      ],
    })
  })

  it('highlightNode 兼容 AI 常见节点高亮调用', () => {
    const b = new AnimationBuilder('lowest_common_ancestor', 'tree')
    b.treeCreate('binary', 'r', [{ id: 'r', value: 3 }], [])
    b.desc('找到 LCA').highlightNode('r')

    const script = b.build()
    expect(script.steps[1].events?.[0]).toEqual({
      type: 'scene.highlight',
      entityId: 'r',
      role: 'safe',
      color: 'success',
    })
  })
})

describe('AnimationBuilder — variables', () => {
  it('varSet 自动推导数值变化标注', () => {
    const b = new AnimationBuilder('counter', 'array')
    b.varInit([{ name: 'ret', value: 0 }])
    b.varSet('ret', 1)
    b.varSet('ret', 0)
    b.varSet('state', 'left')
    b.varSet('state', 'right')

    const script = b.build()
    expect(script.steps[1].events?.[0]).toMatchObject({ type: 'math.set', name: 'ret', value: 1, delta: '+1' })
    expect(script.steps[2].events?.[0]).toMatchObject({ type: 'math.set', name: 'ret', value: 0, delta: '-1' })
    expect(script.steps[4].events?.[0]).toMatchObject({ type: 'math.set', name: 'state', value: 'right', delta: '->right' })
  })

  it('varHighlight 合并到下一次真实动作，不单独产生无意义步骤', () => {
    const b = new AnimationBuilder('lowest_common_ancestor', 'tree')
    b.varInit([{ name: 'q', value: 1 }])
    b.varHighlight('q')
    b.desc('比较当前节点是否等于 q').treeVisit('n1')

    const script = b.build()
    expect(script.steps).toHaveLength(2)
    expect(script.steps[1].description.zh).toBe('比较当前节点是否等于 q')
    expect(script.steps[1].events).toEqual([
      { type: 'tree.visit', nodeId: 'n1' },
      { type: 'math.highlight', name: 'q' },
    ])
  })

  it('_getVar 兼容旧生成器读取变量值', () => {
    const b = new AnimationBuilder('container_with_most_water', 'array')
    b.varInit([{ name: 'ans', value: 0 }])
    expect(b._getVar('ans')).toBe(0)
    expect(b._getVar('missing')).toBeUndefined()

    b.varSet('ans', 1)
    expect(b._getVar('ans')).toBe(1)
  })
})
