import type { AnimationScript } from '@/types/animation'

const bellmanFordPreset: AnimationScript = {
  algorithm: 'bellman_ford',
  complexity: { time: { best: 'O(VE)', average: 'O(VE)', worst: 'O(VE)' }, space: 'O(V)' },
  initialState: {
    type: 'graph',
    data: [],
    nodes: [{ id: '0', label: 'S' }, { id: '1', label: 'A' }, { id: '2', label: 'B' }, { id: '3', label: 'C' }, { id: '4', label: 'D' }],
    edges: [{ source: '0', target: '1', weight: 5 }, { source: '0', target: '2', weight: 4 }, { source: '1', target: '3', weight: 3 }, { source: '2', target: '1', weight: -2 }, { source: '2', target: '3', weight: 7 }, { source: '3', target: '4', weight: 2 }, { source: '1', target: '4', weight: 6 }],
  },
  steps: [
    { stepId: 1, codeLine: 2, description: { zh: '初始化 dist[S]=0，其余=∞', en: 'Init dist[S]=0, others=∞' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 3, description: { zh: '第 1 轮松弛所有边：S→A(5<∞) 更新 A=5', en: 'Round 1 relax: S→A(5<∞) update A=5' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 3, description: { zh: 'S→B(4<∞) 更新 B=4。B→A(-2): 4-2=2 < 5，更新 A=2！', en: 'S→B(4<∞) B=4. B→A: 4-2=2 < 5, update A=2!' }, action: { type: 'compare', targets: [0, 2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 3, description: { zh: 'A→C(2+3=5<∞) 更新 C=5。A→D(2+6=8<∞) 更新 D=8', en: 'A→C(2+3=5<∞) C=5. A→D(2+6=8<∞) D=8' }, action: { type: 'compare', targets: [1, 3], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 4 } },
    { stepId: 5, codeLine: 3, description: { zh: 'C→D(5+2=7<8) 更新 D=7', en: 'C→D(5+2=7<8) update D=7' }, action: { type: 'compare', targets: [3, 4], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 5 } },
    { stepId: 6, codeLine: 3, description: { zh: '第 2 轮松弛：无边可更新，算法收敛。dist=[S:0,A:2,B:4,C:5,D:7]', en: 'Round 2: no updates. Converged. dist=[0,2,4,5,7]' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 6 } },
    { stepId: 7, codeLine: 5, description: { zh: '完成！Bellman-Ford 可处理负权边（不含负环）', en: 'Done! Bellman-Ford handles negative edges (no negative cycles)' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 6 } },
  ],
}

export default bellmanFordPreset
