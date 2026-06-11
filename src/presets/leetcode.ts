import type { AnimationScript, AnimationStep } from '@/types/animation'
import { clampForDemo } from './utils'

const DEFAULT_NUMS = [2, 7, 11, 15]
const DEFAULT_TARGET = 9
const DEMO_CAP = 12

interface ParsedLeetInput { nums: number[]; target: number; truncated: boolean; original: number; usedDefault: boolean }

function parseInput(input?: unknown): ParsedLeetInput {
  if (Array.isArray(input)) {
    const all = input.map(Number).filter(Number.isFinite)
    const { data, truncated, original } = clampForDemo(all, DEMO_CAP)
    return data.length > 0
      ? { nums: data, target: DEFAULT_TARGET, truncated, original, usedDefault: false }
      : { nums: DEFAULT_NUMS, target: DEFAULT_TARGET, truncated: false, original: DEFAULT_NUMS.length, usedDefault: true }
  }

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>
    const rawNums = obj.nums ?? obj.data ?? obj.arr ?? obj.array
    const all = Array.isArray(rawNums) ? rawNums.map(Number).filter(Number.isFinite) : []
    const { data, truncated, original } = clampForDemo(all, DEMO_CAP)
    const target = typeof obj.target === 'number'
      ? obj.target
      : typeof obj.param === 'number'
        ? obj.param
        : DEFAULT_TARGET
    return data.length > 0
      ? { nums: data, target, truncated, original, usedDefault: false }
      : { nums: DEFAULT_NUMS, target: DEFAULT_TARGET, truncated: false, original: DEFAULT_NUMS.length, usedDefault: true }
  }

  return { nums: DEFAULT_NUMS, target: DEFAULT_TARGET, truncated: false, original: DEFAULT_NUMS.length, usedDefault: true }
}

export function generateLeetCode(input?: unknown): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  const { nums, target, truncated, original, usedDefault } = parseInput(input)
  const seen = new Map<number, number>()
  let found: [number, number] | null = null

  // 输入无法解析时静默用示例数据会误导用户以为是自己的输入——显式说明。
  if (usedDefault) {
    steps.push({
      stepId: sid++,
      codeLine: 0,
      description: {
        zh: `未检测到有效输入，已用示例数据 [${DEFAULT_NUMS.join(', ')}] 演示`,
        en: `No valid input detected; demonstrating with sample data [${DEFAULT_NUMS.join(', ')}]`,
      },
      action: { type: 'highlight', targets: [], color: 'warning' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: [{ type: 'scene.note', text: `未检测到有效输入，使用示例数据 [${DEFAULT_NUMS.join(', ')}]` }],
    })
  }
  // 真实累加的运行计数(替代旧版 i+1 估算):
  //   comps = 哈希查找次数(每轮一次 seen.get 判断是否命中)
  //   acc   = 数据访问次数(展示读一遍 + 每轮读 nums[i] 与一次 map 访问)
  let comps = 0
  let acc = nums.length

  if (truncated) {
    steps.push({
      stepId: sid++,
      codeLine: 0,
      description: {
        zh: `输入共 ${original} 个元素，超出演示上限，已截断为前 12 个`,
        en: `Input has ${original} elements, beyond the demo cap; truncated to the first 12`,
      },
      action: { type: 'highlight', targets: [], color: 'warning' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: [{ type: 'scene.note', text: `输入共 ${original} 个元素，演示仅取前 12 个` }],
    })
  }

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
    acc++ // 读 nums[i]
    const need = target - value
    const mate = seen.get(need)
    comps++ // 一次哈希查找(判断 need 是否已记录)
    acc++ // 一次 map 访问
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
        stats: { comparisons: comps, swaps: 0, accesses: acc },
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
      stats: { comparisons: comps, swaps: 0, accesses: acc },
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
    stats: { comparisons: comps, swaps: 0, accesses: acc },
  })

  return {
    algorithm: 'leetcode_hot100',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: nums },
    steps: steps as AnimationScript['steps'],
  }
}
