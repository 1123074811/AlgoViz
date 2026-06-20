/**
 * 金样例 · recursion（递归 / 记忆化）—— 斐波那契记忆化搜索的「递归调用树」
 * sample input: {"n":5}
 * 结构：递归树(tree.* via searchRoot/searchEnter/searchLeave/searchMemoHit) + scene.highlight 状态色。
 * 重点：父子靠 builder 内部调用栈自动建立（不手传 parentId）；记忆化命中(warning 橙)时不再展开其子树，
 *      体现「复用而非重算」，天然控制步数。
 * 操作：searchRoot / searchEnter / searchLeave / searchMemoHit。
 */
export const GOLDEN: string = `// @algorithm fibonacci_memo
// @type array
// @sample {"n":5}
// @time O(n)
// @space O(n)
const n = (input && typeof input.n === 'number') ? input.n : 5
const memo = {}

// 递归树根：要计算的子问题 fib(n)。searchRoot 同时初始化内部调用栈，栈顶即当前父节点。
b.line(1).desc('记忆化斐波那契:用递归树展示子问题 fib(k)。命中缓存的子树不再展开').searchRoot('fib(' + n + ')')

let result
function fib(k) {
  if (k < 2) {
    // 基例：到达叶节点（success 绿）。进入即 searchLeave，配对根那一层无需 enter。
    b.line(4).desc('基例 fib(' + k + ') = ' + k + '，到达叶节点')
    memo[k] = k
    return k
  }
  if (memo[k] !== undefined) {
    // 记忆化命中：当前栈顶下挂一个命中节点（橙色），不展开其子树。
    b.line(6).desc('记忆化命中 fib(' + k + ') = ' + memo[k] + '，复用缓存、不再展开子树').searchMemoHit('fib(' + k + ')=' + memo[k])
    return memo[k]
  }
  // 左子调用 fib(k-1)：进入一层递归，自动以栈顶为父挂节点并入栈。
  b.searchEnter('fib(' + (k - 1) + ')')
  b.line(8).desc('展开 fib(' + k + ') 的左分支 fib(' + (k - 1) + ')')
  const a = fib(k - 1)
  b.searchLeave(true) // 左分支解出，返回前出栈并标已解
  // 右子调用 fib(k-2)
  b.searchEnter('fib(' + (k - 2) + ')')
  b.line(9).desc('展开 fib(' + k + ') 的右分支 fib(' + (k - 2) + ')')
  const c = fib(k - 2)
  b.searchLeave(true)
  memo[k] = a + c
  b.line(10).desc('fib(' + k + ') = fib(' + (k - 1) + ') + fib(' + (k - 2) + ') = ' + memo[k] + '，标记该子问题已解')
  return memo[k]
}

result = fib(n)
b.line(12).desc('计算完成:fib(' + n + ') = ' + result + '。记忆化让每个子问题只算一次').result(result)
`
