import type { AnimationScript } from '@/types/animation'

export function generateStack(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const stack: number[] = []

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '栈 (Stack) — LIFO 后进先出', en: 'Stack — LIFO Last In First Out' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })
  steps[0].events = [{ type: 'array.create', values: [1, 2] }]

  for (const v of [1, 2, 3]) {
    stack.push(v)
    steps.push({ stepId: sid++, codeLine: 2, description: { zh: `push(${v}) → 栈: [${stack.join(', ')}]`, en: `push(${v}) → stack: [${stack.join(', ')}]` }, action: { type: 'insert', targets: [stack.length - 1], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: stack.length } })
    steps[steps.length - 1].events = [{ type: 'array.compare', indices: [stack.length - 1, stack.length - 1] }]
  }

  steps.push({ stepId: sid++, codeLine: 4, description: { zh: `栈顶 peek = ${stack[stack.length - 1]}`, en: `Top peek = ${stack[stack.length - 1]}` }, action: { type: 'highlight', targets: [stack.length - 1], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })
  steps[steps.length - 1].events = [{ type: 'array.compare', indices: [stack.length - 1, stack.length - 1] }]

  const v = stack.pop()!
  steps.push({ stepId: sid++, codeLine: 5, description: { zh: `pop() → ${v}，栈: [${stack.join(', ')}]`, en: `pop() → ${v}, stack: [${stack.join(', ')}]` }, action: { type: 'delete', targets: [stack.length], color: 'danger' }, stats: { comparisons: 0, swaps: 0, accesses: stack.length + 1 } })
  steps[steps.length - 1].events = [{ type: 'array.mark_sorted', indices: [0] }]

  return {
    algorithm: 'stack', complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: [1, 2] },
    steps: steps as AnimationScript['steps'],
  }
}
