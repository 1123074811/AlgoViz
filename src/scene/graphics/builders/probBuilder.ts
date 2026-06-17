import type { ProbAlgorithmEvent } from '../../eventTypes'

/**
 * prob 域图元构建器:语义方法 → ProbAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const probBuilder = {
  dist: (bins: Array<{ label: string; weight: number }>): ProbAlgorithmEvent => ({ type: 'prob.dist', bins }),
  sample: (index: number): ProbAlgorithmEvent => ({ type: 'prob.sample', index }),
  reservoir: (capacity: number, items: Array<number | string>): ProbAlgorithmEvent => ({ type: 'prob.reservoir', capacity, items }),
  note: (text: string): ProbAlgorithmEvent => ({ type: 'prob.note', text }),
  clear: (): ProbAlgorithmEvent => ({ type: 'prob.clear' }),
}
