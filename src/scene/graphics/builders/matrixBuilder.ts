import type { MatrixAlgorithmEvent } from '../../eventTypes'

type RC = { row: number; col: number }

/**
 * matrix 域图元构建器:语义方法 → MatrixAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 * (n_queens.* 事件由同一 compiler 处理,但属独立 union,如需可另建 builder。)
 */
export const matrixBuilder = {
  create: (rows: number, cols: number, values?: Array<Array<number | string>>): MatrixAlgorithmEvent => ({ type: 'matrix.create', rows, cols, values }),
  visitCell: (row: number, col: number): MatrixAlgorithmEvent => ({ type: 'matrix.visit_cell', row, col }),
  updateCell: (row: number, col: number, value: number | string): MatrixAlgorithmEvent => ({ type: 'matrix.update_cell', row, col, value }),
  markPath: (cells: RC[]): MatrixAlgorithmEvent => ({ type: 'matrix.mark_path', cells }),
  markConflict: (cells: RC[]): MatrixAlgorithmEvent => ({ type: 'matrix.mark_conflict', cells }),
  transition: (from: RC, to: RC): MatrixAlgorithmEvent => ({ type: 'matrix.transition', from, to }),
}
