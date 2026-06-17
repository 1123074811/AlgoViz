import type { UnionFindAlgorithmEvent } from '../../eventTypes'

/**
 * unionFind 域图元构建器:语义方法 → UnionFindAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const unionFindBuilder = {
  create: (size: number, parent: number[], rank?: number[]): UnionFindAlgorithmEvent => ({ type: 'union_find.create', size, parent, ...(rank && { rank }) }),
  find: (node: number, root: number, path: number[], parent: number[], rank?: number[]): UnionFindAlgorithmEvent => ({ type: 'union_find.find', node, root, path, parent, ...(rank && { rank }) }),
  link: (childRoot: number, parentRoot: number, parent: number[], rank?: number[], reason?: string): UnionFindAlgorithmEvent => ({ type: 'union_find.link', childRoot, parentRoot, parent, ...(rank && { rank }), ...(reason && { reason }) }),
  compress: (node: number, from: number, to: number, parent: number[], rank?: number[]): UnionFindAlgorithmEvent => ({ type: 'union_find.compress', node, from, to, parent, ...(rank && { rank }) }),
  same: (x: number, y: number, root: number, parent: number[], rank?: number[]): UnionFindAlgorithmEvent => ({ type: 'union_find.same', x, y, root, parent, ...(rank && { rank }) }),
  done: (parent: number[], rank?: number[]): UnionFindAlgorithmEvent => ({ type: 'union_find.done', parent, ...(rank && { rank }) }),
}
