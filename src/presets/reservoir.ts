import type { AnimationScript } from '@/types/animation'

/**
 * 水塘抽样 k=1 演示。可视化三要素：
 * - 数据流：所有流入元素以直方图柱呈现，当前正在处理的元素高亮（prob.sample）。
 * - 水塘：当前样本（prob.reservoir 槽位）。
 * - 决策：每步说明「第 i 个元素以 1/i 概率替换」及替换/保留结果。
 * 用确定性规则(i 为奇数则替换)保证演示可复现、可观察替换与保留两种情形。
 */
export function generateReservoir(arr?: number[]): AnimationScript {
  const stream = (arr && arr.length > 0 ? arr : [10, 20, 30, 40, 50, 60])
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const bins = stream.map((v) => ({ label: String(v), weight: 1 }))

  const push = (
    zh: string,
    en: string,
    events: AnimationScript['steps'][number]['events'],
  ) => {
    steps.push({
      stepId: sid++, codeLine: 0,
      description: { zh, en },
      action: { type: 'highlight', targets: [], color: 'primary' },
      events,
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
  }

  let chosen = stream[0]
  // Step 1：展示整条数据流 + 放入第一个元素。
  push(
    `数据流共 ${stream.length} 个元素。水塘容量 k=1，先放入第 1 个元素 ${chosen}`,
    `Stream of ${stream.length}. Reservoir k=1, put first element ${chosen}`,
    [
      { type: 'prob.dist', bins },
      { type: 'prob.sample', index: 0 },
      { type: 'prob.reservoir', capacity: 1, items: [chosen] },
      { type: 'prob.note', text: '规则：第 i 个元素以 1/i 概率替换当前样本' },
    ],
  )

  for (let i = 1; i < stream.length; i++) {
    const replace = i % 2 === 1 // 确定性演示规则
    if (replace) chosen = stream[i]
    push(
      `处理第 ${i + 1} 个元素 ${stream[i]}：以 1/${i + 1} 概率替换 → ${replace ? `命中，样本变为 ${chosen}` : '未命中，保留原样本'}`,
      `element ${i + 1}=${stream[i]}: replace w/ prob 1/${i + 1} → ${replace ? `now ${chosen}` : 'kept'}`,
      [
        { type: 'prob.dist', bins },
        { type: 'prob.sample', index: i },
        { type: 'prob.reservoir', capacity: 1, items: [chosen] },
        { type: 'prob.note', text: replace ? `替换：当前样本 = ${chosen}` : `保留：当前样本 = ${chosen}` },
      ],
    )
  }

  push(
    `抽样结束，最终样本 = ${chosen}`,
    `Done, final sample = ${chosen}`,
    [
      { type: 'prob.dist', bins },
      { type: 'prob.reservoir', capacity: 1, items: [chosen] },
      { type: 'prob.note', text: `最终样本 ${chosen}` },
    ],
  )

  return {
    algorithm: 'reservoir_sampling',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    presentation: { engine: 'scene', module: 'prob' },
    result: chosen,
    initialState: { type: 'array', data: [] },
    steps,
  }
}
