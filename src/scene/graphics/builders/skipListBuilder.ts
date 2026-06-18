import type { SkipListAlgorithmEvent } from '../../eventTypes'

/** skip_list 域图元构建器:语义方法 → SkipListAlgorithmEvent。 */
export const skipListBuilder = {
  create: (values: number[], heights: number[]): SkipListAlgorithmEvent => ({ type: 'skip_list.create', values, heights }),
  search: (target: number, path: Array<[node: number, level: number]>, found: boolean): SkipListAlgorithmEvent => ({ type: 'skip_list.search', target, path, found }),
}
