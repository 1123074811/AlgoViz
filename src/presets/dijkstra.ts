import type { AnimationScript, TeachingState, ActionColor } from '@/types/animation'

const INF = '∞'
function distState(d: Record<string, string | number>): TeachingState {
  return { graph: { distances: d } }
}

function relaxState(dist: Record<string, string | number>, prev: Record<string, string | null>, edgeSrc: string, edgeTgt: string, tip: string): TeachingState {
  return {
    graph: {
      distances: dist,
      predecessors: prev,
      edgeStates: [{
        source: edgeSrc, target: edgeTgt,
        role: tip === 'success' ? 'relaxed' as const : 'candidate' as const,
        color: tip === 'success' ? 'success' as const : 'warning' as const,
      }],
    },
  }
}

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
    { stepId: 1, codeLine: 3, description: { zh: '初始化距离表：dist[A]=0，其余节点=∞。从未确定集合中选择距离最小的节点开始', en: 'Init distances: dist[A]=0, others=∞. Pick smallest distance from unsettled set' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 1 }, teachingState: distState({ '0': 0, '1': INF, '2': INF, '3': INF, '4': INF }) },
    { stepId: 2, codeLine: 5, description: { zh: '取出距离最小节点 A (dist=0)，标记为已确定', en: 'Pop A (dist=0), nearest from unsettled, mark settled' }, action: { type: 'mark', targets: [0], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 2 }, teachingState: distState({ '0': 0, '1': INF, '2': INF, '3': INF, '4': INF }) },
    { stepId: 3, codeLine: 8, description: { zh: '松弛边 A→B：dist[A]+4=4 < dist[B]=∞，松弛成功，更新 dist[B]=4', en: 'Relax edge A->B: 0+4=4 < ∞, relax succeeded, update dist[B]=4' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 3 }, teachingState: relaxState({ '0': 0, '1': 4, '2': INF, '3': INF, '4': INF }, { '1': '0' }, '0', '1', 'success') },
    { stepId: 4, codeLine: 9, description: { zh: 'dist[B] 从 ∞ 更新为 4，前驱设为 A', en: 'dist[B] updated: ∞ -> 4, predecessor set to A' }, action: { type: 'highlight', targets: [1], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 4 }, teachingState: distState({ '0': 0, '1': 4, '2': INF, '3': INF, '4': INF }) },
    { stepId: 5, codeLine: 8, description: { zh: '松弛边 A→C：dist[A]+2=2 < dist[C]=∞，松弛成功，更新 dist[C]=2', en: 'Relax edge A->C: 0+2=2 < ∞, relax succeeded, update dist[C]=2' }, action: { type: 'compare', targets: [0, 2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 5 }, teachingState: relaxState({ '0': 0, '1': 4, '2': 2, '3': INF, '4': INF }, { '1': '0', '2': '0' }, '0', '2', 'success') },
    { stepId: 6, codeLine: 9, description: { zh: 'dist[C]=2，前驱为 A。A 的所有边已完成松弛', en: 'dist[C]=2, predecessor A. All A edges relaxed' }, action: { type: 'highlight', targets: [2], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 6 }, teachingState: distState({ '0': 0, '1': 4, '2': 2, '3': INF, '4': INF }) },
    { stepId: 7, codeLine: 5, description: { zh: '从待处理节点中取距离最小的 C (dist=2)，标记已确定', en: 'Pick nearest unsettled C (dist=2), mark settled' }, action: { type: 'mark', targets: [2], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 7 }, teachingState: distState({ '0': 0, '1': 4, '2': 2, '3': INF, '4': INF }) },
    { stepId: 8, codeLine: 8, description: { zh: '松弛边 C→B：dist[C]+1=3 < dist[B]=4，松弛成功！通过 C 到 B 距离更短，更新 dist[B]=3', en: 'Relax edge C->B: 2+1=3 < 4, relax succeeded! Shorter path via C, update dist[B]=3' }, action: { type: 'compare', targets: [2, 1], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 8 }, teachingState: relaxState({ '0': 0, '1': 3, '2': 2, '3': INF, '4': INF }, { '1': '2', '2': '0' }, '2', '1', 'success') },
    { stepId: 9, codeLine: 9, description: { zh: 'dist[B]: 4 → 3，前驱从 A 换为 C。这体现了 Dijkstra 不断改进估计的特点', en: 'dist[B]: 4 -> 3, predecessor changed from A to C. Dijkstra refines estimates' }, action: { type: 'highlight', targets: [1], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 9 }, teachingState: distState({ '0': 0, '1': 3, '2': 2, '3': INF, '4': INF }) },
    { stepId: 10, codeLine: 8, description: { zh: '松弛边 C→D：dist[C]+8=10 < dist[D]=∞，松弛成功，更新 dist[D]=10', en: 'Relax edge C->D: 2+8=10 < ∞, relax succeeded, update dist[D]=10' }, action: { type: 'compare', targets: [2, 3], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 10 }, teachingState: relaxState({ '0': 0, '1': 3, '2': 2, '3': 10, '4': INF }, { '1': '2', '2': '0', '3': '2' }, '2', '3', 'success') },
    { stepId: 11, codeLine: 8, description: { zh: '松弛边 C→E：dist[C]+10=12 < dist[E]=∞，松弛成功，更新 dist[E]=12', en: 'Relax edge C->E: 2+10=12 < ∞, relax succeeded, update dist[E]=12' }, action: { type: 'compare', targets: [2, 4], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 11 }, teachingState: distState({ '0': 0, '1': 3, '2': 2, '3': 10, '4': 12 }) },
    { stepId: 12, codeLine: 5, description: { zh: '取出距离最小节点 B (dist=3)，虽然后处理但已是确定最短', en: 'Pick B (dist=3), now settled with shortest distance confirmed' }, action: { type: 'mark', targets: [1], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 12 }, teachingState: distState({ '0': 0, '1': 3, '2': 2, '3': 10, '4': 12 }) },
    { stepId: 13, codeLine: 8, description: { zh: '松弛边 B→D：dist[B]+5=8 < dist[D]=10，松弛成功！通过 B 到 D 更短，更新 dist[D]=8', en: 'Relax edge B->D: 3+5=8 < 10, relax succeeded! Shorter via B, update dist[D]=8' }, action: { type: 'compare', targets: [1, 3], color: 'warning' }, stats: { comparisons: 6, swaps: 0, accesses: 13 }, teachingState: relaxState({ '0': 0, '1': 3, '2': 2, '3': 8, '4': 12 }, { '1': '2', '2': '0', '3': '1' }, '1', '3', 'success') },
    { stepId: 14, codeLine: 5, description: { zh: '取出 D (dist=8)，标记已确定', en: 'Pop D (dist=8), mark settled' }, action: { type: 'mark', targets: [3], color: 'success' }, stats: { comparisons: 6, swaps: 0, accesses: 14 }, teachingState: distState({ '0': 0, '1': 3, '2': 2, '3': 8, '4': 12 }) },
    { stepId: 15, codeLine: 8, description: { zh: '松弛边 D→E：dist[D]+2=10 < dist[E]=12，松弛成功！通过 D 到 E 更短，更新 dist[E]=10', en: 'Relax edge D->E: 8+2=10 < 12, relax succeeded! Shorter via D, update dist[E]=10' }, action: { type: 'compare', targets: [3, 4], color: 'warning' }, stats: { comparisons: 7, swaps: 0, accesses: 15 }, teachingState: relaxState({ '0': 0, '1': 3, '2': 2, '3': 8, '4': 10 }, { '1': '2', '2': '0', '3': '1', '4': '3' }, '3', '4', 'success') },
    { stepId: 16, codeLine: 5, description: { zh: '取出 E (dist=10)，标记已确定。所有节点均已确定！', en: 'Pop E (dist=10). All nodes settled. Done!' }, action: { type: 'mark', targets: [4], color: 'success' }, stats: { comparisons: 7, swaps: 0, accesses: 16 }, teachingState: distState({ '0': 0, '1': 3, '2': 2, '3': 8, '4': 10 }) },
    { stepId: 17, codeLine: 12, description: { zh: '最短路径: A→C→B→D→E，总距离=10。前驱链回溯：E←D←B←C←A', en: 'Shortest path: A→C→B→D→E, total distance=10. Backtrace: E←D←B←C←A' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4], color: 'success' }, stats: { comparisons: 7, swaps: 0, accesses: 16 }, teachingState: distState({ '0': 0, '1': 3, '2': 2, '3': 8, '4': 10 }) },
  ],
}

export default dijkstraPreset
