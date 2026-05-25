import type { AnimationScript } from '@/types/animation'

const primPreset: AnimationScript = {
  algorithm: 'prim',
  complexity: {
    time: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)' },
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
      { source: '0', target: '1', weight: 2 }, { source: '0', target: '3', weight: 6 },
      { source: '1', target: '2', weight: 3 }, { source: '1', target: '3', weight: 8 },
      { source: '1', target: '4', weight: 5 }, { source: '2', target: '4', weight: 7 },
      { source: '3', target: '4', weight: 9 },
    ],
  },
  steps: [
    { stepId: 1, codeLine: 3, description: { zh: '从节点 A 开始构建 MST，标记 A 为已访问', en: 'Start MST from A, mark A visited' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 7, description: { zh: 'A 的候选边：A-B(2)、A-D(6)。选择最小边 A-B(2)', en: 'Candidate edges from A: A-B(2), A-D(6). Pick min A-B(2)' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 8, description: { zh: '边 A-B(2) 加入 MST，B 标记为已访问', en: 'Edge A-B(2) added to MST, mark B visited' }, action: { type: 'mark', targets: [0, 1], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 7, description: { zh: '候选边：A-D(6)、B-C(3)、B-D(8)、B-E(5)。选最小 B-C(3)', en: 'Candidates: A-D(6), B-C(3), B-D(8), B-E(5). Pick B-C(3)' }, action: { type: 'compare', targets: [1, 2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 4 } },
    { stepId: 5, codeLine: 8, description: { zh: '边 B-C(3) 加入 MST，C 标记为已访问', en: 'Edge B-C(3) added to MST, mark C visited' }, action: { type: 'mark', targets: [1, 2], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 5 } },
    { stepId: 6, codeLine: 7, description: { zh: '候选边：A-D(6)、B-E(5)、B-D(8)、C-E(7)。选最小 B-E(5)', en: 'Candidates: A-D(6), B-E(5), B-D(8), C-E(7). Pick B-E(5)' }, action: { type: 'compare', targets: [1, 4], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 6 } },
    { stepId: 7, codeLine: 8, description: { zh: '边 B-E(5) 加入 MST，E 标记为已访问', en: 'Edge B-E(5) added, mark E visited' }, action: { type: 'mark', targets: [1, 4], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 7 } },
    { stepId: 8, codeLine: 7, description: { zh: '候选边：A-D(6)、D-E(9)。选最小 A-D(6)。B-D(8)已形成环跳过', en: 'Candidates: A-D(6), D-E(9). Pick A-D(6). B-D(8) would form cycle' }, action: { type: 'compare', targets: [0, 3], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 8 } },
    { stepId: 9, codeLine: 8, description: { zh: '边 A-D(6) 加入 MST，D 标记为已访问。MST 完成！', en: 'Edge A-D(6) added. MST complete!' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 9 } },
    { stepId: 10, codeLine: 10, description: { zh: 'MST 总权重: 2+3+5+6=16', en: 'MST total weight: 2+3+5+6=16' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 9 } },
  ],
}

export default primPreset
