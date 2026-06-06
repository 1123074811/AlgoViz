import type { AnimationScript, AnimationStep } from '@/types/animation'

const DEFAULT_NUMS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

function parseNums(input?: unknown): number[] {
  const source = Array.isArray(input)
    ? input
    : typeof input === 'object' && input !== null
      ? ((input as Record<string, unknown>).nums
        ?? (input as Record<string, unknown>).data
        ?? (input as Record<string, unknown>).arr
        ?? (input as Record<string, unknown>).array)
      : input
  const nums = Array.isArray(source)
    ? source.map(Number).filter(Number.isFinite).map(v => Math.trunc(v)).slice(0, 16)
    : []
  return nums.length > 0 ? nums : DEFAULT_NUMS
}

function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) return false
  }
  return true
}

export function generateACM(input?: unknown): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  const nums = parseNums(input)
  const first = Math.abs(nums[0] ?? 2)
  const exponent = Math.max(1, Math.min(12, Math.abs(nums[1] ?? 10)))
  const powValue = first ** exponent
  const primeIndices = nums.map((value, index) => isPrime(Math.abs(value)) ? index : -1).filter(index => index >= 0)
  const mid = Math.floor(nums.length / 2)

  steps.push({
    stepId: sid++,
    codeLine: 0,
    description: { zh: `ACM 常用算法模板，示例数据来自输入：${nums.join(', ')}`, en: `ACM common templates, using input data: ${nums.join(', ')}` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    events: [{ type: 'array.create', values: [...nums] }],
  })

  steps.push({
    stepId: sid++,
    codeLine: 2,
    description: { zh: `快速幂: pow(${first}, ${exponent}) = ${powValue} (O(log n))`, en: `Fast power: pow(${first}, ${exponent}) = ${powValue} (O(log n))` },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
    events: [{ type: 'array.compare', indices: [0, Math.min(1, nums.length - 1)] }],
  })

  steps.push({
    stepId: sid++,
    codeLine: 3,
    description: {
      zh: `素数筛/质数判断: 输入中的质数下标为 [${primeIndices.join(', ') || '无'}]`,
      en: `Sieve / primality check: prime indices in input are [${primeIndices.join(', ') || 'none'}]`,
    },
    action: { type: 'mark', targets: primeIndices, color: 'success' },
    stats: { comparisons: nums.length, swaps: 0, accesses: nums.length },
    events: primeIndices.length > 0
      ? [{ type: 'array.mark_sorted', indices: primeIndices }]
      : [{ type: 'array.compare', indices: [0, 0] }],
  })

  steps.push({
    stepId: sid++,
    codeLine: 4,
    description: { zh: `二分答案: 在单调区间中检查中点 index=${mid}, value=${nums[mid]}`, en: `Binary search on answer: inspect mid index=${mid}, value=${nums[mid]}` },
    action: { type: 'compare', targets: [mid], color: 'warning' },
    stats: { comparisons: 1, swaps: 0, accesses: 1 },
    events: [{ type: 'array.compare', indices: [mid, mid] }],
  })

  steps.push({
    stepId: sid++,
    codeLine: 5,
    description: { zh: '离散化 + 前缀和 + 差分 等常用技巧都可基于这组输入继续展开', en: 'Discretization, prefix sums, and difference arrays can continue from this input' },
    action: { type: 'mark', targets: [], color: 'success' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'acm_templates',
    complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: nums },
    steps: steps as AnimationScript['steps'],
  }
}
