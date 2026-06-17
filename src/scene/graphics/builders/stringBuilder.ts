import type { StringAlgorithmEvent } from '../../eventTypes'

/**
 * string 域图元构建器:语义方法 → StringAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const stringBuilder = {
  create: (text: string, row?: number): StringAlgorithmEvent => ({ type: 'string.create', text, ...(row !== undefined && { row }) }),
  createDouble: (text: string, pattern: string): StringAlgorithmEvent => ({ type: 'string.create_double', text, pattern }),
  compare: (row: number, i: number, j: number): StringAlgorithmEvent => ({ type: 'string.compare', row, indices: [i, j] }),
  match: (row: number, index: number): StringAlgorithmEvent => ({ type: 'string.match', row, index }),
  mismatch: (row: number, index: number): StringAlgorithmEvent => ({ type: 'string.mismatch', row, index }),
  markRange: (row: number, indices: number[]): StringAlgorithmEvent => ({ type: 'string.mark_range', row, indices }),
  shiftPattern: (offset: number): StringAlgorithmEvent => ({ type: 'string.shift_pattern', offset }),
}
