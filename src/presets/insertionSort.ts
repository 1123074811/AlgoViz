import type { AnimationScript } from '@/types/animation'

const insertionSortPreset: AnimationScript = {
  algorithm: 'insertion_sort',
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
  },
  initialState: {
    type: 'array',
    data: [5, 3, 8, 1, 9, 2],
    labels: ['5', '3', '8', '1', '9', '2'],
  },
  steps: [
    { stepId: 1, codeLine: 0, description: { zh: '从索引 1 (值=3) 开始，已排序区域: [0..0]', en: 'Start from index 1 (val=3), sorted: [0..0]' }, action: { type: 'highlight', targets: [0], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } },
    { stepId: 2, codeLine: 1, description: { zh: '取出 arr[1]=3 作为 key', en: 'Take arr[1]=3 as key' }, action: { type: 'highlight', targets: [1], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } },
    { stepId: 3, codeLine: 3, description: { zh: '比较 key=3 < arr[0]=5，将 5 右移一位', en: 'Compare key=3 < arr[0]=5, shift 5 right' }, action: { type: 'compare', targets: [0, 1], color: 'danger' }, stats: { comparisons: 1, swaps: 0, accesses: 3 } },
    { stepId: 4, codeLine: 4, description: { zh: '5 已右移，插入 3 到索引 0', en: '5 shifted right, insert 3 at index 0' }, action: { type: 'swap', targets: [0, 1], color: 'danger' }, stats: { comparisons: 1, swaps: 1, accesses: 4 } },
    { stepId: 5, codeLine: 5, description: { zh: '插入完成，已排序: [0..1] = [3,5]', en: 'Inserted, sorted: [0..1] = [3,5]' }, action: { type: 'mark', targets: [0, 1], color: 'success' }, stats: { comparisons: 1, swaps: 1, accesses: 5 } },
    { stepId: 6, codeLine: 1, description: { zh: '取出 arr[2]=8 作为 key', en: 'Take arr[2]=8 as key' }, action: { type: 'highlight', targets: [2], color: 'warning' }, stats: { comparisons: 1, swaps: 1, accesses: 6 } },
    { stepId: 7, codeLine: 3, description: { zh: '比较 key=8 > arr[1]=5，不需要移动', en: 'Compare key=8 > arr[1]=5, no shift needed' }, action: { type: 'compare', targets: [1, 2], color: 'muted' }, stats: { comparisons: 2, swaps: 1, accesses: 7 } },
    { stepId: 8, codeLine: 5, description: { zh: '8 留在原位，已排序: [0..2]', en: '8 stays, sorted: [0..2]' }, action: { type: 'mark', targets: [2], color: 'success' }, stats: { comparisons: 2, swaps: 1, accesses: 8 } },
    { stepId: 9, codeLine: 1, description: { zh: '取出 arr[3]=1 作为 key', en: 'Take arr[3]=1 as key' }, action: { type: 'highlight', targets: [3], color: 'warning' }, stats: { comparisons: 2, swaps: 1, accesses: 9 } },
    { stepId: 10, codeLine: 3, description: { zh: '比较 key=1 < arr[2]=8，将 8 右移', en: 'Compare key=1 < arr[2]=8, shift 8 right' }, action: { type: 'compare', targets: [2, 3], color: 'danger' }, stats: { comparisons: 3, swaps: 1, accesses: 10 } },
    { stepId: 11, codeLine: 3, description: { zh: '比较 key=1 < arr[1]=5，将 5 右移', en: 'Compare key=1 < arr[1]=5, shift 5 right' }, action: { type: 'compare', targets: [1, 2], color: 'danger' }, stats: { comparisons: 4, swaps: 1, accesses: 11 } },
    { stepId: 12, codeLine: 3, description: { zh: '比较 key=1 < arr[0]=3，将 3 右移', en: 'Compare key=1 < arr[0]=3, shift 3 right' }, action: { type: 'compare', targets: [0, 1], color: 'danger' }, stats: { comparisons: 5, swaps: 1, accesses: 12 } },
    { stepId: 13, codeLine: 5, description: { zh: '插入 1 到索引 0，数组变为 [1,3,5,8,9,2]', en: 'Insert 1 at index 0, array: [1,3,5,8,9,2]' }, action: { type: 'mark', targets: [0, 1, 2, 3], color: 'success' }, stats: { comparisons: 5, swaps: 3, accesses: 15 } },
    { stepId: 14, codeLine: 1, description: { zh: '取出 arr[4]=9 作为 key', en: 'Take arr[4]=9 as key' }, action: { type: 'highlight', targets: [4], color: 'warning' }, stats: { comparisons: 5, swaps: 3, accesses: 16 } },
    { stepId: 15, codeLine: 3, description: { zh: '比较 key=9 > arr[3]=8，不需要移动', en: 'Compare key=9 > arr[3]=8, no shift' }, action: { type: 'compare', targets: [3, 4], color: 'muted' }, stats: { comparisons: 6, swaps: 3, accesses: 17 } },
    { stepId: 16, codeLine: 5, description: { zh: '9 留在原位，已排序: [0..4]', en: '9 stays, sorted: [0..4]' }, action: { type: 'mark', targets: [4], color: 'success' }, stats: { comparisons: 6, swaps: 3, accesses: 18 } },
    { stepId: 17, codeLine: 1, description: { zh: '取出 arr[5]=2 作为 key', en: 'Take arr[5]=2 as key' }, action: { type: 'highlight', targets: [5], color: 'warning' }, stats: { comparisons: 6, swaps: 3, accesses: 19 } },
    { stepId: 18, codeLine: 3, description: { zh: '比较 key=2 < arr[4]=9，将 9 右移', en: 'Compare key=2 < arr[4]=9, shift 9 right' }, action: { type: 'compare', targets: [4, 5], color: 'danger' }, stats: { comparisons: 7, swaps: 3, accesses: 20 } },
    { stepId: 19, codeLine: 3, description: { zh: '比较 key=2 < arr[3]=8，将 8 右移', en: 'Compare key=2 < arr[3]=8, shift 8 right' }, action: { type: 'compare', targets: [3, 4], color: 'danger' }, stats: { comparisons: 8, swaps: 3, accesses: 21 } },
    { stepId: 20, codeLine: 3, description: { zh: '比较 key=2 < arr[2]=5，将 5 右移', en: 'Compare key=2 < arr[2]=5, shift 5 right' }, action: { type: 'compare', targets: [2, 3], color: 'danger' }, stats: { comparisons: 9, swaps: 3, accesses: 22 } },
    { stepId: 21, codeLine: 3, description: { zh: '比较 key=2 < arr[1]=3，将 3 右移', en: 'Compare key=2 < arr[1]=3, shift 3 right' }, action: { type: 'compare', targets: [1, 2], color: 'danger' }, stats: { comparisons: 10, swaps: 3, accesses: 23 } },
    { stepId: 22, codeLine: 3, description: { zh: '比较 key=2 > arr[0]=1，停止移动', en: 'Compare key=2 > arr[0]=1, stop' }, action: { type: 'compare', targets: [0, 1], color: 'muted' }, stats: { comparisons: 11, swaps: 3, accesses: 24 } },
    { stepId: 23, codeLine: 5, description: { zh: '插入 2 到索引 1，排序完成！', en: 'Insert 2 at index 1, sorted!' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5], color: 'success' }, stats: { comparisons: 11, swaps: 4, accesses: 27 } },
  ],
}

export default insertionSortPreset
