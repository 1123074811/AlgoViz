import type { AnimationScript, ActionColor } from '@/types/animation'
import type { GraphInput } from './bfsGraph'

export function generatePrim(input: GraphInput): AnimationScript {
  const { nodes, edges } = input
  const n = nodes.length
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id
  const getIdx = (id: string) => nodes.findIndex(n => n.id === id)

  const adj = new Map<string, Array<{ to: string; weight: number }>>()
  for (const nd of nodes) adj.set(nd.id, [])
  for (const e of edges) {
    adj.get(e.source)?.push({ to: e.target, weight: e.weight ?? 1 })
    adj.get(e.target)?.push({ to: e.source, weight: e.weight ?? 1 })
  }

  const steps: AnimationScript['steps'] = []
  let sid = 1
  const inMST = new Set<string>()
  const mstEdges: Array<{ source: string; target: string; weight: number }> = []

  const startId = nodes[0]?.id ?? '0'
  inMST.add(startId)

  // Step 1: Init
  steps.push({
    stepId: sid++, codeLine: 3,
    description: {
      zh: `Prim 算法：从节点 ${getLabel(startId)} 开始构建 MST。MST 集合: {${getLabel(startId)}}`,
      en: `Prim: start from ${getLabel(startId)}. MST set: {${getLabel(startId)}}`,
    },
    action: { type: 'highlight', targets: [getIdx(startId)], color: 'primary' },
    events: [{ type: 'graph.create', nodes, edges, directed: false }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
    teachingState: {
      graph: {
        sets: { mst: [startId], candidates: nodes.filter(nd => nd.id !== startId).map(nd => nd.id) },
        nodeStates: [{ id: startId, role: 'selected', color: 'success' as ActionColor }],
      },
    },
  })

  while (inMST.size < n) {
    let bestEdge: { from: string; to: string; weight: number } | null = null
    let minW = Infinity

    for (const ndId of inMST) {
      for (const { to, weight } of (adj.get(ndId) ?? [])) {
        if (!inMST.has(to) && weight < minW) {
          minW = weight; bestEdge = { from: ndId, to, weight }
        }
      }
    }

    if (!bestEdge) break

    const { from, to, weight } = bestEdge
    inMST.add(to)
    mstEdges.push({ source: from, target: to, weight })

    steps.push({
      stepId: sid++, codeLine: 7,
      description: {
        zh: `选择最小边 ${getLabel(from)}-${getLabel(to)}(${weight})，将 ${getLabel(to)} 加入 MST`,
        en: `Pick min edge ${getLabel(from)}-${getLabel(to)}(${weight}), add ${getLabel(to)} to MST`,
      },
      action: { type: 'compare', targets: [getIdx(from), getIdx(to)], color: 'success' },
      events: [
        { type: 'graph.visit_edge', source: from, target: to },
        { type: 'graph.visit_node', nodeId: to },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: inMST.size },
      teachingState: {
        graph: {
          sets: {
            mst: [...inMST],
            candidates: nodes.filter(nd => !inMST.has(nd.id)).map(nd => nd.id),
          },
          edgeStates: [{ source: from, target: to, role: 'relaxed' as const, color: 'success' as ActionColor }],
          nodeStates: [
            ...[...inMST].map(id => ({ id, role: 'selected' as const, color: 'success' as ActionColor })),
            { id: to, role: 'current' as const, color: 'warning' as ActionColor },
          ],
        },
      },
    })
  }

  const totalWeight = mstEdges.reduce((s, e) => s + e.weight, 0)
  steps.push({
    stepId: sid++, codeLine: 12,
    description: {
      zh: `Prim 完成！MST 总权重 = ${totalWeight}，共 ${mstEdges.length} 条边`,
      en: `Prim done! MST total weight = ${totalWeight}, ${mstEdges.length} edges`,
    },
    action: { type: 'mark', targets: [...inMST].map(getIdx).filter(i => i >= 0), color: 'success' },
    events: mstEdges.map(e => ({ type: 'graph.visit_edge' as const, source: e.source, target: e.target })),
    stats: { comparisons: sid, swaps: 0, accesses: inMST.size },
    teachingState: {
      graph: {
        sets: { mst: [...inMST], candidates: [] },
        nodeStates: [...inMST].map(id => ({ id, role: 'selected' as const, color: 'success' as ActionColor })),
        edgeStates: mstEdges.map(e => ({ source: e.source, target: e.target, role: 'relaxed' as const, color: 'success' as ActionColor })),
      },
    },
  })

  return {
    algorithm: 'prim',
    complexity: { time: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph' },
    initialState: { type: 'graph', data: [], nodes, edges },
    steps,
  }
}

const primPreset = generatePrim({
  nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
  edges: [{ source: '0', target: '1', weight: 2 }, { source: '0', target: '3', weight: 6 }, { source: '1', target: '2', weight: 3 }, { source: '1', target: '3', weight: 8 }, { source: '1', target: '4', weight: 5 }, { source: '2', target: '4', weight: 7 }, { source: '3', target: '4', weight: 9 }],
})

export default primPreset
