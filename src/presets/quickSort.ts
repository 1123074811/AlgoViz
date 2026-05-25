import type { AnimationScript } from '@/types/animation'

const quickSortPreset: AnimationScript = {
  algorithm: 'quick_sort',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    space: 'O(log n)',
  },
  initialState: {
    type: 'array',
    data: [5, 3, 8, 1, 9, 2],
    labels: ['5', '3', '8', '1', '9', '2'],
  },
  steps: [
    { stepId: 1, codeLine: 0, description: { zh: '选取 pivot = arr[0] = 5', en: 'Select pivot = arr[0] = 5' }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 1, description: { zh: '扫描 arr[1]=3 ≤ pivot=5，归入左边', en: 'Scan arr[1]=3 <= pivot=5, goes left' }, action: { type: 'compare', targets: [0, 1], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 1, description: { zh: '扫描 arr[2]=8 > pivot=5，归入右边', en: 'Scan arr[2]=8 > pivot=5, goes right' }, action: { type: 'compare', targets: [0, 2], color: 'muted' }, stats: { comparisons: 2, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 1, description: { zh: '扫描 arr[3]=1 ≤ pivot=5，归入左边', en: 'Scan arr[3]=1 <= pivot=5, goes left' }, action: { type: 'compare', targets: [0, 3], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 4 } },
    { stepId: 5, codeLine: 1, description: { zh: '扫描 arr[4]=9 > pivot=5，归入右边', en: 'Scan arr[4]=9 > pivot=5, goes right' }, action: { type: 'compare', targets: [0, 4], color: 'muted' }, stats: { comparisons: 4, swaps: 0, accesses: 5 } },
    { stepId: 6, codeLine: 1, description: { zh: '扫描 arr[5]=2 ≤ pivot=5，归入左边', en: 'Scan arr[5]=2 <= pivot=5, goes left' }, action: { type: 'compare', targets: [0, 5], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 6 } },
    { stepId: 7, codeLine: 2, description: { zh: '分区结果：左边 [3,1,2]，pivot=5，右边 [8,9]', en: 'Partition: left [3,1,2], pivot=5, right [8,9]' }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 5, swaps: 0, accesses: 7 } },
    { stepId: 8, codeLine: 3, description: { zh: 'pivot=5 已就位，标记为灰色', en: 'pivot=5 in place, mark muted' }, action: { type: 'mark', targets: [0], color: 'muted' }, stats: { comparisons: 5, swaps: 0, accesses: 7 } },
    // Recursive left: [3,1,2], pivot=3
    { stepId: 9, codeLine: 0, description: { zh: '递归左边：选取 pivot=3', en: 'Recurse left: pivot=3' }, action: { type: 'highlight', targets: [1], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 8 } },
    { stepId: 10, codeLine: 1, description: { zh: 'arr[2]=1 ≤ 3，左边', en: 'arr[2]=1 <= 3, left' }, action: { type: 'compare', targets: [1, 2], color: 'success' }, stats: { comparisons: 6, swaps: 0, accesses: 9 } },
    { stepId: 11, codeLine: 1, description: { zh: 'arr[5]=2 ≤ 3，左边', en: 'arr[5]=2 <= 3, left' }, action: { type: 'compare', targets: [1, 3], color: 'success' }, stats: { comparisons: 7, swaps: 0, accesses: 10 } },
    { stepId: 12, codeLine: 2, description: { zh: '左边分区 [1,2]，pivot=3 就位', en: 'Left partition [1,2], pivot=3 in place' }, action: { type: 'mark', targets: [1], color: 'muted' }, stats: { comparisons: 7, swaps: 0, accesses: 10 } },
    // Recursive [1,2], pivot=1
    { stepId: 13, codeLine: 0, description: { zh: '递归 [1,2]：选取 pivot=1', en: 'Recurse [1,2]: pivot=1' }, action: { type: 'highlight', targets: [2], color: 'warning' }, stats: { comparisons: 7, swaps: 0, accesses: 11 } },
    { stepId: 14, codeLine: 1, description: { zh: 'arr[3]=2 > 1，右边', en: 'arr[3]=2 > 1, right' }, action: { type: 'compare', targets: [2, 3], color: 'muted' }, stats: { comparisons: 8, swaps: 0, accesses: 12 } },
    { stepId: 15, codeLine: 2, description: { zh: 'pivot=1 就位，2 自动就位', en: 'pivot=1 in place, 2 auto-placed' }, action: { type: 'mark', targets: [2, 3], color: 'muted' }, stats: { comparisons: 8, swaps: 0, accesses: 12 } },
    // Recursive right: [8,9], pivot=8
    { stepId: 16, codeLine: 0, description: { zh: '递归右边：选取 pivot=8', en: 'Recurse right: pivot=8' }, action: { type: 'highlight', targets: [4], color: 'warning' }, stats: { comparisons: 8, swaps: 0, accesses: 13 } },
    { stepId: 17, codeLine: 1, description: { zh: 'arr[5]=9 > 8，右边', en: 'arr[5]=9 > 8, right' }, action: { type: 'compare', targets: [4, 5], color: 'muted' }, stats: { comparisons: 9, swaps: 0, accesses: 14 } },
    { stepId: 18, codeLine: 2, description: { zh: 'pivot=8 就位，排序完成！', en: 'pivot=8 in place, sorted!' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5], color: 'success' }, stats: { comparisons: 9, swaps: 0, accesses: 14 } },
  ],
}

export default quickSortPreset
