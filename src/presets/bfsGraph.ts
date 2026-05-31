import type { AnimationScript } from '@/types/animation'

export interface GraphInput {
  nodes: Array<{ id: string; label?: string }>
  edges: Array<{ source: string; target: string; weight?: number }>
}

export function generateBFS(input: GraphInput): AnimationScript {
  const { nodes, edges } = input
  const adjacency = new Map<string, string[]>()
  for (const n of nodes) adjacency.set(n.id, [])
  for (const e of edges) {
    const list = adjacency.get(e.source) ?? []
    list.push(e.target)
    adjacency.set(e.source, list)
    // Undirected: add reverse edge too
    const rev = adjacency.get(e.target) ?? []
    if (!rev.includes(e.source)) rev.push(e.source)
    adjacency.set(e.target, rev)
  }

  const steps: AnimationScript['steps'] = []
  let sid = 1
  const visited = new Set<string>()
  const output: string[] = []
  const queue: string[] = []

  const startId = nodes[0]?.id ?? '0'
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id

  // Step 1: Initial state
  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: 'BFS 初始化：将所有节点标记为未访问。选择起点开始遍历', en: 'BFS init: mark all nodes unvisited, select start node' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [
      { type: 'graph.create', nodes, edges, directed: false },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: nodes.length },
    teachingState: { graph: { queue: [], output: [], nodeStates: [] } },
  })

  // Step 2: Enqueue start node
  queue.push(startId)
  visited.add(startId)
  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: `起点 ${getLabel(startId)} 入队，标记为已发现`, en: `Start node ${getLabel(startId)} enqueued, marked discovered` },
    action: { type: 'highlight', targets: [nodes.findIndex(n => n.id === startId)], color: 'primary' },
    events: [
      { type: 'graph.enqueue', nodeId: startId },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
    teachingState: {
      graph: {
        queue: [...queue],
        output: [...output],
        nodeStates: [
          ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as const })),
          ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as const })),
        ],
      },
    },
  })

  // BFS main loop
  while (queue.length > 0) {
    const current = queue.shift()!
    output.push(current)
    const currentIdx = nodes.findIndex(n => n.id === current)

    // Dequeue step
    steps.push({
      stepId: sid++, codeLine: 7,
      description: { zh: `${getLabel(current)} 出队并访问。BFS 按入队顺序逐层处理`, en: `Dequeue and visit ${getLabel(current)}` },
      action: { type: 'mark', targets: [currentIdx], color: 'success' },
      events: [
        { type: 'graph.dequeue', nodeId: current },
        { type: 'graph.visit_node', nodeId: current },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: output.length + queue.length },
      teachingState: {
        graph: {
          queue: [...queue],
          output: [...output],
          nodeStates: [
            ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as const })),
            ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as const })),
            { id: current, role: 'current' as const, color: 'warning' as const },
          ],
        },
      },
    })

    // Explore neighbors
    const neighbors = adjacency.get(current) ?? []
    for (const neighbor of neighbors) {
      const nIdx = nodes.findIndex(n => n.id === neighbor)
      if (visited.has(neighbor)) {
        // Already visited/discovered — just show edge visit
        steps.push({
          stepId: sid++, codeLine: 9,
          description: { zh: `检查边 ${getLabel(current)}→${getLabel(neighbor)}：${getLabel(neighbor)} 已访问，跳过`, en: `Check edge ${getLabel(current)}→${getLabel(neighbor)}: already visited, skip` },
          action: { type: 'compare', targets: [currentIdx, nIdx], color: 'muted' },
          events: [
            { type: 'graph.visit_edge', source: current, target: neighbor },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: visited.size + queue.length },
          teachingState: {
            graph: {
              queue: [...queue],
              output: [...output],
              nodeStates: [
                ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as const })),
                ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as const })),
              ],
            },
          },
        })
      } else {
        // New node discovered
        visited.add(neighbor)
        queue.push(neighbor)
        steps.push({
          stepId: sid++, codeLine: 10,
          description: { zh: `检查边 ${getLabel(current)}→${getLabel(neighbor)}：${getLabel(neighbor)} 未被访问，入队`, en: `Check edge ${getLabel(current)}→${getLabel(neighbor)}: undiscovered, enqueue` },
          action: { type: 'compare', targets: [currentIdx, nIdx], color: 'warning' },
          events: [
            { type: 'graph.visit_edge', source: current, target: neighbor },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: visited.size + queue.length },
          teachingState: {
            graph: {
              queue: [...queue].slice(-1), // Only highlight the newly enqueued in queue state
              output: [...output],
              nodeStates: [
                ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as const })),
                ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as const })),
              ],
              edgeStates: [{ source: current, target: neighbor, role: 'candidate' as const, color: 'warning' as const }],
            },
          },
        })
        // Enqueue step
        steps.push({
          stepId: sid++, codeLine: 11,
          description: { zh: `标记 ${getLabel(neighbor)} 为已发现，加入队列`, en: `Mark ${getLabel(neighbor)} discovered, enqueued` },
          action: { type: 'highlight', targets: [nIdx], color: 'primary' },
          events: [
            { type: 'graph.enqueue', nodeId: neighbor },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: visited.size + queue.length },
          teachingState: {
            graph: {
              queue: [...queue],
              output: [...output],
              nodeStates: [
                ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as const })),
                ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as const })),
              ],
            },
          },
        })
      }
    }
  }

  // Final step
  steps.push({
    stepId: sid++, codeLine: 14,
    description: { zh: `BFS 完成！遍历顺序：${output.map(getLabel).join(' → ')}`, en: `BFS complete! Order: ${output.map(getLabel).join(' → ')}` },
    action: { type: 'mark', targets: output.map(id => nodes.findIndex(n => n.id === id)).filter(i => i >= 0), color: 'success' },
    events: output.map(id => ({ type: 'graph.visit_node' as const, nodeId: id })),
    stats: { comparisons: sid, swaps: 0, accesses: visited.size },
    teachingState: {
      graph: {
        queue: [],
        output: [...output],
        nodeStates: output.map(id => ({ id, role: 'visited' as const, color: 'success' as const })),
      },
    },
  })

  return {
    algorithm: 'bfs_graph',
    complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph', variant: 'vertex' },
    initialState: { type: 'graph', data: [], nodes, edges },
    steps,
  }
}

export default generateBFS
