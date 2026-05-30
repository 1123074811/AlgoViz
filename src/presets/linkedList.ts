import type { AnimationScript } from '@/types/animation'

export function generateLinkedList(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const list: number[] = []
  const vals = [1, 2, 3, 4]

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '单向链表 (Singly Linked List)', en: 'Singly Linked List' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  for (const v of vals) {
    const nodeId = `n${v}`
    const previousNodeId = list.length > 0 ? `n${list[list.length - 1]}` : null
    list.push(v)
    steps.push({
      stepId: sid++,
      codeLine: 3,
      description: { zh: `插入节点: ${v} → 链表: [${list.join('→')}]`, en: `Insert node: ${v} → list: [${list.join('→')}]` },
      action: { type: 'insert', targets: [list.length - 1], color: 'success' },
      events: previousNodeId
        ? [{ type: 'linked_list.insert_after', targetNodeId: previousNodeId, newNode: { id: nodeId, value: v } }]
        : [{ type: 'linked_list.create', variant: 'singly', nodes: [{ id: nodeId, value: v }], headId: nodeId, tailId: nodeId }],
      stats: { comparisons: 0, swaps: 0, accesses: list.length },
    })
  }

  list.splice(2, 1)
  steps.push({ stepId: sid++, codeLine: 6, description: { zh: `删除索引 2 的节点 → 链表: [${list.join('→')}]`, en: `Delete node at idx 2 → list: [${list.join('→')}]` }, action: { type: 'delete', targets: [2], color: 'danger' }, events: [{ type: 'linked_list.delete', nodeId: 'n3' }], stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 8, description: { zh: `遍历: ${list.join(' → ')} → null`, en: `Traverse: ${list.join(' → ')} → null` }, action: { type: 'mark', targets: [0, 1, 2], color: 'success' }, events: [{ type: 'linked_list.visit', nodeId: 'n1', pointerId: 'cur' }, { type: 'linked_list.visit', nodeId: 'n2', pointerId: 'cur' }, { type: 'linked_list.visit', nodeId: 'n4', pointerId: 'cur' }], stats: { comparisons: 0, swaps: 0, accesses: list.length } })

  return { algorithm: 'linked_list', complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' }, presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' }, initialState: { type: 'linked_list', data: list }, steps: steps as AnimationScript['steps'] }
}
