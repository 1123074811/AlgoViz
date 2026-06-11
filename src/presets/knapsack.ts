import type { AnimationScript } from '@/types/animation'
import { generateDPTable } from './dpTable'

/** 0/1 背包:dp[i][j] = 前 i 件物品、容量 j 时的最大价值。用统一的 DP 状态表 + 变量面板。 */
export function generateKnapsack(weights?: number[], values?: number[], capacity?: number): AnimationScript {
  const w = weights ?? [2, 3, 4, 5]
  const v = values ?? [3, 4, 5, 8]
  const C = capacity ?? 8
  const n = w.length

  // 行 0 = 空物品集;列 = 容量 0..C。基态全 0(行 0、列 0)。
  const rowLabels = ['∅', ...w.map((wi, i) => `物${i + 1}(w${wi},v${v[i]})`)]
  const colLabels = Array.from({ length: C + 1 }, (_, c) => String(c))
  const initial: Array<Array<number | null>> = Array.from({ length: n + 1 }, () => new Array(C + 1).fill(0))

  // 填表顺序:行 1..n,列 0..C(列 0 恒为 0,但仍逐格演示更完整)。
  const order: Array<{ row: number; col: number }> = []
  for (let i = 1; i <= n; i++) for (let j = 0; j <= C; j++) order.push({ row: i, col: j })

  return generateDPTable({
    algorithm: 'knapsack_01',
    title: { zh: '0/1 背包 DP 状态表', en: '0/1 Knapsack DP Table' },
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
      zh: `0/1 背包:物品重量[${w.join(',')}] 价值[${v.join(',')}],容量=${C}。每件物品只能选一次,求最大总价值`,
      en: `0/1 Knapsack: weights[${w.join(',')}] values[${v.join(',')}], capacity=${C}. Each item used at most once; maximize total value`,
    },
    complexity: { time: { best: 'O(n*C)', average: 'O(n*C)', worst: 'O(n*C)' }, space: 'O(n*C)' },
    answer: { row: n, col: C },
    done: { zh: `DP 完成!最大价值 = dp[${n}][${C}]`, en: `DP done! Max value = dp[${n}][${C}]` },
    compute: (i, j, dp) => {
      const wi = w[i - 1]
      const vi = v[i - 1]
      if (wi <= j) {
        const skip = dp[i - 1][j]
        const take = dp[i - 1][j - wi] + vi
        const value = Math.max(skip, take)
        return {
          value,
          vars: { '物品 i': i, '容量 j': j, '当前值': value },
          deps: [{ row: i - 1, col: j }, { row: i - 1, col: j - wi }],
          formula: {
            zh: `dp[${i}][${j}] = max(不取 dp[${i - 1}][${j}]=${skip}, 取 dp[${i - 1}][${j - wi}]+${vi}=${take}) = ${value}`,
            en: `dp[${i}][${j}] = max(skip ${skip}, take ${take}) = ${value}`,
          },
          desc: {
            zh: `物品${i}(重${wi}值${vi}),容量${j}:不取=${skip},取=${take},取较大者 ${value}`,
            en: `Item ${i}(wt${wi} val${vi}), cap ${j}: skip=${skip}, take=${take}, max=${value}`,
          },
        }
      }
      const value = dp[i - 1][j]
      return {
        value,
        vars: { '物品 i': i, '容量 j': j, '当前值': value },
        deps: [{ row: i - 1, col: j }],
        formula: {
          zh: `重${wi} > 容量${j} → dp[${i}][${j}] = dp[${i - 1}][${j}] = ${value}`,
          en: `wt${wi} > cap${j} → dp[${i}][${j}] = dp[${i - 1}][${j}] = ${value}`,
        },
        desc: {
          zh: `物品${i}(重${wi}) > 容量${j},装不下,只能不取 = ${value}`,
          en: `Item ${i}(wt${wi}) > cap ${j}, cannot take, skip = ${value}`,
        },
      }
    },
  })
}
