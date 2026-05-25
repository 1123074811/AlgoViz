import type { AnimationScript } from '@/types/animation'

const mergeSortPreset: AnimationScript = {
  algorithm: 'merge_sort',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
  },
  initialState: {
    type: 'array',
    data: [5, 3, 8, 1, 9, 2],
    labels: ['5', '3', '8', '1', '9', '2'],
  },
  steps: [
    // Split [5,3,8,1,9,2] -> [5,3,8] + [1,9,2]
    { stepId: 1, codeLine: 0, description: { zh: '分割：取中点 mid=3，左半 [5,3,8]，右半 [1,9,2]', en: 'Split at mid=3, left [5,3,8], right [1,9,2]' }, action: { type: 'compare', targets: [0, 1, 2], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 6 } },
    { stepId: 2, codeLine: 0, description: { zh: '标记右半部分 [1,9,2]', en: 'Mark right half [1,9,2]' }, action: { type: 'compare', targets: [3, 4, 5], color: 'muted' }, stats: { comparisons: 0, swaps: 0, accesses: 6 } },
    // Split left [5,3,8] -> [5] + [3,8]
    { stepId: 3, codeLine: 2, description: { zh: '递归左半 [5,3,8]，取中点 mid=1，[5] | [3,8]', en: 'Recurse on [5,3,8], mid=1, [5] | [3,8]' }, action: { type: 'highlight', targets: [0, 1, 2], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 9 } },
    // Split [3,8] -> [3] + [8]
    { stepId: 4, codeLine: 2, description: { zh: '递归 [3,8]，mid=1，[3] | [8]', en: 'Recurse on [3,8], mid=1, [3] | [8]' }, action: { type: 'highlight', targets: [1, 2], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 11 } },
    // Merge [3] + [8] -> [3,8]
    { stepId: 5, codeLine: 6, description: { zh: '合并 [3] 和 [8]：比较 3<8，放入3，再放入8', en: 'Merge [3] and [8]: 3<8, put 3 then 8' }, action: { type: 'compare', targets: [1, 2], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 13 } },
    { stepId: 6, codeLine: 10, description: { zh: '[3,8] 合并完成', en: '[3,8] merged' }, action: { type: 'mark', targets: [1, 2], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 13 } },
    // Merge [5] + [3,8] -> [3,5,8]
    { stepId: 7, codeLine: 6, description: { zh: '合并 [5] 和 [3,8]：比较 5>3，放入3', en: 'Merge [5] and [3,8]: 5>3, put 3' }, action: { type: 'compare', targets: [0, 1], color: 'warning' }, stats: { comparisons: 2, swaps: 0, accesses: 14 } },
    { stepId: 8, codeLine: 8, description: { zh: '比较 5<8，放入5', en: 'Compare 5<8, put 5' }, action: { type: 'compare', targets: [0, 2], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 15 } },
    { stepId: 9, codeLine: 10, description: { zh: '放入剩余8，[3,5,8] 合并完成', en: 'Put remaining 8, [3,5,8] merged' }, action: { type: 'mark', targets: [0, 1, 2], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 16 } },
    // Split right [1,9,2] -> [1] + [9,2]
    { stepId: 10, codeLine: 2, description: { zh: '递归右半 [1,9,2]，mid=1，[1] | [9,2]', en: 'Recurse on [1,9,2], mid=1, [1] | [9,2]' }, action: { type: 'highlight', targets: [3, 4, 5], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 19 } },
    // Split [9,2] -> [9] + [2]
    { stepId: 11, codeLine: 2, description: { zh: '递归 [9,2]，mid=1，[9] | [2]', en: 'Recurse on [9,2], mid=1, [9] | [2]' }, action: { type: 'highlight', targets: [4, 5], color: 'warning' }, stats: { comparisons: 3, swaps: 0, accesses: 21 } },
    // Merge [9] + [2] -> [2,9]
    { stepId: 12, codeLine: 6, description: { zh: '合并 [9] 和 [2]：比较 9>2，放入2 再放入9', en: 'Merge [9] and [2]: 9>2, put 2 then 9' }, action: { type: 'compare', targets: [4, 5], color: 'warning' }, stats: { comparisons: 4, swaps: 0, accesses: 23 } },
    { stepId: 13, codeLine: 10, description: { zh: '[2,9] 合并完成', en: '[2,9] merged' }, action: { type: 'mark', targets: [4, 5], color: 'success' }, stats: { comparisons: 4, swaps: 0, accesses: 23 } },
    // Merge [1] + [2,9] -> [1,2,9]
    { stepId: 14, codeLine: 6, description: { zh: '合并 [1] 和 [2,9]：比较 1<2，放入1', en: 'Merge [1] and [2,9]: 1<2, put 1' }, action: { type: 'compare', targets: [3, 4], color: 'warning' }, stats: { comparisons: 5, swaps: 0, accesses: 24 } },
    { stepId: 15, codeLine: 8, description: { zh: '放入剩余2,9，[1,2,9] 合并完成', en: 'Put remaining 2,9, [1,2,9] merged' }, action: { type: 'mark', targets: [3, 4, 5], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 25 } },
    // Final merge [3,5,8] + [1,2,9] -> [1,2,3,5,8,9]
    { stepId: 16, codeLine: 6, description: { zh: '最终合并 [3,5,8] 和 [1,2,9]：比较 3>1，放入1', en: 'Final merge: 3>1, put 1' }, action: { type: 'compare', targets: [0, 3], color: 'warning' }, stats: { comparisons: 6, swaps: 0, accesses: 26 } },
    { stepId: 17, codeLine: 8, description: { zh: '比较 3>2，放入2', en: '3>2, put 2' }, action: { type: 'compare', targets: [0, 4], color: 'warning' }, stats: { comparisons: 7, swaps: 0, accesses: 27 } },
    { stepId: 18, codeLine: 6, description: { zh: '比较 3<9，放入3', en: '3<9, put 3' }, action: { type: 'compare', targets: [0, 5], color: 'warning' }, stats: { comparisons: 8, swaps: 0, accesses: 28 } },
    { stepId: 19, codeLine: 6, description: { zh: '比较 5<9，放入5', en: '5<9, put 5' }, action: { type: 'compare', targets: [1, 5], color: 'warning' }, stats: { comparisons: 9, swaps: 0, accesses: 29 } },
    { stepId: 20, codeLine: 6, description: { zh: '比较 8<9，放入8', en: '8<9, put 8' }, action: { type: 'compare', targets: [2, 5], color: 'warning' }, stats: { comparisons: 10, swaps: 0, accesses: 30 } },
    { stepId: 21, codeLine: 10, description: { zh: '放入剩余9，排序完成！', en: 'Put remaining 9, sorted!' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5], color: 'success' }, stats: { comparisons: 10, swaps: 0, accesses: 32 } },
  ],
}

export default mergeSortPreset
