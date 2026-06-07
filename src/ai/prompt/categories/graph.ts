/**
 * 图类别提示词：图（遍历 / 最短路 / 拓扑 / 最小生成树等）。
 */
export const PROMPT: string = `### 图
- \`b.graphCreate(nodes, edges, directed?)\` 第一步必调；nodes=[{id,label?}]，edges=[{source,target,weight?}]
- \`b.visitNode(id)\` / \`b.visitEdge(s, t)\` / \`b.relaxEdge(s, t, success)\` / \`b.enqueue(id)\` / \`b.dequeue(id)\``
