import type { AnimationScript } from '@/types/animation'

export function generateFloyd(input?: number[][]): AnimationScript {
  let matrix: number[][]
  if (input && Array.isArray(input) && input.length > 0 && Array.isArray(input[0])) {
    matrix = input.map(row => [...row])
  } else {
    matrix = [
      [0, 3, 999, 7],
      [8, 0, 2, 999],
      [999, 999, 0, 1],
      [6, 999, 999, 0],
    ]
  }
  const n = matrix.length
  const INF = 999

  const steps: AnimationScript['steps'] = []
  let sid = 1

  function fmtDist(d: number) { return d >= INF ? '∞' : String(d) }
  function matrixSnapshot() { return matrix.map(row => [...row]) }

  // Step 1: Initial matrix
  const flatInit = matrix.flat()
  steps.push({
    stepId: sid++, codeLine: 2,
    description: {
      zh: `初始距离矩阵 (${n}×${n}, 999=∞)。Floyd 以每个节点为中间点逐步优化`,
      en: `Initial distance matrix (${n}×${n}, 999=∞). Floyd uses each node as intermediate`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: n, cols: n, values: matrixSnapshot() }],
    stats: { comparisons: 0, swaps: 0, accesses: n * n },
    teachingState: { variables: { k: -1, phase: '初始状态' } },
  })

  // Run Floyd-Warshall
  for (let k = 0; k < n; k++) {
    steps.push({
      stepId: sid++, codeLine: 5,
      description: {
        zh: `k=${k}：以节点 ${k} 为中间点。遍历所有 (i,j) 检查是否 dist[i][k] + dist[k][j] < dist[i][j]`,
        en: `k=${k}: using node ${k} as intermediate. Check all (i,j): is dist[i][k] + dist[k][j] < dist[i][j]?`,
      },
      action: { type: 'highlight', targets: [k], color: 'warning' },
      events: [
        { type: 'matrix.mark_path', cells: [{ row: k, col: k }] },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: n * n },
      teachingState: { variables: { k, phase: `中间点 k=${k}` } },
    })

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j || i === k || j === k) continue
        if (matrix[i][k] >= INF || matrix[k][j] >= INF) continue

        const oldDist = matrix[i][j]
        const newDist = matrix[i][k] + matrix[k][j]

        if (newDist < oldDist) {
          matrix[i][j] = newDist
          steps.push({
            stepId: sid++, codeLine: 7,
            description: {
              zh: `k=${k}, i=${i}, j=${j}：dist[${i}][${k}]=${matrix[i][k]} + dist[${k}][${j}]=${matrix[k][j]} = ${newDist} < ${fmtDist(oldDist)}，更新 dist[${i}][${j}]=${newDist}`,
              en: `k=${k}: ${i}→${k}→${j}: ${matrix[i][k]}+${matrix[k][j]}=${newDist} < ${fmtDist(oldDist)}, update!`,
            },
            action: { type: 'compare', targets: [i * n + j], color: 'success' },
            events: [
              { type: 'matrix.mark_path', cells: [{ row: i, col: k }, { row: k, col: j }] },
              { type: 'matrix.update_cell', row: i, col: j, value: newDist },
            ],
            stats: { comparisons: sid, swaps: 0, accesses: n * n },
            teachingState: { variables: { k, i, j, improvement: `${fmtDist(oldDist)}→${newDist}` } },
          })
        }
      }
    }
  }

  // Final step
  steps.push({
    stepId: sid++, codeLine: 12,
    description: {
      zh: `Floyd-Warshall 完成！全源最短路径已计算`,
      en: `Floyd-Warshall done! All-pairs shortest paths computed`,
    },
    action: { type: 'mark', targets: Array.from({ length: n * n }, (_, idx) => idx), color: 'success' },
    stats: { comparisons: n * n * n, swaps: 0, accesses: n * n },
    teachingState: { variables: { phase: '完成' } },
  })

  return {
    algorithm: 'floyd',
    complexity: { time: { best: 'O(V³)', average: 'O(V³)', worst: 'O(V³)' }, space: 'O(V²)' },
    presentation: { engine: 'scene', module: 'matrix' },
    initialState: { type: 'matrix', data: flatInit, matrix: matrix },
    steps,
  }
}

const floydPreset = generateFloyd()
export default floydPreset
