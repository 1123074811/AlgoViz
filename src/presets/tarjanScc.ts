import type { AnimationScript } from '@/types/animation'
import type { GraphInput } from './bfsGraph'

/**
 * Tarjan 强连通分量。遵循图算法惯例（与 BFS 一致）：
 * - 接收 GraphInput（由 parseGraphInput 解析用户输入），有向邻接，输入改变则动画改变。
 * - 每步带 teachingState.stack → 复用基础 ContainerView 栈渲染（不再自建栈样式）。
 * - presentation.layout='composite' + teachingState 触发 relayout('graph') → 2D 图布局（不再退化成直线）。
 * - graph_analysis.update 仅叠加 disc/low 标注与 SCC 分组环（由 GraphAnalysisView 渲染）。
 */
const FALLBACK: GraphInput = {
  nodes: ['0', '1', '2', '3', '4'].map((id) => ({ id, label: id })),
  edges: [
    { source: '0', target: '1' }, { source: '1', target: '2' }, { source: '2', target: '0' }, // SCC {0,1,2}
    { source: '2', target: '3' }, { source: '3', target: '4' }, { source: '4', target: '3' }, // SCC {3,4}
  ],
}

export function generateTarjanScc(input?: GraphInput): AnimationScript {
  const graph = input && input.nodes.length > 0 && input.edges.length > 0 ? input : FALLBACK
  const nodes = graph.nodes
  const label = (id: string) => nodes.find((n) => n.id === id)?.label ?? id
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of graph.edges) adj.get(e.source)?.push(e.target) // 有向

  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (
    zh: string,
    en: string,
    events: AnimationScript['steps'][number]['events'],
    stack: string[],
  ) => {
    steps.push({
      stepId: sid++, codeLine: 0,
      description: { zh, en },
      action: { type: 'highlight', targets: [], color: 'primary' },
      events,
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
      teachingState: { stack: stack.map((s) => label(s)) },
    })
  }

  push('构建有向图，准备 Tarjan 深度优先遍历', 'Build directed graph for Tarjan DFS',
    [{ type: 'graph.create', nodes, edges: graph.edges, directed: true }], [])

  let idx = 0
  const disc: Record<string, number> = {}
  const low: Record<string, number> = {}
  const onStack = new Set<string>()
  const stack: string[] = []
  const comp: Record<string, number> = {}
  let compId = 0

  const dfs = (u: string) => {
    idx++
    disc[u] = idx
    low[u] = idx
    stack.push(u)
    onStack.add(u)
    push(`访问 ${label(u)}：disc=low=${idx}，入栈`, `visit ${label(u)}: disc=low=${idx}, push`, [
      { type: 'graph.visit_node', nodeId: u },
      { type: 'graph_analysis.update', discLow: { [u]: [disc[u], low[u]] } },
    ], stack)

    for (const v of adj.get(u) ?? []) {
      if (disc[v] === undefined) {
        push(`边 ${label(u)}→${label(v)}：${label(v)} 未访问，递归`, `edge ${label(u)}→${label(v)}: recurse`, [
          { type: 'graph.visit_edge', source: u, target: v },
        ], stack)
        dfs(v)
        low[u] = Math.min(low[u], low[v])
        push(`回溯到 ${label(u)}：low=min(low[${label(u)}],low[${label(v)}])=${low[u]}`, `back to ${label(u)}: low=${low[u]}`, [
          { type: 'graph_analysis.update', discLow: { [u]: [disc[u], low[u]] } },
        ], stack)
      } else if (onStack.has(v)) {
        low[u] = Math.min(low[u], disc[v])
        push(`边 ${label(u)}→${label(v)}：${label(v)} 在栈中，low=min(low,${disc[v]})=${low[u]}`, `edge to on-stack ${label(v)}: low=${low[u]}`, [
          { type: 'graph.visit_edge', source: u, target: v },
          { type: 'graph_analysis.update', discLow: { [u]: [disc[u], low[u]] } },
        ], stack)
      }
    }

    if (low[u] === disc[u]) {
      const members: string[] = []
      let w = ''
      do {
        w = stack.pop() as string
        onStack.delete(w)
        comp[w] = compId
        members.push(w)
      } while (w !== u)
      push(`low[${label(u)}]==disc[${label(u)}]：弹出强连通分量 #${compId} {${members.map(label).join(', ')}}`,
        `SCC #${compId}: {${members.map(label).join(', ')}}`, [
          { type: 'graph_analysis.update', stack: stack.map(label), components: { ...comp } },
        ], stack)
      compId++
    }
  }

  for (const n of nodes) if (disc[n.id] === undefined) dfs(n.id)

  push(`完成，共 ${compId} 个强连通分量`, `Done: ${compId} SCC(s)`, [
    { type: 'graph_analysis.update', components: { ...comp } },
  ], [])

  return {
    algorithm: 'tarjan_scc',
    complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph', variant: 'vertex', layout: 'composite' },
    initialState: { type: 'graph', data: [], nodes, edges: graph.edges },
    steps,
  }
}
