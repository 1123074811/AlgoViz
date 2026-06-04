import type { AnimationScript, AnimationStep } from '@/types/animation'

export function generateLeetCode(): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  const arr = [2, 7, 11, 15]

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: 'LeetCode Hot 100 — 两数之和 (Two Sum)', en: 'LeetCode Hot 100 — Two Sum' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })
  steps[0].events = [{ type: 'array.create', values: [...arr] }]

  steps.push({ stepId: sid++, codeLine: 1, description: { zh: `nums = [${arr.join(', ')}], target = 9`, en: `nums = [${arr.join(', ')}], target = 9` }, action: { type: 'highlight', targets: [0, 1, 2, 3], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 4 } })

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: 'i=0: nums[0]=2, 查 map 中是否有 target-2=7 → 无，map[2]=0', en: 'i=0: 2, check map for 7 → no, map[2]=0' }, action: { type: 'compare', targets: [0], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 1 } })
  steps[steps.length - 1].events = [{ type: 'array.compare', indices: [0, 0] }]

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: 'i=1: nums[1]=7, 查 map 中是否有 target-7=2 → 找到！result=[0,1]', en: 'i=1: 7, check map for 2 → found! result=[0,1]' }, action: { type: 'mark', targets: [0, 1], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 2 } })
  steps[steps.length - 1].events = [{ type: 'array.compare', indices: [1, 0] }]

  steps.push({ stepId: sid++, codeLine: 5, description: { zh: 'O(n) 时间, O(n) 空间 — 哈希表一次遍历', en: 'O(n) time, O(n) space — single pass with hash map' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 2, swaps: 0, accesses: 2 } })

  return { algorithm: 'leetcode_hot100', complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' }, presentation: { engine: 'scene', module: 'array' }, initialState: { type: 'array', data: arr }, steps: steps as AnimationScript['steps'] }
}
