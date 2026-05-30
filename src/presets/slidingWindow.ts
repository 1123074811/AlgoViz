import type { AnimationScript, AnimationStep } from '@/types/animation'

export function generateSlidingWindow(arr: number[], k?: number): AnimationScript {
  const K = k ?? 3
  const steps: AnimationStep[] = []
  let sid = 1, comps = 0

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `数组 [${arr.join(', ')}]，窗口大小 k=${K}`, en: `Array [${arr.join(', ')}], window k=${K}` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: [...arr] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  if (arr.length < K) {
    steps.push({
      stepId: sid++, codeLine: 1,
      description: { zh: '数组长度小于 k，无法形成窗口', en: 'Array too short for window' },
      action: { type: 'mark', targets: [], color: 'danger' },
      events: [{ type: 'array.mark_sorted', indices: [] }],
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    })
    return { algorithm: 'sliding_window', complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' }, presentation: { engine: 'scene', module: 'array', variant: 'sliding_window' }, initialState: { type: 'array', data: [...arr] }, steps }
  }

  let windowSum = 0
  for (let i = 0; i < K; i++) windowSum += arr[i]

  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `初始窗口 [0..${K - 1}]: [${arr.slice(0, K).join(', ')}]，sum=${windowSum}`, en: `Init window [0..${K - 1}]: [${arr.slice(0, K).join(', ')}], sum=${windowSum}` },
    action: { type: 'highlight', targets: Array.from({ length: K }, (_, i) => i), color: 'warning' },
    events: [{ type: 'array.mark_sorted', indices: Array.from({ length: K }, (_, i) => i) }],
    stats: { comparisons: 0, swaps: 0, accesses: K },
  })

  let maxSum = windowSum

  for (let i = K; i < arr.length; i++) {
    const leaving = arr[i - K], entering = arr[i]
    const oldSum = windowSum
    windowSum = windowSum - leaving + entering

    steps.push({
      stepId: sid++, codeLine: 4,
      description: { zh: `窗口滑动：移除 arr[${i - K}]=${leaving}，加入 arr[${i}]=${entering}，sum=${oldSum}-${leaving}+${entering}=${windowSum}`, en: `Slide: remove arr[${i - K}]=${leaving}, add arr[${i}]=${entering}, sum=${windowSum}` },
      action: { type: 'compare', targets: [i - K, i], color: 'warning' },
      events: [{ type: 'array.compare', indices: [i - K, i] }],
      stats: { comparisons: ++comps, swaps: 0, accesses: comps + K },
    })

    const windowIndices = Array.from({ length: K }, (_, j) => i - K + 1 + j)
    const isNewMax = windowSum > maxSum
    if (isNewMax) maxSum = windowSum

    steps.push({
      stepId: sid++, codeLine: 5,
      description: { zh: `当前窗口 [${windowIndices.map(j => arr[j]).join(', ')}]，sum=${windowSum}${isNewMax ? ' (新最大值!)' : ''}，max=${maxSum}`, en: `Window [${windowIndices.map(j => arr[j]).join(', ')}], sum=${windowSum}${isNewMax ? ' (new max!)' : ''}, max=${maxSum}` },
      action: { type: 'highlight', targets: windowIndices, color: isNewMax ? 'success' : 'primary' },
      events: [{ type: 'array.mark_sorted', indices: windowIndices }],
      stats: { comparisons: comps, swaps: 0, accesses: comps + K + 1 },
    })
  }

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: `滑动完成！最大窗口和 = ${maxSum}`, en: `Done! Max window sum = ${maxSum}` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: [] }],
    stats: { comparisons: comps, swaps: 0, accesses: arr.length + comps },
  })

  return { algorithm: 'sliding_window', complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' }, presentation: { engine: 'scene', module: 'array', variant: 'sliding_window' }, initialState: { type: 'array', data: [...arr] }, steps }
}
