import type { AnimationScript } from '@/types/animation'

export function generateEditDistance(w1?: string, w2?: string): AnimationScript {
  const word1 = w1 ?? 'horse'
  const word2 = w2 ?? 'ros'
  const m = word1.length, n = word2.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  const initialDp = dp.map((row) => [...row])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `单词1: "${word1}" (${m}), 单词2: "${word2}" (${n})`, en: `Word1: "${word1}" (${m}), Word2: "${word2}" (${n})` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: m + 1, cols: n + 1, values: initialDp }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
        steps.push({
          stepId: sid++, codeLine: 5,
          description: { zh: `${word1[i-1]} == ${word2[j-1]}，dp[${i}][${j}]=dp[${i-1}][${j-1}]=${dp[i][j]}`, en: `${word1[i-1]} == ${word2[j-1]}, dp[${i}][${j}]=${dp[i][j]}` },
          action: { type: 'compare', targets: [i * (n + 1) + j], color: 'success' },
          events: [
            { type: 'scene.clear_highlight' },
            { type: 'matrix.mark_path', cells: [{ row: i - 1, col: j - 1 }] },
            { type: 'matrix.update_cell', row: i, col: j, value: dp[i][j] },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        steps.push({
          stepId: sid++, codeLine: 7,
          description: { zh: `${word1[i-1]} ≠ ${word2[j-1]}，dp[${i}][${j}]=1+min(删${dp[i-1][j]},插${dp[i][j-1]},换${dp[i-1][j-1]})=${dp[i][j]}`, en: `${word1[i-1]} ≠ ${word2[j-1]}, dp[${i}][${j}]=1+min(del${dp[i-1][j]},ins${dp[i][j-1]},rep${dp[i-1][j-1]})=${dp[i][j]}` },
          action: { type: 'compare', targets: [i * (n + 1) + j], color: 'warning' },
          events: [
            { type: 'scene.clear_highlight' },
            { type: 'matrix.mark_path', cells: [{ row: i - 1, col: j }, { row: i, col: j - 1 }, { row: i - 1, col: j - 1 }] },
            { type: 'matrix.update_cell', row: i, col: j, value: dp[i][j] },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      }
    }
  }

  steps.push({
    stepId: sid++, codeLine: 9,
    description: { zh: `编辑距离 = ${dp[m][n]}（操作：${word1} → ${word2}）`, en: `Edit distance = ${dp[m][n]} (ops: ${word1} → ${word2})` },
    action: { type: 'mark', targets: [], color: 'success' },
    stats: { comparisons: m * n, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'edit_distance',
    complexity: { time: { best: 'O(m*n)', average: 'O(m*n)', worst: 'O(m*n)' }, space: 'O(m*n)' },
    presentation: { engine: 'scene', module: 'matrix', variant: 'dp_table' },
    initialState: { type: 'matrix', data: initialDp.flat(), matrix: initialDp },
    steps: steps as AnimationScript['steps'],
  }
}
