/**
 * 金样例 · tree（树）—— 二叉搜索树（BST）插入
 * sample input: {"values":[8,3,10,1,6,14,4,7,13]}
 * 结构：tree（variant='bst'）；操作：tree.create / tree.compare / tree.insert / tree.visit。
 * 逐个插入：从根开始比较，按大小走左/右，找到空位后 treeInsert。
 */
export const GOLDEN: string = `// @algorithm bst_insert
// @type tree
// @sample {"values":[8,3,10,1,6,14,4,7,13]}
// @time O(h)
// @space O(1)
const values = (input && input.values) || (Array.isArray(input) ? input : []) || []
if (!values.length) { b.note('空输入'); return }
const root = values[0]
const nodeId = v => 'n' + v
b.line(1).desc('以首元素 ' + root + ' 作为 BST 根节点').treeCreate('bst', nodeId(root), [{ id: nodeId(root), value: root }], [])
const children = { [nodeId(root)]: { left: null, right: null } }
for (let i = 1; i < values.length; i++) {
  const v = values[i]
  let cur = root
  b.line(7).desc('插入 ' + v + '：从根 ' + root + ' 开始查找空位').treeVisit(nodeId(cur))
  while (true) {
    b.line(9).desc('比较 ' + v + ' 与节点 ' + cur).treeCompare(nodeId(cur), v)
    const side = v < cur ? 'left' : 'right'
    const slot = children[nodeId(cur)]
    if (slot[side] === null) {
      slot[side] = v
      children[nodeId(v)] = { left: null, right: null }
      const reason = side === 'left' ? (v + ' < ' + cur + '，作为左孩子插入') : (v + ' ≥ ' + cur + '，作为右孩子插入')
      b.line(14).desc(reason).treeInsert(nodeId(cur), { id: nodeId(v), value: v }, side)
      break
    }
    cur = slot[side]
    b.line(18).desc('继续向 ' + (side === 'left' ? '左' : '右') + '子树下行至 ' + cur).treeVisit(nodeId(cur))
  }
}
b.line(21).desc('全部 ' + values.length + ' 个值插入完成').note('BST 构建完成')
`
