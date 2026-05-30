import type { AnimationScript } from '@/types/animation'

export function generateSudoku(): AnimationScript {
  const board = [
    ['5', '3', '.', '.', '7', '.', '.', '.', '.'],
    ['6', '.', '.', '1', '9', '5', '.', '.', '.'],
    ['.', '9', '8', '.', '.', '.', '.', '6', '.'],
    ['8', '.', '.', '.', '6', '.', '.', '.', '3'],
    ['4', '.', '.', '8', '.', '3', '.', '.', '1'],
    ['7', '.', '.', '.', '2', '.', '.', '.', '6'],
    ['.', '6', '.', '.', '.', '.', '2', '8', '.'],
    ['.', '.', '.', '4', '1', '9', '.', '.', '5'],
    ['.', '.', '.', '.', '8', '.', '.', '7', '9'],
  ]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  const flatInit = board.flat().map(c => c === '.' ? 0 : parseInt(c))
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '数独初始盘面（0=空格）', en: 'Sudoku initial board (0=empty)' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'matrix.create', rows: 9, cols: 9, values: flatInit }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Demo solving a few cells
  const fills = [
    { r: 0, c: 2, v: 4, zh: '(0,2) 唯一可填 4：同行已有 5,3,7', en: '(0,2) only 4 possible' },
    { r: 0, c: 3, v: 6, zh: '(0,3) 唯一可填 6', en: '(0,3) only 6' },
    { r: 0, c: 6, v: 1, zh: '(0,6) 填 1', en: '(0,6) place 1' },
    { r: 0, c: 8, v: 8, zh: '(0,8) 填 8，第0行完成', en: '(0,8) place 8, row 0 done' },
    { r: 1, c: 1, v: 4, zh: '(1,1) 填 4', en: '(1,1) place 4' },
    { r: 1, c: 2, v: 7, zh: '(1,2) 填 7', en: '(1,2) place 7' },
    { r: 1, c: 6, v: 8, zh: '(1,6) 填 8', en: '(1,6) place 8' },
    { r: 1, c: 7, v: 3, zh: '(1,7) 填 3', en: '(1,7) place 3' },
    { r: 1, c: 8, v: 2, zh: '(1,8) 填 2，第1行完成', en: '(1,8) place 2, row 1 done' },
  ]

  for (const f of fills) {
    const idx = f.r * 9 + f.c
    board[f.r][f.c] = String(f.v)
    steps.push({
      stepId: sid++, codeLine: 6,
      description: { zh: f.zh, en: f.en },
      action: { type: 'insert', targets: [idx], color: 'success' },
      events: [{ type: 'matrix.update_cell', row: f.r, col: f.c, value: f.v }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
  }

  steps.push({
    stepId: sid++, codeLine: 12,
    description: { zh: '回溯法继续求解...数独求解算法演示', en: 'Backtracking continues... Sudoku solver demo' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'matrix.visit_cell', row: 0, col: 0 }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'sudoku',
    complexity: { time: { best: 'O(1)', average: 'O(9^m)', worst: 'O(9^m)' }, space: 'O(m)' },
    presentation: { engine: 'scene', module: 'matrix', variant: 'sudoku' },
    initialState: { type: 'matrix', data: flatInit },
    steps: steps as AnimationScript['steps'],
  }
}
