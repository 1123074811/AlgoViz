import type { AnimationScript, AnimationStep } from '@/types/animation'

const DEFAULT_BOARD = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
]

function parseCell(value: unknown): number {
  if (value === null || value === undefined || value === '.') return 0
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 9 ? n : 0
}

function parseBoard(input: unknown): number[][] {
  const source = typeof input === 'object' && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>).board
    : input

  if (Array.isArray(source) && source.length === 9 && source.every(row => Array.isArray(row) && row.length === 9)) {
    return source.map(row => (row as unknown[]).map(parseCell))
  }

  if (Array.isArray(source) && source.length === 81) {
    return Array.from({ length: 9 }, (_, r) => source.slice(r * 9, r * 9 + 9).map(parseCell))
  }

  return DEFAULT_BOARD.map(row => [...row])
}

function isValid(board: number[][], row: number, col: number, value: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === value || board[i][col] === value) return false
  }
  const sr = Math.floor(row / 3) * 3
  const sc = Math.floor(col / 3) * 3
  for (let r = sr; r < sr + 3; r++) {
    for (let c = sc; c < sc + 3; c++) {
      if (board[r][c] === value) return false
    }
  }
  return true
}

function solve(board: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue
      for (let value = 1; value <= 9; value++) {
        if (!isValid(board, r, c, value)) continue
        board[r][c] = value
        if (solve(board)) return true
        board[r][c] = 0
      }
      return false
    }
  }
  return true
}

export function generateSudoku(input?: unknown): AnimationScript {
  const initialBoard = parseBoard(input)
  const board = initialBoard.map(row => [...row])
  const solved = initialBoard.map(row => [...row])
  const solvedOk = solve(solved)
  const steps: AnimationStep[] = []
  let sid = 1

  const flatInit = initialBoard.flat()
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '数独初始盘面（0=空格）', en: 'Sudoku initial board (0=empty)' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: 9, cols: 9, values: initialBoard.map(row => [...row]) }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  const fills = solvedOk
    ? initialBoard.flatMap((row, r) => row.map((value, c) => ({ r, c, before: value, after: solved[r][c] })))
      .filter(cell => cell.before === 0 && cell.after !== 0)
      .slice(0, 12)
    : []

  for (const fill of fills) {
    const idx = fill.r * 9 + fill.c
    board[fill.r][fill.c] = fill.after
    steps.push({
      stepId: sid++, codeLine: 6,
      description: {
        zh: `(${fill.r},${fill.c}) 可填 ${fill.after}：同行、同列、同宫均不冲突`,
        en: `(${fill.r},${fill.c}) place ${fill.after}: no row, column, or box conflict`,
      },
      action: { type: 'insert', targets: [idx], color: 'success' },
      events: [{ type: 'matrix.update_cell', row: fill.r, col: fill.c, value: fill.after }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
  }

  steps.push({
    stepId: sid++, codeLine: 12,
    description: solvedOk
      ? { zh: '回溯法继续求解，逐步填满所有空格', en: 'Backtracking continues until all empty cells are filled' }
      : { zh: '当前盘面无有效解，回溯会撤销冲突分支', en: 'The current board has no valid solution; backtracking rejects conflicting branches' },
    action: { type: 'mark', targets: [], color: solvedOk ? 'success' : 'danger' },
    events: solvedOk
      ? [{ type: 'matrix.visit_cell', row: 0, col: 0 }]
      : [{ type: 'matrix.mark_conflict', cells: [{ row: 0, col: 0 }] }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'sudoku',
    complexity: { time: { best: 'O(1)', average: 'O(9^m)', worst: 'O(9^m)' }, space: 'O(m)' },
    presentation: { engine: 'scene', module: 'matrix', variant: 'sudoku' },
    initialState: { type: 'matrix', data: flatInit, matrix: initialBoard },
    steps: steps as AnimationScript['steps'],
  }
}
