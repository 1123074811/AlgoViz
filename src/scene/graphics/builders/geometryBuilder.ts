import type { GeometryAlgorithmEvent } from '../../eventTypes'

type GeoColor = 'primary' | 'success' | 'danger' | 'muted'

/**
 * geometry 域图元构建器:语义方法 → GeometryAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const geometryBuilder = {
  plane: (xRange: [number, number], yRange: [number, number]): GeometryAlgorithmEvent => ({ type: 'geometry.plane', xRange, yRange }),
  point: (id: string, x: number, y: number, opts: { label?: string; color?: GeoColor } = {}): GeometryAlgorithmEvent => ({ type: 'geometry.point', id, x, y, ...opts }),
  segment: (id: string, from: [number, number], to: [number, number], color?: GeoColor): GeometryAlgorithmEvent => ({ type: 'geometry.segment', id, from, to, color }),
  polygon: (id: string, points: Array<[number, number]>, color?: GeoColor): GeometryAlgorithmEvent => ({ type: 'geometry.polygon', id, points, color }),
  sweepline: (axis: 'x' | 'y', value: number): GeometryAlgorithmEvent => ({ type: 'geometry.sweepline', axis, value }),
  clear: (): GeometryAlgorithmEvent => ({ type: 'geometry.clear' }),
}
