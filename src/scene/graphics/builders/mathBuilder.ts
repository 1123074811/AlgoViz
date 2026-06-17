import type { MathAlgorithmEvent } from '../../eventTypes'

/**
 * math 域图元构建器:语义方法 → MathAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const mathBuilder = {
  init: (vars: Array<{ name: string; value: number | string }>): MathAlgorithmEvent => ({ type: 'math.init', vars }),
  set: (name: string, value: number | string, delta?: string): MathAlgorithmEvent => ({ type: 'math.set', name, value, ...(delta && { delta }) }),
  highlight: (name: string): MathAlgorithmEvent => ({ type: 'math.highlight', name }),
  note: (text: string): MathAlgorithmEvent => ({ type: 'math.note', text }),
}
