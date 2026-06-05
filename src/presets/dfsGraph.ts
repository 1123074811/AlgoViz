import type { AnimationScript, GraphNodeState, ActionColor } from '@/types/animation'
import type { GraphInput } from './bfsGraph'

export function generateDFS(input: GraphInput): AnimationScript {
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
  const stack: string[] = []
  const startId = nodes[0]?.id ?? '0'

  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id
  const getIdx = (id: string) => nodes.findIndex(n => n.id === id)

  function nodeStates(currentId: string | null): GraphNodeState[] {
    const states: GraphNodeState[] = []
    for (const id of output) states.push({ id, role: 'visited', color: 'success' as ActionColor })
    for (const id of stack) {
      if (!output.includes(id)) states.push({ id, role: 'stacked', color: 'primary' as ActionColor })
    }
    if (currentId) states.push({ id: currentId, role: 'current', color: 'warning' as ActionColor })
    return states
  }

  // Step 1: Initial state
  steps.push({
    stepId: sid++, codeLine: 1,
    description: { zh: 'DFS 初始化：使用递归（隐式栈）或显式栈进行深度优先遍历', en: 'DFS init: depth-first traversal using recursion or explicit stack' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [
      { type: 'graph.create', nodes, edges, directed: false },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: nodes.length },
    teachingState: { graph: { stack: [], output: [], nodeStates: [] } },
  })

  // Step 2: Push start node
  stack.push(startId)
  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `起点 ${getLabel(startId)} 入栈（递归调用栈）。DFS 沿路径深入，走到尽头再回溯`, en: `Push ${getLabel(startId)} onto recursion stack` },
    action: { type: 'highlight', targets: [getIdx(startId)], color: 'primary' },
    events: [
      { type: 'graph.enqueue', nodeId: startId },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
    teachingState: {
      graph: {
        stack: [...stack],
        output: [...output],
        nodeStates: nodeStates(startId),
      },
    },
  })

  // DFS iterative using explicit stack
  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current)) continue

    const currentIdx = getIdx(current)
    visited.add(current)
    output.push(current)

    // Visit current node
    steps.push({
      stepId: sid++, codeLine: 5,
      description: { zh: `访问 ${getLabel(current)}，标记已访问。当前已访问: ${output.map(getLabel).join(', ')}`, en: `Visit ${getLabel(current)}. Visited: ${output.map(getLabel).join(', ')}` },
      action: { type: 'mark', targets: [currentIdx], color: 'success' },
      events: [
        { type: 'graph.dequeue', nodeId: current },
        { type: 'graph.visit_node', nodeId: current },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: output.length + stack.length },
      teachingState: {
        graph: {
          stack: [...stack],
          output: [...output],
          nodeStates: nodeStates(current),
        },
      },
    })

    // Explore neighbors in reverse order (so first neighbor gets processed first with stack LIFO)
    const neighbors = adjacency.get(current) ?? []
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i]
      const nIdx = getIdx(neighbor)

      if (visited.has(neighbor)) {
        steps.push({
          stepId: sid++, codeLine: 8,
          description: { zh: `检查边 ${getLabel(current)}→${getLabel(neighbor)}：${getLabel(neighbor)} 已访问，跳过`, en: `Check edge ${getLabel(current)}→${getLabel(neighbor)}: visited, skip` },
          action: { type: 'compare', targets: [currentIdx, nIdx], color: 'muted' },
          events: [
            { type: 'graph.visit_edge', source: current, target: neighbor },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: visited.size + stack.length },
          teachingState: {
            graph: {
              stack: [...stack],
              output: [...output],
              nodeStates: nodeStates(current),
            },
          },
        })
      } else {
        stack.push(neighbor)
        steps.push({
          stepId: sid++, codeLine: 9,
          description: { zh: `检查边 ${getLabel(current)}→${getLabel(neighbor)}：${getLabel(neighbor)} 未访问，压入栈中`, en: `Check edge ${getLabel(current)}→${getLabel(neighbor)}: undiscovered, push to stack` },
          action: { type: 'compare', targets: [currentIdx, nIdx], color: 'warning' },
          events: [
            { type: 'graph.visit_edge', source: current, target: neighbor },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: visited.size + stack.length },
          teachingState: {
            graph: {
              stack: [...stack],
              output: [...output],
              nodeStates: nodeStates(neighbor),
              edgeStates: [{ source: current, target: neighbor, role: 'candidate' as const, color: 'warning' as const }],
            },
          },
        })
        // Push to stack step
        steps.push({
          stepId: sid++, codeLine: 10,
          description: { zh: `${getLabel(neighbor)} 压入栈中，栈: [${[...stack].reverse().map(getLabel).join(', ')}]`, en: `${getLabel(neighbor)} pushed to stack, stack: [${[...stack].reverse().map(getLabel).join(', ')}]` },
          action: { type: 'highlight', targets: [nIdx], color: 'primary' },
          events: [
            { type: 'graph.enqueue', nodeId: neighbor },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: visited.size + stack.length },
          teachingState: {
            graph: {
              stack: [...stack],
              output: [...output],
              nodeStates: nodeStates(neighbor),
            },
          },
        })
      }
    }
  }

  // Final step
  steps.push({
    stepId: sid++, codeLine: 14,
    description: { zh: `DFS 完成！遍历顺序：${output.map(getLabel).join(' → ')}`, en: `DFS complete! Order: ${output.map(getLabel).join(' → ')}` },
    action: { type: 'mark', targets: output.map(getIdx).filter(i => i >= 0), color: 'success' },
    events: output.map(id => ({ type: 'graph.visit_node' as const, nodeId: id })),
    stats: { comparisons: sid, swaps: 0, accesses: visited.size },
    teachingState: {
      graph: {
        stack: [],
        output: [...output],
        nodeStates: output.map(id => ({ id, role: 'visited' as const, color: 'success' as const })),
      },
    },
  })

  return {
    algorithm: 'dfs_graph',
    complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph', layout: 'composite' },
    initialState: { type: 'graph', data: [], nodes, edges },
    steps,
  }
}

export default generateDFS
