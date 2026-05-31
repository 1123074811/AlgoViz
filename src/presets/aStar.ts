import type { AnimationScript, ActionColor } from '@/types/animation'
import type { GraphInput } from './bfsGraph'

export interface AStarInput extends GraphInput {
  start?: string
  goal?: string
  heuristics?: Record<string, number>
}

export function generateAStar(input: AStarInput): AnimationScript {
  const { nodes, edges, heuristics: hMap } = input
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id
  const getIdx = (id: string) => nodes.findIndex(n => n.id === id)

  const adj = new Map<string, Array<{ to: string; weight: number }>>()
  for (const nd of nodes) adj.set(nd.id, [])
  for (const e of edges) {
    adj.get(e.source)?.push({ to: e.target, weight: e.weight ?? 1 })
  }

  const startId = input.start ?? nodes[0]?.id ?? '0'
  const goalId = input.goal ?? nodes[nodes.length - 1]?.id ?? String(nodes.length - 1)
  const h: Record<string, number> = hMap ?? {}
  for (const nd of nodes) {
    if (h[nd.id] === undefined) h[nd.id] = Math.abs(parseInt(nd.id) - parseInt(goalId))
  }

  const steps: AnimationScript['steps'] = []
  let sid = 1

  const gScore: Record<string, number> = {}
  const fScore: Record<string, number> = {}
  const prev: Record<string, string | null> = {}
  const closed = new Set<string>()
  const INF = Number.MAX_SAFE_INTEGER

  for (const nd of nodes) { gScore[nd.id] = INF; fScore[nd.id] = INF; prev[nd.id] = null }
  gScore[startId] = 0
  fScore[startId] = h[startId] ?? 0
  const openSet = [startId]

  function fmtVal(v: number) { return v === INF ? '∞' : String(v) }

  function openMinNode() {
    let best = '', bestF = INF
    for (const id of openSet) {
      if (!closed.has(id) && fScore[id] < bestF) { bestF = fScore[id]; best = id }
    }
    return best
  }

  // Step 1: Init
  steps.push({
    stepId: sid++, codeLine: 2,
    description: {
      zh: `A* 从 ${getLabel(startId)} 到 ${getLabel(goalId)}。f(n)=g(n)+h(n)，g=实际距离，h=启发估计`,
      en: `A* from ${getLabel(startId)} to ${getLabel(goalId)}. f(n)=g(n)+h(n)`,
    },
    action: { type: 'highlight', targets: [getIdx(startId)], color: 'primary' },
    events: [{ type: 'graph.create', nodes, edges: edges.map(e => ({ source: e.source, target: e.target, weight: e.weight })), directed: true }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
    teachingState: {
      graph: {
        distances: { 'g': 0, [`h(${getLabel(startId)})`]: h[startId] ?? 0, 'f': fScore[startId] },
        sets: { open: [startId], closed: [] },
      },
    },
  })

  while (openSet.length > 0) {
    const current = openMinNode()
    if (!current) break

    if (current === goalId) {
      // Reached goal — reconstruct path
      const path: string[] = []
      let p: string | null = goalId
      while (p) { path.unshift(p); p = prev[p] }
      steps.push({
        stepId: sid++, codeLine: 10,
        description: {
          zh: `到达目标 ${getLabel(goalId)}！最短路径：${path.map(getLabel).join(' → ')}，距离=${gScore[goalId]}`,
          en: `Goal ${getLabel(goalId)} reached! Path: ${path.map(getLabel).join(' → ')}, dist=${gScore[goalId]}`,
        },
        action: { type: 'mark', targets: path.map(getIdx).filter(i => i >= 0), color: 'success' },
        events: path.map(id => ({ type: 'graph.visit_node' as const, nodeId: id })),
        stats: { comparisons: sid, swaps: 0, accesses: closed.size + openSet.length },
        teachingState: {
          graph: {
            distances: { goal: gScore[goalId] },
            sets: { open: [], closed: [...closed, current] },
            nodeStates: path.map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
          },
        },
      })
      break
    }

    openSet.splice(openSet.indexOf(current), 1)
    closed.add(current)

    steps.push({
      stepId: sid++, codeLine: 5,
      description: {
        zh: `取出 f 最小节点 ${getLabel(current)}：g=${fmtVal(gScore[current])}, h=${h[current]}, f=${fmtVal(fScore[current])}`,
        en: `Pop min-f node ${getLabel(current)}: g=${fmtVal(gScore[current])}, h=${h[current]}, f=${fmtVal(fScore[current])}`,
      },
      action: { type: 'mark', targets: [getIdx(current)], color: 'success' },
      events: [{ type: 'graph.visit_node', nodeId: current }],
      stats: { comparisons: sid, swaps: 0, accesses: closed.size + openSet.length },
      teachingState: {
        graph: {
          sets: { open: [...openSet], closed: [...closed] },
          distances: { [`g(${getLabel(current)})`]: gScore[current], [`h(${getLabel(current)})`]: h[current], [`f(${getLabel(current)})`]: fScore[current] },
          nodeStates: [
            ...[...closed].map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
            ...openSet.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
          ],
        },
      },
    })

    // Explore neighbors (directed edges, only outgoing)
    for (const { to: neighbor, weight: w } of (adj.get(current) ?? [])) {
      if (closed.has(neighbor)) continue

      const tentativeG = gScore[current] + w
      const oldG = gScore[neighbor]

      if (tentativeG < oldG) {
        gScore[neighbor] = tentativeG
        fScore[neighbor] = tentativeG + (h[neighbor] ?? 0)
        prev[neighbor] = current

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor)
          steps.push({
            stepId: sid++, codeLine: 8,
            description: {
              zh: `探索 ${getLabel(current)}→${getLabel(neighbor)}：g=${tentativeG}, f=${fScore[neighbor]}，新节点加入 Open`,
              en: `Explore ${getLabel(current)}→${getLabel(neighbor)}: g=${tentativeG}, f=${fScore[neighbor]}, new node added to Open`,
            },
            action: { type: 'compare', targets: [getIdx(current), getIdx(neighbor)], color: 'success' },
            events: [
              { type: 'graph.visit_edge', source: current, target: neighbor },
              { type: 'graph.enqueue', nodeId: neighbor },
            ],
            stats: { comparisons: sid, swaps: 0, accesses: closed.size + openSet.length },
            teachingState: {
              graph: {
                sets: { open: [...openSet], closed: [...closed] },
                edgeStates: [{ source: current, target: neighbor, role: 'relaxed' as const, color: 'success' as ActionColor }],
                nodeStates: [
                  ...[...closed].map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
                  ...openSet.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
                ],
              },
            },
          })
        } else {
          steps.push({
            stepId: sid++, codeLine: 8,
            description: {
              zh: `松弛 ${getLabel(current)}→${getLabel(neighbor)}：g=${tentativeG} < ${fmtVal(oldG)}，更新 Open 中的 f=${fScore[neighbor]}`,
              en: `Relax ${getLabel(current)}→${getLabel(neighbor)}: g=${tentativeG} < ${fmtVal(oldG)}, update f=${fScore[neighbor]} in Open`,
            },
            action: { type: 'compare', targets: [getIdx(current), getIdx(neighbor)], color: 'warning' },
            events: [
              { type: 'graph.visit_edge', source: current, target: neighbor },
              { type: 'graph.relax_edge', source: current, target: neighbor, oldDistance: fmtVal(oldG), newDistance: fmtVal(tentativeG), success: true },
            ],
            stats: { comparisons: sid, swaps: 0, accesses: closed.size + openSet.length },
            teachingState: {
              graph: {
                sets: { open: [...openSet], closed: [...closed] },
                edgeStates: [{ source: current, target: neighbor, role: 'relaxed' as const, color: 'warning' as ActionColor }],
                nodeStates: [
                  ...[...closed].map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
                  ...openSet.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
                  { id: neighbor, role: 'current' as const, color: 'warning' as ActionColor },
                ],
              },
            },
          })
        }
      } else if (!closed.has(neighbor)) {
        steps.push({
          stepId: sid++, codeLine: 8,
          description: {
            zh: `检查 ${getLabel(current)}→${getLabel(neighbor)}：g=${tentativeG} ≥ ${fmtVal(oldG)}，不更新`,
            en: `Check ${getLabel(current)}→${getLabel(neighbor)}: g=${tentativeG} >= ${fmtVal(oldG)}, no update`,
          },
          action: { type: 'compare', targets: [getIdx(current), getIdx(neighbor)], color: 'muted' },
          events: [{ type: 'graph.visit_edge', source: current, target: neighbor }],
          stats: { comparisons: sid, swaps: 0, accesses: closed.size + openSet.length },
          teachingState: {
            graph: {
              sets: { open: [...openSet], closed: [...closed] },
              nodeStates: [
                ...[...closed].map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
                ...openSet.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
              ],
            },
          },
        })
      }
    }
  }

  return {
    algorithm: 'a_star',
    complexity: { time: { best: 'O(E)', average: 'O(E log V)', worst: 'O(E log V)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph' },
    initialState: { type: 'graph', data: [], nodes, edges: edges.map(e => ({ source: e.source, target: e.target, weight: e.weight })) },
    steps,
  }
}

const aStarPreset = generateAStar({
  nodes: [{ id: '0', label: 'S' }, { id: '1', label: 'A' }, { id: '2', label: 'B' }, { id: '3', label: 'C' }, { id: '4', label: 'G' }],
  edges: [{ source: '0', target: '1', weight: 1 }, { source: '0', target: '2', weight: 4 }, { source: '1', target: '2', weight: 2 }, { source: '1', target: '3', weight: 5 }, { source: '2', target: '3', weight: 1 }, { source: '3', target: '4', weight: 3 }, { source: '2', target: '4', weight: 7 }],
  start: '0', goal: '4',
  heuristics: { '0': 4, '1': 3, '2': 2, '3': 1, '4': 0 },
})

export default aStarPreset
