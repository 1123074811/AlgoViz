import type { AnimationScript } from '@/types/animation'

export function generateLinkedList(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const list: number[] = []
  const vals = [1, 2, 3, 4]

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '单向链表 (Singly Linked List)', en: 'Singly Linked List' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  for (const v of vals) {
    list.push(v)
    steps.push({ stepId: sid++, codeLine: 3, description: { zh: `插入节点: ${v} → 链表: [${list.join('→')}]`, en: `Insert node: ${v} → list: [${list.join('→')}]` }, action: { type: 'insert', targets: [list.length - 1], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: list.length } })
  }

  list.splice(2, 1)
  steps.push({ stepId: sid++, codeLine: 6, description: { zh: `删除索引 2 的节点 → 链表: [${list.join('→')}]`, en: `Delete node at idx 2 → list: [${list.join('→')}]` }, action: { type: 'delete', targets: [2], color: 'danger' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 8, description: { zh: `遍历: ${list.join(' → ')} → null`, en: `Traverse: ${list.join(' → ')} → null` }, action: { type: 'mark', targets: [0, 1, 2], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: list.length } })

  return { algorithm: 'linked_list', complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' }, initialState: { type: 'array', data: list }, steps: steps as AnimationScript['steps'] }
}
