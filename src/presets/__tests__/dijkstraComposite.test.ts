import { describe, it, expect } from 'vitest'
import { generateDijkstra } from '../dijkstra'
import { deriveSceneState } from '@/scene'
import type { GraphInput } from '../bfsGraph'

// 小图：A-B-C 三角 + 一条悬挂边 C-D，足以触发松弛/入堆/连线。
const smallGraph: GraphInput = {
  nodes: [
    { id: '0', label: 'A' },
    { id: '1', label: 'B' },
    { id: '2', label: 'C' },
    { id: '3', label: 'D' },
  ],
  edges: [
    { source: '0', target: '1', weight: 4 },
    { source: '0', target: '2', weight: 1 },
    { source: '1', target: '2', weight: 2 },
    { source: '2', target: '3', weight: 5 },
  ],
}

describe('W5 Dijkstra 组合场景', () => {
  it('presentation.layout 为 composite', () => {
    const script = generateDijkstra(smallGraph)
    expect(script.presentation?.layout).toBe('composite')
    expect(script.algorithm).toBe('dijkstra')
  })

  it('末态三结构同框：图节点 + arr_ 格 + heap_ 格', () => {
    const script = generateDijkstra(smallGraph)
    const scene = deriveSceneState(script, script.steps.length)
    const ids = Object.keys(scene.entities)

    // 图节点：node 类型，且 id 无 arr_/heap_ 前缀
    const graphNodes = Object.values(scene.entities).filter(
      e => e.type === 'node' && !e.id.startsWith('arr_') && !e.id.startsWith('heap_'),
    )
    expect(graphNodes.length).toBeGreaterThan(0)

    // 距离数组格
    const arrCells = ids.filter(id => id.startsWith('arr_'))
    expect(arrCells.length).toBe(smallGraph.nodes.length)

    // 堆格（heap_variant 标记不计；用 heap_<数字>）
    const heapCells = ids.filter(id => /^heap_\d+$/.test(id))
    expect(heapCells.length).toBeGreaterThan(0)
  })

  it('生成 ≥2 个 region group 且任意两个区域竖直不重叠', () => {
    const script = generateDijkstra(smallGraph)
    const scene = deriveSceneState(script, script.steps.length)
    const regions = Object.values(scene.groups).filter(g => g.id.startsWith('region_'))
    expect(regions.length).toBeGreaterThanOrEqual(2)

    // 三结构理想：region_main / region_array / region_heap
    expect(scene.groups['region_main']).toBeDefined()
    expect(scene.groups['region_array']).toBeDefined()
    expect(scene.groups['region_heap']).toBeDefined()

    // 任意两区域竖直不重叠（[top, bottom) 区间互不相交）
    const boxes = regions
      .map(g => g.bounds!)
      .map(b => ({ top: b.position.y, bottom: b.position.y + b.size.height }))
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        const disjoint = a.bottom <= b.top || b.bottom <= a.top
        expect(disjoint).toBe(true)
      }
    }
  })

  it('生成了距离数组格 → 图节点的跨结构连线 scene.link', () => {
    const script = generateDijkstra(smallGraph)
    const linkEvents = script.steps
      .flatMap(s => s.events ?? [])
      .filter(e => e.type === 'scene.link')
    expect(linkEvents.length).toBeGreaterThan(0)
  })

  it('步数受控（≤ 60）', () => {
    const script = generateDijkstra(smallGraph)
    expect(script.steps.length).toBeLessThanOrEqual(60)
  })
})
