import type { AnimationScript } from '@/types/animation'
import { AnimationBuilder } from '@/sandbox/builder'

/**
 * 固定演示图：0→1→2→0 构成一个强连通分量 {0,1,2}；2→3，结点 3 单独成一组。
 * 用 Tarjan 算法逐步展示 disc/low 标注、DFS 栈与最终 SCC 分组着色。
 */
export function generateTarjanScc(): AnimationScript {
  const nodes = ['0', '1', '2', '3']
  const adj: Record<string, string[]> = { '0': ['1'], '1': ['2'], '2': ['0', '3'], '3': [] }

  const b = new AnimationBuilder('tarjan_scc', 'graph')
  b.desc('构建有向图').graphCreate(
    nodes.map(id => ({ id, label: id })),
    nodes.flatMap(u => adj[u].map(v => ({ source: u, target: v }))),
    true,
  )

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
    b.desc(`访问 ${u}，disc=low=${idx}，入栈`).visitNode(u)
    b.ganUpdate({ discLow: { [u]: [disc[u], low[u]] }, stack: [...stack] })

    for (const v of adj[u]) {
      if (disc[v] === undefined) {
        dfs(v)
        low[u] = Math.min(low[u], low[v])
      } else if (onStack.has(v)) {
        low[u] = Math.min(low[u], disc[v])
      }
      b.desc(`回溯/更新 ${u}.low=${low[u]}`).ganUpdate({ discLow: { [u]: [disc[u], low[u]] } })
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
      b.desc(`发现 SCC #${compId}: {${members.join(', ')}}`).ganUpdate({ stack: [...stack], components: { ...comp } })
      compId++
    }
  }

  for (const n of nodes) if (disc[n] === undefined) dfs(n)

  b.desc(`完成，共 ${compId} 个强连通分量`).ganUpdate({ components: { ...comp } })

  const script = b.build()
  script.complexity = { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' }
  // graph_analysis 只是叠加在图结点上的标注层，不是独立结构，无需 composite 区域布局。
  script.presentation = { engine: 'scene', module: 'graph' }
  return script
}
