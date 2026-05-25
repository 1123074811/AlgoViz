import type { AnimationScript } from '@/types/animation'

export function generateLIS(arr: number[]): AnimationScript {
  const data = [...arr]
  const n = data.length
  const dp: number[] = new Array(n).fill(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `数组 [${data.join(', ')}]，求最长递增子序列 (LIS)`, en: `Array [${data.join(', ')}], find LIS` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 0; i < n; i++) {
    steps.push({
      stepId: sid++, codeLine: 3,
      description: { zh: `dp[${i}] 初始化为 1`, en: `dp[${i}] initialized to 1` },
      action: { type: 'highlight', targets: [i], color: 'primary' },
      stats: { comparisons: i, swaps: 0, accesses: i + 1 },
    })
    for (let j = 0; j < i; j++) {
      steps.push({
        stepId: sid++, codeLine: 5,
        description: { zh: `比较 arr[${j}]=${data[j]} < arr[${i}]=${data[i]}？`, en: `Compare arr[${j}]=${data[j]} < arr[${i}]=${data[i]}?` },
        action: { type: 'compare', targets: [j, i], color: 'warning' },
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      if (data[j] < data[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1
        steps.push({
          stepId: sid++, codeLine: 6,
          description: { zh: `${data[j]} < ${data[i]}，dp[${i}] = max(dp[${i}], dp[${j}]+1) = ${dp[i]}`, en: `${data[j]} < ${data[i]}, dp[${i}] = ${dp[i]}` },
          action: { type: 'highlight', targets: [i], color: 'success' },
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      }
    }
  }

  const maxLen = Math.max(...dp)
  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: `LIS 完成！dp=[${dp.join(', ')}]，最大长度=${maxLen}`, en: `LIS done! dp=[${dp.join(', ')}], max=${maxLen}` },
    action: { type: 'mark', targets: dp.map((v, i) => v === maxLen ? i : -1).filter(i => i >= 0), color: 'success' },
    stats: { comparisons: n * n, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'lis',
    complexity: { time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(n)' },
    initialState: { type: 'array', data: [...arr] },
    steps: steps as AnimationScript['steps'],
  }
}
