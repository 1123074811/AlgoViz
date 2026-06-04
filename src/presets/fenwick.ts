import type { AnimationScript, AnimationStep } from '@/types/animation'

export function generateFenwick(arr: number[]): AnimationScript {
  const data = [...arr]
  const n = data.length
  const tree = new Array(n + 1).fill(0)
  const initialTree = [...tree]
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `数组 [${data.join(', ')}]，构建树状数组 (Fenwick Tree / BIT)`, en: `Array [${data.join(', ')}], build Fenwick Tree` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: initialTree.slice(1) }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Build
  for (let i = 0; i < n; i++) {
    let idx = i + 1
    while (idx <= n) {
      tree[idx] += data[i]
      steps.push({
        stepId: sid++, codeLine: 4,
        description: { zh: `update(${i}, ${data[i]}): tree[${idx}] += ${data[i]} → ${tree[idx]}`, en: `update(${i}, ${data[i]}): tree[${idx}] += ${data[i]} → ${tree[idx]}` },
        action: { type: 'highlight', targets: [idx - 1], color: 'warning' },
        events: [{ type: 'array.compare', indices: [idx - 1, i] }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      idx += idx & -idx
    }
  }

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: `树状数组构建完成: [${tree.slice(1).join(', ')}]`, en: `Fenwick tree built: [${tree.slice(1).join(', ')}]` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: Array.from({ length: n }, (_, k) => k) }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  // Query example
  let sum = 0
  let idx = 4 // query prefix sum up to index 3
  steps.push({
    stepId: sid++, codeLine: 9,
    description: { zh: `查询前缀和 prefix(4)`, en: `Query prefix sum(4)` },
    action: { type: 'highlight', targets: [3], color: 'primary' },
    events: [{ type: 'array.mark_sorted', indices: [3] }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })
  while (idx > 0) {
    sum += tree[idx]
    steps.push({
      stepId: sid++, codeLine: 11,
      description: { zh: `tree[${idx}]=${tree[idx]}, sum=${sum}, idx -= lowbit → ${idx - (idx & -idx)}`, en: `tree[${idx}]=${tree[idx]}, sum=${sum}` },
      action: { type: 'compare', targets: [idx - 1], color: 'warning' },
      events: [{ type: 'array.mark_sorted', indices: [idx - 1] }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
    idx -= idx & -idx
  }

  steps.push({
    stepId: sid++, codeLine: 13,
    description: { zh: `前缀和 = ${sum}`, en: `Prefix sum = ${sum}` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: [] }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'fenwick_tree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array', variant: 'fenwick' },
    initialState: { type: 'array', data: initialTree.slice(1) },
    steps: steps as AnimationScript['steps'],
  }
}
