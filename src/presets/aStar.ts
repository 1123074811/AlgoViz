import type { AnimationScript } from '@/types/animation'

const aStarPreset: AnimationScript = {
  algorithm: 'a_star',
  complexity: { time: { best: 'O(E)', average: 'O(E log V)', worst: 'O(E log V)' }, space: 'O(V)' },
  initialState: {
    type: 'graph',
    data: [],
    nodes: [{ id: '0', label: 'S' }, { id: '1', label: 'A' }, { id: '2', label: 'B' }, { id: '3', label: 'C' }, { id: '4', label: 'G' }],
    edges: [{ source: '0', target: '1', weight: 1 }, { source: '0', target: '2', weight: 4 }, { source: '1', target: '2', weight: 2 }, { source: '1', target: '3', weight: 5 }, { source: '2', target: '3', weight: 1 }, { source: '3', target: '4', weight: 3 }, { source: '2', target: '4', weight: 7 }],
  },
  steps: [
    { stepId: 1, codeLine: 2, description: { zh: '起点 S(0,0)，目标 G(4,0)。f(n)=g(n)+h(n)', en: 'Start S(0,0), goal G(4,0). f(n)=g(n)+h(n)' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 4, description: { zh: 'S 出队，检查邻居：S→A (g=1, h=3, f=4)。S→B (g=4, h=2, f=6)', en: 'Pop S, check: S→A(f=4), S→B(f=6)' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 5, description: { zh: 'A(f=4) < B(f=6)，选 A。A→B(g=1+2=3<4, h=2, f=5) 更新 B(f=5)', en: 'A(f=4) < B(f=6), pick A. A→B: g=3<4, update B(f=5)' }, action: { type: 'compare', targets: [1, 2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 5, description: { zh: 'A→C(g=1+5=6, h=?, f=9<∞) 更新 C(f=9)', en: 'A→C(g=6, f=9) update C' }, action: { type: 'compare', targets: [1, 3], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 4 } },
    { stepId: 5, codeLine: 4, description: { zh: 'B(f=5) 最小，出队。B→C(g=3+1=4<6, f=7) 更新 C(f=7)', en: 'B(f=5) min, pop. B→C: g=4<6, update C(f=7)' }, action: { type: 'compare', targets: [2, 3], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 5 } },
    { stepId: 6, codeLine: 4, description: { zh: 'B→G(g=3+7=10, f=10) 更新 G', en: 'B→G(g=10, f=10) update G' }, action: { type: 'compare', targets: [2, 4], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 6 } },
    { stepId: 7, codeLine: 4, description: { zh: 'C(f=7) 出队。C→G(g=4+3=7<10, f=7) 更新 G(f=7)，找到最短路径！', en: 'C(f=7) pop. C→G: g=7<10, update G(f=7). Found shortest!' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4], color: 'success' }, stats: { comparisons: 6, swaps: 0, accesses: 7 } },
    { stepId: 8, codeLine: 6, description: { zh: 'A* 完成！路径 S→A→B→C→G，总距离=7', en: 'A* done! Path S→A→B→C→G, total=7' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 6, swaps: 0, accesses: 7 } },
  ],
}

export default aStarPreset
