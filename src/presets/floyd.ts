import type { AnimationScript } from '@/types/animation'

const floydPreset: AnimationScript = {
  algorithm: 'floyd',
  complexity: {
    time: { best: 'O(V³)', average: 'O(V³)', worst: 'O(V³)' },
    space: 'O(V²)',
  },
  initialState: {
    type: 'matrix',
    data: [0, 3, 999, 7, 8, 0, 2, 999, 999, 999, 0, 1, 6, 999, 999, 0],
  },
  steps: [
    { stepId: 1, codeLine: 2, description: { zh: '初始距离矩阵 (999=∞)', en: 'Initial distance matrix (999=∞)' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 16 } },
    { stepId: 2, codeLine: 3, description: { zh: 'k=0：以节点 0 为中间点。检查路径 i→0→j', en: 'k=0: node 0 as intermediate. Check i→0→j' }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 16 } },
    { stepId: 3, codeLine: 4, description: { zh: 'k=0 后：3→0→1: ∞+3 不更新。无更短路径', en: 'After k=0: no updates (node 0 has no incoming via 0)' }, action: { type: 'compare', targets: [], color: 'muted' }, stats: { comparisons: 16, swaps: 0, accesses: 32 } },
    { stepId: 4, codeLine: 3, description: { zh: 'k=1：以节点 1 为中间点。检查路径 i→1→j', en: 'k=1: node 1 as intermediate. Check i→1→j' }, action: { type: 'highlight', targets: [4, 5, 6, 7], color: 'warning' }, stats: { comparisons: 16, swaps: 0, accesses: 32 } },
    { stepId: 5, codeLine: 4, description: { zh: '0→1→2: 3+2=5 < ∞，更新 dist[0][2]=5', en: '0→1→2: 3+2=5 < ∞, update dist[0][2]=5' }, action: { type: 'compare', targets: [2], color: 'success' }, stats: { comparisons: 17, swaps: 0, accesses: 33 } },
    { stepId: 6, codeLine: 4, description: { zh: 'k=1 后：dist[0][2]=5。矩阵更新', en: 'After k=1: dist[0][2]=5. Matrix updated' }, action: { type: 'mark', targets: [2], color: 'success' }, stats: { comparisons: 32, swaps: 0, accesses: 48 } },
    { stepId: 7, codeLine: 3, description: { zh: 'k=2：以节点 2 为中间点', en: 'k=2: node 2 as intermediate' }, action: { type: 'highlight', targets: [8, 9, 10, 11], color: 'warning' }, stats: { comparisons: 32, swaps: 0, accesses: 48 } },
    { stepId: 8, codeLine: 4, description: { zh: '0→2→3: 5+1=6 < 7，更新 dist[0][3]=6', en: '0→2→3: 5+1=6 < 7, update dist[0][3]=6' }, action: { type: 'compare', targets: [3], color: 'success' }, stats: { comparisons: 33, swaps: 0, accesses: 49 } },
    { stepId: 9, codeLine: 4, description: { zh: '1→2→3: 2+1=3 < ∞，更新 dist[1][3]=3', en: '1→2→3: 2+1=3 < ∞, update dist[1][3]=3' }, action: { type: 'compare', targets: [7], color: 'success' }, stats: { comparisons: 34, swaps: 0, accesses: 50 } },
    { stepId: 10, codeLine: 3, description: { zh: 'k=3：以节点 3 为中间点（最后一步）', en: 'k=3: node 3 as intermediate (final)' }, action: { type: 'highlight', targets: [12, 13, 14, 15], color: 'warning' }, stats: { comparisons: 34, swaps: 0, accesses: 50 } },
    { stepId: 11, codeLine: 5, description: { zh: 'Floyd-Warshall 完成！所有节点对最短路径已计算', en: 'Floyd-Warshall complete! All-pairs shortest paths computed' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], color: 'success' }, stats: { comparisons: 64, swaps: 0, accesses: 80 } },
  ],
}

export default floydPreset
