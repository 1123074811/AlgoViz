import type { SkipListAlgorithmEvent } from '../../eventTypes'

/** skip_list 域图元构建器:语义方法 → SkipListAlgorithmEvent。 */
export const skipListBuilder = {
  create: (values: number[], heights: number[]): SkipListAlgorithmEvent => ({ type: 'skip_list.create', values, heights }),
  compare: (node: number, level: number, target: number): SkipListAlgorithmEvent => ({ type: 'skip_list.compare', node, level, target }),
  moveRight: (from: number, to: number, level: number): SkipListAlgorithmEvent => ({ type: 'skip_list.move_right', from, to, level }),
  dropDown: (node: number, fromLevel: number, toLevel: number): SkipListAlgorithmEvent => ({ type: 'skip_list.drop_down', node, fromLevel, toLevel }),
  found: (node: number, level: number, target: number): SkipListAlgorithmEvent => ({ type: 'skip_list.found', node, level, target }),
  miss: (node: number, level: number, target: number): SkipListAlgorithmEvent => ({ type: 'skip_list.miss', node, level, target }),
}
