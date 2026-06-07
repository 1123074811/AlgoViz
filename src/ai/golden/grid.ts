/**
 * 金样例 · grid（网格寻路）—— BFS 迷宫最短路
 * sample input: {"grid":[[0,0,0,0],[1,1,0,1],[0,0,0,0],[0,1,1,0]],"start":[0,0],"target":[3,3]}
 * 结构：grid（+ 内部用 queue 逻辑）；操作：grid.visit / grid.frontier / grid.path。
 * BFS 逐层扩展 frontier，找到 target 后回溯 path。
 */
export const GOLDEN: string = `// @algorithm bfs_maze_shortest_path
// @type matrix
// @sample {"grid":[[0,0,0,0],[1,1,0,1],[0,0,0,0],[0,1,1,0]],"start":[0,0],"target":[3,3]}
// @time O(R·C)
// @space O(R·C)
const g = (input && input.grid) || input || []
const grid = g.map(row => row.slice())
const R = grid.length
const C = R ? grid[0].length : 0
const start = (input && input.start) || [0, 0]
const target = (input && input.target) || [R - 1, C - 1]
b.line(1).desc('初始化迷宫，0=可走 1=墙').gridCreate(grid)
b.line(2).desc('标记起点与终点').gridSet(start[0], start[1], 'S', 'start')
b.gridSet(target[0], target[1], 'T', 'target')
const key = (r, c) => r + ',' + c
const prev = {}
const visited = new Set([key(start[0], start[1])])
let frontier = [start]
const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
let found = false
let level = 0
while (frontier.length && !found) {
  level++
  b.line(11).desc('BFS 第 ' + level + ' 层，扩展 ' + frontier.length + ' 个边界格').gridFrontier(frontier.map(p => [p[0], p[1]]))
  const next = []
  for (const [r, c] of frontier) {
    b.line(14).desc('访问 (' + r + ',' + c + ')').gridVisit(r, c)
    if (r === target[0] && c === target[1]) { found = true; break }
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue
      if (grid[nr][nc] === 1 || visited.has(key(nr, nc))) continue
      visited.add(key(nr, nc))
      prev[key(nr, nc)] = [r, c]
      next.push([nr, nc])
    }
  }
  frontier = next
}
if (found) {
  const path = []
  let cur = target
  while (cur && !(cur[0] === start[0] && cur[1] === start[1])) {
    path.push([cur[0], cur[1]])
    cur = prev[key(cur[0], cur[1])]
  }
  path.push([start[0], start[1]])
  path.reverse()
  b.line(28).desc('回溯最短路径，长度 ' + path.length).gridPath(path)
} else {
  b.line(30).desc('终点不可达').note('无法到达终点')
}
`
