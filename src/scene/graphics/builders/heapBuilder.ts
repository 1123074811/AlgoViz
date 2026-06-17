import type { HeapAlgorithmEvent } from '../../eventTypes'

/**
 * heap 域图元构建器:语义方法 → HeapAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const heapBuilder = {
  create: (values: number[], variant?: 'min' | 'max'): HeapAlgorithmEvent => ({ type: 'heap.create', values, ...(variant && { variant }) }),
  push: (value: number): HeapAlgorithmEvent => ({ type: 'heap.push', value }),
  pop: (): HeapAlgorithmEvent => ({ type: 'heap.pop' }),
  sift: (from: number, to: number): HeapAlgorithmEvent => ({ type: 'heap.sift', from, to }),
  peek: (index: number): HeapAlgorithmEvent => ({ type: 'heap.peek', index }),
}
