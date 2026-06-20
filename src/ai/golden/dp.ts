/**
 * 金样例 · dp（动态规划 / 记忆化搜索）—— 最长公共子序列（LCS）记忆化 dfs → DP 状态表
 * sample input: {"a":"AGCAT","b":"GAC"}
 * 结构：dp/memo 表（(m+1)×(n+1)）；操作：dpCreate / dpHighlight / dpDependency / dpSet / dpTraceback。
 * 重点：这是「带 memo 数组的 dfs」=记忆化搜索。精华是 **memo 表的填充与复用**，不是递归过程，
 *      所以用 DP 状态表（而非递归树）展示：
 *      - 每个子问题 dfs(i,j) 算出后写入 memo[i][j]（dpSet），并标依赖（dpDependency）；
 *      - 记忆化命中（memo 已有值）= 复用已填格：dpHighlight([{i,j}], 'dependency') 表示「命中缓存、不重算」。
 *      填表有界（最多 (m+1)(n+1) 格，不指数爆炸），区别于递归树会爆炸。
 */
export const GOLDEN: string = `// @algorithm lcs_memo
// @type matrix
// @sample {"a":"AGCAT","b":"GAC"}
// @time O(m·n)
// @space O(m·n)
const a = (input && input.a != null ? String(input.a) : (Array.isArray(input) ? input[0] : '')) || 'AGCAT'
const b2 = (input && input.b != null ? String(input.b) : (Array.isArray(input) ? input[1] : '')) || 'GAC'
const m = a.length, n = b2.length
// memo 表：行=串A前缀长度 i（剩 a[i..]），列=串B前缀长度 j（剩 b[j..]）。memo[i][j]=LCS(a[i..],b[j..])。
const rowLabels = [...a.split('').map((c, i) => 'a[' + i + ']=' + c), '∅']
const colLabels = [...b2.split('').map((c, j) => 'b[' + j + ']=' + c), '∅']
const TID = 'lcs_memo'
b.line(1).desc('记忆化搜索 dfs(i,j)=LCS(a[i..],b[j..])。memo 表:行=剩余A起点 i,列=剩余B起点 j。填表而非递归').dpCreate(TID, m + 1, n + 1, {
  title: 'memo[i][j] = LCS(a[i..], b[j..])', rowLabels, colLabels, defaultValue: '·',
})

// memo[i][j]：undefined 表示未计算（递归树里会重复访问的子问题，在表里只填一次）。
const memo = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(undefined))

function dfs(i, j) {
  // 记忆化命中:该子问题已算过 → 复用已填格,不再递归(高亮该格表示「命中缓存、复用而非重算」)。
  if (memo[i][j] !== undefined) {
    b.line(8).desc('记忆化命中 dfs(' + i + ',' + j + '):memo 已有 ' + memo[i][j] + '，复用已填格、不再展开递归').dpHighlight(TID, [{ row: i, col: j }], 'dependency')
    return memo[i][j]
  }
  b.line(11).desc('计算子问题 dfs(' + i + ',' + j + ')，先标当前格').dpHighlight(TID, [{ row: i, col: j }], 'current')
  let val
  if (i === m || j === n) {
    // 基例:任一串走完,LCS=0。
    val = 0
    b.line(15).desc('基例:a 或 b 已耗尽，dfs(' + i + ',' + j + ') = 0').dpSet(TID, i, j, 0, 'base: 0')
  } else if (a[i] === b2[j]) {
    // 字符匹配:取右下子问题 + 1（依赖 memo[i+1][j+1]）。
    b.line(18).desc('字符匹配 ' + a[i] + '：dfs 依赖右下子问题 dfs(' + (i + 1) + ',' + (j + 1) + ')').dpDependency(TID, [{ row: i + 1, col: j + 1 }], { row: i, col: j }, '+1')
    val = dfs(i + 1, j + 1) + 1
    b.line(19).desc('匹配回填:memo[' + i + '][' + j + '] = 右下 + 1 = ' + val).dpSet(TID, i, j, val, 'dfs(i+1,j+1)+1')
  } else {
    // 不匹配:取「下」「右」两个子问题的较大者（依赖 memo[i+1][j] 与 memo[i][j+1]）。
    b.line(22).desc('不匹配:dfs 依赖下 dfs(' + (i + 1) + ',' + j + ') 与右 dfs(' + i + ',' + (j + 1) + ')').dpDependency(TID, [{ row: i + 1, col: j }, { row: i, col: j + 1 }], { row: i, col: j }, 'max')
    val = Math.max(dfs(i + 1, j), dfs(i, j + 1))
    b.line(23).desc('不匹配回填:memo[' + i + '][' + j + '] = max(下, 右) = ' + val).dpSet(TID, i, j, val, 'max(dfs(i+1,j),dfs(i,j+1))')
  }
  memo[i][j] = val
  return val
}

const answer = dfs(0, 0)
b.line(28).desc('左上 memo[0][0] 即整体 LCS 长度 = ' + answer + '。填表有界(最多 ' + ((m + 1) * (n + 1)) + ' 格)，命中即复用').dpHighlight(TID, [{ row: 0, col: 0 }], 'answer')

// 沿 memo 表回溯一条 LCS 路径（与递归决策一致）。
const path = []
let pi = 0, pj = 0
while (pi < m && pj < n) {
  if (a[pi] === b2[pj]) { path.push({ row: pi, col: pj }); pi++; pj++ }
  else if ((memo[pi + 1] && memo[pi + 1][pj]) >= (memo[pi] && memo[pi][pj + 1])) pi++
  else pj++
}
b.line(36).desc('沿 memo 表回溯出一条 LCS 选择路径，长度 ' + answer).dpTraceback(TID, path)
`
