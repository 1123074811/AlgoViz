import type { GraphAlgorithmEvent } from '../../eventTypes'

/**
 * graph 域图元构建器:语义方法 → GraphAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const graphBuilder = {
  create: (nodes: Array<{ id: string; label?: string }>, edges: Array<{ id?: string; source: string; target: string; weight?: number }>, directed?: boolean): GraphAlgorithmEvent => ({ type: 'graph.create', nodes, edges, directed }),
  visitNode: (nodeId: string): GraphAlgorithmEvent => ({ type: 'graph.visit_node', nodeId }),
  visitEdge: (source: string, target: string): GraphAlgorithmEvent => ({ type: 'graph.visit_edge', source, target }),
  relaxEdge: (source: string, target: string, success: boolean, opts: { oldDistance?: number | string; newDistance?: number | string } = {}): GraphAlgorithmEvent => ({ type: 'graph.relax_edge', source, target, success, ...opts }),
  enqueue: (nodeId: string): GraphAlgorithmEvent => ({ type: 'graph.enqueue', nodeId }),
  dequeue: (nodeId: string): GraphAlgorithmEvent => ({ type: 'graph.dequeue', nodeId }),
}
