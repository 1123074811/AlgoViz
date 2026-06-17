import type { SetAlgorithmEvent } from '../../eventTypes'

/**
 * set 域图元构建器:语义方法 → SetAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const setBuilder = {
  create: (values: Array<number | string>, label?: string): SetAlgorithmEvent => ({ type: 'set.create', values, ...(label && { label }) }),
  add: (value: number | string): SetAlgorithmEvent => ({ type: 'set.add', value }),
  remove: (value: number | string): SetAlgorithmEvent => ({ type: 'set.remove', value }),
  contains: (value: number | string, found: boolean): SetAlgorithmEvent => ({ type: 'set.contains', value, found }),
}
