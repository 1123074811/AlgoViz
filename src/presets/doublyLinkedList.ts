import type { AnimationScript } from '@/types/animation'

export function generateDoublyLinkedList(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const list: number[] = [1, 2, 3, 4]

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '双向链表 — 每个节点有 prev 和 next 指针', en: 'Doubly Linked List — each node has prev and next' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 1, description: { zh: `当前链表: [${list.join(' ↔ ')}]`, en: `Current: [${list.join(' ↔ ')}]` }, action: { type: 'highlight', targets: [0, 1, 2, 3], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 4 } })

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: '正向遍历: 1→2→3→4', en: 'Forward: 1→2→3→4' }, action: { type: 'highlight', targets: [0, 1, 2, 3], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 4 } })

  steps.push({ stepId: sid++, codeLine: 4, description: { zh: '反向遍历: 4→3→2→1 (利用 prev 指针)', en: 'Backward: 4→3→2→1 (using prev)' }, action: { type: 'highlight', targets: [3, 2, 1, 0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 4 } })

  steps.push({ stepId: sid++, codeLine: 6, description: { zh: '中间插入：2 ↔ 5 ↔ 3', en: 'Insert 5 between 2 and 3' }, action: { type: 'insert', targets: [2], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 5 } })

  steps.push({ stepId: sid++, codeLine: 7, description: { zh: '双向链表完成', en: 'Doubly linked list demo done' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 5 } })

  return { algorithm: 'doubly_linked_list', complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' }, initialState: { type: 'array', data: list }, steps: steps as AnimationScript['steps'] }
}
