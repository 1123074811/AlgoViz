import type { AnimationScript } from '@/types/animation'

export function generateStack(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const stack: number[] = [1, 2]

  // Step 1: Create initial stack
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '栈 (Stack) — LIFO 后进先出，初始栈: [1, 2]', en: 'Stack — LIFO, initial: [1, 2]' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [
      { type: 'linked_list.create', variant: 'singly', nodes: [{ id: 's0', value: 2 }, { id: 's1', value: 1 }], headId: 's0' },
      { type: 'linked_list.move_pointer', pointerId: 'top', toNodeId: 's0' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Step 2: push(3)
  stack.push(3)
  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `push(3) → 新元素入栈，成为新的栈顶`, en: `push(3) → new element becomes top` },
    action: { type: 'insert', targets: [stack.length - 1], color: 'success' },
    events: [
      { type: 'scene.highlight', entityId: 's0', role: 'active', color: 'warning' },
      { type: 'linked_list.insert_before', targetNodeId: 's0', newNode: { id: 's2', value: 3 } },
      { type: 'linked_list.set_head', nodeId: 's2' },
      { type: 'linked_list.move_pointer', pointerId: 'top', toNodeId: 's2' },
      { type: 'scene.highlight', entityId: 's2', role: 'inserted', color: 'success' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: stack.length },
  })

  // Step 3: peek top
  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `peek() → 栈顶元素 = ${stack[stack.length - 1]}（仅查看，不移除）`, en: `peek() → top = ${stack[stack.length - 1]} (read only)` },
    action: { type: 'highlight', targets: [stack.length - 1], color: 'warning' },
    events: [
      { type: 'scene.highlight', entityId: 's2', role: 'current', color: 'warning' },
      { type: 'scene.note', text: `top = ${stack[stack.length - 1]}` },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Step 4: pop()
  const v = stack.pop()!
  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `pop() → 移除栈顶元素 ${v}，新栈顶 = ${stack[stack.length - 1]}`, en: `pop() → remove top ${v}, new top = ${stack[stack.length - 1]}` },
    action: { type: 'delete', targets: [stack.length], color: 'danger' },
    events: [
      { type: 'scene.highlight', entityId: 's2', role: 'deleted', color: 'danger' },
      { type: 'linked_list.delete', nodeId: 's2' },
      { type: 'linked_list.set_head', nodeId: 's0' },
      { type: 'linked_list.move_pointer', pointerId: 'top', toNodeId: 's0' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: stack.length + 1 },
  })

  // Step 5: done
  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: `栈操作完成。最终栈: [${stack.join(', ')}]，栈顶 = ${stack[stack.length - 1]}`, en: `Stack ops done. Final: [${stack.join(', ')}], top = ${stack[stack.length - 1]}` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [
      { type: 'scene.clear_highlight' },
      { type: 'scene.highlight', entityId: 's0', role: 'visited', color: 'success' },
      { type: 'scene.highlight', entityId: 's1', role: 'visited', color: 'success' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'stack',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
    initialState: { type: 'linked_list', data: stack },
    steps,
  }
}
