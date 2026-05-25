import type { AnimationScript, ActionColor } from '@/types/animation'

function kStep(id: number, ln: number, zh: string, en: string,
  type: string, targets: number[], color: ActionColor,
  comps: number, accs: number, components: string[],
): AnimationScript['steps'][0] {
  return {
    stepId: id, codeLine: ln, description: { zh, en },
    action: { type: type as AnimationScript['steps'][0]['action']['type'], targets, color },
    stats: { comparisons: comps, swaps: 0, accesses: accs },
    teachingState: { graph: { sets: { components } } },
  }
}

const kruskalPreset: AnimationScript = {
  algorithm: 'kruskal',
  complexity: { time: { best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)' }, space: 'O(V)' },
  initialState: {
    type: 'graph', data: [],
    nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
    edges: [{ source: '0', target: '1', weight: 2 }, { source: '0', target: '3', weight: 6 }, { source: '1', target: '2', weight: 3 }, { source: '1', target: '3', weight: 8 }, { source: '1', target: '4', weight: 5 }, { source: '2', target: '4', weight: 7 }, { source: '3', target: '4', weight: 9 }],
  },
  steps: [
    kStep(1, 2, 'Kruskal：将所有边按权重升序排序，初始每个节点自成一个连通分量。Kruskal 与 Prim 不同，边不必连通到现有 MST', 'Kruskal: sort edges by weight. Each node initially its own component. Unlike Prim, edges need not connect to existing MST', 'highlight', [], 'primary', 0, 7, ['{A}','{B}','{C}','{D}','{E}']),
    kStep(2, 6, '取最小边 A-B(2)：A∈{A}、B∈{B}，分量不同，不形成环，加入 MST。合并为 {A,B}', 'Edge A-B(2): A,B in different components, no cycle, add to MST. Union {A,B}', 'compare', [0,1], 'success', 1, 8, ['{A,B}','{C}','{D}','{E}']),
    kStep(3, 7, 'MST: A-B(2)。并查集判断：两端属于同一分量则跳过（会成环），不同则合并。列表: AB(2)<BC(3)<BE(5)<AD(6)<CE(7)<BD(8)<DE(9)', 'MST: AB(2). Union-Find: skip if same component (would cycle), add & union if different', 'mark', [0,1], 'success', 1, 9, ['{A,B}','{C}','{D}','{E}']),
    kStep(4, 6, '边 B-C(3)：B∈{A,B}、C∈{C}，不同分量，加入 MST。合并 {A,B,C}', 'Edge B-C(3): B in {A,B}, C in {C}, different, add. Union {A,B,C}', 'compare', [1,2], 'success', 2, 10, ['{A,B,C}','{D}','{E}']),
    kStep(5, 7, 'MST: AB(2), BC(3)。已选 2 条，目标 V-1=4 条', 'MST: AB, BC. 2 edges, target 4', 'mark', [1,2], 'success', 2, 11, ['{A,B,C}','{D}','{E}']),
    kStep(6, 6, '边 B-E(5)：B∈{A,B,C}、E∈{E}，不同分量，加入 MST。合并 {A,B,C,E}', 'Edge B-E(5): different components, add. Union {A,B,C,E}', 'compare', [1,4], 'success', 3, 12, ['{A,B,C,E}','{D}']),
    kStep(7, 7, 'MST: AB, BC, BE。3 条边，只剩 1 条。5 节点图需要 4 条边形成生成树', 'MST: AB, BC, BE. 3 edges, need 1 more. N nodes requires N-1 edges for a spanning tree', 'mark', [1,4], 'success', 3, 13, ['{A,B,C,E}','{D}']),
    kStep(8, 6, '边 A-D(6)：A∈{A,B,C,E}、D∈{D}，不同分量，加入 MST。并查集合并全部 → {A,B,C,D,E}', 'Edge A-D(6): different, add. Union all → {A,B,C,D,E}', 'compare', [0,3], 'success', 4, 14, ['{A,B,C,D,E}']),
    kStep(9, 7, '4 条边 = V-1，MST 完成！总重 2+3+5+6=16。Kruskal O(E log E)，适合稀疏图', '4 edges = V-1, MST done! Total 16. Kruskal O(E log E), good for sparse graphs', 'mark', [0,1,2,3,4], 'success', 4, 14, ['{A,B,C,D,E}']),
  ],
}

export default kruskalPreset
