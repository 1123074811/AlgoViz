import type { AnimationScript } from '@/types/animation'

const binarySearchPreset: AnimationScript = {
  algorithm: 'binary_search',
  complexity: {
    time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(1)',
  },
  initialState: {
    type: 'array',
    data: [1, 3, 5, 7, 9, 11, 13, 15],
    labels: ['1', '3', '5', '7', '9', '11', '13', '15'],
  },
  steps: [
    {
      stepId: 1,
      codeLine: 1,
      description: { zh: '初始化 left=0, right=7，搜索目标 target=7', en: 'Init left=0, right=7, target=7' },
      action: { type: 'highlight', targets: [0, 7], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 2 },
    },
    {
      stepId: 2,
      codeLine: 3,
      description: { zh: '计算 mid = 0 + (7-0)//2 = 3，arr[3]=7', en: 'Compute mid=3, arr[3]=7' },
      action: { type: 'compare', targets: [3], color: 'warning' },
      stats: { comparisons: 1, swaps: 0, accesses: 3 },
    },
    {
      stepId: 3,
      codeLine: 4,
      description: { zh: 'arr[3]=7 == target=7，找到目标！', en: 'arr[3]=7 == target=7, found!' },
      action: { type: 'mark', targets: [3], color: 'success' },
      stats: { comparisons: 1, swaps: 0, accesses: 3 },
    },
    {
      stepId: 4,
      codeLine: 5,
      description: { zh: '返回索引 3', en: 'Return index 3' },
      action: { type: 'highlight', targets: [3], color: 'success' },
      stats: { comparisons: 1, swaps: 0, accesses: 3 },
    },
  ],
}

export default binarySearchPreset
