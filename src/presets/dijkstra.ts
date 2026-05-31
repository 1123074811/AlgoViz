import type { AnimationScript, ActionColor } from '@/types/animation'
import type { GraphInput } from './bfsGraph'

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
  const prev: Record<string, string | null> = {}
  const settled = new Set<string>()

  for (const n of nodes) { dist[n.id] = INF; prev[n.id] = null }
  const startId = nodes[0]?.id ?? '0'
  dist[startId] = 0

  function fmtDist(d: number) { return d === INF ? '∞' : String(d) }
  function distSnapshot() {
    const snap: Record<string, number | string> = {}
    for (const n of nodes) snap[n.id] = dist[n.id] === INF ? '∞' : dist[n.id]
    return snap
  }

  // Step 1: Init
  steps.push({
    stepId: sid++, codeLine: 3,
    description: {
      zh: `初始化：dist[${getLabel(startId)}]=0，其余=∞`,
      en: `Init: dist[${getLabel(startId)}]=0, others=∞`,
    },
    action: { type: 'highlight', targets: [getIdx(startId)], color: 'primary' },
    events: [{ type: 'graph.create', nodes, edges, directed: false }],
    stats: { comparisons: 0, swaps: 0, accesses: nodes.length },
    teachingState: { graph: { distances: distSnapshot() } },
  })

  for (let iter = 0; iter < nodes.length; iter++) {
    // Find unsettled node with smallest distance
    let minDist = INF, u = ''
    for (const n of nodes) {
      if (!settled.has(n.id) && dist[n.id] < minDist) {
        minDist = dist[n.id]; u = n.id
      }
    }
    if (!u) break
    settled.add(u)

    // Mark settled
    steps.push({
      stepId: sid++, codeLine: 5,
      description: {
        zh: `选出距离最小节点 ${getLabel(u)} (dist=${fmtDist(dist[u])})，标记为已确定`,
        en: `Pick nearest node ${getLabel(u)} (dist=${fmtDist(dist[u])}), mark settled`,
      },
      action: { type: 'mark', targets: [getIdx(u)], color: 'success' },
      events: [{ type: 'graph.visit_node', nodeId: u }],
      stats: { comparisons: iter + 1, swaps: 0, accesses: settled.size },
      teachingState: { graph: { distances: distSnapshot() } },
    })

    // Relax neighbors
    for (const { to: v, weight: w } of (adj.get(u) ?? [])) {
      if (settled.has(v)) {
        steps.push({
          stepId: sid++, codeLine: 8,
          description: {
            zh: `检查边 ${getLabel(u)}→${getLabel(v)}：${getLabel(v)} 已确定，跳过`,
            en: `Check edge ${getLabel(u)}→${getLabel(v)}: ${getLabel(v)} settled, skip`,
          },
          action: { type: 'compare', targets: [getIdx(u), getIdx(v)], color: 'muted' },
          events: [{ type: 'graph.visit_edge', source: u, target: v }],
          stats: { comparisons: sid, swaps: 0, accesses: settled.size },
          teachingState: { graph: { distances: distSnapshot() } },
        })
        continue
      }

      const newDist = dist[u] + w
      const oldDist = dist[v]
      const improved = newDist < oldDist

      if (improved) {
        dist[v] = newDist; prev[v] = u
      }

      steps.push({
        stepId: sid++, codeLine: 8,
        description: {
          zh: improved
            ? `松弛 ${getLabel(u)}→${getLabel(v)}：${dist[u]}+${w}=${newDist} < ${fmtDist(oldDist)}，更新 dist[${getLabel(v)}]=${newDist}`
            : `松弛 ${getLabel(u)}→${getLabel(v)}：${dist[u]}+${w}=${newDist} ≥ ${fmtDist(oldDist)}，不更新`,
          en: improved
            ? `Relax ${getLabel(u)}→${getLabel(v)}: ${dist[u]}+${w}=${newDist} < ${fmtDist(oldDist)}, update!`
            : `Relax ${getLabel(u)}→${getLabel(v)}: ${dist[u]}+${w}=${newDist} >= ${fmtDist(oldDist)}, no update`,
        },
        action: { type: 'compare', targets: [getIdx(u), getIdx(v)], color: improved ? 'success' : 'warning' },
        events: [
          { type: 'graph.visit_edge', source: u, target: v },
          { type: 'graph.relax_edge', source: u, target: v, oldDistance: fmtDist(oldDist), newDistance: fmtDist(dist[v]), success: improved },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: settled.size },
        teachingState: { graph: { distances: distSnapshot(), edgeStates: [{ source: u, target: v, role: improved ? 'relaxed' : 'candidate', color: (improved ? 'success' : 'warning') as ActionColor }] } },
      })
    }
  }

  // Final step
  const pathNodes = [...settled]
  steps.push({
    stepId: sid++, codeLine: 14,
    description: {
      zh: `Dijkstra 完成！起点 ${getLabel(startId)} 到各节点的最短距离已确定`,
      en: `Dijkstra done! Shortest distances from ${getLabel(startId)} computed`,
    },
    action: { type: 'mark', targets: pathNodes.map(getIdx).filter(i => i >= 0), color: 'success' },
    events: pathNodes.map(id => ({ type: 'graph.visit_node' as const, nodeId: id })),
    stats: { comparisons: sid, swaps: 0, accesses: settled.size },
    teachingState: { graph: { distances: distSnapshot() } },
  })

  return {
    algorithm: 'dijkstra',
    complexity: { time: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph' },
    initialState: { type: 'graph', data: [], nodes, edges },
    steps,
  }
}

const dijkstraPreset = generateDijkstra({
  nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
  edges: [{ source: '0', target: '1', weight: 4 }, { source: '0', target: '2', weight: 2 }, { source: '1', target: '2', weight: 1 }, { source: '1', target: '3', weight: 5 }, { source: '2', target: '3', weight: 8 }, { source: '2', target: '4', weight: 10 }, { source: '3', target: '4', weight: 2 }],
})

export default dijkstraPreset
