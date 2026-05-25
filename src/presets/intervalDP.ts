import type { AnimationScript } from '@/types/animation'

export function generateIntervalDP(arr?: number[]): AnimationScript {
  const stones = arr ?? [3, 4, 5, 2, 6]
  const n = stones.length
  const prefix = [0]
  for (const s of stones) prefix.push(prefix[prefix.length - 1] + s)
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `石子: [${stones.join(', ')}]，求合并的最小代价（区间DP）`, en: `Stones: [${stones.join(', ')}], min merge cost (Interval DP)` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i < n - len + 1; i++) {
      const j = i + len - 1
      dp[i][j] = Infinity
      const sum = prefix[j + 1] - prefix[i]
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + sum
        if (cost < dp[i][j]) dp[i][j] = cost
        steps.push({
          stepId: sid++, codeLine: 5,
          description: { zh: `区间[${i},${j}], k=${k}: ${dp[i][k]}+${dp[k+1][j]}+sum[${i}..${j}]=${sum} = ${cost}, min=${dp[i][j] === Infinity ? '?' : dp[i][j]}`, en: `Range[${i},${j}], k=${k}: cost=${cost}, min=${dp[i][j]}` },
          action: { type: 'compare', targets: [i * n + j], color: 'warning' },
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      }
    }
  }

  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: `最小合并代价 = ${dp[0][n-1]}`, en: `Min merge cost = ${dp[0][n-1]}` },
    action: { type: 'mark', targets: [], color: 'success' },
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'interval_dp',
    complexity: { time: { best: 'O(n³)', average: 'O(n³)', worst: 'O(n³)' }, space: 'O(n²)' },
    initialState: { type: 'matrix', data: dp.flat() },
    steps: steps as AnimationScript['steps'],
  }
}
