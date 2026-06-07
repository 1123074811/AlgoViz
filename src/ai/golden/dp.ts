/**
 * 金样例 · dp（动态规划）—— 最长公共子序列（LCS）
 * sample input: {"a":"AGCAT","b":"GAC"}
 * 结构：dp 表（(m+1)×(n+1)）；操作：dp.create / dp.set / dp.dependency / dp.highlight / dp.traceback。
 * 每个状态填值前先 dpDependency 指出它从哪个前驱转移而来。
 */
export const GOLDEN: string = `// @algorithm longest_common_subsequence
// @type matrix
// @sample {"a":"AGCAT","b":"GAC"}
// @time O(m·n)
// @space O(m·n)
const a = (input && input.a != null ? String(input.a) : (Array.isArray(input) ? input[0] : '')) || 'AGCAT'
const b2 = (input && input.b != null ? String(input.b) : (Array.isArray(input) ? input[1] : '')) || 'GAC'
const m = a.length, n = b2.length
const rowLabels = ['∅', ...a.split('')]
const colLabels = ['∅', ...b2.split('')]
const TID = 'lcs'
b.line(1).desc('构建 LCS 表，行=串A、列=串B，首行首列为空串基准').dpCreate(TID, m + 1, n + 1, {
  title: 'LCS dp[i][j]', rowLabels, colLabels, defaultValue: 0,
})
const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
for (let i = 0; i <= m; i++) b.line(6).desc('基准：dp[' + i + '][0] = 0').dpSet(TID, i, 0, 0)
for (let j = 1; j <= n; j++) b.line(7).desc('基准：dp[0][' + j + '] = 0').dpSet(TID, 0, j, 0)
for (let i = 1; i <= m; i++) {
  for (let j = 1; j <= n; j++) {
    if (a[i - 1] === b2[j - 1]) {
      dp[i][j] = dp[i - 1][j - 1] + 1
      b.line(13).desc('字符匹配 ' + a[i - 1] + '：dp[' + i + '][' + j + '] = 左上 + 1').dpDependency(TID, [{ row: i - 1, col: j - 1 }], { row: i, col: j }, '+1')
      b.dpSet(TID, i, j, dp[i][j], 'dp[i-1][j-1]+1')
    } else {
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      b.line(17).desc('字符不匹配：dp[' + i + '][' + j + '] = max(上, 左) = ' + dp[i][j]).dpDependency(TID, [{ row: i - 1, col: j }, { row: i, col: j - 1 }], { row: i, col: j }, 'max')
      b.dpSet(TID, i, j, dp[i][j], 'max(dp[i-1][j],dp[i][j-1])')
    }
  }
}
b.line(21).desc('右下角即为 LCS 长度 = ' + dp[m][n]).dpHighlight(TID, [{ row: m, col: n }], 'answer')
const path = []
let pi = m, pj = n
while (pi > 0 && pj > 0) {
  if (a[pi - 1] === b2[pj - 1]) { path.push({ row: pi, col: pj }); pi--; pj-- }
  else if (dp[pi - 1][pj] >= dp[pi][pj - 1]) pi--
  else pj--
}
path.reverse()
b.line(28).desc('回溯得到 LCS 路径，长度 ' + dp[m][n]).dpTraceback(TID, path)
`
