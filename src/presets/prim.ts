import type { AnimationScript, GraphEdgeState, ActionColor } from '@/types/animation'

function pStep(id: number, ln: number, zh: string, en: string,
  type: string, targets: number[], color: ActionColor,
  comps: number, accs: number,
  mstNodes: string[], candidates: string[],
): AnimationScript['steps'][0] {
  return {
    stepId: id, codeLine: ln, description: { zh, en },
    action: { type: type as AnimationScript['steps'][0]['action']['type'], targets, color },
    stats: { comparisons: comps, swaps: 0, accesses: accs },
    teachingState: { graph: { sets: { mst: mstNodes, candidates } } },
  }
}

const primPreset: AnimationScript = {
  algorithm: 'prim',
  complexity: { time: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)' }, space: 'O(V)' },
  initialState: {
    type: 'graph', data: [],
    nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
    edges: [{ source: '0', target: '1', weight: 2 }, { source: '0', target: '3', weight: 6 }, { source: '1', target: '2', weight: 3 }, { source: '1', target: '3', weight: 8 }, { source: '1', target: '4', weight: 5 }, { source: '2', target: '4', weight: 7 }, { source: '3', target: '4', weight: 9 }],
  },
  steps: [
    pStep(1, 3, 'Prim 从节点 A 开始构建 MST。MST 集合: {A}。Prim 每次选择连接 MST 与外部的最小权重边', 'Prim starts from A. MST set: {A}. Prim picks min-weight edge crossing MST to outside', 'highlight', [0], 'primary', 0, 1, ['0'], []),
    pStep(2, 7, '候选边：A-B(2)、A-D(6)。选择最小权 A-B(2)，将 B 加入 MST', 'Candidates: A-B(2), A-D(6). Pick min-weight A-B(2), add B to MST', 'compare', [0, 1], 'warning', 1, 2, ['0', '1'], ['2','3','4']),
    pStep(3, 8, 'MST 边: A-B(2)。MST 集合: {A,B}。更新候选边，加入 B 的邻居 C、D、E', 'MST edge: A-B(2). MST: {A,B}. Update candidates with B\'s neighbors C, D, E', 'mark', [0, 1], 'success', 1, 3, ['0','1'], ['2','3','4']),
    pStep(4, 7, '候选边：A-D(6)、B-C(3)、B-D(8)、B-E(5)。选最小 B-C(3)。Prim 只关心横跨 MST 边界的边', 'Candidates: AD(6), BC(3), BD(8), BE(5). Pick BC(3). Prim only considers crossing edges', 'compare', [1, 2], 'warning', 2, 4, ['0','1','2'], ['3','4']),
    pStep(5, 8, 'MST: A-B(2), B-C(3)。MST 集合: {A,B,C}。C 的邻居 E 成为新候选', 'MST: AB(2), BC(3). MST: {A,B,C}. C\'s neighbor E is new candidate', 'mark', [1, 2], 'success', 2, 5, ['0','1','2'], ['3','4']),
    pStep(6, 7, '候选边：A-D(6)、B-E(5)、B-D(8)、C-E(7)。选最小 B-E(5)', 'Candidates: AD(6), BE(5), BD(8), CE(7). Pick BE(5)', 'compare', [1, 4], 'warning', 3, 6, ['0','1','2','4'], ['3']),
    pStep(7, 8, '边 B-E(5) 加入 MST。MST: {A,B,C,E}。只剩 D 未在 MST 中', 'Edge B-E(5) added. MST: {A,B,C,E}. Only D outside MST', 'mark', [1, 4], 'success', 3, 7, ['0','1','2','4'], ['3']),
    pStep(8, 7, '候选边：A-D(6)、D-E(9)。选 A-D(6)。B-D(8) 也是候选但更大，9 比 6 大所以 A-D 胜出', 'Candidates: AD(6), DE(9). Pick AD(6). BD(8) and DE(9) are larger', 'compare', [0, 3], 'warning', 4, 8, ['0','1','2','3','4'], []),
    pStep(9, 8, '边 A-D(6) 加入 MST。所有 5 个节点已加入，MST 完成！总权重: 2+3+5+6=16', 'Edge A-D(6) added. All 5 nodes in MST. Total weight: 16', 'mark', [0,1,2,3,4], 'success', 4, 9, ['0','1','2','3','4'], []),
  ],
}

primPreset.presentation = { engine: 'scene', module: 'graph' }
primPreset.steps = primPreset.steps.map((step, index) => {
  const events: NonNullable<(typeof step)['events']> = []
  if (index === 0) {
    events.push({
      type: 'graph.create',
      nodes: primPreset.initialState.nodes ?? [],
      edges: primPreset.initialState.edges ?? [],
      directed: false,
    })
  }
  if (step.action.type === 'mark' && step.action.targets.length > 0) {
    step.action.targets.forEach((target) => events.push({ type: 'graph.visit_node', nodeId: String(target) }))
  }
  if (step.action.type === 'compare' && step.action.targets.length >= 2) {
    events.push({ type: 'graph.visit_edge', source: String(step.action.targets[0]), target: String(step.action.targets[1]) })
  }
  if (step.action.type === 'highlight' && step.action.targets.length > 0) {
    events.push({ type: 'graph.visit_node', nodeId: String(step.action.targets[0]) })
  }
  return events.length > 0 ? { ...step, events } : step
})

export default primPreset
