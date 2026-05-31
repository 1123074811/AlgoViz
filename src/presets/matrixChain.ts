import type { AnimationScript } from '@/types/animation'

export function generateMatrixChain(dims?: number[]): AnimationScript {
  const d = dims ?? [10, 20, 30, 40, 30]
  const n = d.length - 1
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  const initialDp = dp.map((row) => [...row])
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `矩阵链: ${d.map((x, i) => i < n ? `A${i+1}[${d[i]}×${d[i+1]}]` : '').filter(Boolean).join(' × ')}`, en: `Matrix chain: ${d.map((x, i) => i < n ? `A${i+1}[${d[i]}×${d[i+1]}]` : '').filter(Boolean).join(' × ')}` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: n, cols: n, values: initialDp }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i < n - len + 1; i++) {
      const j = i + len - 1
      dp[i][j] = Infinity
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + d[i] * d[k + 1] * d[j + 1]
        if (cost < dp[i][j]) dp[i][j] = cost
        steps.push({
          stepId: sid++, codeLine: 5,
          description: { zh: `dp[${i}][${j}]: k=${k}, cost=${dp[i][k]}+${dp[k+1][j]}+${d[i]}×${d[k+1]}×${d[j+1]}=${cost}, min=${dp[i][j]}`, en: `dp[${i}][${j}]: k=${k}, cost=${cost}, min=${dp[i][j]}` },
          action: { type: 'compare', targets: [i * n + j], color: 'warning' },
          events: [
            { type: 'scene.clear_highlight' },
            { type: 'matrix.visit_cell', row: i, col: j },
            { type: 'matrix.update_cell', row: i, col: j, value: dp[i][j] },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      }
    }
  }

  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: `最优乘法次数 = ${dp[0][n - 1]} (DP 完成)`, en: `Optimal multiplications = ${dp[0][n - 1]} (DP done)` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'matrix.mark_path', cells: [{ row: 0, col: n - 1 }] }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'matrix_chain',
    complexity: { time: { best: 'O(n³)', average: 'O(n³)', worst: 'O(n³)' }, space: 'O(n²)' },
    presentation: { engine: 'scene', module: 'matrix', variant: 'dp_table' },
    initialState: { type: 'matrix', data: initialDp.flat(), matrix: initialDp },
    steps: steps as AnimationScript['steps'],
  }
}
