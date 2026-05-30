import type { AnimationScript } from '@/types/animation'

export function generateQueue(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const queue: number[] = [1, 2, 3]

  // Step 1: Create initial queue
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '队列 (Queue) — FIFO 先进先出，初始队列: [1, 2, 3]', en: 'Queue — FIFO, initial: [1, 2, 3]' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [
      { type: 'linked_list.create', variant: 'singly', nodes: [{ id: 'q0', value: 1 }, { id: 'q1', value: 2 }, { id: 'q2', value: 3 }], headId: 'q0', tailId: 'q2' },
      { type: 'linked_list.move_pointer', pointerId: 'front', toNodeId: 'q0' },
      { type: 'linked_list.move_pointer', pointerId: 'rear', toNodeId: 'q2' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Step 2: enqueue(4)
  queue.push(4)
  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `enqueue(4) → 新元素加入队尾，rear 指针后移`, en: `enqueue(4) → add to rear, advance rear pointer` },
    action: { type: 'insert', targets: [queue.length - 1], color: 'success' },
    events: [
      { type: 'scene.highlight', entityId: 'q2', role: 'active', color: 'warning' },
      { type: 'linked_list.insert_after', targetNodeId: 'q2', newNode: { id: 'q3', value: 4 } },
      { type: 'linked_list.set_tail', nodeId: 'q3' },
      { type: 'linked_list.move_pointer', pointerId: 'rear', toNodeId: 'q3' },
      { type: 'scene.highlight', entityId: 'q3', role: 'inserted', color: 'success' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Step 3: peek front
  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `front() → 队首元素 = ${queue[0]}（仅查看，不移除）`, en: `front() → peek front = ${queue[0]} (read only)` },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    events: [
      { type: 'scene.highlight', entityId: 'q0', role: 'current', color: 'warning' },
      { type: 'scene.note', text: `front = ${queue[0]}` },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Step 4: dequeue()
  const v = queue.shift()!
  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `dequeue() → 移除队首元素 ${v}，新队首 = ${queue[0]}`, en: `dequeue() → remove front ${v}, new front = ${queue[0]}` },
    action: { type: 'delete', targets: [0], color: 'danger' },
    events: [
      { type: 'scene.highlight', entityId: 'q0', role: 'deleted', color: 'danger' },
      { type: 'linked_list.delete', nodeId: 'q0' },
      { type: 'linked_list.set_head', nodeId: 'q1' },
      { type: 'linked_list.move_pointer', pointerId: 'front', toNodeId: 'q1' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: queue.length + 1 },
  })

  // Step 5: done
  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: `队列操作完成。最终队列: [${queue.join(', ')}]，front=${queue[0]}, rear=${queue[queue.length - 1]}`, en: `Queue ops done. Final: [${queue.join(', ')}], front=${queue[0]}, rear=${queue[queue.length - 1]}` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [
      { type: 'scene.clear_highlight' },
      { type: 'scene.highlight', entityId: 'q1', role: 'visited', color: 'success' },
      { type: 'scene.highlight', entityId: 'q2', role: 'visited', color: 'success' },
      { type: 'scene.highlight', entityId: 'q3', role: 'visited', color: 'success' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'queue',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
    initialState: { type: 'linked_list', data: queue },
    steps,
  }
}
