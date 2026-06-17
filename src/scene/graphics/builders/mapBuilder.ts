import type { MapAlgorithmEvent } from '../../eventTypes'

/**
 * map 域图元构建器:语义方法 → MapAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const mapBuilder = {
  create: (entries: Array<{ key: string; value: number | string }>, label?: string): MapAlgorithmEvent => ({ type: 'map.create', entries, ...(label && { label }) }),
  put: (key: string, value: number | string): MapAlgorithmEvent => ({ type: 'map.put', key, value }),
  get: (key: string, found: boolean, value?: number | string): MapAlgorithmEvent => ({ type: 'map.get', key, found, ...(value !== undefined && { value }) }),
  remove: (key: string): MapAlgorithmEvent => ({ type: 'map.remove', key }),
}
