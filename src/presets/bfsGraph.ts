import type { AnimationScript } from '@/types/animation'

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
    { stepId: 1, codeLine: 4, description: { zh: '将起点 A 加入队列，标记为已访问', en: 'Enqueue start node A, mark visited' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 5, description: { zh: 'A 出队，访问 A', en: 'Dequeue A, visit A' }, action: { type: 'mark', targets: [0], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 7, description: { zh: '遍历 A 的邻居：发现 B（未访问），加入队列', en: 'Traverse A neighbors: found B (unvisited), enqueue' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 8, description: { zh: '标记 B 为已访问，加入队列', en: 'Mark B visited, enqueue' }, action: { type: 'highlight', targets: [1], color: 'primary' }, stats: { comparisons: 1, swaps: 0, accesses: 4 } },
    { stepId: 5, codeLine: 7, description: { zh: '遍历 A 的邻居：发现 C（未访问），加入队列', en: 'Traverse A neighbors: found C (unvisited), enqueue' }, action: { type: 'compare', targets: [0, 2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 5 } },
    { stepId: 6, codeLine: 8, description: { zh: '标记 C 为已访问，加入队列。A 遍历完毕', en: 'Mark C visited, enqueue. A done' }, action: { type: 'highlight', targets: [2], color: 'primary' }, stats: { comparisons: 2, swaps: 0, accesses: 6 } },
    { stepId: 7, codeLine: 5, description: { zh: 'B 出队，访问 B', en: 'Dequeue B, visit B' }, action: { type: 'mark', targets: [1], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 7 } },
    { stepId: 8, codeLine: 7, description: { zh: '遍历 B 的邻居：发现 D（未访问），加入队列', en: 'Traverse B neighbors: found D (unvisited), enqueue' }, action: { type: 'compare', targets: [1, 3], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 8 } },
    { stepId: 9, codeLine: 8, description: { zh: '标记 D 为已访问，加入队列', en: 'Mark D visited, enqueue' }, action: { type: 'highlight', targets: [3], color: 'primary' }, stats: { comparisons: 3, swaps: 0, accesses: 9 } },
    { stepId: 10, codeLine: 7, description: { zh: '遍历 B 的邻居：发现 E（未访问），加入队列', en: 'Traverse B neighbors: found E (unvisited), enqueue' }, action: { type: 'compare', targets: [1, 4], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 10 } },
    { stepId: 11, codeLine: 8, description: { zh: '标记 E 为已访问，加入队列。B 遍历完毕', en: 'Mark E visited, enqueue. B done' }, action: { type: 'highlight', targets: [4], color: 'primary' }, stats: { comparisons: 4, swaps: 0, accesses: 11 } },
    { stepId: 12, codeLine: 5, description: { zh: 'C 出队，访问 C', en: 'Dequeue C, visit C' }, action: { type: 'mark', targets: [2], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 12 } },
    { stepId: 13, codeLine: 7, description: { zh: '遍历 C 的邻居：发现 F（未访问），加入队列', en: 'Traverse C neighbors: found F (unvisited), enqueue' }, action: { type: 'compare', targets: [2, 5], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 13 } },
    { stepId: 14, codeLine: 8, description: { zh: '标记 F 为已访问。C 遍历完毕', en: 'Mark F visited. C done' }, action: { type: 'highlight', targets: [5], color: 'primary' }, stats: { comparisons: 5, swaps: 0, accesses: 14 } },
    { stepId: 15, codeLine: 5, description: { zh: 'D 出队，访问 D（无新邻居）', en: 'Dequeue D, visit D (no new neighbors)' }, action: { type: 'mark', targets: [3], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 15 } },
    { stepId: 16, codeLine: 5, description: { zh: 'E 出队，访问 E（无新邻居）', en: 'Dequeue E, visit E (no new neighbors)' }, action: { type: 'mark', targets: [4], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 16 } },
    { stepId: 17, codeLine: 5, description: { zh: 'F 出队，访问 F。队列空，BFS 完成！', en: 'Dequeue F. Queue empty, BFS done!' }, action: { type: 'mark', targets: [5], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 17 } },
    { stepId: 18, codeLine: 9, description: { zh: 'BFS 遍历顺序：A → B → C → D → E → F', en: 'BFS order: A -> B -> C -> D -> E -> F' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 17 } },
  ],
}

export default bfsGraphPreset
