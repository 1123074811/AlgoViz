import type { AnimationScript } from '@/types/animation'

const topologicalSortPreset: AnimationScript = {
  algorithm: 'topological_sort',
  complexity: {
    time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' },
    space: 'O(V)',
  },
  initialState: {
    type: 'graph',
    data: [],
    nodes: [
      { id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' },
      { id: '3', label: 'D' }, { id: '4', label: 'E' },
    ],
    edges: [
      { source: '0', target: '1' }, { source: '0', target: '2' },
      { source: '1', target: '3' }, { source: '2', target: '3' },
      { source: '3', target: '4' },
    ],
  },
  steps: [
    { stepId: 1, codeLine: 2, description: { zh: '计算所有节点入度：A=0, B=1, C=1, D=2, E=1', en: 'Compute indegree: A=0, B=1, C=1, D=2, E=1' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 5 } },
    { stepId: 2, codeLine: 5, description: { zh: '入度为 0 的节点进队列：A', en: 'Nodes with indegree 0 enqueued: A' }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 6 } },
    { stepId: 3, codeLine: 7, description: { zh: '出队 A，加入拓扑序。A→B: B 入度减 1 (1→0)，B 进队列', en: 'Pop A, add to order. A→B: indegree 1→0, B enqueued' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 7 } },
    { stepId: 4, codeLine: 7, description: { zh: 'A→C: C 入度减 1 (1→0)，C 进队列', en: 'A→C: indegree 1→0, C enqueued' }, action: { type: 'compare', targets: [0, 2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 8 } },
    { stepId: 5, codeLine: 8, description: { zh: '拓扑序: [A]。已访问 A', en: 'Topo order: [A]. Mark A visited' }, action: { type: 'mark', targets: [0], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 9 } },
    { stepId: 6, codeLine: 7, description: { zh: '出队 B，加入拓扑序。B→D: D 入度减 1 (2→1)', en: 'Pop B, add to order. B→D: indegree 2→1' }, action: { type: 'compare', targets: [1, 3], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 10 } },
    { stepId: 7, codeLine: 8, description: { zh: '拓扑序: [A, B]。已访问 B', en: 'Topo order: [A, B]. Mark B visited' }, action: { type: 'mark', targets: [1], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 11 } },
    { stepId: 8, codeLine: 7, description: { zh: '出队 C，加入拓扑序。C→D: D 入度减 1 (1→0)，D 进队列', en: 'Pop C, add to order. C→D: indegree 1→0, D enqueued' }, action: { type: 'compare', targets: [2, 3], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 12 } },
    { stepId: 9, codeLine: 8, description: { zh: '拓扑序: [A, B, C]。已访问 C', en: 'Topo order: [A, B, C]. Mark C visited' }, action: { type: 'mark', targets: [2], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 13 } },
    { stepId: 10, codeLine: 7, description: { zh: '出队 D，加入拓扑序。D→E: E 入度减 1 (1→0)，E 进队列', en: 'Pop D, add to order. D→E: indegree 1→0, E enqueued' }, action: { type: 'compare', targets: [3, 4], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 14 } },
    { stepId: 11, codeLine: 8, description: { zh: '拓扑序: [A, B, C, D]。已访问 D', en: 'Topo order: [A, B, C, D]. Mark D visited' }, action: { type: 'mark', targets: [3], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 15 } },
    { stepId: 12, codeLine: 7, description: { zh: '出队 E，加入拓扑序。E 无出边', en: 'Pop E, add to order. E has no outgoing edges' }, action: { type: 'mark', targets: [4], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 16 } },
    { stepId: 13, codeLine: 9, description: { zh: '队列空，拓扑排序完成：A → B → C → D → E', en: 'Queue empty. Topo order: A→B→C→D→E' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 16 } },
  ],
}

export default topologicalSortPreset
