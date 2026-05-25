import type { AnimationScript } from '@/types/animation'

export function generateSegmentTree(arr: number[]): AnimationScript {
  const data = [...arr]
  const n = data.length
  const tree = new Array(4 * n).fill(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `数组 [${data.join(', ')}]，构建线段树`, en: `Array [${data.join(', ')}], build segment tree` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  function build(node: number, start: number, end: number) {
    if (start === end) {
      tree[node] = data[start]
      steps.push({
        stepId: sid++, codeLine: 4,
        description: { zh: `叶节点 tree[${node}] = arr[${start}] = ${data[start]}`, en: `Leaf tree[${node}] = arr[${start}] = ${data[start]}` },
        action: { type: 'highlight', targets: [start], color: 'primary' },
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      return
    }
    const mid = Math.floor((start + end) / 2)
    build(2 * node + 1, start, mid)
    build(2 * node + 2, mid + 1, end)
    tree[node] = tree[2 * node + 1] + tree[2 * node + 2]
    steps.push({
      stepId: sid++, codeLine: 7,
      description: { zh: `tree[${node}] = tree[${2*node+1}] + tree[${2*node+2}] = ${tree[2*node+1]} + ${tree[2*node+2]} = ${tree[node]} (区间[${start},${end}])`, en: `tree[${node}] = ${tree[node]} (range [${start},${end}])` },
      action: { type: 'compare', targets: [start, end], color: 'success' },
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
  }

  build(0, 0, n - 1)

  // Query example: sum of range [1, 3]
  steps.push({
    stepId: sid++, codeLine: 11,
    description: { zh: `查询区间和 sum[1..3]：从根节点递归`, en: `Query range sum[1..3]: recurse from root` },
    action: { type: 'highlight', targets: [1, 2, 3], color: 'warning' },
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  const sum = data.slice(1, 4).reduce((a, b) => a + b, 0)
  steps.push({
    stepId: sid++, codeLine: 15,
    description: { zh: `sum[1..3] = ${data[1]}+${data[2]}+${data[3]} = ${sum} (O(log n))`, en: `sum[1..3] = ${sum} (O(log n))` },
    action: { type: 'mark', targets: [1, 2, 3], color: 'success' },
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'segment_tree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    initialState: { type: 'array', data },
    steps: steps as AnimationScript['steps'],
  }
}
