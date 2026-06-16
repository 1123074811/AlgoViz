import type { AnimationScript, AnimationStep } from '@/types/animation'

/** Build a deterministic skip list over sorted values, then search `target`. */
export function generateSkipList(arr?: number[], target?: number): AnimationScript {
  const values = (arr && arr.length ? [...arr] : [1, 3, 4, 7, 9, 12, 15, 19]).sort((a, b) => a - b)
  // Deterministic tower heights: every 2nd node gets +1 level, every 4th +1 more (max 3).
  const heights = values.map((_, i) => 1 + (i % 2 === 1 ? 1 : 0) + (i % 4 === 3 ? 1 : 0))
  const maxLevel = Math.max(...heights)
  const tgt = target ?? values[Math.floor(values.length / 2)]
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `跳表(有序 ${values.length} 节点，${maxLevel} 层索引)`, en: `Skip list (${values.length} sorted nodes, ${maxLevel} index levels)` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'skip_list.create', values, heights }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Search from top-left head, drop down levels, walk right while next <= target.
  const path: Array<[number, number]> = []
  let comparisons = 0
  let foundCol = -1
  for (let lvl = maxLevel - 1; lvl >= 0; lvl--) {
    for (let i = 0; i < values.length; i++) {
      if (heights[i] <= lvl) continue
      comparisons++
      if (values[i] <= tgt) {
        path.push([i, lvl])
        if (values[i] === tgt) { foundCol = i; break }
      }
    }
    if (foundCol >= 0) break
  }
  const found = foundCol >= 0

  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: found ? `从高层索引逐层下降，命中 ${tgt}（比较 ${comparisons} 次）` : `查找 ${tgt}：逐层下降未命中`, en: found ? `Drop down levels, found ${tgt} (${comparisons} comparisons)` : `Search ${tgt}: not found` },
    action: { type: found ? 'mark' : 'highlight', targets: [], color: found ? 'success' : 'danger' },
    events: [{ type: 'skip_list.search', target: tgt, path, found }],
    stats: { comparisons, swaps: 0, accesses: comparisons },
  })

  return {
    algorithm: 'skip_list',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: values },
    result: found ? values.indexOf(tgt) : -1,
    steps: steps as AnimationScript['steps'],
  }
}
