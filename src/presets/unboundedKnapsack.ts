import type { AnimationScript } from '@/types/animation'

export function generateUnboundedKnapsack(weights?: number[], values?: number[], capacity?: number): AnimationScript {
  const w = weights ?? [2, 3, 5]
  const v = values ?? [3, 4, 7]
  const C = capacity ?? 8
  const n = w.length
  const dp: number[] = new Array(C + 1).fill(0)
  const table: number[][] = [new Array(C + 1).fill(0)]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `物品: 重[${w.join(',')}] 值[${v.join(',')}]，容量=${C}（每件可选无限次）`, en: `Items: wt[${w.join(',')}] val[${v.join(',')}], cap=${C} (unlimited each)` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: n + 1, cols: C + 1, values: Array.from({ length: n + 1 }, () => new Array(C + 1).fill(0)) }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 0; i < n; i++) {
    const row = [...dp]
    for (let cap = 1; cap <= C; cap++) {
      if (w[i] <= cap) {
        const take = row[cap - w[i]] + v[i]
        const skip = row[cap]
        row[cap] = Math.max(take, skip)
        dp[cap] = row[cap]
        steps.push({
          stepId: sid++, codeLine: 5,
          description: { zh: `容量${cap}，物品${i}(重${w[i]}值${v[i]})：取=${take} 不取=${skip} → dp[${cap}]=${row[cap]}`, en: `Cap ${cap}, item ${i}: take=${take} skip=${skip} → dp[${cap}]=${row[cap]}` },
          action: { type: 'compare', targets: [cap], color: 'warning' },
          events: [
            { type: 'scene.clear_highlight' },
            { type: 'matrix.mark_path', cells: [{ row: i + 1, col: cap - w[i] }, { row: i + 1, col: cap }] },
            { type: 'matrix.update_cell', row: i + 1, col: cap, value: row[cap] },
          ],
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      }
    }
    table.push([...row])
  }

  steps.push({
    stepId: sid++, codeLine: 7,
    description: { zh: `DP 完成！最大价值=${dp[C]}`, en: `DP done! Max value=${dp[C]}` },
    action: { type: 'mark', targets: [], color: 'success' },
    stats: { comparisons: n * C, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'unbounded_knapsack',
    complexity: { time: { best: 'O(n*C)', average: 'O(n*C)', worst: 'O(n*C)' }, space: 'O(C)' },
    presentation: { engine: 'scene', module: 'matrix', variant: 'dp_table' },
    initialState: { type: 'matrix', data: table.flat(), matrix: table },
    steps: steps as AnimationScript['steps'],
  }
}
