import type { AnimationScript } from '@/types/animation'

export function generateQueue(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const queue: number[] = []

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '队列 (Queue) — FIFO 先进先出', en: 'Queue — FIFO First In First Out' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  for (const v of [1, 2, 3]) {
    queue.push(v)
    steps.push({ stepId: sid++, codeLine: 2, description: { zh: `enqueue(${v}) → 队: [${queue.join(', ')}]`, en: `enqueue(${v}) → queue: [${queue.join(', ')}]` }, action: { type: 'insert', targets: [queue.length - 1], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: queue.length } })
  }

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: `队首 front = ${queue[0]}`, en: `Front = ${queue[0]}` }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  const v = queue.shift()!
  steps.push({ stepId: sid++, codeLine: 4, description: { zh: `dequeue() → ${v}，队: [${queue.join(', ')}]`, en: `dequeue() → ${v}, queue: [${queue.join(', ')}]` }, action: { type: 'delete', targets: [0], color: 'danger' }, stats: { comparisons: 0, swaps: 0, accesses: queue.length + 1 } })

  return {
    algorithm: 'queue', complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    initialState: { type: 'array', data: [2, 3] },
    steps: steps as AnimationScript['steps'],
  }
}
