import type { AnimationScript } from '@/types/animation'

export function generateACM(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: 'ACM 常用算法模板', en: 'ACM Common Algorithm Templates' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 2, description: { zh: '快速幂: pow(2,10) = 1024 (O(log n))', en: 'Fast power: pow(2,10) = 1024 (O(log n))' }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: '素数筛 (埃氏筛): 2,3,5,7,11,13,17,19,23,29...', en: 'Sieve of Eratosthenes: 2,3,5,7,11,13,17,19,23,29...' }, action: { type: 'mark', targets: [1, 2, 3, 5, 7, 11], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 30 } })

  steps.push({ stepId: sid++, codeLine: 4, description: { zh: '二分答案: 在单调函数上查找满足条件的最值', en: 'Binary search on answer: find optimal value on monotonic function' }, action: { type: 'compare', targets: [15], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } })

  steps.push({ stepId: sid++, codeLine: 5, description: { zh: '离散化 + 前缀和 + 差分 等常用技巧', en: 'Discretization + prefix sum + difference array' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  const nums = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
  return { algorithm: 'acm_templates', complexity: { time: { best: '—', average: '—', worst: '—' }, space: '—' }, initialState: { type: 'array', data: nums }, steps: steps as AnimationScript['steps'] }
}
