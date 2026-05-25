import type { AnimationScript } from '@/types/animation'

export function generateBinaryTree(): AnimationScript {
  const tree = [8, 3, 10, 1, 6, '', 14, '', '', 4, 7, '', '', 13, '']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '二叉树 (Binary Tree)', en: 'Binary Tree' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  const nums = tree.filter(v => v !== '').map(Number)
  steps.push({ stepId: sid++, codeLine: 1, description: { zh: `树结构: 根=${nums[0]}`, en: `Tree: root=${nums[0]}` }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  steps.push({ stepId: sid++, codeLine: 3, description: { zh: `中序遍历: L → 根 → R`, en: `Inorder: L → root → R` }, action: { type: 'highlight', targets: [0, 1, 2], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 3 } })

  steps.push({ stepId: sid++, codeLine: 4, description: { zh: `先序遍历: 根 → L → R`, en: `Preorder: root → L → R` }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  steps.push({ stepId: sid++, codeLine: 5, description: { zh: `后序遍历: L → R → 根`, en: `Postorder: L → R → root` }, action: { type: 'highlight', targets: [1, 2, 0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 3 } })

  steps.push({ stepId: sid++, codeLine: 6, description: { zh: `高度=3，节点数=${nums.length}`, en: `Height=3, nodes=${nums.length}` }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: nums.length } })

  return { algorithm: 'binary_tree', complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(h)' }, initialState: { type: 'tree', data: nums }, steps: steps as AnimationScript['steps'] }
}
