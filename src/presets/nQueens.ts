import type { AnimationScript, AnimationStep } from '@/types/animation'

export function generateNQueens(n?: number): AnimationScript {
  const N = n ?? 4
  const steps: AnimationStep[] = []
  let sid = 1
  const board: string[][] = Array.from({ length: N }, () => new Array(N).fill('·'))
  const initialBoard = board.map(row => [...row])

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `${N} 皇后问题：在 ${N}×${N} 棋盘放置 ${N} 个皇后，互不攻击`, en: `${N}-Queens: place ${N} queens on ${N}x${N} board, no attacks` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: N, cols: N }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  function isSafe(row: number, col: number): boolean {
    for (let i = 0; i < row; i++) {
      if (board[i][col] === 'Q') return false
      const d = row - i
      if (col - d >= 0 && board[i][col - d] === 'Q') return false
      if (col + d < N && board[i][col + d] === 'Q') return false
    }
    return true
  }

  function solve(row: number): boolean {
    if (row === N) {
      steps.push({
        stepId: sid++, codeLine: 3,
        description: { zh: `找到解！皇后位置: ${board.map((r, i) => `(${i},${r.indexOf('Q')})`).join(' ')}`, en: `Solution found! Queens at: ${board.map((r, i) => `(${i},${r.indexOf('Q')})`).join(' ')}` },
        action: { type: 'mark', targets: [], color: 'success' },
        events: [{ type: 'n_queens.solution', queens: board.map((r, i) => ({ row: i, col: r.indexOf('Q') })).filter((queen) => queen.col >= 0) }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      return true
    }
    for (let col = 0; col < N; col++) {
      board[row] = new Array(N).fill('·')
      board[row][col] = '?'
      // Find flat index of this cell
      const idx = row * N + col
      steps.push({
        stepId: sid++, codeLine: 6,
        description: { zh: `尝试在 (${row},${col}) 放置皇后`, en: `Try placing queen at (${row},${col})` },
        action: { type: 'compare', targets: [idx], color: 'warning' },
        events: [{ type: 'n_queens.try_place', row, col }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })

      if (isSafe(row, col)) {
        board[row][col] = 'Q'
        steps.push({
          stepId: sid++, codeLine: 8,
          description: { zh: `(${row},${col}) 安全，放置 Q`, en: `(${row},${col}) safe, place Q` },
          action: { type: 'highlight', targets: [idx], color: 'success' },
          events: [{ type: 'n_queens.place', row, col }],
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
        if (solve(row + 1)) return true
        board[row][col] = '·'
        steps.push({
          stepId: sid++, codeLine: 9,
          description: { zh: `回溯：撤销 (${row},${col}) 的皇后`, en: `Backtrack: remove queen at (${row},${col})` },
          action: { type: 'delete', targets: [idx], color: 'danger' },
          events: [{ type: 'n_queens.backtrack', row, col }],
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
      }
    }
    return false
  }

  solve(0)

  const initialFlat = initialBoard.flat().map((c) => (c === 'Q' ? 1 : 0))
  return {
    algorithm: 'n_queens',
    complexity: { time: { best: 'O(N!)', average: 'O(N!)', worst: 'O(N!)' }, space: 'O(N)' },
    presentation: { engine: 'scene', module: 'n_queens', variant: 'board' },
    initialState: { type: 'matrix', data: initialFlat, matrix: initialBoard.map((row) => row.map((cell) => cell === 'Q' ? 1 : 0)) },
    steps: steps as AnimationScript['steps'],
  }
}
