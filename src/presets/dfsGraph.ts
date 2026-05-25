import type { AnimationScript } from '@/types/animation'

const dfsGraphPreset: AnimationScript = {
  algorithm: 'dfs_graph',
  complexity: {
    time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' },
    space: 'O(V)',
  },
  initialState: {
    type: 'graph',
    data: [],
    nodes: [
      { id: '0', label: 'A' },
      { id: '1', label: 'B' },
      { id: '2', label: 'C' },
      { id: '3', label: 'D' },
      { id: '4', label: 'E' },
      { id: '5', label: 'F' },
    ],
    edges: [
      { source: '0', target: '1' },
      { source: '0', target: '2' },
      { source: '1', target: '3' },
      { source: '1', target: '4' },
      { source: '2', target: '5' },
    ],
  },
  steps: [
    { stepId: 1, codeLine: 1, description: { zh: '从 A 开始 DFS', en: 'Start DFS from A' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 2, description: { zh: '访问 A，标记为已访问', en: 'Visit A, mark visited' }, action: { type: 'mark', targets: [0], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 4, description: { zh: '探索 A 的邻居 B（未访问），递归进入', en: 'Explore neighbor B (unvisited), recurse' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 2, description: { zh: '访问 B', en: 'Visit B' }, action: { type: 'mark', targets: [1], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 4 } },
    { stepId: 5, codeLine: 4, description: { zh: '探索 B 的邻居 D（未访问），递归进入', en: 'Explore neighbor D (unvisited), recurse' }, action: { type: 'compare', targets: [1, 3], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 5 } },
    { stepId: 6, codeLine: 2, description: { zh: '访问 D。D 无其他邻居，回溯到 B', en: 'Visit D. No more neighbors, backtrack to B' }, action: { type: 'mark', targets: [3], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 6 } },
    { stepId: 7, codeLine: 4, description: { zh: '探索 B 的邻居 E（未访问），递归进入', en: 'Explore neighbor E (unvisited), recurse' }, action: { type: 'compare', targets: [1, 4], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 7 } },
    { stepId: 8, codeLine: 2, description: { zh: '访问 E。E 无其他邻居，回溯到 B', en: 'Visit E. No more neighbors, backtrack to B' }, action: { type: 'mark', targets: [4], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 8 } },
    { stepId: 9, codeLine: 5, description: { zh: 'B 遍历完所有邻居，回溯到 A', en: 'B done, backtrack to A' }, action: { type: 'highlight', targets: [0, 1], color: 'muted' }, stats: { comparisons: 3, swaps: 0, accesses: 9 } },
    { stepId: 10, codeLine: 4, description: { zh: '探索 A 的邻居 C（未访问），递归进入', en: 'Explore neighbor C (unvisited), recurse' }, action: { type: 'compare', targets: [0, 2], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 10 } },
    { stepId: 11, codeLine: 2, description: { zh: '访问 C', en: 'Visit C' }, action: { type: 'mark', targets: [2], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 11 } },
    { stepId: 12, codeLine: 4, description: { zh: '探索 C 的邻居 F（未访问），递归进入', en: 'Explore neighbor F (unvisited), recurse' }, action: { type: 'compare', targets: [2, 5], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 12 } },
    { stepId: 13, codeLine: 2, description: { zh: '访问 F。F 无未访问邻居，回溯到 C', en: 'Visit F. Backtrack to C' }, action: { type: 'mark', targets: [5], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 13 } },
    { stepId: 14, codeLine: 5, description: { zh: 'C 遍历完毕，回溯到 A。A 也无更多邻居', en: 'C done, backtrack to A. A done' }, action: { type: 'highlight', targets: [0, 2, 5], color: 'muted' }, stats: { comparisons: 5, swaps: 0, accesses: 14 } },
    { stepId: 15, codeLine: 6, description: { zh: 'DFS 遍历完成！顺序：A → B → D → E → C → F', en: 'DFS done! Order: A -> B -> D -> E -> C -> F' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 15 } },
  ],
}

export default dfsGraphPreset
