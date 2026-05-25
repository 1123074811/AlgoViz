import type { AnimationScript } from '@/types/animation'

export function generateAVLTree(): AnimationScript {
  const tree = [8, 3, 10, 1, 6, '', 14, '', '', 4]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: 'AVL 树 (自平衡二叉搜索树) — 平衡因子≤1', en: 'AVL Tree — balance factor ≤1' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 1, description: { zh: `插入序列: [8,3,10,1,6,14,4]`, en: `Insert sequence: [8,3,10,1,6,14,4]` }, action: { type: 'highlight', targets: [0], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 7 } })

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: '节点8(根) h=3, 节点3(L) h=2, 节点10(R) h=2 → 平衡', en: 'Node8 h=3, 3 h=2, 10 h=2 → balanced' }, action: { type: 'mark', targets: [0, 1, 2], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 3 } })

  steps.push({ stepId: sid++, codeLine: 5, description: { zh: '插入 4 → 节点6(R) 高度变2，平衡 |3-1|=2 → 需要旋转', en: 'Insert 4 → height(6)=2, |h(1)-h(6)|=2 → need rotation' }, action: { type: 'compare', targets: [1, 6], color: 'warning' }, stats: { comparisons: 1, swaps: 0, accesses: 4 } })

  steps.push({ stepId: sid++, codeLine: 7, description: { zh: 'RL 旋转：先对 6 右旋，再对 3 左旋。AVL 平衡恢复', en: 'RL rotation: right-rotate 6, left-rotate 3. AVL rebalanced' }, action: { type: 'swap', targets: [1, 3, 6], color: 'danger' }, stats: { comparisons: 1, swaps: 1, accesses: 6 } })

  steps.push({ stepId: sid++, codeLine: 8, description: { zh: 'AVL 树保持平衡，高度=3，所有 |bf|≤1', en: 'AVL balanced, height=3, all |bf|≤1' }, action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5, 6], color: 'success' }, stats: { comparisons: 2, swaps: 1, accesses: 8 } })

  const nums = tree.filter(v => v !== '').map(Number)
  return { algorithm: 'avl_tree', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' }, initialState: { type: 'tree', data: nums }, steps: steps as AnimationScript['steps'] }
}
