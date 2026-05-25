import type { AnimationScript } from '@/types/animation'

export function generateArray(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const arr = [1, 2, 3, 4, 5]

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '数组 — 连续内存，O(1) 随机访问', en: 'Array — contiguous memory, O(1) random access' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 1, description: { zh: `arr = [${arr.join(', ')}]`, en: `arr = [${arr.join(', ')}]` }, action: { type: 'highlight', targets: [0, 1, 2, 3, 4], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 5 } })

  steps.push({ stepId: sid++, codeLine: 2, description: { zh: `arr[2] = ${arr[2]} (O(1) 随机访问)`, en: `arr[2] = ${arr[2]} (O(1) random access)` }, action: { type: 'compare', targets: [2], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  arr.push(6)
  steps.push({ stepId: sid++, codeLine: 3, description: { zh: `append(6) → [${arr.join(', ')}]`, en: `append(6) → [${arr.join(', ')}]` }, action: { type: 'insert', targets: [5], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  arr.splice(1, 1)
  steps.push({ stepId: sid++, codeLine: 4, description: { zh: `remove(1) → [${arr.join(', ')}] (O(n) 需要移动元素)`, en: `remove(1) → [${arr.join(', ')}] (O(n) shift needed)` }, action: { type: 'delete', targets: [1], color: 'danger' }, stats: { comparisons: 0, swaps: 0, accesses: arr.length } })

  steps.push({ stepId: sid++, codeLine: 5, description: { zh: '数组操作完成', en: 'Array operations done' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: arr.length } })

  return { algorithm: 'array', complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' }, initialState: { type: 'array', data: arr }, steps: steps as AnimationScript['steps'] }
}
