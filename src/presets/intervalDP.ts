import type { AnimationScript } from '@/types/animation'
import { generateDPTable } from './dpTable'

/**
 * 石子合并(区间 DP):dp[i][j] = 合并区间 [i,j] 石子的最小代价。
 * 转移:dp[i][j] = min_{k∈[i,j)} dp[i][k] + dp[k+1][j] + sum(i..j),
 * 其中 sum(i..j) 为该区间石子总数(每次合并代价 = 两堆之和,故整段固定加一次区间和)。
 * 区间 DP ⇒ 按区间长度(对角线)从短到长填表。用统一的 DP 状态表 + 当前方程 + 变量面板。
 */
export function generateIntervalDP(arr?: number[]): AnimationScript {
  const stones = arr ?? [3, 4, 5, 2, 6]
  const n = stones.length
  const prefix = [0]
  for (const s of stones) prefix.push(prefix[prefix.length - 1] + s)

  // 表为 n×n,行/列下标 0..n-1 对应石子堆。对角线(len=1,单堆)代价为 0。
  const rowLabels = Array.from({ length: n }, (_, i) => `${stones[i]}`)
  const colLabels = Array.from({ length: n }, (_, j) => `${stones[j]}`)
  const initial: Array<Array<number | null>> = Array.from({ length: n }, () => new Array(n).fill(0))

  // 填表顺序:区间长度 len=2..n;对每个长度,起点 i=0..n-len,终点 j=i+len-1。
  const order: Array<{ row: number; col: number }> = []
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) order.push({ row: i, col: i + len - 1 })
  }

  return generateDPTable({
    algorithm: 'interval_dp',
    title: { zh: '石子合并 DP 状态表', en: 'Stone-Merge DP Table' },
    rows: n,
    cols: n,
    rowLabels,
    colLabels,
    initial,
    vars: [
      { name: '区间', value: '[i,j]' },
      { name: '最优k', value: '-' },
      { name: '当前值', value: 0 },
    ],
    order,
    intro: {
      zh: `石子:[${stones.join(', ')}]。每次只能合并相邻两堆,代价为两堆之和,求合并成一堆的最小总代价(区间 DP,按区间长度从短到长填表)`,
      en: `Stones: [${stones.join(', ')}]. Merge adjacent piles (cost = sum of two piles); minimize total cost (Interval DP, fill by increasing interval length)`,
    },
    complexity: { time: { best: 'O(n³)', average: 'O(n³)', worst: 'O(n³)' }, space: 'O(n²)' },
    answer: { row: 0, col: n - 1 },
    done: { zh: `DP 完成!最小合并代价 = dp[0][${n - 1}]`, en: `DP done! Min merge cost = dp[0][${n - 1}]` },
    compute: (i, j, dp) => {
      const sum = prefix[j + 1] - prefix[i]
      let best = Infinity
      let bestK = i
      const parts: string[] = []
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + sum
        parts.push(`k=${k}:${cost}`)
        if (cost < best) {
          best = cost
          bestK = k
        }
      }
      const left = dp[i][bestK]
      const right = dp[bestK + 1][j]
      return {
        value: best,
        vars: { '区间': `[${i},${j}]`, '最优k': bestK, '当前值': best },
        deps: [{ row: i, col: bestK }, { row: bestK + 1, col: j }],
        formula: {
          zh: `dp[${i}][${j}] = min_k(${parts.join(', ')}) = dp[${i}][${bestK}]+dp[${bestK + 1}][${j}]+sum[${i}..${j}] = ${left}+${right}+${sum} = ${best} (k=${bestK})`,
          en: `dp[${i}][${j}] = min_k(${parts.join(', ')}) = dp[${i}][${bestK}]+dp[${bestK + 1}][${j}]+${sum} = ${best} (k=${bestK})`,
        },
        desc: {
          zh: `区间 [${i},${j}](和=${sum}):枚举分割点 k,最优 k=${bestK},最小合并代价 ${best}`,
          en: `Range [${i},${j}] (sum=${sum}): try split k, best k=${bestK}, min cost ${best}`,
        },
      }
    },
  })
}
