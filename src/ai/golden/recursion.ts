/**
 * 金样例 · recursion（递归 / 回溯）—— 网格 DFS 求岛屿数量
 * sample input: {"grid":[[1,1,0,0],[1,0,0,1],[0,0,1,1],[0,0,0,1]]}
 * 结构：grid + callstack；用 callPush/callPop 体现递归调用栈深度。
 * 操作：grid.visit / grid.set / callstack.push / callstack.pop。
 */
export const GOLDEN: string = `// @algorithm number_of_islands_dfs
// @type matrix
// @sample {"grid":[[1,1,0,0],[1,0,0,1],[0,0,1,1],[0,0,0,1]]}
// @time O(R·C)
// @space O(R·C)
const raw = (input && input.grid) || input || []
const grid = raw.map(row => row.slice())
const R = grid.length
const C = R ? grid[0].length : 0
b.line(1).desc('初始化网格，1=陆地 0=水').gridCreate(grid)
b.line(2).desc('创建递归调用栈').callStackCreate('DFS 调用栈')
let count = 0
let depth = 0
function dfs(r, c) {
  if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] !== 1) {
    return
  }
  const fid = 'f_' + r + '_' + c
  depth++
  b.line(8).desc('进入 dfs(' + r + ',' + c + ')，压入调用帧').callPush('dfs', { r: r, c: c }, { depth: depth }, fid)
  grid[r][c] = 2
  b.line(9).desc('标记 (' + r + ',' + c + ') 已访问').gridSet(r, c, 2, 'visited')
  b.gridVisit(r, c)
  dfs(r + 1, c)
  dfs(r - 1, c)
  dfs(r, c + 1)
  dfs(r, c - 1)
  b.line(14).desc('dfs(' + r + ',' + c + ') 四向探索完毕，弹出调用帧').callPop(fid)
  depth--
}
for (let r = 0; r < R; r++) {
  for (let c = 0; c < C; c++) {
    if (grid[r][c] === 1) {
      count++
      b.line(20).desc('发现新岛屿 #' + count + '，从 (' + r + ',' + c + ') 开始 DFS').gridSet(r, c, 1, 'start')
      dfs(r, c)
    }
  }
}
b.line(24).desc('扫描完成，共发现 ' + count + ' 座岛屿').note('岛屿数量 = ' + count)
`
