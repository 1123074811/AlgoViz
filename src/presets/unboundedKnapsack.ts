import type { AnimationScript } from '@/types/animation'
import { generateDPTable } from './dpTable'

/** 完全背包:每件物品可选无限次。dp[i][j] = max(不取 dp[i-1][j], 取 dp[i][j-w]+v)。统一 DP 状态表。 */
export function generateUnboundedKnapsack(weights?: number[], values?: number[], capacity?: number): AnimationScript {
  const w = weights ?? [2, 3, 5]
  const v = values ?? [3, 4, 7]
  const C = capacity ?? 8
  const n = w.length

  const rowLabels = ['∅', ...w.map((wi, i) => `物${i + 1}(w${wi},v${v[i]})`)]
  const colLabels = Array.from({ length: C + 1 }, (_, c) => String(c))
  const initial: Array<Array<number | null>> = Array.from({ length: n + 1 }, () => new Array(C + 1).fill(0))

  const order: Array<{ row: number; col: number }> = []
  for (let i = 1; i <= n; i++) for (let j = 0; j <= C; j++) order.push({ row: i, col: j })

  return generateDPTable({
    algorithm: 'unbounded_knapsack',
    title: { zh: '完全背包 DP 状态表', en: 'Unbounded Knapsack DP Table' },
    rows: n + 1,
    cols: C + 1,
    rowLabels,
    colLabels,
    initial,
    vars: [
      { name: '物品 i', value: 0 },
      { name: '容量 j', value: 0 },
      { name: '当前值', value: 0 },
    ],
    order,
    intro: {
      zh: `完全背包:物品重量[${w.join(',')}] 价值[${v.join(',')}],容量=${C}。每件物品可重复选取,求最大总价值`,
      en: `Unbounded Knapsack: weights[${w.join(',')}] values[${v.join(',')}], capacity=${C}. Each item reusable; maximize value`,
    },
    complexity: { time: { best: 'O(n*C)', average: 'O(n*C)', worst: 'O(n*C)' }, space: 'O(n*C)' },
    answer: { row: n, col: C },
    done: { zh: `DP 完成!最大价值 = dp[${n}][${C}]`, en: `DP done! Max value = dp[${n}][${C}]` },
    compute: (i, j, dp) => {
      const wi = w[i - 1], vi = v[i - 1]
      const skip = dp[i - 1][j]
      if (wi <= j) {
        // 完全背包「取」依赖同一行的 dp[i][j-w](可重复选),而非上一行
        const take = dp[i][j - wi] + vi
        const value = Math.max(skip, take)
        return {
          value,
          vars: { '物品 i': i, '容量 j': j, '当前值': value },
          deps: [{ row: i - 1, col: j }, { row: i, col: j - wi }],
          formula: {
            zh: `dp[${i}][${j}] = max(不取 dp[${i - 1}][${j}]=${skip}, 取 dp[${i}][${j - wi}]+${vi}=${take}) = ${value}`,
            en: `dp[${i}][${j}] = max(skip ${skip}, take ${take}) = ${value}`,
          },
          desc: {
            zh: `容量${j},物品${i}(重${wi}值${vi}):不取=${skip},取(可重复)=${take},取较大者 ${value}`,
            en: `Cap ${j}, item ${i}: skip=${skip}, take=${take}, max=${value}`,
          },
        }
      }
      return {
        value: skip,
        vars: { '物品 i': i, '容量 j': j, '当前值': skip },
        deps: [{ row: i - 1, col: j }],
        formula: {
          zh: `重${wi} > 容量${j} → dp[${i}][${j}] = dp[${i - 1}][${j}] = ${skip}`,
          en: `wt${wi} > cap${j} → dp[${i}][${j}] = dp[${i - 1}][${j}] = ${skip}`,
        },
        desc: { zh: `物品${i}(重${wi}) > 容量${j},装不下,只能不取 = ${skip}`, en: `Item ${i}(wt${wi}) > cap ${j}, skip = ${skip}` },
      }
    },
  })
}
