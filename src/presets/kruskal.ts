import type { AnimationScript } from '@/types/animation'

const kruskalPreset: AnimationScript = {
  algorithm: 'kruskal',
  complexity: {
    time: { best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)' },
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
    { stepId: 1, codeLine: 2, description: { zh: '将所有边按权重排序：A-B(2) < B-C(3) < B-E(5) < A-D(6) < C-E(7) < B-D(8) < D-E(9)', en: 'Sort edges by weight: AB(2) < BC(3) < BE(5) < AD(6) < CE(7) < BD(8) < DE(9)' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 7 } },
    { stepId: 2, codeLine: 6, description: { zh: '取边 A-B(2)：A、B 不在同一集合，加入 MST，合并集合 {A,B}', en: 'Edge A-B(2): A,B in different sets, add to MST, union {A,B}' }, action: { type: 'compare', targets: [0, 1], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 8 } },
    { stepId: 3, codeLine: 7, description: { zh: 'MST 边: A-B(2)。当前集合: {A,B}, {C}, {D}, {E}', en: 'MST: AB(2). Sets: {A,B}, {C}, {D}, {E}' }, action: { type: 'mark', targets: [0, 1], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 9 } },
    { stepId: 4, codeLine: 6, description: { zh: '取边 B-C(3)：B∈{A,B}、C∈{C}，不在同一集合，加入 MST，合并 {A,B,C}', en: 'Edge B-C(3): B,C different sets, add to MST, union {A,B,C}' }, action: { type: 'compare', targets: [1, 2], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 10 } },
    { stepId: 5, codeLine: 7, description: { zh: 'MST: A-B(2), B-C(3)。集合: {A,B,C}, {D}, {E}', en: 'MST: AB(2), BC(3). Sets: {A,B,C}, {D}, {E}' }, action: { type: 'mark', targets: [1, 2], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 11 } },
    { stepId: 6, codeLine: 6, description: { zh: '取边 B-E(5)：B∈{A,B,C}、E∈{E}，不在同一集合，加入 MST，合并 {A,B,C,E}', en: 'Edge B-E(5): different sets, add to MST, union {A,B,C,E}' }, action: { type: 'compare', targets: [1, 4], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 12 } },
    { stepId: 7, codeLine: 7, description: { zh: 'MST: AB(2), BC(3), BE(5)。集合: {A,B,C,E}, {D}', en: 'MST: AB(2), BC(3), BE(5). Sets: {A,B,C,E}, {D}' }, action: { type: 'mark', targets: [1, 4], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 13 } },
    { stepId: 8, codeLine: 6, description: { zh: '取边 A-D(6)：A∈{A,B,C,E}、D∈{D}，不在同一集合，加入 MST，合并 {A,B,C,D,E}', en: 'Edge A-D(6): different sets, add to MST, union all' }, action: { type: 'compare', targets: [0, 3], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 14 } },
    { stepId: 9, codeLine: 7, description: { zh: '边集已含 4 条边 = V-1，MST 完成！剩余边无需检查', en: '4 edges = V-1, MST complete! Remaining edges skipped' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 14 } },
    { stepId: 10, codeLine: 9, description: { zh: 'MST 总权重: 2+3+5+6=16', en: 'MST total weight: 2+3+5+6=16' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 14 } },
  ],
}

export default kruskalPreset
