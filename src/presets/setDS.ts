import type { AnimationScript } from '@/types/animation'

export function generateSet(values?: number[]): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const initialValues = values && values.length > 0 ? values : [1, 2, 3]

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '集合 (Set) — 无序、不重复元素的椭圆容器', en: 'Set — unordered unique elements in ellipse container' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'set.create', values: [...initialValues] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `add(4) → 在集合中添加新元素 4`, en: `add(4) → insert element 4 into the set` },
    action: { type: 'insert', targets: [initialValues.length], color: 'success' },
    events: [{ type: 'set.add', value: 4 }],
    stats: { comparisons: 0, swaps: 0, accesses: initialValues.length + 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `contains(2) → 查找元素 2，在集合中找到`, en: `contains(2) → search for 2, found in set` },
    action: { type: 'highlight', targets: [1], color: 'success' },
    events: [{ type: 'set.contains', value: 2, found: true }],
    stats: { comparisons: 1, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `contains(99) → 查找 99，集合中不存在`, en: `contains(99) → search for 99, not found` },
    action: { type: 'highlight', targets: [], color: 'danger' },
    events: [{ type: 'set.contains', value: 99, found: false }],
    stats: { comparisons: initialValues.length, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: `remove(2) → 从集合中删除元素 2`, en: `remove(2) → delete element 2 from set` },
    action: { type: 'delete', targets: [1], color: 'danger' },
    events: [{ type: 'set.remove', value: 2 }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: '集合操作完成。最终: {1, 3, 4}', en: 'Set ops done. Final: {1, 3, 4}' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'set',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'set' },
    initialState: { type: 'array', data: initialValues },
    steps,
  }
}
