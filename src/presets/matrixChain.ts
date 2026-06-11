import type { AnimationScript } from '@/types/animation'
import { generateDPTable } from './dpTable'

/**
 * 矩阵链乘法:dp[i][j] = 计算 A_i..A_j 这段矩阵连乘的最少标量乘法次数。
 * 转移:dp[i][j] = min_{k∈[i,j)} dp[i][k] + dp[k+1][j] + p[i]·p[k+1]·p[j+1]。
 * 区间 DP ⇒ 按区间长度(对角线)从短到长填表。用统一的 DP 状态表 + 当前方程 + 变量面板。
 */
export function generateMatrixChain(dims?: number[]): AnimationScript {
  const d = dims ?? [10, 20, 30, 40, 30]
  const n = d.length - 1 // 矩阵个数:A_1..A_n,A_(i+1) 维度为 d[i]×d[i+1]

  // 表为 n×n,行/列下标 0..n-1 对应矩阵 A_(下标+1)。对角线(len=1)恒为 0。
  const rowLabels = Array.from({ length: n }, (_, i) => `A${i + 1}`)
  const colLabels = Array.from({ length: n }, (_, j) => `A${j + 1}`)
  const initial: Array<Array<number | null>> = Array.from({ length: n }, () => new Array(n).fill(0))

  // 填表顺序:区间长度 len=2..n;对每个长度,起点 i=0..n-len,终点 j=i+len-1。
  const order: Array<{ row: number; col: number }> = []
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) order.push({ row: i, col: i + len - 1 })
  }

  const chain = Array.from({ length: n }, (_, i) => `A${i + 1}[${d[i]}×${d[i + 1]}]`).join(' × ')

  return generateDPTable({
    algorithm: 'matrix_chain',
    title: { zh: '矩阵链乘 DP 状态表', en: 'Matrix-Chain DP Table' },
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
      zh: `矩阵链:${chain}。求连乘的最少标量乘法次数(区间 DP,按区间长度从短到长填表)`,
      en: `Matrix chain: ${chain}. Minimize scalar multiplications (Interval DP, fill by increasing interval length)`,
    },
    complexity: { time: { best: 'O(n³)', average: 'O(n³)', worst: 'O(n³)' }, space: 'O(n²)' },
    answer: { row: 0, col: n - 1 },
    done: { zh: `DP 完成!最少乘法次数 = dp[0][${n - 1}]`, en: `DP done! Min multiplications = dp[0][${n - 1}]` },
    compute: (i, j, dp) => {
      let best = Infinity
      let bestK = i
      const parts: string[] = []
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + d[i] * d[k + 1] * d[j + 1]
        parts.push(`k=${k}:${cost}`)
        if (cost < best) {
          best = cost
          bestK = k
        }
      }
      const left = dp[i][bestK]
      const right = dp[bestK + 1][j]
      const product = d[i] * d[bestK + 1] * d[j + 1]
      return {
        value: best,
        vars: { '区间': `[${i},${j}]`, '最优k': bestK, '当前值': best },
        deps: [{ row: i, col: bestK }, { row: bestK + 1, col: j }],
        formula: {
          zh: `dp[${i}][${j}] = min_k(${parts.join(', ')}) = dp[${i}][${bestK}]+dp[${bestK + 1}][${j}]+${d[i]}×${d[bestK + 1]}×${d[j + 1]} = ${left}+${right}+${product} = ${best} (k=${bestK})`,
          en: `dp[${i}][${j}] = min_k(${parts.join(', ')}) = dp[${i}][${bestK}]+dp[${bestK + 1}][${j}]+${product} = ${best} (k=${bestK})`,
        },
        desc: {
          zh: `区间 [${i},${j}](矩阵 A${i + 1}..A${j + 1}):枚举分割点 k,最优 k=${bestK},最少乘法 ${best}`,
          en: `Range [${i},${j}] (A${i + 1}..A${j + 1}): try split k, best k=${bestK}, min cost ${best}`,
        },
      }
    },
  })
}
