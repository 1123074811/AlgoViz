import type { AnimationScript } from '@/types/animation'

export function generateKnapsack(weights?: number[], values?: number[], capacity?: number): AnimationScript {
  const w = weights ?? [2, 3, 4, 5]
  const v = values ?? [3, 4, 5, 8]
  const C = capacity ?? 8
  const n = w.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(C + 1).fill(0))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1, comps = 0

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `物品: 重量[${w.join(',')}] 价值[${v.join(',')}]，背包容量=${C}`, en: `Items: wt[${w.join(',')}] val[${v.join(',')}], capacity=${C}` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= C; j++) {
      if (w[i - 1] <= j) {
        const take = dp[i - 1][j - w[i - 1]] + v[i - 1]
        const skip = dp[i - 1][j]
        steps.push({
          stepId: sid++, codeLine: 5,
          description: { zh: `物品${i}(重${w[i-1]}值${v[i-1]})，容量${j}：不取=${skip}，取=${take}，max=${Math.max(take, skip)}`, en: `Item ${i}(wt${w[i-1]}val${v[i-1]}), cap ${j}: skip=${skip}, take=${take}, max=${Math.max(take, skip)}` },
          action: { type: 'compare', targets: [(i - 1) * (C + 1) + j, i * (C + 1) + j], color: 'warning' },
          stats: { comparisons: ++comps, swaps: 0, accesses: 0 },
        })
        dp[i][j] = Math.max(take, skip)
      } else {
        dp[i][j] = dp[i - 1][j]
        steps.push({
          stepId: sid++, codeLine: 7,
          description: { zh: `物品${i}(重${w[i-1]}) > 容量${j}，只能不取 = ${dp[i-1][j]}`, en: `Item ${i}(wt${w[i-1]}) > cap ${j}, skip = ${dp[i-1][j]}` },
          action: { type: 'compare', targets: [(i - 1) * (C + 1) + j, i * (C + 1) + j], color: 'muted' },
          stats: { comparisons: ++comps, swaps: 0, accesses: 0 },
        })
      }
    }
  }

  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: `DP 完成！最大价值 = ${dp[n][C]}`, en: `DP done! Max value = ${dp[n][C]}` },
    action: { type: 'mark', targets: [], color: 'success' },
    stats: { comparisons: comps, swaps: 0, accesses: 0 },
  })

  // Flatten dp table for matrix renderer
  const flat = dp.flat()

  return {
    algorithm: 'knapsack_01',
    complexity: { time: { best: 'O(n*C)', average: 'O(n*C)', worst: 'O(n*C)' }, space: 'O(n*C)' },
    initialState: { type: 'matrix', data: flat },
    steps: steps as AnimationScript['steps'],
  }
}
