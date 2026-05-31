import type { AnimationScript } from '@/types/animation'

export function generateUnionFind(edges?: number[][]): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  const unions = edges && edges.length > 0 ? edges : [[0, 1], [1, 2], [3, 4], [4, 5], [2, 4]]
  // Find max node ID to determine n
  let n = 6
  for (const [a, b] of unions) { n = Math.max(n, a + 1, b + 1) }

  const parent = Array.from({ length: n }, (_, i) => i)
  const initialParent = [...parent]

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `并查集初始化: parent=[${parent.join(', ')}] (每个元素指向自己)`, en: `Union-Find init: parent=[${parent.join(', ')}]` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'tree.create', variant: 'binary', rootId: '0', nodes: Array.from({ length: n }, (_, i) => ({ id: String(i), value: String(i) })), edges: [] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  function find(x: number): number {
    if (parent[x] !== x) {
      steps.push({
        stepId: sid++, codeLine: 3,
        description: { zh: `find(${x}): parent[${x}]=${parent[x]} ≠ ${x}，路径压缩`, en: `find(${x}): path compression` },
        action: { type: 'highlight', targets: [x], color: 'warning' },
        events: [{ type: 'tree.visit', nodeId: String(x) }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      parent[x] = find(parent[x])
    }
    return parent[x]
  }

  function union(x: number, y: number) {
    const px = find(x), py = find(y)
    if (px !== py) {
      steps.push({
        stepId: sid++, codeLine: 8,
        description: { zh: `union(${x}, ${y}): find(${x})=${px}, find(${y})=${py} → 合并`, en: `union(${x}, ${y}): ${px} ≠ ${py} → merge` },
        action: { type: 'compare', targets: [x, y], color: 'warning' },
        events: [{ type: 'tree.visit', nodeId: String(px) }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      parent[px] = py
    }
    steps.push({
      stepId: sid++, codeLine: 9,
      description: { zh: `parent=[${parent.join(', ')}]`, en: `parent=[${parent.join(', ')}]` },
      action: { type: 'mark', targets: [py], color: 'success' },
      events: [{ type: 'tree.visit', nodeId: String(py) }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
  }

  for (const [a, b] of unions) {
    union(a, b)
  }

  steps.push({
    stepId: sid++, codeLine: 12,
    description: { zh: `所有元素已连通。parent=[${parent.join(', ')}]`, en: `All connected. parent=[${parent.join(', ')}]` },
    action: { type: 'mark', targets: Array.from({ length: n }, (_, i) => i), color: 'success' },
    events: [{ type: 'tree.visit', nodeId: '0' }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'union_find',
    complexity: { time: { best: 'O(α(n))', average: 'O(α(n))', worst: 'O(α(n))' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree' },
    initialState: { type: 'array', data: initialParent },
    steps: steps as AnimationScript['steps'],
  }
}
