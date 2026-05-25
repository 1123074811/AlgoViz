import type { AnimationScript } from '@/types/animation'

export function generateRedBlackTree(): AnimationScript {
  const tree = [13, 8, 17, 1, 11, 15, 25, '', 6, '', '', '', '', 22, 27]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const nums = tree.filter(v => v !== '').map(Number)

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '红黑树 — 自平衡二叉搜索树，节点分红色/黑色', en: 'Red-Black Tree — self-balancing BST, nodes are red/black' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 1, description: { zh: '5 条性质：①节点红/黑 ②根黑 ③叶(NIL)黑 ④红节点子必黑 ⑤黑高相等', en: '5 properties: nodes red/black, root black, leaves black, red children black, equal black-height' }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: `插入 6：变色+旋转维持平衡`, en: `Insert 6: recolor + rotate to maintain balance` }, action: { type: 'compare', targets: [5], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 3 } })

  steps.push({ stepId: sid++, codeLine: 5, description: { zh: '旋转后红黑树恢复平衡，高度=4, 黑高=3', en: 'After rotation, RBT balanced. Height=4, black-height=3' }, action: { type: 'mark', targets: [0, 1, 2, 5], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 5 } })

  steps.push({ stepId: sid++, codeLine: 6, description: { zh: `查找 O(log n) | 插入/删除 O(log n) | 最坏情况也平衡`, en: `Search O(log n) | Insert/Delete O(log n) | Balanced even in worst case` }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 5 } })

  return { algorithm: 'red_black_tree', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' }, initialState: { type: 'tree', data: nums }, steps: steps as AnimationScript['steps'] }
}
