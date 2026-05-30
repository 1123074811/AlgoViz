import type { AnimationScript } from '@/types/animation'

export function generateQueue(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const queue: number[] = [1, 2, 3]

  // Step 1: initial queue with pipe container
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '队列 (Queue) — FIFO 先进先出，管道形容器，元素从左向右流动', en: 'Queue — FIFO, pipe container, elements flow left to right' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'queue.create', values: [1, 2, 3] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Step 2: enqueue(4)
  queue.push(4)
  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `enqueue(4) → 新元素从队尾（右侧）加入`, en: `enqueue(4) → add to rear (right side)` },
    action: { type: 'insert', targets: [queue.length - 1], color: 'success' },
    events: [{ type: 'queue.enqueue', value: 4 }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Step 3: peek front
  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `front() → 查看队首 = ${queue[0]}（不移除）`, en: `front() → peek front = ${queue[0]} (read only)` },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    events: [{ type: 'queue.peek_front', index: 0 }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Step 4: dequeue()
  const v = queue.shift()!
  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `dequeue() → 从队首（左侧）移除 ${v}，剩余元素前移`, en: `dequeue() → remove ${v} from front (left), remaining shift left` },
    action: { type: 'delete', targets: [0], color: 'danger' },
    events: [{ type: 'queue.dequeue' }],
    stats: { comparisons: 0, swaps: 0, accesses: queue.length + 1 },
  })

  // Step 5: done
  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: `队列操作完成。最终队列: [${queue.join(', ')}]`, en: `Queue ops done. Final: [${queue.join(', ')}]` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'queue',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'queue' },
    initialState: { type: 'array', data: queue },
    steps,
  }
}
