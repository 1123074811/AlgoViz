import type { AnimationScript } from '@/types/animation'

export function generateLCS(text1?: string, text2?: string): AnimationScript {
  const s1 = text1 ?? 'ABCBDAB'
  const s2 = text2 ?? 'BDCABA'
  const m = s1.length, n = s2.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  const initialDp = dp.map((row) => [...row])

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `序列1: ${s1} (长度=${m}), 序列2: ${s2} (长度=${n})`, en: `Seq1: ${s1} (len=${m}), Seq2: ${s2} (len=${n})` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: m + 1, cols: n + 1, values: initialDp }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const same = s1[i - 1] === s2[j - 1]
      if (same) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        steps.push({
          stepId: sid++, codeLine: 5,
          description: { zh: `${s1[i-1]} == ${s2[j-1]}，dp[${i}][${j}]=dp[${i-1}][${j-1}]+1=${dp[i][j]}`, en: `${s1[i-1]} == ${s2[j-1]}, dp[${i}][${j}]=dp[${i-1}][${j-1}]+1=${dp[i][j]}` },
          action: { type: 'compare', targets: [i * (n + 1) + j, (i - 1) * (n + 1) + (j - 1)], color: 'success' },
          events: [
            { type: 'scene.clear_highlight' },
            { type: 'matrix.mark_path', cells: [{ row: i - 1, col: j - 1 }] },
            { type: 'matrix.update_cell', row: i, col: j, value: dp[i][j] },
          ],
          stats: { comparisons: i * n + j, swaps: 0, accesses: 0 },
        })
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        steps.push({
          stepId: sid++, codeLine: 7,
          description: { zh: `${s1[i-1]} ≠ ${s2[j-1]}，dp[${i}][${j}]=max(dp[${i-1}][${j}]=${dp[i-1][j]}, dp[${i}][${j-1}]=${dp[i][j-1]})=${dp[i][j]}`, en: `${s1[i-1]} ≠ ${s2[j-1]}, dp[${i}][${j}]=max(${dp[i-1][j]}, ${dp[i][j-1]})=${dp[i][j]}` },
          action: { type: 'compare', targets: [i * (n + 1) + j, (i - 1) * (n + 1) + j], color: 'warning' },
          events: [
            { type: 'scene.clear_highlight' },
            { type: 'matrix.mark_path', cells: [{ row: i - 1, col: j }, { row: i, col: j - 1 }] },
            { type: 'matrix.update_cell', row: i, col: j, value: dp[i][j] },
          ],
          stats: { comparisons: i * n + j, swaps: 0, accesses: 0 },
        })
      }
    }
  }

  const lcsLen = dp[m][n]
  steps.push({
    stepId: sid++, codeLine: 9,
    description: { zh: `DP 完成！LCS 长度 = ${lcsLen}`, en: `DP done! LCS length = ${lcsLen}` },
    action: { type: 'mark', targets: [], color: 'success' },
    stats: { comparisons: m * n, swaps: 0, accesses: 0 },
  })

  const flat = dp.flat()
  return {
    algorithm: 'lcs',
    complexity: { time: { best: 'O(m*n)', average: 'O(m*n)', worst: 'O(m*n)' }, space: 'O(m*n)' },
    presentation: { engine: 'scene', module: 'matrix', variant: 'dp_table' },
    initialState: { type: 'matrix', data: flat, matrix: dp },
    steps: steps as AnimationScript['steps'],
  }
}
