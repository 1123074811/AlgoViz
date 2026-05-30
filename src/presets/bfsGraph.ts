import type { AnimationScript, GraphNodeState, ActionColor } from '@/types/animation'

const A = '0', B = '1', C = '2', D = '3', E = '4', F = '5'

function bfsStep(id: number, codeLine: number, zh: string, en: string,
  type: AnimationScript['steps'][0]['action']['type'], targets: number[], color: AnimationScript['steps'][0]['action']['color'],
  comps: number, swaps: number, accs: number,
  queue: string[], _visited: string[], output: string[],
): AnimationScript['steps'][0] {
  const nodeStates: GraphNodeState[] = [
    ...output.map(id => ({ id, role: 'visited' as const, color: 'success' as ActionColor })),
    ...queue.map(id => ({ id, role: 'queued' as const, color: 'primary' as ActionColor })),
    ...(type === 'mark' && targets.length > 0 ? [{ id: String(targets[0]), role: 'current' as const, color: 'warning' as ActionColor }] : []),
    ...(type === 'compare' ? targets.map(t => ({ id: String(t), role: 'current' as const, color: 'warning' as ActionColor })) : []),
  ]
  return {
    stepId: id, codeLine, description: { zh, en }, action: { type, targets, color }, stats: { comparisons: comps, swaps, accesses: accs },
    teachingState: {
      graph: { queue, output, nodeStates },
    },
  }
}

const bfsGraphPreset: AnimationScript = {
  algorithm: 'bfs_graph',
  complexity: {
    time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' },
    space: 'O(V)',
  },
  initialState: {
    type: 'graph',
    data: [],
    nodes: [
      { id: A, label: 'A' }, { id: B, label: 'B' }, { id: C, label: 'C' },
      { id: D, label: 'D' }, { id: E, label: 'E' }, { id: F, label: 'F' },
    ],
    edges: [
      { source: A, target: B }, { source: A, target: C },
      { source: B, target: D }, { source: B, target: E }, { source: C, target: F },
    ],
  },
  steps: [
    bfsStep(1, 4, '起点 A 入队，标记为已发现。BFS 使用队列保证逐层展开', 'Start node A enqueued, marked discovered. BFS uses a queue for level-order traversal', 'highlight', [0], 'primary', 0, 0, 1, [A], [], []),
    bfsStep(2, 5, 'A 出队并访问，A 作为第 1 层被处理', 'Dequeue and visit A, processed as level 1', 'mark', [0], 'success', 0, 0, 2, [], [], [A]),
    bfsStep(3, 7, '检查边 A→B：B 未被访问，将 B 入队', 'Check edge A->B: B unvisited, enqueue B', 'compare', [0, 1], 'warning', 1, 0, 3, [B], [], [A]),
    bfsStep(4, 8, '标记 B 为已发现，B 加入待处理队列', 'Mark B discovered, added to queue', 'highlight', [1], 'primary', 1, 0, 4, [B], [], [A]),
    bfsStep(5, 7, '检查边 A→C：C 未被访问，将 C 入队', 'Check edge A->C: C unvisited, enqueue C', 'compare', [0, 2], 'warning', 2, 0, 5, [B, C], [], [A]),
    bfsStep(6, 8, '标记 C 为已发现。A 的所有邻居检查完毕', 'Mark C discovered. A neighbors exhausted', 'highlight', [2], 'primary', 2, 0, 6, [B, C], [], [A]),
    bfsStep(7, 5, 'B 出队并访问。BFS 按入队顺序处理节点', 'Dequeue and visit B. BFS processes in FIFO order', 'mark', [1], 'success', 2, 0, 7, [C], [], [A, B]),
    bfsStep(8, 7, '检查边 B→D：D 未被访问，将 D 入队', 'Check edge B->D: D unvisited, enqueue D', 'compare', [1, 3], 'warning', 3, 0, 8, [C, D], [], [A, B]),
    bfsStep(9, 8, '标记 D 为已发现，入队', 'Mark D discovered, enqueued', 'highlight', [3], 'primary', 3, 0, 9, [C, D], [], [A, B]),
    bfsStep(10, 7, '检查边 B→E：E 未被访问，将 E 入队', 'Check edge B->E: E unvisited, enqueue E', 'compare', [1, 4], 'warning', 4, 0, 10, [C, D, E], [], [A, B]),
    bfsStep(11, 8, '标记 E 为已发现。B 的邻居检查完毕', 'Mark E discovered. B neighbors exhausted', 'highlight', [4], 'primary', 4, 0, 11, [C, D, E], [], [A, B]),
    bfsStep(12, 5, 'C 出队并访问', 'Dequeue and visit C', 'mark', [2], 'success', 4, 0, 12, [D, E], [], [A, B, C]),
    bfsStep(13, 7, '检查边 C→F：F 未被访问，将 F 入队', 'Check edge C->F: F unvisited, enqueue F', 'compare', [2, 5], 'warning', 5, 0, 13, [D, E, F], [], [A, B, C]),
    bfsStep(14, 8, '标记 F 为已发现。C 的邻居检查完毕', 'Mark F discovered. C neighbors exhausted', 'highlight', [5], 'primary', 5, 0, 14, [D, E, F], [], [A, B, C]),
    bfsStep(15, 5, 'D 出队并访问（无未访问邻居，边已全部处理）', 'Dequeue and visit D (no unvisited neighbors)', 'mark', [3], 'success', 5, 0, 15, [E, F], [], [A, B, C, D]),
    bfsStep(16, 5, 'E 出队并访问', 'Dequeue and visit E', 'mark', [4], 'success', 5, 0, 16, [F], [], [A, B, C, D, E]),
    bfsStep(17, 5, 'F 出队并访问。队列已空，BFS 完成！', 'Dequeue and visit F. Queue empty, BFS complete!', 'mark', [5], 'success', 5, 0, 17, [], [], [A, B, C, D, E, F]),
    bfsStep(18, 9, 'BFS 遍历顺序：A → B → C → D → E → F（逐层展开）', 'BFS order: A -> B -> C -> D -> E -> F (level by level)', 'mark', [0, 1, 2, 3, 4, 5], 'success', 5, 0, 17, [], [], [A, B, C, D, E, F]),
  ],
}

bfsGraphPreset.presentation = { engine: 'scene', module: 'graph', variant: 'vertex' }
bfsGraphPreset.steps = bfsGraphPreset.steps.map((step, index) => {
  const events: NonNullable<AnimationScript['steps'][number]['events']> = []
  if (index === 0) {
    events.push({
      type: 'graph.create',
      nodes: bfsGraphPreset.initialState.nodes ?? [],
      edges: bfsGraphPreset.initialState.edges ?? [],
      directed: true,
    })
  }
  if (step.action.type === 'mark' && step.action.targets.length > 0) {
    step.action.targets.forEach((target) => events.push({ type: 'graph.visit_node', nodeId: String(target) }))
  }
  if (step.action.type === 'highlight' && step.action.targets.length > 0) {
    step.action.targets.forEach((target) => events.push({ type: 'graph.enqueue', nodeId: String(target) }))
  }
  if (step.action.type === 'compare' && step.action.targets.length >= 2) {
    events.push({ type: 'graph.visit_edge', source: String(step.action.targets[0]), target: String(step.action.targets[1]) })
  }
  return events.length > 0 ? { ...step, events } : step
})

export default bfsGraphPreset
