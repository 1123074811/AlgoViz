import type { DequeAlgorithmEvent } from '../../eventTypes'

/**
 * deque 域图元构建器:语义方法 → DequeAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const dequeBuilder = {
  create: (values: Array<number | string>): DequeAlgorithmEvent => ({ type: 'deque.create', values }),
  pushFront: (value: number | string): DequeAlgorithmEvent => ({ type: 'deque.push_front', value }),
  pushBack: (value: number | string): DequeAlgorithmEvent => ({ type: 'deque.push_back', value }),
  popFront: (): DequeAlgorithmEvent => ({ type: 'deque.pop_front' }),
  popBack: (): DequeAlgorithmEvent => ({ type: 'deque.pop_back' }),
  peekFront: (index: number): DequeAlgorithmEvent => ({ type: 'deque.peek_front', index }),
  peekBack: (index: number): DequeAlgorithmEvent => ({ type: 'deque.peek_back', index }),
}
