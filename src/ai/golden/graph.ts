/**
 * 金样例 · graph（图）—— BFS 图遍历
 * sample input: {"nodes":["A","B","C","D","E","F"],"edges":[["A","B"],["A","C"],["B","D"],["C","E"],["D","F"],["E","F"]],"start":"A"}
 * 结构：graph（+ queue 语义用 enqueue/dequeue）；操作：graph.visit_node / visit_edge / enqueue / dequeue。
 */
export const GOLDEN: string = `// @algorithm bfs_graph_traversal
// @type graph
// @sample {"nodes":["A","B","C","D","E","F"],"edges":[["A","B"],["A","C"],["B","D"],["C","E"],["D","F"],["E","F"]],"start":"A"}
// @time O(V+E)
// @space O(V)
const nodeIds = (input && input.nodes) || ['A', 'B', 'C']
const rawEdges = (input && input.edges) || []
const start = (input && input.start) || nodeIds[0]
const nodes = nodeIds.map(id => ({ id: String(id) }))
const edges = rawEdges.map(e => Array.isArray(e)
  ? { source: String(e[0]), target: String(e[1]), weight: e[2] }
  : { source: String(e.source), target: String(e.target), weight: e.weight })
b.line(1).desc('构建无向图').graphCreate(nodes, edges, false)
const adj = {}
for (const id of nodeIds) adj[id] = []
for (const e of edges) { adj[e.source].push(e.target); adj[e.target].push(e.source) }
const visited = new Set([start])
const queue = [start]
b.line(8).desc('起点 ' + start + ' 入队').enqueue(start)
while (queue.length) {
  const u = queue.shift()
  b.line(11).desc('节点 ' + u + ' 出队并访问').dequeue(u)
  b.visitNode(u)
  for (const v of adj[u]) {
    b.line(14).desc('检查边 ' + u + '→' + v).visitEdge(u, v)
    if (!visited.has(v)) {
      visited.add(v)
      queue.push(v)
      b.line(17).desc('邻居 ' + v + ' 未访问，入队').enqueue(v)
    }
  }
}
b.line(20).desc('BFS 遍历完成，共访问 ' + visited.size + ' 个节点').note('已访问 ' + visited.size + ' 个节点')
`
