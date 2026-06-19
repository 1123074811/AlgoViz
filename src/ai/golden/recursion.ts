/**
 * 金样例 · recursion（递归 / 记忆化）—— 斐波那契记忆化搜索的「递归调用树」
 * sample input: {"n":5}
 * 结构：递归树(tree.* via searchRoot/searchTry) + scene.highlight 状态色。
 * 重点：记忆化命中(warning 橙)时不再展开其子树,体现「复用而非重算」,天然控制步数。
 * 操作：searchRoot / searchTry / searchOk / scene.highlight(命中)。
 */
export const GOLDEN: string = `// @algorithm fibonacci_memo
// @type array
// @sample {"n":5}
// @time O(n)
// @space O(n)
const n = (input && typeof input.n === 'number') ? input.n : 5
const memo = {}

// 递归树根：要计算的子问题 fib(n)
b.line(1).desc('记忆化斐波那契:用递归树展示子问题 fib(k)。命中缓存的子树不再展开').searchRoot('fib(' + n + ')')
// 把根 id 记到一个映射里：每个 k 第一次展开时对应的树节点 id（用于命中时高亮复用）。
const nodeOf = { }
nodeOf[n] = 'st_0'

let result
function fib(k, nodeId) {
  if (k < 2) {
    b.line(4).desc('基例 fib(' + k + ') = ' + k + '，到达叶节点').searchOk(nodeId)
    memo[k] = k
    return k
  }
  if (memo[k] !== undefined) {
    // 记忆化命中：复用已算结果，不展开子树（橙色高亮）
    b.line(6).desc('记忆化命中 fib(' + k + ') = ' + memo[k] + '，复用缓存、不再展开子树')
      .emit({ type: 'scene.highlight', entityId: nodeId, color: 'warning', role: 'current' })
    return memo[k]
  }
  // 左子调用 fib(k-1)
  const leftId = b.searchTry(nodeId, 'fib(' + (k - 1) + ')')
  b.line(8).desc('展开 fib(' + k + ') 的左分支 fib(' + (k - 1) + ')')
  const a = fib(k - 1, leftId)
  // 右子调用 fib(k-2)
  const rightId = b.searchTry(nodeId, 'fib(' + (k - 2) + ')')
  b.line(9).desc('展开 fib(' + k + ') 的右分支 fib(' + (k - 2) + ')')
  const c = fib(k - 2, rightId)
  memo[k] = a + c
  b.line(10).desc('fib(' + k + ') = fib(' + (k - 1) + ') + fib(' + (k - 2) + ') = ' + memo[k] + '，标记该子问题已解').searchOk(nodeId)
  return memo[k]
}

result = fib(n, 'st_0')
b.line(12).desc('计算完成:fib(' + n + ') = ' + result + '。记忆化让每个子问题只算一次').result(result)
`
