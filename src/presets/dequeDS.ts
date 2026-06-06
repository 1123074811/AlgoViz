import type { AnimationScript } from '@/types/animation'

export function generateDeque(values?: number[]): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const initialValues = values && values.length > 0 ? values : [2, 3]

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '双端队列 (Deque) — 两端均可 push/pop 的管道容器', en: 'Deque — double-ended queue, push/pop from both ends' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'deque.create', values: [...initialValues] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `push_front(1) → 从前端插入 1`, en: `push_front(1) → insert 1 at front` },
    action: { type: 'insert', targets: [0], color: 'success' },
    events: [{ type: 'deque.push_front', value: 1 }],
    stats: { comparisons: 0, swaps: 0, accesses: initialValues.length + 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `push_back(4) → 从后端插入 4`, en: `push_back(4) → insert 4 at back` },
    action: { type: 'insert', targets: [initialValues.length + 1], color: 'success' },
    events: [{ type: 'deque.push_back', value: 4 }],
    stats: { comparisons: 0, swaps: 0, accesses: initialValues.length + 2 },
  })

  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `peek_front() → 查看前端 = 1（不移除）`, en: `peek_front() → front = 1 (read only)` },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    events: [{ type: 'deque.peek_front', index: 0 }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: `peek_back() → 查看后端 = 4（不移除）`, en: `peek_back() → back = 4 (read only)` },
    action: { type: 'highlight', targets: [3], color: 'warning' },
    events: [{ type: 'deque.peek_back', index: 3 }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: `pop_front() → 从前端弹出 1`, en: `pop_front() → pop 1 from front` },
    action: { type: 'delete', targets: [0], color: 'danger' },
    events: [{ type: 'deque.pop_front' }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 7,
    description: { zh: `pop_back() → 从后端弹出 4`, en: `pop_back() → pop 4 from back` },
    action: { type: 'delete', targets: [2], color: 'danger' },
    events: [{ type: 'deque.pop_back' }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: '双端队列操作完成。最终: [2, 3]', en: 'Deque ops done. Final: [2, 3]' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'deque',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'deque' },
    initialState: { type: 'array', data: initialValues },
    steps,
  }
}
