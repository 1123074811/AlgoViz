import type { AnimationScript, AnimationStep } from '@/types/animation'
import { treeBuilder } from '@/scene/graphics'

export function generateRedBlackTree(): AnimationScript {
  // 初始红黑树(不含待插入的 6)。index 8 留空,6 在演示中插入为节点 1(index 3)的右孩子。
  const tree = [13, 8, 17, 1, 11, 15, 25, '', '', '', '', '', '', 22, 27]
  const steps: AnimationStep[] = []
  let sid = 1
  const nums = tree.map(v => v === '' ? 0 : Number(v))

  // 自洽红黑着色:根黑、红节点子全黑、黑节点子红/黑(满足红黑性质)。
  const RB: Record<number, 'red' | 'black'> = {
    13: 'black', 8: 'red', 17: 'red',
    1: 'black', 11: 'black', 15: 'black', 25: 'black',
    6: 'red', 22: 'red', 27: 'red',
  }
  const nodes = nums
    .map((v, i) => ({ id: String(i), value: v, rbColor: (RB[v] ?? 'black') as 'red' | 'black' }))
    .filter(n => n.value !== 0)

  const edges: { parentId: string; childId: string; port: 'left' | 'right' }[] = []
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) continue
    const leftIdx = 2 * i + 1
    const rightIdx = 2 * i + 2
    if (leftIdx < nums.length && nums[leftIdx] !== 0) edges.push({ parentId: String(i), childId: String(leftIdx), port: 'left' })
    if (rightIdx < nums.length && nums[rightIdx] !== 0) edges.push({ parentId: String(i), childId: String(rightIdx), port: 'right' })
  }

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '红黑树初始结构 — 自平衡 BST,节点分红/黑(根 13 黑,8/17 红,叶层红…)', en: 'Red-Black Tree initial — self-balancing BST, nodes red/black (root 13 black, 8/17 red…)' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    events: [treeBuilder.create('0', nodes, edges, 'binary')],
  })

  steps.push({
    stepId: sid++, codeLine: 1,
    description: { zh: '5 条性质：①节点红/黑 ②根黑 ③叶(NIL)黑 ④红节点子必黑 ⑤任一路径黑高相等', en: '5 properties: nodes red/black, root black, leaves black, red children black, equal black-height' },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
    events: [treeBuilder.compare('0', 13, 'equal')],
  })

  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: '插入 6：从根查找 13→8→1(6<13 左,6<8 左,6>1 右),作为节点 1 的右孩子插入,新节点染红', en: 'Insert 6: search 13→8→1 (6<13 left, 6<8 left, 6>1 right), insert as right child of node 1, colored red' },
    action: { type: 'insert', targets: [3], color: 'warning' },
    stats: { comparisons: 3, swaps: 0, accesses: 3 },
    events: [
      treeBuilder.compare('1', 6, 'less'),
      treeBuilder.compare('3', 6, 'greater'),
      treeBuilder.insert('3', { id: '8', value: 6 }, 'right'),
      treeBuilder.recolor('8', 'red'),
    ],
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: '父节点 1 为黑色 → 红节点 6 直接插入即满足全部性质(性质④红子黑成立),无需变色或旋转', en: 'Parent node 1 is black → red node 6 inserted directly satisfies all properties (red-children-black holds), no recolor/rotation needed' },
    action: { type: 'mark', targets: [3, 8], color: 'success' },
    stats: { comparisons: 3, swaps: 0, accesses: 5 },
    events: [treeBuilder.visit('8')],
  })

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: '查找 O(log n) | 插入/删除 O(log n) | 靠红黑 5 性质保证最坏也近似平衡', en: 'Search O(log n) | Insert/Delete O(log n) | 5 properties keep it balanced even in worst case' },
    action: { type: 'mark', targets: [], color: 'success' },
    stats: { comparisons: 3, swaps: 0, accesses: 5 },
    events: [treeBuilder.visit('0')],
  })

  return { algorithm: 'red_black_tree', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' }, presentation: { engine: 'scene', module: 'tree' }, initialState: { type: 'tree', data: nums }, result: 'balanced', steps }
}
