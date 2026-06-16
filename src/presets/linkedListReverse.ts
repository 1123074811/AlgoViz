import type { AnimationScript, AnimationStep } from '@/types/animation'

/** Iterative singly-linked-list reversal (prev/cur/next pointer walk). */
export function generateLinkedListReverse(arr?: number[]): AnimationScript {
  const vals = arr && arr.length > 0 ? [...arr] : [1, 2, 3, 4, 5]
  const ids = vals.map(v => `n${v}`)
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `单链表 [${vals.join('→')}]，目标：原地反转`, en: `Singly list [${vals.join('→')}], goal: reverse in place` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'linked_list.create', variant: 'singly', nodes: vals.map((v, i) => ({ id: ids[i], value: v })), headId: ids[0], tailId: ids[ids.length - 1] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 1,
    description: { zh: 'prev = null，cur = head。逐节点把 cur.next 指回 prev', en: 'prev = null, cur = head. Point cur.next back to prev, node by node' },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    events: [{ type: 'linked_list.move_pointer', pointerId: 'cur', toNodeId: ids[0] }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Reverse each forward link: node i should now point to node i-1 (null for i=0).
  for (let i = 0; i < ids.length; i++) {
    const prevId = i === 0 ? null : ids[i - 1]
    steps.push({
      stepId: sid++, codeLine: 3,
      description: {
        zh: `反转 ${vals[i]} 的指针 → ${prevId ? vals[i - 1] : 'null'}；cur 前移`,
        en: `Reverse ${vals[i]}.next → ${prevId ? vals[i - 1] : 'null'}; advance cur`,
      },
      action: { type: 'swap', targets: [i], color: 'warning' },
      events: [
        { type: 'linked_list.reverse_link', fromNodeId: ids[i], toNodeId: prevId },
        ...(i + 1 < ids.length ? [{ type: 'linked_list.move_pointer' as const, pointerId: 'cur', toNodeId: ids[i + 1] }] : []),
      ],
      stats: { comparisons: 0, swaps: i + 1, accesses: i + 1 },
    })
  }

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: `反转完成：新表头是 ${vals[vals.length - 1]}，链表变为 [${[...vals].reverse().join('→')}]`, en: `Done: new head ${vals[vals.length - 1]}, list is [${[...vals].reverse().join('→')}]` },
    action: { type: 'mark', targets: vals.map((_, i) => i), color: 'success' },
    events: [
      { type: 'linked_list.set_head', nodeId: ids[ids.length - 1] },
      ...ids.slice().reverse().map(id => ({ type: 'linked_list.visit' as const, nodeId: id, pointerId: 'cur' })),
    ],
    stats: { comparisons: 0, swaps: vals.length, accesses: vals.length },
  })

  return {
    algorithm: 'linked_list_reversal',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
    initialState: { type: 'linked_list', data: [...vals] },
    result: [...vals].reverse(),
    steps: steps as AnimationScript['steps'],
  }
}
