import type { QueueAlgorithmEvent } from '../../eventTypes'

/**
 * queue 域图元构建器:语义方法 → QueueAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const queueBuilder = {
  create: (values: Array<number | string>): QueueAlgorithmEvent => ({ type: 'queue.create', values }),
  enqueue: (value: number | string): QueueAlgorithmEvent => ({ type: 'queue.enqueue', value }),
  dequeue: (): QueueAlgorithmEvent => ({ type: 'queue.dequeue' }),
  peekFront: (index: number): QueueAlgorithmEvent => ({ type: 'queue.peek_front', index }),
}
