import type { AnimationScript } from '@/types/animation'

export function generateLIS(arr: number[]): AnimationScript {
  const data = [...arr]
  const n = data.length
  const dp: number[] = new Array(n).fill(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  // Helper: include dp array in teachingState
  const dpAux = (dp: number[], activeIndices?: number[]) => ({
    auxiliaryArrays: [{ id: 'dp', label: 'DP 数组 (以 i 结尾的 LIS 长度)', data: dp.map(String), activeIndices }],
  })

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `数组 [${data.join(', ')}]，求最长递增子序列 (LIS)`, en: `Array [${data.join(', ')}], find LIS` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: data }],
    teachingState: dpAux(dp),
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 0; i < n; i++) {
    steps.push({
      stepId: sid++, codeLine: 3,
      description: { zh: `dp[${i}] 初始化为 1`, en: `dp[${i}] initialized to 1` },
      action: { type: 'highlight', targets: [i], color: 'primary' },
      events: [{ type: 'array.mark_sorted', indices: [i] }],
      teachingState: dpAux(dp, [i]),
      stats: { comparisons: i, swaps: 0, accesses: i + 1 },
    })
    for (let j = 0; j < i; j++) {
      steps.push({
        stepId: sid++, codeLine: 5,
        description: { zh: `比较 arr[${j}]=${data[j]} < arr[${i}]=${data[i]}？`, en: `Compare arr[${j}]=${data[j]} < arr[${i}]=${data[i]}?` },
        action: { type: 'compare', targets: [j, i], color: 'warning' },
        events: [{ type: 'array.compare', indices: [j, i] }],
        teachingState: dpAux(dp, [i, j]),
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      if (data[j] < data[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1
        steps.push({
          stepId: sid++, codeLine: 6,
          description: { zh: `${data[j]} < ${data[i]}，dp[${i}] = max(dp[${i}], dp[${j}]+1) = ${dp[i]}`, en: `${data[j]} < ${data[i]}, dp[${i}] = ${dp[i]}` },
          action: { type: 'highlight', targets: [i], color: 'success' },
          events: [{ type: 'array.mark_sorted', indices: [i] }],
          teachingState: dpAux(dp, [i]),
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      }
    }
  }

  const maxLen = Math.max(...dp)
  const lisIndices = dp.reduce((acc: number[], v, i) => v === maxLen ? [...acc, i] : acc, [])
  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: `LIS 完成！dp=[${dp.join(', ')}]，最大长度=${maxLen}`, en: `LIS done! dp=[${dp.join(', ')}], max=${maxLen}` },
    action: { type: 'mark', targets: dp.map((v, i) => v === maxLen ? i : -1).filter(i => i >= 0), color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: lisIndices }],
    teachingState: dpAux(dp, lisIndices),
    stats: { comparisons: n * n, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'lis',
    complexity: { time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array', variant: 'dp_array' },
    initialState: { type: 'array', data: [...arr] },
    steps: steps as AnimationScript['steps'],
  }
}
