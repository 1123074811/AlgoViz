import type { AnimationScript } from '@/types/animation'

const dijkstraPreset: AnimationScript = {
  algorithm: 'dijkstra',
  complexity: {
    time: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)' },
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
    ],
    edges: [
      { source: '0', target: '1', weight: 4 },
      { source: '0', target: '2', weight: 2 },
      { source: '1', target: '2', weight: 1 },
      { source: '1', target: '3', weight: 5 },
      { source: '2', target: '3', weight: 8 },
      { source: '2', target: '4', weight: 10 },
      { source: '3', target: '4', weight: 2 },
    ],
  },
  steps: [
    { stepId: 1, codeLine: 3, description: { zh: '初始化：dist[A]=0，其余节点=∞。从 A 开始', en: 'Init: dist[A]=0, others=∞. Start from A' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 5, description: { zh: '从优先队列取出 A (dist=0)，标记为已访问', en: 'Pop A (dist=0) from PQ, mark visited' }, action: { type: 'mark', targets: [0], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 8, description: { zh: 'A→B: dist[A]+4=4 < dist[B]=∞，更新 dist[B]=4', en: 'A→B: 0+4=4 < ∞, update dist[B]=4' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 9, description: { zh: 'B 距离更新为 4', en: 'B distance updated to 4' }, action: { type: 'highlight', targets: [1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 4 } },
    { stepId: 5, codeLine: 8, description: { zh: 'A→C: dist[A]+2=2 < dist[C]=∞，更新 dist[C]=2', en: 'A→C: 0+2=2 < ∞, update dist[C]=2' }, action: { type: 'compare', targets: [0, 2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 5 } },
    { stepId: 6, codeLine: 9, description: { zh: 'C 距离更新为 2', en: 'C distance updated to 2' }, action: { type: 'highlight', targets: [2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 6 } },
    { stepId: 7, codeLine: 5, description: { zh: '取出最小距离节点 C (dist=2)，标记已访问', en: 'Pop C (dist=2), mark visited' }, action: { type: 'mark', targets: [2], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 7 } },
    { stepId: 8, codeLine: 8, description: { zh: 'C→B: dist[C]+1=3 < dist[B]=4，更新 dist[B]=3', en: 'C→B: 2+1=3 < 4, update dist[B]=3' }, action: { type: 'compare', targets: [2, 1], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 8 } },
    { stepId: 9, codeLine: 9, description: { zh: 'B 距离更新为 3（通过 C 更短）', en: 'B updated to 3 (shorter via C)' }, action: { type: 'highlight', targets: [1], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 9 } },
    { stepId: 10, codeLine: 8, description: { zh: 'C→D: dist[C]+8=10 < dist[D]=∞，更新 dist[D]=10', en: 'C→D: 2+8=10 < ∞, update dist[D]=10' }, action: { type: 'compare', targets: [2, 3], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 10 } },
    { stepId: 11, codeLine: 8, description: { zh: 'C→E: dist[C]+10=12 < dist[E]=∞，更新 dist[E]=12', en: 'C→E: 2+10=12 < ∞, update dist[E]=12' }, action: { type: 'compare', targets: [2, 4], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 11 } },
    { stepId: 12, codeLine: 5, description: { zh: '取出最小距离节点 B (dist=3)，标记已访问', en: 'Pop B (dist=3), mark visited' }, action: { type: 'mark', targets: [1], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 12 } },
    { stepId: 13, codeLine: 8, description: { zh: 'B→D: dist[B]+5=8 < dist[D]=10，更新 dist[D]=8', en: 'B→D: 3+5=8 < 10, update dist[D]=8' }, action: { type: 'compare', targets: [1, 3], color: 'warning' }, stats: { comparisons: 6, swaps: 0, accesses: 13 } },
    { stepId: 14, codeLine: 5, description: { zh: '取出 D (dist=8)，标记已访问', en: 'Pop D (dist=8), mark visited' }, action: { type: 'mark', targets: [3], color: 'success' }, stats: { comparisons: 6, swaps: 0, accesses: 14 } },
    { stepId: 15, codeLine: 8, description: { zh: 'D→E: dist[D]+2=10 < dist[E]=12，更新 dist[E]=10', en: 'D→E: 8+2=10 < 12, update dist[E]=10' }, action: { type: 'compare', targets: [3, 4], color: 'warning' }, stats: { comparisons: 7, swaps: 0, accesses: 15 } },
    { stepId: 16, codeLine: 5, description: { zh: '取出 E (dist=10)，标记已访问。完成！', en: 'Pop E (dist=10). Done!' }, action: { type: 'mark', targets: [4], color: 'success' }, stats: { comparisons: 7, swaps: 0, accesses: 16 } },
    { stepId: 17, codeLine: 12, description: { zh: '最短路径: A→C→B→D→E，总距离=10', en: 'Shortest: A→C→B→D→E, total=10' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4], color: 'success' }, stats: { comparisons: 7, swaps: 0, accesses: 16 } },
  ],
}

export default dijkstraPreset
