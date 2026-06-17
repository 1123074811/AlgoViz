import type { GraphAnalysisAlgorithmEvent } from '../../eventTypes'

/**
 * graph_analysis 域图元构建器:语义方法 → GraphAnalysisAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const graphAnalysisBuilder = {
  update: (opts: { discLow?: Record<string, [number, number]>; stack?: string[]; components?: Record<string, number> } = {}): GraphAnalysisAlgorithmEvent => ({ type: 'graph_analysis.update', ...opts }),
  clear: (): GraphAnalysisAlgorithmEvent => ({ type: 'graph_analysis.clear' }),
}
