import type { AnimationScript, AnimationStep } from '@/types/animation'

type Coord = [number, number]

export interface GridPathInput {
  grid?: number[][]
  start?: Coord
  target?: Coord
}

/** BFS shortest path. 0 is traversable and 1 is a wall. */
export function generateGridPathfinding(input: GridPathInput = {}): AnimationScript {
  const grid = input.grid?.length
    ? input.grid
    : [[0, 0, 0, 0, 0], [0, 1, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 0]]
  const rows = grid.length, cols = grid[0].length
  const walls = new Set(
    grid.flatMap((row, r) => row.flatMap((cell, c) => cell === 1 ? [`${r},${c}`] : [])),
  )
  const start: Coord = input.start ?? [0, 0]
  const target: Coord = input.target ?? [rows - 1, cols - 1]
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `${rows}×${cols} 网格，起点(0,0) 终点(3,4)，黑格为墙，BFS 找最短路`, en: `${rows}×${cols} grid, start(0,0) target(3,4), walls in black, BFS shortest path` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [
      { type: 'grid.create', rows, cols },
      ...[...walls].map(w => { const [r, c] = w.split(',').map(Number); return { type: 'grid.wall' as const, row: r, col: c, enabled: true } }),
      { type: 'grid.set_cell', row: start[0], col: start[1], state: 'start' },
      { type: 'grid.set_cell', row: target[0], col: target[1], state: 'target' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // BFS
  const key = (r: number, c: number) => `${r},${c}`
  const prev = new Map<string, string | null>()
  const visited = new Set<string>([key(...start)])
  prev.set(key(...start), null)
  let frontier: Coord[] = [start]
  let order = 0
  const dirs: Coord[] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  let reached = false

  while (frontier.length && !reached) {
    const next: Coord[] = []
    for (const [r, c] of frontier) {
      order++
      steps.push({
        stepId: sid++, codeLine: 4,
        description: { zh: `访问 (${r},${c})`, en: `Visit (${r},${c})` },
        action: { type: 'highlight', targets: [], color: 'warning' },
        events: [{ type: 'grid.visit', row: r, col: c, order }],
        stats: { comparisons: order, swaps: 0, accesses: order },
      })
      if (r === target[0] && c === target[1]) { reached = true; break }
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (walls.has(key(nr, nc)) || visited.has(key(nr, nc))) continue
        visited.add(key(nr, nc))
        prev.set(key(nr, nc), key(r, c))
        next.push([nr, nc])
      }
    }
    if (next.length && !reached) {
      steps.push({
        stepId: sid++, codeLine: 7,
        description: { zh: `下一层前沿 ${next.length} 个格子入队`, en: `Frontier: ${next.length} cells enqueued` },
        action: { type: 'highlight', targets: [], color: 'primary' },
        events: [{ type: 'grid.frontier', cells: next }],
        stats: { comparisons: order, swaps: 0, accesses: order },
      })
    }
    frontier = next
  }

  // reconstruct path
  const path: Coord[] = []
  if (reached) {
    let curK: string | null = key(...target)
    while (curK) {
      const [r, c] = curK.split(',').map(Number)
      path.unshift([r, c])
      curK = prev.get(curK) ?? null
    }
  }
  const distance = reached ? path.length - 1 : -1
  steps.push({
    stepId: sid++, codeLine: 10,
    description: reached
      ? { zh: `最短路长度 ${distance}：${path.map(p => `(${p[0]},${p[1]})`).join(' → ')}`, en: `Shortest path length ${distance}` }
      : { zh: '目标不可达，返回 -1', en: 'Target is unreachable; return -1' },
    action: { type: 'mark', targets: [], color: reached ? 'success' : 'danger' },
    events: path.length ? [{ type: 'grid.path', cells: path }] : [],
    stats: { comparisons: order, swaps: 0, accesses: order },
  })

  return {
    algorithm: 'grid_pathfinding',
    complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'grid' },
    initialState: { type: 'matrix', data: grid.flat(), matrix: grid },
    result: path,
    steps: steps as AnimationScript['steps'],
  }
}

/** Minimum path sum DP — only move right/down. Fills a dp grid and backtracks. */
export function generateGridDP(grid?: number[][]): AnimationScript {
  const g = grid && grid.length ? grid : [[1, 3, 1], [1, 5, 1], [4, 2, 1]]
  const rows = g.length, cols = g[0].length
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0))
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `代价网格，dp[i][j]=到(i,j)的最小路径和(只能右/下)`, en: `Cost grid; dp[i][j]=min path sum to (i,j), moving right/down only` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'grid.create', rows, cols, values: g }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (i === 0 && j === 0) dp[i][j] = g[0][0]
      else if (i === 0) dp[i][j] = dp[i][j - 1] + g[i][j]
      else if (j === 0) dp[i][j] = dp[i - 1][j] + g[i][j]
      else dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + g[i][j]
      steps.push({
        stepId: sid++, codeLine: 4,
        description: { zh: `dp[${i}][${j}] = ${dp[i][j]}`, en: `dp[${i}][${j}] = ${dp[i][j]}` },
        action: { type: 'compare', targets: [], color: 'warning' },
        events: [{ type: 'grid.set_cell', row: i, col: j, value: dp[i][j], state: 'visited' }],
        stats: { comparisons: sid, swaps: 0, accesses: sid },
      })
    }
  }

  // backtrack from bottom-right
  const path: Coord[] = []
  let i = rows - 1, j = cols - 1
  path.unshift([i, j])
  while (i > 0 || j > 0) {
    if (i === 0) j--
    else if (j === 0) i--
    else if (dp[i - 1][j] <= dp[i][j - 1]) i--
    else j--
    path.unshift([i, j])
  }
  const arrows = path.slice(1).map((to, idx) => ({ type: 'grid.arrow' as const, from: path[idx], to }))
  steps.push({
    stepId: sid++, codeLine: 9,
    description: { zh: `最小路径和 = ${dp[rows - 1][cols - 1]}，回溯路径已标注`, en: `Min path sum = ${dp[rows - 1][cols - 1]}; path traced` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'grid.path', cells: path }, ...arrows],
    stats: { comparisons: sid, swaps: 0, accesses: sid },
  })

  return {
    algorithm: 'grid_dp',
    complexity: { time: { best: 'O(mn)', average: 'O(mn)', worst: 'O(mn)' }, space: 'O(mn)' },
    presentation: { engine: 'scene', module: 'grid' },
    initialState: { type: 'matrix', data: g.flat(), matrix: g },
    result: dp[rows - 1][cols - 1],
    steps: steps as AnimationScript['steps'],
  }
}
