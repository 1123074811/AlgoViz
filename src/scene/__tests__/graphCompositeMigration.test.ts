import { describe, it, expect } from 'vitest'
import { generateBFS, type GraphInput } from '@/presets/bfsGraph'
import { deriveSceneState } from '@/scene'

// 小图：A-B-C 三角 + 一条悬挂边 C-D，BFS 过程中队列会有若干节点入队。
const smallGraph: GraphInput = {
  nodes: [
    { id: '0', label: 'A' },
    { id: '1', label: 'B' },
    { id: '2', label: 'C' },
    { id: '3', label: 'D' },
  ],
  edges: [
    { source: '0', target: '1' },
    { source: '0', target: '2' },
    { source: '1', target: '2' },
    { source: '2', target: '3' },
  ],
}

describe('W6 图遍历预设迁移到区域布局', () => {
  it('BFS 预设 presentation.layout 为 composite', () => {
    const script = generateBFS(smallGraph)
    expect(script.presentation?.layout).toBe('composite')
    expect(script.algorithm).toBe('bfs_graph')
  })

  // 找到一个队列非空的中间步：起点入队后队列至少有 1 个 queue_ 格。
  function findStepWithQueue(script: ReturnType<typeof generateBFS>): number {
    for (let step = 1; step <= script.steps.length; step++) {
      const scene = deriveSceneState(script, step)
      const hasQueueCell = Object.keys(scene.entities).some(id => /^queue_\d+$/.test(id))
      const queueNonEmpty = Object.values(scene.entities).some(
        e => /^queue_\d+$/.test(e.id) && e.type === 'cell' && (e as { value?: unknown }).value !== '',
      )
      if (hasQueueCell && queueNonEmpty) return step
    }
    return -1
  }

  it('中间步同时有图节点 + queue_ 格', () => {
    const script = generateBFS(smallGraph)
    const step = findStepWithQueue(script)
    expect(step).toBeGreaterThan(0)

    const scene = deriveSceneState(script, step)
    const graphNodes = Object.values(scene.entities).filter(
      e => e.type === 'node' && !e.id.startsWith('queue_') && !e.id.startsWith('stack_'),
    )
    expect(graphNodes.length).toBeGreaterThan(0)

    const queueCells = Object.keys(scene.entities).filter(id => /^queue_\d+$/.test(id))
    expect(queueCells.length).toBeGreaterThan(0)
  })

  it('生成 region_main 和 region_queue 两个 region group', () => {
    const script = generateBFS(smallGraph)
    const step = findStepWithQueue(script)
    const scene = deriveSceneState(script, step)

    expect(scene.groups['region_main']).toBeDefined()
    expect(scene.groups['region_queue']).toBeDefined()
  })

  it('图区域与队列区域竖直不重叠', () => {
    const script = generateBFS(smallGraph)
    const step = findStepWithQueue(script)
    const scene = deriveSceneState(script, step)

    const regions = Object.values(scene.groups).filter(g => g.id.startsWith('region_'))
    expect(regions.length).toBeGreaterThanOrEqual(2)

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
})
