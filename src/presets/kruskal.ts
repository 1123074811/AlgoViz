import type { AnimationScript, ActionColor } from '@/types/animation'
import type { GraphInput } from './bfsGraph'

export function generateKruskal(input: GraphInput): AnimationScript {
  const { nodes, edges: rawEdges } = input
  const n = nodes.length
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id
  const getIdx = (id: string) => nodes.findIndex(n => n.id === id)

  const edges = rawEdges.map(e => ({ source: e.source, target: e.target, weight: e.weight ?? 1 }))
  edges.sort((a, b) => a.weight - b.weight)

  // Union-Find
  const parent = new Map<string, string>()
  for (const nd of nodes) parent.set(nd.id, nd.id)

  function find(x: string): string {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
    return parent.get(x)!
  }
  function union(a: string, b: string) { parent.set(find(a), find(b)) }
  function componentLabel(id: string) {
    const root = find(id)
    const members = nodes.filter(nd => find(nd.id) === root).map(nd => getLabel(nd.id))
    return `{${members.join(',')}}`
  }

  const steps: AnimationScript['steps'] = []
  let sid = 1
  const mstEdges: Array<{ source: string; target: string; weight: number }> = []

  const initialComponents = nodes.map(nd => componentLabel(nd.id))

  // Step 1: Init
  steps.push({
    stepId: sid++, codeLine: 2,
    description: {
      zh: `Kruskal：按权重排序边，初始每个节点自成一个连通分量。已排序：${edges.map(e => `${getLabel(e.source)}-${getLabel(e.target)}(${e.weight})`).join(', ')}`,
      en: `Kruskal: sort edges by weight, each node is its own component`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'graph.create', nodes, edges: edges.map(e => ({ source: e.source, target: e.target, weight: e.weight })), directed: false }],
    stats: { comparisons: 0, swaps: 0, accesses: n + edges.length },
    teachingState: { graph: { sets: { components: initialComponents } } },
  })

  for (const edge of edges) {
    const { source, target, weight } = edge
    if (find(source) !== find(target)) {
      union(source, target)
      mstEdges.push(edge)

      const comps = [...new Set(nodes.map(nd => componentLabel(nd.id)))]
      steps.push({
        stepId: sid++, codeLine: 6,
        description: {
          zh: `选择边 ${getLabel(source)}-${getLabel(target)}(${weight})：不同分量，不形成环，加入 MST`,
          en: `Add edge ${getLabel(source)}-${getLabel(target)}(${weight}): different components, add to MST`,
        },
        action: { type: 'compare', targets: [getIdx(source), getIdx(target)], color: 'success' },
        events: [
          { type: 'graph.visit_edge', source, target },
          { type: 'graph.visit_node', nodeId: source },
          { type: 'graph.visit_node', nodeId: target },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: mstEdges.length },
        teachingState: {
          graph: {
            sets: { components: comps },
            edgeStates: [{ source, target, role: 'relaxed' as const, color: 'success' as ActionColor }],
          },
        },
      })

      if (mstEdges.length === n - 1) break
    } else {
      steps.push({
        stepId: sid++, codeLine: 6,
        description: {
          zh: `跳过边 ${getLabel(source)}-${getLabel(target)}(${weight})：两端在同一分量，会形成环`,
          en: `Skip ${getLabel(source)}-${getLabel(target)}(${weight}): same component, would create cycle`,
        },
        action: { type: 'compare', targets: [getIdx(source), getIdx(target)], color: 'muted' },
        events: [{ type: 'graph.visit_edge', source, target }],
        stats: { comparisons: sid, swaps: 0, accesses: mstEdges.length },
        teachingState: { graph: { sets: { components: [...new Set(nodes.map(nd => componentLabel(nd.id)))] } } },
      })
    }
  }

  const totalWeight = mstEdges.reduce((s, e) => s + e.weight, 0)
  steps.push({
    stepId: sid++, codeLine: 12,
    description: {
      zh: `Kruskal 完成！MST 总权重 = ${totalWeight}，${mstEdges.length} 条边`,
      en: `Kruskal done! MST total weight = ${totalWeight}, ${mstEdges.length} edges`,
    },
    action: { type: 'mark', targets: nodes.map((_, i) => i), color: 'success' },
    events: mstEdges.map(e => ({ type: 'graph.visit_edge' as const, source: e.source, target: e.target })),
    stats: { comparisons: sid, swaps: 0, accesses: mstEdges.length },
    teachingState: {
      graph: {
        sets: { components: [nodes.map(nd => getLabel(nd.id)).join(',')] },
        edgeStates: mstEdges.map(e => ({ source: e.source, target: e.target, role: 'relaxed' as const, color: 'success' as ActionColor })),
      },
    },
  })

  return {
    algorithm: 'kruskal',
    complexity: { time: { best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph' },
    initialState: { type: 'graph', data: [], nodes, edges: edges.map(e => ({ source: e.source, target: e.target, weight: e.weight })) },
    steps,
  }
}

const kruskalPreset = generateKruskal({
  nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }],
  edges: [{ source: '0', target: '1', weight: 2 }, { source: '0', target: '3', weight: 6 }, { source: '1', target: '2', weight: 3 }, { source: '1', target: '3', weight: 8 }, { source: '1', target: '4', weight: 5 }, { source: '2', target: '4', weight: 7 }, { source: '3', target: '4', weight: 9 }],
})

export default kruskalPreset
