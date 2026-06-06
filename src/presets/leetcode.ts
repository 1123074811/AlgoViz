import type { AnimationScript, AnimationStep } from '@/types/animation'

const DEFAULT_NUMS = [2, 7, 11, 15]
const DEFAULT_TARGET = 9

function parseInput(input?: unknown): { nums: number[]; target: number } {
  if (Array.isArray(input)) {
    const nums = input.map(Number).filter(Number.isFinite).slice(0, 12)
    return { nums: nums.length > 0 ? nums : DEFAULT_NUMS, target: DEFAULT_TARGET }
  }

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>
    const rawNums = obj.nums ?? obj.data ?? obj.arr ?? obj.array
    const nums = Array.isArray(rawNums)
      ? rawNums.map(Number).filter(Number.isFinite).slice(0, 12)
      : DEFAULT_NUMS
    const target = typeof obj.target === 'number'
      ? obj.target
      : typeof obj.param === 'number'
        ? obj.param
        : DEFAULT_TARGET
    return { nums: nums.length > 0 ? nums : DEFAULT_NUMS, target }
  }

  return { nums: DEFAULT_NUMS, target: DEFAULT_TARGET }
}

export function generateLeetCode(input?: unknown): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  const { nums, target } = parseInput(input)
  const seen = new Map<number, number>()
  let found: [number, number] | null = null

  steps.push({
    stepId: sid++,
    codeLine: 0,
    description: { zh: 'LeetCode Hot 100 — 两数之和 (Two Sum)', en: 'LeetCode Hot 100 — Two Sum' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    events: [{ type: 'array.create', values: [...nums] }],
  })

  steps.push({
    stepId: sid++,
    codeLine: 1,
    description: { zh: `nums = [${nums.join(', ')}], target = ${target}`, en: `nums = [${nums.join(', ')}], target = ${target}` },
    action: { type: 'highlight', targets: nums.map((_, index) => index), color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: nums.length },
  })

  for (let i = 0; i < nums.length; i++) {
    const value = nums[i]
    const need = target - value
    const mate = seen.get(need)
    if (mate !== undefined) {
      found = [mate, i]
      steps.push({
        stepId: sid++,
        codeLine: 3,
        description: {
          zh: `i=${i}: nums[${i}]=${value}，查找 target-${value}=${need} → 找到下标 ${mate}，result=[${mate},${i}]`,
          en: `i=${i}: nums[${i}]=${value}, check target-${value}=${need} -> found index ${mate}, result=[${mate},${i}]`,
        },
        action: { type: 'mark', targets: [mate, i], color: 'success' },
        stats: { comparisons: i + 1, swaps: 0, accesses: i + 1 },
        events: [{ type: 'array.compare', indices: [i, mate] }],
      })
      break
    }

    steps.push({
      stepId: sid++,
      codeLine: 3,
      description: {
        zh: `i=${i}: nums[${i}]=${value}，查 map 中是否有 ${need} → 无，记录 ${value} -> ${i}`,
        en: `i=${i}: nums[${i}]=${value}, check map for ${need} -> no, store ${value} -> ${i}`,
      },
      action: { type: 'compare', targets: [i], color: 'warning' },
      stats: { comparisons: i + 1, swaps: 0, accesses: i + 1 },
      events: [{ type: 'array.compare', indices: [i, i] }],
    })
    if (!seen.has(value)) seen.set(value, i)
  }

  steps.push({
    stepId: sid++,
    codeLine: 5,
    description: found
      ? { zh: `返回下标 [${found[0]}, ${found[1]}]，对应值 ${nums[found[0]]} + ${nums[found[1]]} = ${target}`, en: `Return indices [${found[0]}, ${found[1]}], values ${nums[found[0]]} + ${nums[found[1]]} = ${target}` }
      : { zh: `遍历结束，没有两数之和等于 target=${target}`, en: `Traversal finished; no pair sums to target=${target}` },
    action: { type: 'mark', targets: found ? [...found] : [], color: found ? 'success' : 'danger' },
    stats: { comparisons: nums.length, swaps: 0, accesses: nums.length },
  })

  return {
    algorithm: 'leetcode_hot100',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: nums },
    steps: steps as AnimationScript['steps'],
  }
}
