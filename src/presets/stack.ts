import type { AnimationScript } from '@/types/animation'

export function generateStack(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const initialStack = [1, 2]
  const stack = [...initialStack]

  // Step 1: initial stack with U-shape container
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '栈 (Stack) — LIFO 后进先出，U 形容器底部封闭、顶部开口', en: 'Stack — LIFO, U-shaped container open at top' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'stack.create', values: [1, 2] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Step 2: push(3)
  stack.push(3)
  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `push(3) → 新元素从顶部压入栈中，栈顶 = 3`, en: `push(3) → push onto top, top = 3` },
    action: { type: 'insert', targets: [stack.length - 1], color: 'success' },
    events: [{ type: 'stack.push', value: 3 }],
    stats: { comparisons: 0, swaps: 0, accesses: stack.length },
  })

  // Step 3: peek top
  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `peek() → 查看栈顶 = ${stack[stack.length - 1]}（不移除）`, en: `peek() → top = ${stack[stack.length - 1]} (read only)` },
    action: { type: 'highlight', targets: [stack.length - 1], color: 'warning' },
    events: [{ type: 'stack.peek', index: stack.length - 1 }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Step 4: pop()
  const v = stack.pop()!
  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `pop() → 从顶部弹出 ${v}，新栈顶 = ${stack[stack.length - 1]}`, en: `pop() → pop ${v} from top, new top = ${stack[stack.length - 1]}` },
    action: { type: 'delete', targets: [stack.length], color: 'danger' },
    events: [{ type: 'stack.pop' }],
    stats: { comparisons: 0, swaps: 0, accesses: stack.length + 1 },
  })

  // Step 5: done
  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: `栈操作完成。最终栈: [${stack.join(', ')}]`, en: `Stack ops done. Final: [${stack.join(', ')}]` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'stack',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'stack' },
    initialState: { type: 'array', data: initialStack },
    steps,
  }
}
