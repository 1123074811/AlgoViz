import type { AnimationScript } from '@/types/animation'
import { bitsetBuilder } from '@/scene/graphics'

/**
 * Bitset / 位集演示 — 用 bitsetBuilder 构建事件,模拟「标志位 / 集合掩码」:
 * 创建 8 位全 0 → 依次把若干位 set 为 1 → highlight 检视某一位。
 *
 * 默认置位下标取自 `values`(过滤到 [0, BITS) 内的整数),缺省演示 {1, 3, 4, 6}。
 */
export function generateBitset(values?: number[]): AnimationScript {
  const BITS = 8
  const requested = (values && values.length > 0 ? values : [1, 3, 4, 6])
    .map(v => Math.floor(v))
    .filter(v => v >= 0 && v < BITS)
  const setBits = Array.from(new Set(requested.length > 0 ? requested : [1, 3, 4, 6]))

  const steps: AnimationScript['steps'] = []
  let sid = 1

  // 1) 创建 8 位全 0 的位集
  steps.push({
    stepId: sid++, codeLine: 1,
    description: {
      zh: `创建 ${BITS} 位位集(Bitset),全部初始化为 0,常用作标志位或集合掩码`,
      en: `Create a ${BITS}-bit bitset initialized to all 0, used as flags or a set mask`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [bitsetBuilder.create(BITS, 'Bitmask')],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // 2) 依次把指定位 set 为 1
  for (const index of setBits) {
    steps.push({
      stepId: sid++, codeLine: 3,
      description: {
        zh: `set(${index}) → mask |= (1 << ${index}),把第 ${index} 位置 1`,
        en: `set(${index}) → mask |= (1 << ${index}), turn bit ${index} on`,
      },
      action: { type: 'insert', targets: [index], color: 'success' },
      events: [bitsetBuilder.set(index, 1)],
      stats: { comparisons: 0, swaps: 0, accesses: 1 },
    })
  }

  // 3) highlight 检视某一位(检测是否置位)
  const checkIndex = setBits[0]
  steps.push({
    stepId: sid++, codeLine: 5,
    description: {
      zh: `test(${checkIndex}) → (mask >> ${checkIndex}) & 1,检视第 ${checkIndex} 位是否为 1`,
      en: `test(${checkIndex}) → (mask >> ${checkIndex}) & 1, inspect whether bit ${checkIndex} is set`,
    },
    action: { type: 'highlight', targets: [checkIndex], color: 'warning' },
    events: [bitsetBuilder.highlight(checkIndex)],
    stats: { comparisons: 1, swaps: 0, accesses: 1 },
  })

  // 4) 收尾
  const finalBitString = Array.from({ length: BITS }, (_, i) => (setBits.includes(i) ? 1 : 0))
    .slice()
    .reverse()
    .join('')
  steps.push({
    stepId: sid++, codeLine: 6,
    description: {
      zh: `位运算完成。最终掩码 = 0b${finalBitString},置位下标: {${[...setBits].sort((a, b) => a - b).join(', ')}}`,
      en: `Bit ops done. Final mask = 0b${finalBitString}, set bits: {${[...setBits].sort((a, b) => a - b).join(', ')}}`,
    },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'bitset',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n/w)' },
    presentation: { engine: 'scene', module: 'bitset' },
    initialState: { type: 'array', data: Array(BITS).fill(0) },
    result: [...setBits].sort((a, b) => a - b),
    steps,
  }
}
