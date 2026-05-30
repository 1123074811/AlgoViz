import type { AnimationScript } from '@/types/animation'

export function generateArray(): AnimationScript {
  const arr = [1, 2, 3, 4, 5]
  return {
    algorithm: 'array',
    presentation: { engine: 'scene', module: 'array' },
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    initialState: { type: 'array', data: arr },
    steps: [
      {
        stepId: 1, codeLine: 0,
        description: { zh: `数组初始化: [${arr.join(', ')}]`, en: `Array init: [${arr.join(', ')}]` },
        action: { type: 'highlight', targets: [], color: 'primary' },
        events: [{ type: 'array.create', values: arr }],
        stats: { comparisons: 0, swaps: 0, accesses: arr.length },
      },
      {
        stepId: 2, codeLine: 2,
        description: { zh: `随机访问 arr[2] = ${arr[2]} (O(1))`, en: `Random access arr[2] = ${arr[2]} (O(1))` },
        action: { type: 'compare', targets: [2], color: 'warning' },
        events: [{ type: 'array.compare', indices: [2, 2] }],
        stats: { comparisons: 0, swaps: 0, accesses: 1 },
      },
      {
        stepId: 3, codeLine: 3,
        description: { zh: `追加 6 → [${[...arr, 6].join(', ')}]`, en: `Append 6 → [${[...arr, 6].join(', ')}]` },
        action: { type: 'insert', targets: [5], color: 'success' },
        events: [{ type: 'array.create', values: [...arr, 6] }],
        stats: { comparisons: 0, swaps: 0, accesses: 1 },
      },
      {
        stepId: 4, codeLine: 4,
        description: { zh: `删除索引 1 → [${[...arr.slice(0, 1), ...arr.slice(2)].join(', ')}] (O(n))`, en: `Remove idx 1 → [${[...arr.slice(0, 1), ...arr.slice(2)].join(', ')}] (O(n))` },
        action: { type: 'delete', targets: [1], color: 'danger' },
        events: [{ type: 'array.create', values: [...arr.slice(0, 1), ...arr.slice(2)] }],
        stats: { comparisons: 0, swaps: 0, accesses: 4 },
      },
    ],
  }
}
