import type { StackAlgorithmEvent } from '../../eventTypes'

/**
 * stack 域图元构建器:语义方法 → StackAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const stackBuilder = {
  create: (values: Array<number | string>, label?: string): StackAlgorithmEvent => ({ type: 'stack.create', values, ...(label !== undefined && { label }) }),
  push: (value: number | string, label?: string): StackAlgorithmEvent => ({ type: 'stack.push', value, ...(label !== undefined && { label }) }),
  pop: (): StackAlgorithmEvent => ({ type: 'stack.pop' }),
  peek: (index: number): StackAlgorithmEvent => ({ type: 'stack.peek', index }),
}
