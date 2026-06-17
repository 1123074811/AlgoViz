import type { ArrayAlgorithmEvent } from '../../eventTypes'

/**
 * array 域图元构建器:语义方法 → ArrayAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const arrayBuilder = {
  create: (values: Array<number | string>): ArrayAlgorithmEvent => ({ type: 'array.create', values }),
  compare: (i: number, j: number): ArrayAlgorithmEvent => ({ type: 'array.compare', indices: [i, j] }),
  swap: (i: number, j: number): ArrayAlgorithmEvent => ({ type: 'array.swap', indices: [i, j] }),
  move: (from: number, to: number): ArrayAlgorithmEvent => ({ type: 'array.move', from, to }),
  setValue: (index: number, value: number | string): ArrayAlgorithmEvent => ({ type: 'array.set_value', index, value }),
  markSorted: (...indices: number[]): ArrayAlgorithmEvent => ({ type: 'array.mark_sorted', indices }),
  window: (indices: number[], opts: { entering?: number; leaving?: number; isNewMax?: boolean } = {}): ArrayAlgorithmEvent => ({ type: 'array.window', indices, ...opts }),
  partition: (pivotIndex: number, left: number, right: number): ArrayAlgorithmEvent => ({ type: 'array.partition', pivotIndex, left, right }),
}
