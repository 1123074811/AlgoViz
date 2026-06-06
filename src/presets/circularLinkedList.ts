import type { AnimationScript } from '@/types/animation'

export function generateCircularLinkedList(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '循环链表 — 尾节点 next 指向头节点，形成环', en: 'Circular Linked List — tail.next points to head, forming a ring' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{
      type: 'linked_list.create', variant: 'circular',
      nodes: [{ id: 'A', value: 1 }, { id: 'B', value: 2 }, { id: 'C', value: 3 }],
      headId: 'A', tailId: 'C'
    }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `visit(A) → 从头节点 A 开始遍历`, en: `visit(A) → start traversal from head A` },
    action: { type: 'highlight', targets: [0], color: 'primary' },
    events: [{ type: 'linked_list.visit', nodeId: 'A', pointerId: 'cur' }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `visit(B) → 沿 next 移动到 B`, en: `visit(B) → move to B via next` },
    action: { type: 'highlight', targets: [1], color: 'primary' },
    events: [
      { type: 'linked_list.move_pointer', pointerId: 'cur', toNodeId: 'B' },
      { type: 'linked_list.visit', nodeId: 'B', pointerId: 'cur' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `visit(C) → 移动到尾节点 C，其 next 指向头节点 A`, en: `visit(C) → move to tail C, its next points back to A` },
    action: { type: 'highlight', targets: [2], color: 'primary' },
    events: [
      { type: 'linked_list.move_pointer', pointerId: 'cur', toNodeId: 'C' },
      { type: 'linked_list.visit', nodeId: 'C', pointerId: 'cur' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: '遍历结束，cur 经过 C.next 回到 A 形成闭环', en: 'Traversal done, C.next → A closes the loop' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'circular_linked_list',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    presentation: { engine: 'scene', module: 'linked_list' },
    initialState: { type: 'linked_list', data: [1, 2, 3] },
    steps,
  }
}
