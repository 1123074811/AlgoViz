import type { AnimationScript, AnimationStep } from '@/types/animation'

/** Build a deterministic skip list over sorted values, then search `target`. */
export function generateSkipList(arr?: number[], target?: number): AnimationScript {
  const values = (arr && arr.length ? [...arr] : [1, 3, 4, 7, 9, 12, 15, 19]).sort((a, b) => a - b)
  // Deterministic tower heights: every 2nd node gets +1 level, every 4th +1 more (max 3).
  const heights = values.map((_, i) => 1 + (i % 2 === 1 ? 1 : 0) + (i % 4 === 3 ? 1 : 0))
  const maxLevel = Math.max(...heights)
  const tgt = target ?? values[Math.max(0, values.length - 2)]
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `跳表(有序 ${values.length} 节点，${maxLevel} 层索引)`, en: `Skip list (${values.length} sorted nodes, ${maxLevel} index levels)` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'skip_list.create', values, heights }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  let comparisons = 0
  let current = -1
  let found = -1

  const pushStep = (
    codeLine: number,
    zh: string,
    en: string,
    event: NonNullable<AnimationStep['events']>[number],
    color: 'primary' | 'warning' | 'success' | 'danger' = 'primary',
  ) => {
    steps.push({
      stepId: sid++,
      codeLine,
      description: { zh, en },
      action: { type: color === 'success' ? 'mark' : 'highlight', targets: [], color },
      events: [event],
      stats: { comparisons, swaps: 0, accesses: comparisons },
    })
  }

  // Standard skip-list search: keep one predecessor, move right on the
  // current level, then drop from that predecessor instead of rescanning.
  for (let level = maxLevel - 1; level >= 0 && found < 0; level--) {
    let next = values.findIndex((_, index) => index > current && heights[index] > level)
    while (next >= 0) {
      comparisons++
      pushStep(
        2,
        `在 L${level} 比较 ${values[next]} 与目标 ${tgt}`,
        `Compare ${values[next]} with ${tgt} on L${level}`,
        { type: 'skip_list.compare', node: next, level, target: tgt },
        'warning',
      )
      if (values[next] === tgt) {
        found = next
        pushStep(
          3,
          `命中 ${tgt}，查找结束`,
          `Found ${tgt}; search complete`,
          { type: 'skip_list.found', node: next, level, target: tgt },
          'success',
        )
        break
      }
      if (values[next] > tgt) break

      pushStep(
        4,
        `${values[next]} 小于 ${tgt}，沿 L${level} 向右移动`,
        `${values[next]} is below ${tgt}; move right on L${level}`,
        { type: 'skip_list.move_right', from: current, to: next, level },
      )
      current = next
      next = values.findIndex((_, index) => index > current && heights[index] > level)
    }

    if (found < 0 && level > 0) {
      pushStep(
        5,
        `L${level} 无法继续，保持当前前驱并下沉到 L${level - 1}`,
        `Cannot advance on L${level}; keep the predecessor and drop to L${level - 1}`,
        { type: 'skip_list.drop_down', node: current, fromLevel: level, toLevel: level - 1 },
      )
    }
  }

  if (found < 0) {
    pushStep(
      6,
      `到达底层，未找到 ${tgt}`,
      `Reached the bottom level; ${tgt} was not found`,
      { type: 'skip_list.miss', node: current, level: 0, target: tgt },
      'danger',
    )
  }

  return {
    algorithm: 'skip_list',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'skip_list', layout: 'layered' },
    initialState: { type: 'array', data: values },
    result: found,
    steps: steps as AnimationScript['steps'],
  }
}
