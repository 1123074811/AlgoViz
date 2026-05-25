import type { AnimationScript, ActionColor } from '@/types/animation'

function tStep(id: number, ln: number, zh: string, en: string,
  type: string, targets: number[], color: ActionColor,
  comps: number, accs: number, indegrees: Record<string, number>, q: string[], out: string[],
): AnimationScript['steps'][0] {
  return {
    stepId: id, codeLine: ln, description: { zh, en },
    action: { type: type as AnimationScript['steps'][0]['action']['type'], targets, color },
    stats: { comparisons: comps, swaps: 0, accesses: accs },
    teachingState: { graph: { queue: q, output: out, distances: indegrees } },
  }
}

const topologicalSortPreset: AnimationScript = {
  algorithm: 'topological_sort',
  complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
  initialState: {
    type: 'graph', data: [],
    nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
    edges: [{ source: '0', target: '1' }, { source: '0', target: '2' }, { source: '1', target: '3' }, { source: '2', target: '3' }, { source: '3', target: '4' }],
  },
  steps: [
    tStep(1, 2, '初始化入度表: A=0, B=1, C=1, D=2, E=1。拓扑排序只适用于有向无环图(DAG)', 'Init indegree: A=0, B=1, C=1, D=2, E=1. Topological sort only works on DAGs', 'highlight', [], 'primary', 0, 5, { '0':0,'1':1,'2':1,'3':2,'4':1 }, [], []),
    tStep(2, 5, '将入度为 0 的节点（A）加入队列。入度为 0 表示没有入边依赖，可以首先处理', 'Enqueue nodes with indegree 0: A. Zero indegree means no incoming dependencies', 'highlight', [0], 'warning', 0, 6, { '0':0,'1':1,'2':1,'3':2,'4':1 }, ['0'], []),
    tStep(3, 7, 'A 出队加入拓扑序。删除边 A→B：B 入度 1→0，B 入队。A→C：C 入度 1→0，C 入队', 'Dequeue A, add to order. Remove A→B: B indegree 1->0, B enqueued. A->C: C 1->0, C enqueued', 'compare', [0,1], 'warning', 1, 7, { '0':0,'1':0,'2':0,'3':2,'4':1 }, ['1','2'], ['0']),
    tStep(4, 8, '拓扑序: [A]。标记 A 为已处理', 'Order: [A]. Mark A processed', 'mark', [0], 'success', 1, 8, { '0':0,'1':0,'2':0,'3':2,'4':1 }, ['1','2'], ['0']),
    tStep(5, 7, 'B 出队加入拓扑序。删除边 B→D：D 入度 2→1，D 尚未为 0，不入队', 'Dequeue B, add to order. Remove B→D: D indegree 2→1, not 0 yet', 'compare', [1,3], 'warning', 2, 9, { '0':0,'1':0,'2':0,'3':1,'4':1 }, ['2'], ['0','1']),
    tStep(6, 8, '拓扑序: [A,B]', 'Order: [A,B]', 'mark', [1], 'success', 2, 10, { '0':0,'1':0,'2':0,'3':1,'4':1 }, ['2'], ['0','1']),
    tStep(7, 7, 'C 出队加入拓扑序。删除边 C→D：D 入度 1→0，D 入队', 'Dequeue C. Remove C→D: D indegree 1->0, D enqueued', 'compare', [2,3], 'warning', 3, 11, { '0':0,'1':0,'2':0,'3':0,'4':1 }, ['3'], ['0','1','2']),
    tStep(8, 8, '拓扑序: [A,B,C]', 'Order: [A,B,C]', 'mark', [2], 'success', 3, 12, { '0':0,'1':0,'2':0,'3':0,'4':1 }, ['3'], ['0','1','2']),
    tStep(9, 7, 'D 出队。删除边 D→E：E 入度 1→0，E 入队', 'Dequeue D. Remove D→E: E indegree 1->0, E enqueued', 'compare', [3,4], 'warning', 4, 13, { '0':0,'1':0,'2':0,'3':0,'4':0 }, ['4'], ['0','1','2','3']),
    tStep(10, 8, '拓扑序: [A,B,C,D]', 'Order: [A,B,C,D]', 'mark', [3], 'success', 4, 14, { '0':0,'1':0,'2':0,'3':0,'4':0 }, ['4'], ['0','1','2','3']),
    tStep(11, 7, 'E 出队加入拓扑序。E 无出边。队列空，完成！', 'Dequeue E, add to order. No outgoing edges from E. Queue empty, done!', 'mark', [4], 'success', 5, 15, { '0':0,'1':0,'2':0,'3':0,'4':0 }, [], ['0','1','2','3','4']),
    tStep(12, 9, '拓扑排序结果：A→B→C→D→E。所有边方向从左到右（如果输出节点数<V，则图有环）', 'Result: A->B->C->D->E. All edges go forward. If output count < V, graph has cycle', 'mark', [0,1,2,3,4], 'success', 5, 15, { '0':0,'1':0,'2':0,'3':0,'4':0 }, [], ['0','1','2','3','4']),
  ],
}

export default topologicalSortPreset
