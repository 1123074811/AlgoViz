import type { ActionColor } from '@/types/animation'
import type { PointerAlgorithmEvent } from '../../eventTypes'

/**
 * pointer 域图元构建器:语义方法 → PointerAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const pointerBuilder = {
  create: (pointerId: string, opts: { label?: string; targetId?: string; portId?: string } = {}): PointerAlgorithmEvent => ({ type: 'pointer.create', pointerId, ...opts }),
  move: (pointerId: string, targetId: string | null, opts: { portId?: string; label?: string } = {}): PointerAlgorithmEvent => ({ type: 'pointer.move', pointerId, targetId, ...opts }),
  clear: (pointerId: string): PointerAlgorithmEvent => ({ type: 'pointer.clear', pointerId }),
  highlight: (pointerId: string, color?: ActionColor): PointerAlgorithmEvent => ({ type: 'pointer.highlight', pointerId, ...(color !== undefined && { color }) }),
}
