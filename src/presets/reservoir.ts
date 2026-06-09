import type { AnimationScript } from '@/types/animation'

// 水塘抽样 k=1：以确定性"伪随机"（这里用 i 的奇偶决定是否替换，保证演示可复现）展示替换逻辑。
export function generateReservoir(arr?: number[]): AnimationScript {
  const stream = (arr && arr.length > 0 ? arr : [10, 20, 30, 40, 50, 60])
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (zh: string, en: string, events: AnimationScript['steps'][number]['events']) =>
    steps.push({ stepId: sid++, codeLine: 0, description: { zh, en }, action: { type: 'highlight', targets: [], color: 'primary' }, events, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  let chosen = stream[0]
  push(`初始化：水塘容量 1，先放入第 1 个元素 ${chosen}`, `Init reservoir(1) with first element ${chosen}`, [
    { type: 'prob.reservoir', capacity: 1, items: [chosen] },
    { type: 'prob.note', text: '水塘抽样 k=1：第 i 个元素以 1/i 概率替换当前样本' },
  ])

  for (let i = 1; i < stream.length; i++) {
    const replace = (i % 2 === 1) // 演示用确定性规则
    if (replace) chosen = stream[i]
    push(
      `第 ${i + 1} 个元素 ${stream[i]}：以 1/${i + 1} 概率替换 → ${replace ? `替换为 ${chosen}` : '保留原样本'}`,
      `element ${i + 1} = ${stream[i]}: replace with prob 1/${i + 1} → ${replace ? 'replaced' : 'kept'}`,
      [
        { type: 'prob.reservoir', capacity: 1, items: [chosen] },
        { type: 'prob.note', text: replace ? `替换：当前样本 = ${chosen}` : `保留：当前样本 = ${chosen}` },
      ],
    )
  }
  push(`抽样结束，最终样本 = ${chosen}`, `Done, sample = ${chosen}`, [{ type: 'prob.note', text: `最终样本 ${chosen}` }])

  return {
    algorithm: 'reservoir_sampling',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    presentation: { engine: 'scene', module: 'prob' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
