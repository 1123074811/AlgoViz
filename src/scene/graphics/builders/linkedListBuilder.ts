import type { LinkedListAlgorithmEvent } from '../../eventTypes'

/**
 * linkedList 域图元构建器:语义方法 → LinkedListAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const linkedListBuilder = {
  create: (variant: 'singly' | 'doubly' | 'circular', nodes: Array<{ id: string; value: number | string }>, opts: { headId?: string; tailId?: string } = {}): LinkedListAlgorithmEvent => ({ type: 'linked_list.create', variant, nodes, ...opts }),
  visit: (nodeId: string, pointerId?: string): LinkedListAlgorithmEvent => ({ type: 'linked_list.visit', nodeId, ...(pointerId !== undefined && { pointerId }) }),
  movePointer: (pointerId: string, toNodeId: string | null): LinkedListAlgorithmEvent => ({ type: 'linked_list.move_pointer', pointerId, toNodeId }),
  insertAfter: (targetNodeId: string, newNode: { id: string; value: number | string }): LinkedListAlgorithmEvent => ({ type: 'linked_list.insert_after', targetNodeId, newNode }),
  insertBefore: (targetNodeId: string, newNode: { id: string; value: number | string }): LinkedListAlgorithmEvent => ({ type: 'linked_list.insert_before', targetNodeId, newNode }),
  delete: (nodeId: string): LinkedListAlgorithmEvent => ({ type: 'linked_list.delete', nodeId }),
  reverseLink: (fromNodeId: string, toNodeId: string | null): LinkedListAlgorithmEvent => ({ type: 'linked_list.reverse_link', fromNodeId, toNodeId }),
  setHead: (nodeId: string | null): LinkedListAlgorithmEvent => ({ type: 'linked_list.set_head', nodeId }),
  setTail: (nodeId: string | null): LinkedListAlgorithmEvent => ({ type: 'linked_list.set_tail', nodeId }),
}
