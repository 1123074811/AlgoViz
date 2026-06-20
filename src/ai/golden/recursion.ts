/**
 * 金样例 · recursion（纯回溯，无 memo）—— 子集枚举的「选 / 不选」递归树
 * sample input: {"n":5}
 * 结构：递归树(tree.* via searchRoot/searchEnter/searchLeave) + scene.highlight 状态色。
 * 重点：纯回溯（没有 memo 数组，不是记忆化）——精华是搜索空间的形状，故用递归树。
 *      每层对一个元素做「选/不选」二叉分支；走到底（叶）即得到一个子集，searchLeave(true) 标解。
 *      父子靠 builder 内部调用栈自动建立（不手传 parentId）。元素数取 min(n,3) 控制树规模。
 */
export const GOLDEN: string = `// @algorithm subsets
// @type array
// @sample {"n":5}
// @time O(2^n · n)
// @space O(n)
const rawN = (input && typeof input.n === 'number') ? input.n : 3
// 子集枚举无记忆化（无 memo），用递归树展示「选/不选」搜索空间；元素数限 3 以内保持树清晰。
const k = Math.max(1, Math.min(rawN, 3))
const items = Array.from({ length: k }, (_, i) => i + 1)

b.line(1).desc('子集枚举（纯回溯，无 memo）:对每个元素「选 / 不选」，用递归树展示搜索空间').searchRoot('[ ]')

const subsets = []
const cur = []

function dfs(i) {
  if (i === items.length) {
    // 叶节点:一条选择路径走到底,得到一个完整子集(success 绿)。
    b.line(6).desc('到达叶节点,得到子集 {' + cur.join(',') + '}').searchLeave(true)
    subsets.push(cur.slice())
    return
  }
  const x = items[i]
  // 分支一:不选 items[i]。进入一层递归,自动以栈顶为父挂节点并入栈。
  b.searchEnter('跳过 ' + x)
  b.line(11).desc('不选 ' + x + '，递归处理后续元素')
  dfs(i + 1)
  b.searchLeave(true) // 该分支子树已枚举完,返回前出栈
  // 分支二:选 items[i]。
  b.searchEnter('选 ' + x)
  b.line(14).desc('选择 ' + x + '，加入当前子集后递归')
  cur.push(x)
  dfs(i + 1)
  cur.pop()
  b.searchLeave(true)
}

dfs(0)
b.line(18).desc('枚举完成:共 ' + subsets.length + ' 个子集。纯回溯的精华是搜索空间的形状(递归树)').result(subsets.length)
`
