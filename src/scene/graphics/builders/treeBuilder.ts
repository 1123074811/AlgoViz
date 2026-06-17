import type { TreeAlgorithmEvent } from '../../eventTypes'

/**
 * tree 域图元构建器:语义方法 → TreeAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const treeBuilder = {
  create: (rootId: string, nodes: Array<{ id: string; value: number | string; rbColor?: 'red' | 'black' }>, edges: Array<{ parentId: string; childId: string; port?: string }>, variant: 'binary' | 'bst' | 'avl' | 'btree' | 'trie' = 'binary'): TreeAlgorithmEvent => ({ type: 'tree.create', variant, rootId, nodes, edges }),
  visit: (nodeId: string): TreeAlgorithmEvent => ({ type: 'tree.visit', nodeId }),
  compare: (nodeId: string, value: number | string, result?: 'less' | 'greater' | 'equal'): TreeAlgorithmEvent => ({ type: 'tree.compare', nodeId, value, result }),
  insert: (parentId: string, node: { id: string; value: number | string }, side?: 'left' | 'right' | string): TreeAlgorithmEvent => ({ type: 'tree.insert', parentId, node, side }),
  remove: (nodeId: string): TreeAlgorithmEvent => ({ type: 'tree.delete', nodeId }),
  rotate: (rotation: 'left' | 'right' | 'left-right' | 'right-left', pivotId: string): TreeAlgorithmEvent => ({ type: 'tree.rotate', rotation, pivotId }),
  updateMetadata: (nodeId: string, m: { height?: number; balanceFactor?: number; metadata?: Record<string, unknown> }): TreeAlgorithmEvent => ({ type: 'tree.update_metadata', nodeId, ...m }),
  recolor: (nodeId: string, rbColor: 'red' | 'black'): TreeAlgorithmEvent => ({ type: 'tree.recolor', nodeId, rbColor }),
}
