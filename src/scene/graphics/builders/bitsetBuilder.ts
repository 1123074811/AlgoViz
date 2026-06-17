import type { BitsetAlgorithmEvent } from '../../eventTypes'

/**
 * bitset 域图元构建器:语义方法 → BitsetAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const bitsetBuilder = {
  create: (bits: number, label?: string): BitsetAlgorithmEvent => ({ type: 'bitset.create', bits, ...(label !== undefined && { label }) }),
  set: (index: number, value: 0 | 1): BitsetAlgorithmEvent => ({ type: 'bitset.set', index, value }),
  highlight: (index: number): BitsetAlgorithmEvent => ({ type: 'bitset.highlight', index }),
}
