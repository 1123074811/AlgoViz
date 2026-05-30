import type { AnimationScript, ActionColor } from '@/types/animation'

function bfStep(id: number, ln: number, zh: string, en: string,
  type: string, targets: number[], color: ActionColor, rnd: number,
  comps: number, accs: number, dists: Record<string, number | string>,
): AnimationScript['steps'][0] {
  return {
    stepId: id, codeLine: ln, description: { zh, en },
    action: { type: type as AnimationScript['steps'][0]['action']['type'], targets, color },
    stats: { comparisons: comps, swaps: 0, accesses: accs },
    teachingState: { graph: { distances: dists, queue: [`轮 ${rnd}`] } },
  }
}

const bellmanFordPreset: AnimationScript = {
  algorithm: 'bellman_ford',
  complexity: { time: { best: 'O(VE)', average: 'O(VE)', worst: 'O(VE)' }, space: 'O(V)' },
  initialState: {
    type: 'graph', data: [],
    nodes: [{ id: '0', label: 'S' }, { id: '1', label: 'A' }, { id: '2', label: 'B' }, { id: '3', label: 'C' }, { id: '4', label: 'D' }],
    edges: [{ source: '0', target: '1', weight: 5 }, { source: '0', target: '2', weight: 4 }, { source: '1', target: '3', weight: 3 }, { source: '2', target: '1', weight: -2 }, { source: '2', target: '3', weight: 7 }, { source: '3', target: '4', weight: 2 }, { source: '1', target: '4', weight: 6 }],
  },
  steps: [
    bfStep(1, 2, '初始化 dist[S]=0，其余=∞。Bellman-Ford 对所有边进行 V-1 轮松弛，可处理负权边', 'Init dist[S]=0, others=∞. Bellman-Ford relaxes all edges V-1 times, handles negative weights', 'highlight', [0], 'primary', 0, 0, 1, { '0': 0, '1': '∞', '2': '∞', '3': '∞', '4': '∞' }),
    bfStep(2, 3, '第 1 轮：松弛 S→A：0+5=5 < ∞，dist[A]=5', 'Round 1: Relax S->A: 0+5=5 < ∞, dist[A]=5', 'compare', [0,1], 'warning', 1, 1, 2, { '0': 0, '1': 5, '2': '∞', '3': '∞', '4': '∞' }),
    bfStep(3, 3, '第 1 轮：S→B：0+4=4 < ∞，dist[B]=4。关键：B→A有负权-2，后续可改进A', 'Round 1: S->B: 0+4=4 < ∞, dist[B]=4. Note: B→A weight -2 can improve A later', 'compare', [0,2], 'warning', 1, 2, 3, { '0': 0, '1': 5, '2': 4, '3': '∞', '4': '∞' }),
    bfStep(4, 3, '第 1 轮：A→C：5+3=8 < ∞，C=8。B→A：4-2=2 < dist[A]=5！通过 B 到 A 更短，A=2', 'Round 1: A->C: 5+3=8 < ∞, C=8. B->A: 4-2=2 < 5! Shorter via B, A=2', 'compare', [2,1], 'warning', 1, 3, 4, { '0': 0, '1': 2, '2': 4, '3': 8, '4': '∞' }),
    bfStep(5, 3, '第 1 轮：B→C：4+7=11 > dist[C]=8，松弛失败。C→D：8+2=10 < ∞，D=10。A→D：2+6=8 < 10，D=8', 'Round 1: B->C: 4+7=11 > 8, no update. C->D: 8+2=10 < ∞, D=10. A->D: 2+6=8 < 10, D=8', 'compare', [3,4], 'warning', 1, 4, 5, { '0': 0, '1': 2, '2': 4, '3': 8, '4': 8 }),
    bfStep(6, 3, '第 2 轮：重新扫描所有边。Bellman-Ford 每轮可能更新多个节点，因为早期节点的改进会传播', 'Round 2: Re-scan all edges. Bellman-Ford may update multiple nodes per round as improvements propagate', 'compare', [], 'warning', 2, 5, 6, { '0': 0, '1': 2, '2': 4, '3': 7, '4': 7 }),
    bfStep(7, 3, '第 2 轮结束：无边可更新，算法收敛。第 3 轮无变化说明无负环（V-1 轮后还可更新则有负环）', 'Round 2 done: no edges updated, converged. If any update in round V, negative cycle exists', 'mark', [0,1,2,3,4], 'success', 2, 5, 7, { '0': 0, '1': 2, '2': 4, '3': 7, '4': 7 }),
    bfStep(8, 5, '完成！dist=[S:0,A:2,B:4,C:7,D:7]。Bellman-Ford 比 Dijkstra 慢但可处理负权边', 'Done! dist=[0,2,4,7,7]. Bellman-Ford slower than Dijkstra but handles negative edges', 'mark', [], 'success', 2, 5, 7, { '0': 0, '1': 2, '2': 4, '3': 7, '4': 7 }),
  ],
}

bellmanFordPreset.presentation = { engine: 'scene', module: 'graph' }
bellmanFordPreset.steps = bellmanFordPreset.steps.map((step, index) => {
  const events: NonNullable<(typeof step)['events']> = []
  if (index === 0) {
    events.push({
      type: 'graph.create',
      nodes: bellmanFordPreset.initialState.nodes ?? [],
      edges: bellmanFordPreset.initialState.edges ?? [],
      directed: true,
    })
  }
  if (step.action.type === 'mark' && step.action.targets.length > 0) {
    step.action.targets.forEach((target) => events.push({ type: 'graph.visit_node', nodeId: String(target) }))
  }
  if (step.action.type === 'compare' && step.action.targets.length >= 2) {
    events.push({ type: 'graph.visit_edge', source: String(step.action.targets[0]), target: String(step.action.targets[1]) })
    events.push({ type: 'graph.relax_edge', source: String(step.action.targets[0]), target: String(step.action.targets[1]), success: step.action.color === 'warning' || step.action.color === 'success' })
  }
  if (step.action.type === 'highlight' && step.action.targets.length > 0) {
    step.action.targets.forEach((target) => events.push({ type: 'graph.visit_node', nodeId: String(target) }))
  }
  return events.length > 0 ? { ...step, events } : step
})

export default bellmanFordPreset
