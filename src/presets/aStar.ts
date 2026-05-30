import type { AnimationScript, ActionColor } from '@/types/animation'

function aStep(id: number, ln: number, zh: string, en: string,
  type: string, targets: number[], color: ActionColor,
  comps: number, accs: number, scores: Record<string, string | number>,
  openSet: string[], closedSet: string[],
): AnimationScript['steps'][0] {
  return {
    stepId: id, codeLine: ln, description: { zh, en },
    action: { type: type as AnimationScript['steps'][0]['action']['type'], targets, color },
    stats: { comparisons: comps, swaps: 0, accesses: accs },
    teachingState: { graph: { distances: scores, sets: { open: openSet, closed: closedSet } } },
  }
}

const aStarPreset: AnimationScript = {
  algorithm: 'a_star',
  complexity: { time: { best: 'O(E)', average: 'O(E log V)', worst: 'O(E log V)' }, space: 'O(V)' },
  initialState: {
    type: 'graph', data: [],
    nodes: [{ id: '0', label: 'S' }, { id: '1', label: 'A' }, { id: '2', label: 'B' }, { id: '3', label: 'C' }, { id: '4', label: 'G' }],
    edges: [{ source: '0', target: '1', weight: 1 }, { source: '0', target: '2', weight: 4 }, { source: '1', target: '2', weight: 2 }, { source: '1', target: '3', weight: 5 }, { source: '2', target: '3', weight: 1 }, { source: '3', target: '4', weight: 3 }, { source: '2', target: '4', weight: 7 }],
  },
  steps: [
    aStep(1, 2, 'A* 搜索从 S 到 G。f(n)=g(n)+h(n)，g=实际距离，h=启发估计。A* 保证在可纳启发下找到最优解', 'A* from S to G. f(n)=g(n)+h(n), g=actual cost, h=heuristic. A* guarantees optimal with admissible heuristic', 'highlight', [0], 'primary', 0, 1, { 'g(S)': 0, 'h(S)': 4, 'f(S)': 4 }, ['0'], []),
    aStep(2, 4, 'Open 集中 S(f=4) 最小，出队处理。检查 S→A：g=1, h=3, f=4 < ∞，A 入 open', 'S(f=4) smallest in open, dequeue. Check S->A: g=1, h=3, f=4 < ∞, A into open', 'compare', [0,1], 'warning', 1, 2, { 'g(A)': 1, 'h(A)': 3, 'f(A)': 4, 'g(B)': 4, 'h(B)': 2, 'f(B)': 6 }, ['1','2'], ['0']),
    aStep(3, 4, 'S→B：g=4, h=2, f=6。Open: [A(f=4), B(f=6)]。A f 最小，选 A', 'S->B: g=4, h=2, f=6. Open: [A(f=4), B(f=6)]. A has min f, pick A', 'compare', [0,2], 'warning', 2, 3, { 'g(A)': 1, 'f(A)': 4, 'g(B)': 4, 'f(B)': 6 }, ['1','2'], ['0']),
    aStep(4, 4, 'A 出队。A→B：g=1+2=3 < current g(B)=4，找到到 B 的更短路径！更新 B: g=3, f=5', 'Dequeue A. A->B: g=1+2=3 < 4, shorter path to B! Update B: g=3, f=5', 'compare', [1,2], 'warning', 3, 4, { 'g(A)': 1, 'f(A)': 4, 'g(B)': 3, 'f(B)': 5, 'g(C)': 6, 'f(C)': 7 }, ['2','3'], ['0','1']),
    aStep(5, 4, 'A→C：g=1+5=6, h=1, f=7 < ∞，C 入 open。B(f=5) 最小，选 B', 'A->C: g=1+5=6, h=1, f=7 < ∞, C into open. B(f=5) is min, pick B', 'compare', [1,3], 'warning', 4, 5, { 'g(B)': 3, 'f(B)': 5, 'g(C)': 6, 'f(C)': 7 }, ['2','3'], ['0','1']),
    aStep(6, 4, 'B 出队。B→C：g=3+1=4 < 6，更新 C：g=4, f=5。B→G：g=3+7=10, f=10，G 入 open', 'Dequeue B. B->C: g=3+1=4 < 6, update C: g=4, f=5. B->G: g=10, h=0, f=10, G into open', 'compare', [2,3], 'warning', 5, 6, { 'g(C)': 4, 'f(C)': 5, 'g(G)': 10, 'f(G)': 10 }, ['3','4'], ['0','1','2']),
    aStep(7, 4, 'C(f=5) 最小，出队。C→G：g=4+3=7 < 10，更新 G：g=7, f=7！通过 C 到 G 更短', 'C(f=5) is min, dequeue. C->G: g=4+3=7 < 10, update G: g=7, f=7! Shorter via C', 'compare', [3,4], 'warning', 6, 7, { 'g(C)': 4, 'f(C)': 5, 'g(G)': 7, 'f(G)': 7 }, ['4'], ['0','1','2','3']),
    aStep(8, 6, '目标 G 出队！A* 找到最短路径 S→A→B→C→G，总距离 7。A* 比 Dijkstra 快，因为启发函数 h 引导搜索方向', 'Goal G dequeued! Path S->A->B->C->G, total 7. A* faster than Dijkstra as heuristic guides search', 'mark', [0,1,2,3,4], 'success', 7, 8, { 'g(G)': 7, 'f(G)': 7 }, [], ['0','1','2','3','4']),
  ],
}

aStarPreset.presentation = { engine: 'scene', module: 'graph' }
aStarPreset.steps = aStarPreset.steps.map((step, index) => {
  const events: NonNullable<(typeof step)['events']> = []
  if (index === 0) {
    events.push({
      type: 'graph.create',
      nodes: aStarPreset.initialState.nodes ?? [],
      edges: aStarPreset.initialState.edges ?? [],
      directed: false,
    })
  }
  if (step.action.type === 'mark' && step.action.targets.length > 0) {
    step.action.targets.forEach((target) => events.push({ type: 'graph.visit_node', nodeId: String(target) }))
  }
  if (step.action.type === 'compare' && step.action.targets.length >= 2) {
    events.push({ type: 'graph.visit_edge', source: String(step.action.targets[0]), target: String(step.action.targets[1]) })
    events.push({ type: 'graph.relax_edge', source: String(step.action.targets[0]), target: String(step.action.targets[1]), success: step.action.color === 'warning' })
  }
  if (step.action.type === 'highlight' && step.action.targets.length > 0) {
    events.push({ type: 'graph.visit_node', nodeId: String(step.action.targets[0]) })
  }
  return events.length > 0 ? { ...step, events } : step
})

export default aStarPreset
