import type { AnimationScript, GraphNodeState, ActionColor } from '@/types/animation'

const N = ['0','1','2','3','4','5'] as const

function dfsStep(id: number, ln: number, zh: string, en: string,
  type: string, targets: number[], color: ActionColor,
  comps: number, accs: number,
  stack: string[], visited: string[], current: string | null,
): AnimationScript['steps'][0] {
  const ns: GraphNodeState[] = [
    ...visited.map(i => ({ id: i, role: 'visited' as const, color: 'success' as ActionColor })),
    ...stack.map(i => ({ id: i, role: 'stacked' as const, color: 'primary' as ActionColor })),
  ]
  if (current) ns.push({ id: current, role: 'current', color: 'warning' as ActionColor })
  return {
    stepId: id, codeLine: ln, description: { zh, en },
    action: { type: type as AnimationScript['steps'][0]['action']['type'], targets, color },
    stats: { comparisons: comps, swaps: 0, accesses: accs },
    teachingState: { graph: { stack, output: visited, nodeStates: ns } },
  }
}

const dfsGraphPreset: AnimationScript = {
  algorithm: 'dfs_graph',
  complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
  initialState: {
    type: 'graph', data: [],
    nodes: N.map((id, i) => ({ id, label: String.fromCharCode(65 + i) })),
    edges: [{ source: '0', target: '1' }, { source: '0', target: '2' }, { source: '1', target: '3' }, { source: '1', target: '4' }, { source: '2', target: '5' }],
  },
  steps: [
    dfsStep(1, 1, '从 A 开始 DFS。DFS 沿着一条路径深入到底，无法前进时回溯', 'Start DFS from A. DFS explores as deep as possible, then backtracks', 'highlight', [0], 'primary', 0, 1, ['0'], [], '0'),
    dfsStep(2, 2, '访问 A，标记已访问。A 入栈（递归调用栈）', 'Visit A, mark visited. A pushed onto recursion stack', 'mark', [0], 'success', 0, 2, ['0'], ['0'], '0'),
    dfsStep(3, 4, '探索 A→B：B 未被访问，沿边深入', 'Explore A->B: B unvisited, go deeper', 'compare', [0, 1], 'warning', 1, 3, ['0', '1'], ['0'], '1'),
    dfsStep(4, 2, '访问 B，已访问节点: A,B。栈顶: B', 'Visit B. Visited: A,B. Stack top: B', 'mark', [1], 'success', 1, 4, ['0', '1'], ['0', '1'], '1'),
    dfsStep(5, 4, '探索 B→D：D 未被访问，沿边深入', 'Explore B->D: D unvisited, go deeper', 'compare', [1, 3], 'warning', 2, 5, ['0', '1', '3'], ['0', '1'], '3'),
    dfsStep(6, 2, '访问 D。D 无未访问邻居，回溯到 B。DFS 的关键：走到尽头后回退', 'Visit D. No more unvisited neighbors, backtrack to B. DFS hallmark: retreat when stuck', 'mark', [3], 'success', 2, 6, ['0', '1'], ['0', '1', '3'], '1'),
    dfsStep(7, 4, '探索 B→E：E 未被访问，沿边深入', 'Explore B->E: E unvisited, go deeper', 'compare', [1, 4], 'warning', 3, 7, ['0', '1', '4'], ['0', '1', '3'], '4'),
    dfsStep(8, 2, '访问 E。E 无未访问邻居，回溯到 B。B 所有邻居已处理，回溯到 A', 'Visit E. No more neighbors, backtrack B→A', 'mark', [4], 'success', 3, 8, ['0'], ['0', '1', '3', '4'], '0'),
    dfsStep(9, 5, '回溯到 A，检查 A 的剩余邻居。A 还有邻居 C 未访问', 'Backtracked to A, check remaining neighbors. A has C unvisited', 'highlight', [0], 'muted', 3, 9, ['0'], ['0', '1', '3', '4'], '0'),
    dfsStep(10, 4, '探索 A→C：C 未被访问，沿边深入', 'Explore A->C: C unvisited, go deeper', 'compare', [0, 2], 'warning', 4, 10, ['0', '2'], ['0', '1', '3', '4'], '2'),
    dfsStep(11, 2, '访问 C', 'Visit C', 'mark', [2], 'success', 4, 11, ['0', '2'], ['0', '1', '3', '4', '2'], '2'),
    dfsStep(12, 4, '探索 C→F：F 未被访问，沿边深入', 'Explore C->F: F unvisited, go deeper', 'compare', [2, 5], 'warning', 5, 12, ['0', '2', '5'], ['0', '1', '3', '4', '2'], '5'),
    dfsStep(13, 2, '访问 F。F 无未访问邻居，回溯。栈为空，DFS 完成！', 'Visit F. No more neighbors, backtrack. Stack empty, DFS complete!', 'mark', [5], 'success', 5, 13, [], ['0', '1', '3', '4', '2', '5'], null),
    dfsStep(14, 6, 'DFS 遍历顺序：A→B→D→E→C→F。DFS 深度优先，适合路径搜索、拓扑排序等问题', 'DFS order: A->B->D->E->C->F. DFS used for path finding, topological sort, cycle detection', 'mark', [0,1,2,3,4,5], 'success', 5, 14, [], ['0','1','3','4','2','5'], null),
  ],
}

export default dfsGraphPreset
