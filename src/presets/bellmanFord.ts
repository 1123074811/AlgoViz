import type { AnimationScript, ActionColor } from '@/types/animation'

export function generateBellmanFord(input: any): AnimationScript {
  // 1. Parse or default the custom graph data
  let nodes = [
    { id: '0', label: 'S' },
    { id: '1', label: 'A' },
    { id: '2', label: 'B' },
    { id: '3', label: 'C' },
    { id: '4', label: 'D' }
  ]
  let edges = [
    { source: '0', target: '1', weight: 5 },
    { source: '0', target: '2', weight: 4 },
    { source: '1', target: '3', weight: 3 },
    { source: '2', target: '1', weight: -2 },
    { source: '2', target: '3', weight: 7 },
    { source: '3', target: '4', weight: 2 },
    { source: '1', target: '4', weight: 6 }
  ]

  if (input && typeof input === 'object') {
    if (Array.isArray(input.nodes) && input.nodes.length > 0) {
      nodes = input.nodes.map((n: any, idx: number) => ({
        id: String(n.id !== undefined ? n.id : idx),
        label: String(n.label !== undefined ? n.label : (n.id !== undefined ? n.id : idx))
      }))
    }
    if (Array.isArray(input.edges)) {
      edges = input.edges.map((e: any) => ({
        source: String(e.source),
        target: String(e.target),
        weight: Number(e.weight !== undefined ? e.weight : 1)
      }))
    }
  }

  const steps: AnimationScript['steps'] = []
  let sid = 1

  // Bellman-Ford Algorithm Execution
  const n = nodes.length
  const startId = nodes[0].id
  
  // Initialize distances
  const dist: Record<string, number | string> = {}
  nodes.forEach(v => {
    dist[v.id] = '∞'
  })
  dist[startId] = 0

  function getDistsCopy() {
    return { ...dist }
  }

  // Helper to compile a step
  function addBfStep(
    ln: number,
    zh: string,
    en: string,
    type: string,
    targets: string[],
    color: ActionColor,
    rnd: number,
    comps: number,
    accs: number,
    events: any[] = []
  ) {
    steps.push({
      stepId: sid++,
      codeLine: ln,
      description: { zh, en },
      action: { type: type as any, targets: targets.map(Number).filter(v => !isNaN(v)), color },
      stats: { comparisons: comps, swaps: 0, accesses: accs },
      teachingState: {
        graph: {
          distances: getDistsCopy()
        },
        variables: { Round: rnd, 'Relaxed Edges': `${comps}/${edges.length}` }
      },
      events
    })
  }

  // Step 1: Init Step
  addBfStep(
    2,
    `初始化 dist[${nodes[0].label}]=0，其余=∞。Bellman-Ford 对所有边进行 V-1 轮松弛`,
    `Init dist[${nodes[0].label}]=0, others=∞. Bellman-Ford relaxes all edges V-1 times`,
    'highlight',
    [startId],
    'primary',
    0,
    0,
    1,
    [{ type: 'graph.create', nodes, edges, directed: true }]
  )

  let comparisons = 0
  let accesses = 1

  // Run V-1 rounds
  for (let rnd = 1; rnd < n; rnd++) {
    let updatedThisRound = false

    for (let eIdx = 0; eIdx < edges.length; eIdx++) {
      const edge = edges[eIdx]
      const u = edge.source
      const v = edge.target
      const w = edge.weight

      const uLabel = nodes.find(n => n.id === u)?.label ?? u
      const vLabel = nodes.find(n => n.id === v)?.label ?? v

      const distU = dist[u]
      const distV = dist[v]

      comparisons++
      accesses += 2

      const events = [
        { type: 'graph.visit_edge', source: u, target: v },
        { type: 'graph.relax_edge', source: u, target: v, success: false }
      ]

      if (distU !== '∞') {
        const valU = distU as number
        const valV = distV === '∞' ? Infinity : (distV as number)

        if (valU + w < valV) {
          dist[v] = valU + w
          updatedThisRound = true
          events[1].success = true

          addBfStep(
            14,
            `第 ${rnd} 轮：松弛 ${uLabel}→${vLabel}：${valU}+(${w})=${valU + w} < ${distV === '∞' ? '∞' : distV}，更新 dist[${vLabel}]=${valU + w}`,
            `Round ${rnd}: Relax ${uLabel}→${vLabel}: ${valU}+(${w})=${valU + w} < ${distV === '∞' ? '∞' : distV}, update dist[${vLabel}]=${valU + w}`,
            'compare',
            [u, v],
            'success',
            rnd,
            comparisons,
            accesses,
            events
          )
          continue
        }
      }

      // No update
      addBfStep(
        14,
        `第 ${rnd} 轮：松弛 ${uLabel}→${vLabel}：dist[${uLabel}]+weight = ${distU === '∞' ? '∞' : `${distU}+(${w})`} 无法改善 dist[${vLabel}]=${distV}`,
        `Round ${rnd}: Relax ${uLabel}→${vLabel}: dist[${uLabel}]+weight = ${distU === '∞' ? '∞' : `${distU}+(${w})`} cannot improve dist[${vLabel}]=${distV}`,
        'compare',
        [u, v],
        'warning',
        rnd,
        comparisons,
        accesses,
        events
      )
    }

    if (!updatedThisRound) {
      // Early convergence
      addBfStep(
        17,
        `第 ${rnd} 轮未发生任何松弛更新，算法提前收敛！`,
        `No updates occurred in round ${rnd}, algorithm converged early!`,
        'mark',
        nodes.map(n => n.id),
        'success',
        rnd,
        comparisons,
        accesses
      )
      break
    }
  }

  // Done Step
  addBfStep(
    19,
    `完成！最短路径计算完毕。Bellman-Ford 比 Dijkstra 慢，但支持负权边`,
    `Completed! Shortest paths calculated. Bellman-Ford is slower but supports negative weights`,
    'mark',
    [],
    'success',
    n - 1,
    comparisons,
    accesses
  )

  return {
    algorithm: 'bellman_ford',
    complexity: {
      time: { best: 'O(VE)', average: 'O(VE)', worst: 'O(VE)' },
      space: 'O(V)'
    },
    presentation: { engine: 'scene', module: 'graph' },
    initialState: { type: 'graph', data: [], nodes, edges },
    steps
  }
}

const bellmanFordPreset = generateBellmanFord(null)
export default bellmanFordPreset
