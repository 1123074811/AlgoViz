import type { AnimationScript, ActionColor } from '@/types/animation'
import type { GraphInput } from './bfsGraph'

export function generateTopologicalSort(input: GraphInput): AnimationScript {
  const { nodes, edges: rawEdges } = input
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id
  const getIdx = (id: string) => nodes.findIndex(n => n.id === id)

  // Build adjacency and compute indegrees
  const indegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const nd of nodes) { indegree.set(nd.id, 0); adj.set(nd.id, []) }
  for (const e of rawEdges) {
    adj.get(e.source)?.push(e.target)
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1)
  }

  const steps: AnimationScript['steps'] = []
  let sid = 1
  const output: string[] = []
  const queue: string[] = []

  function indegreeSnapshot() {
    const snap: Record<string, number> = {}
    for (const nd of nodes) snap[nd.id] = indegree.get(nd.id) ?? 0
    return snap
  }

  // Step 1: Init
  steps.push({
    stepId: sid++, codeLine: 2,
    description: {
      zh: `初始化入度表：${nodes.map(nd => `${getLabel(nd.id)}=${indegree.get(nd.id)}`).join(', ')}`,
      en: `Init indegrees: ${nodes.map(nd => `${getLabel(nd.id)}=${indegree.get(nd.id)}`).join(', ')}`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'graph.create', nodes, edges: rawEdges.map(e => ({ source: e.source, target: e.target })), directed: true }],
    stats: { comparisons: 0, swaps: 0, accesses: nodes.length },
    teachingState: { graph: { queue: [], output: [], distances: indegreeSnapshot() } },
  })

  // Enqueue nodes with indegree 0
  for (const nd of nodes) {
    if (indegree.get(nd.id) === 0 && !queue.includes(nd.id)) {
      queue.push(nd.id)
    }
  }

  steps.push({
    stepId: sid++, codeLine: 5,
    description: {
      zh: `入度为 0 的节点入队：${queue.map(getLabel).join(', ')}`,
      en: `Enqueue nodes with indegree 0: ${queue.map(getLabel).join(', ')}`,
    },
    action: { type: 'highlight', targets: queue.map(getIdx).filter(i => i >= 0), color: 'warning' },
    events: queue.map(id => ({ type: 'graph.enqueue' as const, nodeId: id })),
    stats: { comparisons: 0, swaps: 0, accesses: nodes.length },
    teachingState: {
      graph: {
        queue: [...queue], output: [...output], distances: indegreeSnapshot(),
        nodeStates: [
          ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
          ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
        ],
      },
    },
  })

  // Main loop
  while (queue.length > 0) {
    const u = queue.shift()!
    output.push(u)

    steps.push({
      stepId: sid++, codeLine: 7,
      description: {
        zh: `${getLabel(u)} 出队，加入拓扑序。当前序：[${output.map(getLabel).join(', ')}]`,
        en: `${getLabel(u)} dequeued, added to order. Current: [${output.map(getLabel).join(', ')}]`,
      },
      action: { type: 'mark', targets: [getIdx(u)], color: 'success' },
      events: [
        { type: 'graph.dequeue', nodeId: u },
        { type: 'graph.visit_node', nodeId: u },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: output.length },
      teachingState: {
        graph: {
          queue: [...queue], output: [...output], distances: indegreeSnapshot(),
          nodeStates: [
            ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
            ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
          ],
        },
      },
    })

    for (const v of (adj.get(u) ?? [])) {
      indegree.set(v, (indegree.get(v) ?? 1) - 1)

      if (indegree.get(v) === 0 && !queue.includes(v)) {
        queue.push(v)
        steps.push({
          stepId: sid++, codeLine: 8,
          description: {
            zh: `删除边 ${getLabel(u)}→${getLabel(v)}，${getLabel(v)} 入度 → 0，入队`,
            en: `Remove edge ${getLabel(u)}→${getLabel(v)}, ${getLabel(v)} indegree → 0, enqueue`,
          },
          action: { type: 'compare', targets: [getIdx(u), getIdx(v)], color: 'warning' },
          events: [
            { type: 'graph.visit_edge', source: u, target: v },
            { type: 'graph.enqueue', nodeId: v },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: output.length + queue.length },
          teachingState: {
            graph: {
              queue: [...queue], output: [...output], distances: indegreeSnapshot(),
              nodeStates: [
                ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
                ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
              ],
            },
          },
        })
      } else {
        steps.push({
          stepId: sid++, codeLine: 8,
          description: {
            zh: `删除边 ${getLabel(u)}→${getLabel(v)}，${getLabel(v)} 入度=${indegree.get(v)}，未到 0`,
            en: `Remove edge ${getLabel(u)}→${getLabel(v)}, ${getLabel(v)} indegree=${indegree.get(v)}, not 0 yet`,
          },
          action: { type: 'compare', targets: [getIdx(u), getIdx(v)], color: 'muted' },
          events: [{ type: 'graph.visit_edge', source: u, target: v }],
          stats: { comparisons: sid, swaps: 0, accesses: output.length },
          teachingState: {
            graph: {
              queue: [...queue], output: [...output], distances: indegreeSnapshot(),
              nodeStates: [
                ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
                ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
              ],
            },
          },
        })
      }
    }
  }

  // Final step
  const allVisited = output.length === nodes.length
  steps.push({
    stepId: sid++, codeLine: 14,
    description: {
      zh: allVisited
        ? `拓扑排序完成！${output.map(getLabel).join(' → ')}`
        : `排序完成。但输出 ${output.length}/${nodes.length} 个节点，图可能含环`,
      en: allVisited
        ? `Topological sort done! ${output.map(getLabel).join(' → ')}`
        : `Done. Output ${output.length}/${nodes.length} nodes, graph may have cycles`,
    },
    action: { type: 'mark', targets: output.map(getIdx).filter(i => i >= 0), color: 'success' },
    events: output.map(id => ({ type: 'graph.visit_node' as const, nodeId: id })),
    stats: { comparisons: sid, swaps: 0, accesses: output.length },
    teachingState: {
      graph: {
        queue: [], output: [...output], distances: indegreeSnapshot(),
        nodeStates: output.map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
      },
    },
  })

  return {
    algorithm: 'topological_sort',
    complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph' },
    initialState: { type: 'graph', data: [], nodes, edges: rawEdges.map(e => ({ source: e.source, target: e.target })) },
    steps,
  }
}

const topologicalSortPreset = generateTopologicalSort({
  nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
  edges: [{ source: '0', target: '1' }, { source: '0', target: '2' }, { source: '1', target: '3' }, { source: '2', target: '3' }, { source: '3', target: '4' }],
})

export default topologicalSortPreset
