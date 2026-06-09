import type { AnimationScript, ActionColor } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'
import type { GraphInput } from './bfsGraph'

/**
 * W5 组合场景：Dijkstra 重写为「图 + 距离数组 + 最小堆 + 跨结构连线」三结构同框。
 *
 * - 图（graph.*）→ 'main' 区域（节点无前缀）
 * - 距离数组（array.*，每个节点一格，arr_<下标>）→ 'array' 区域
 * - 最小堆/优先队列（heap.*，heap_<下标>）→ 'heap' 区域
 * - scene.link 把更新过的距离数组格连到对应图节点
 *
 * presentation.layout='composite' 触发 regionLayout 区域自动布局（竖直分区不重叠），
 * 各编译器只发各自前缀的实体，坐标由 regionLayout 统一平移，预设不手设坐标。
 */
export function generateDijkstra(input: GraphInput): AnimationScript {
  const { nodes, edges } = input
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id
  const getIdx = (id: string) => nodes.findIndex(n => n.id === id)

  const adj = new Map<string, Array<{ to: string; weight: number }>>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    adj.get(e.source)?.push({ to: e.target, weight: e.weight ?? 1 })
    adj.get(e.target)?.push({ to: e.source, weight: e.weight ?? 1 })
  }

  const steps: AnimationScript['steps'] = []
  let sid = 1
  const INF = Number.MAX_SAFE_INTEGER
  const dist: Record<string, number> = {}
  const settled = new Set<string>()

  for (const n of nodes) dist[n.id] = INF
  const startId = nodes[0]?.id ?? '0'
  dist[startId] = 0

  const fmtDist = (d: number) => (d === INF ? '∞' : String(d))
  // 距离数组初值：源点 0，其余 '∞'（字符串表示无穷）
  const initialDistCells: Array<number | string> = nodes.map(n => (n.id === startId ? 0 : '∞'))

  // 朴素优先队列（数组里放距离数值，与堆可视化一致）。返回最小距离对应的节点。
  // pq 与可视化堆同步：pq 里每个 entry 既有 node 也有 dist；堆里只放 dist 数值。
  const pq: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }]

  // ── Step 1: 同时创建三结构 ──
  steps.push({
    stepId: sid++, codeLine: 3,
    description: {
      zh: `初始化三结构：图 + 距离数组（dist[${getLabel(startId)}]=0，其余=∞）+ 最小堆（源点距离 0 入堆）`,
      en: `Init three structures: graph + dist array (dist[${getLabel(startId)}]=0, rest=∞) + min-heap (push source dist 0)`,
    },
    action: { type: 'highlight', targets: [getIdx(startId)], color: 'primary' },
    events: [
      { type: 'graph.create', nodes, edges, directed: false },
      { type: 'array.create', values: initialDistCells },
      { type: 'heap.create', values: [0], variant: 'min' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: nodes.length },
  })

  let comparisons = 0
  let accesses = nodes.length

  // ── 主循环：每次取堆顶最小距离节点 ──
  while (pq.length > 0) {
    // 取出最小距离的待定节点
    let minIdx = 0
    for (let i = 1; i < pq.length; i++) {
      if (pq[i].d < pq[minIdx].d) minIdx = i
    }
    const { id: u, d: du } = pq.splice(minIdx, 1)[0]
    comparisons++
    if (settled.has(u)) continue // 堆里可能有同一节点的旧距离，跳过陈旧条目
    if (du > dist[u]) continue
    settled.add(u)
    accesses++

    // 本轮的关系更新：松弛成功的邻居（array.set_value + heap.push + scene.link）
    const popEvents: AlgorithmEvent[] = [
      { type: 'heap.pop' },
      { type: 'graph.visit_node', nodeId: u },
    ]
    const relaxNotes: string[] = []

    for (const { to: v, weight: w } of (adj.get(u) ?? [])) {
      accesses++
      if (settled.has(v)) {
        popEvents.push({ type: 'graph.visit_edge', source: u, target: v })
        popEvents.push({ type: 'graph.relax_edge', source: u, target: v, oldDistance: fmtDist(dist[v]), newDistance: fmtDist(dist[v]), success: false })
        continue
      }
      const newDist = dist[u] + w
      const oldDist = dist[v]
      const improved = newDist < oldDist
      popEvents.push({ type: 'graph.visit_edge', source: u, target: v })
      popEvents.push({ type: 'graph.relax_edge', source: u, target: v, oldDistance: fmtDist(oldDist), newDistance: fmtDist(improved ? newDist : oldDist), success: improved })

      if (improved) {
        dist[v] = newDist
        pq.push({ id: v, d: newDist })
        comparisons++
        // 更新距离数组该邻居格 + 新距离入堆 + 连线（距离格 → 图节点）
        popEvents.push({ type: 'array.set_value', index: getIdx(v), value: newDist })
        popEvents.push({ type: 'heap.push', value: newDist })
        popEvents.push({ type: 'scene.link', from: `arr_${getIdx(v)}`, to: v, label: String(newDist), color: 'success' })
        relaxNotes.push(`${getLabel(v)}=${newDist}`)
      }
    }

    steps.push({
      stepId: sid++, codeLine: 5,
      description: {
        zh: relaxNotes.length
          ? `堆顶取出 ${getLabel(u)} (dist=${fmtDist(du)})，标记确定；松弛更新：${relaxNotes.join('，')}`
          : `堆顶取出 ${getLabel(u)} (dist=${fmtDist(du)})，标记确定；邻居无可松弛`,
        en: relaxNotes.length
          ? `Pop ${getLabel(u)} (dist=${fmtDist(du)}), settle; relaxed: ${relaxNotes.join(', ')}`
          : `Pop ${getLabel(u)} (dist=${fmtDist(du)}), settle; no neighbor improved`,
      },
      action: { type: 'mark', targets: [getIdx(u)], color: 'success' },
      events: popEvents,
      stats: { comparisons, swaps: 0, accesses },
    })
  }

  // ── 末步：完成 ──
  const settledList = [...settled]
  steps.push({
    stepId: sid++, codeLine: 14,
    description: {
      zh: `Dijkstra 完成！起点 ${getLabel(startId)} 到各节点的最短距离已写入距离数组`,
      en: `Dijkstra done! Shortest distances from ${getLabel(startId)} written to dist array`,
    },
    action: { type: 'mark', targets: settledList.map(getIdx).filter(i => i >= 0), color: 'success' as ActionColor },
    events: settledList.map(id => ({ type: 'graph.visit_node' as const, nodeId: id })),
    stats: { comparisons, swaps: 0, accesses },
  })

  return {
    algorithm: 'dijkstra',
    complexity: { time: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph', layout: 'composite' },
    initialState: { type: 'graph', data: [], nodes, edges },
    steps,
  }
}

const dijkstraPreset = generateDijkstra({
  nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
  edges: [{ source: '0', target: '1', weight: 4 }, { source: '0', target: '2', weight: 2 }, { source: '1', target: '2', weight: 1 }, { source: '1', target: '3', weight: 5 }, { source: '2', target: '3', weight: 8 }, { source: '2', target: '4', weight: 10 }, { source: '3', target: '4', weight: 2 }],
})

export default dijkstraPreset
