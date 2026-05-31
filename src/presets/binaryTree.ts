import type { AnimationScript, ActionColor } from '@/types/animation'
import { makeStep } from './utils'

export function generateBinaryTree(arr?: number[]): AnimationScript {
  const tree = arr && arr.length > 0 ? [...arr] : [8, 3, 10, 1, 6, 0, 14, 0, 0, 4, 7, 0, 0, 13, 0]
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const nums = tree.filter(v => v !== 0)

  // Construct active nodes and edges dynamically based on standard binary tree array layout
  const nodes = tree
    .map((v, i) => ({ id: String(i), value: v }))
    .filter(n => n.value !== 0)

  const edges: { parentId: string; childId: string; port: 'left' | 'right' }[] = []
  for (let i = 0; i < tree.length; i++) {
    if (tree[i] === 0) continue
    const leftIdx = 2 * i + 1
    const rightIdx = 2 * i + 2
    if (leftIdx < tree.length && tree[leftIdx] !== 0) {
      edges.push({ parentId: String(i), childId: String(leftIdx), port: 'left' })
    }
    if (rightIdx < tree.length && tree[rightIdx] !== 0) {
      edges.push({ parentId: String(i), childId: String(rightIdx), port: 'right' })
    }
  }

  steps.push(makeStep(sid++, 0,
    `二叉树演示。每个节点最多有两个子节点（左、右）。本树高=3，共 ${nums.length} 个节点`,
    `Binary Tree demo. Each node has at most 2 children (left, right). Height=3, ${nums.length} nodes`,
    'highlight', [0], 'primary', 0, 0, 0,
    { tree: { nodeStates: [{ id: '0', role: 'root', color: 'primary' as ActionColor }] } },
  ))
  steps[0].events = [{ type: 'tree.create', variant: 'binary', rootId: '0', nodes, edges }]

  // Inorder traversal
  const inorderPath = [3, 1, 9, 4, 10, 0, 11, 6, 12, 2, 13, 7, 14]
  for (const nodeIdx of inorderPath.slice(0, 5)) {
    steps.push(makeStep(sid++, 3,
      `中序遍历（L→根→R）：先访问左子树，再访问当前节点 arr[${nodeIdx}]=${tree[nodeIdx]}，最后访问右子树。中序遍历 BST 得到有序序列`,
      `Inorder (L→Root→R): visit left subtree, then current node arr[${nodeIdx}]=${tree[nodeIdx]}, then right subtree. Inorder on BST yields sorted order`,
      'mark', [nodeIdx], 'warning', 0, 0, 1,
      { tree: { traversalPath: inorderPath.slice(0, 5).map(String), nodeStates: [{ id: String(nodeIdx), role: 'current', color: 'warning' as ActionColor }] } },
    ))
    steps[steps.length - 1].events = [{ type: 'tree.visit', nodeId: String(nodeIdx) }]
  }
  steps.push(makeStep(sid++, 3,
    `中序遍历完成：[${inorderPath.map(i => tree[i]).join(', ')}]`,
    `Inorder complete: [${inorderPath.map(i => tree[i]).join(', ')}]`,
    'mark', inorderPath, 'success', 0, 0, nums.length,
    { tree: { traversalPath: inorderPath.map(String) } },
  ))
  steps[steps.length - 1].events = [{ type: 'tree.visit', nodeId: '0' }]

  // Preorder
  const preorderPath = [0, 1, 3, 9, 4, 10, 2, 6, 11, 12, 7, 13, 14]
  steps.push(makeStep(sid++, 4,
    `先序遍历（根→L→R）：先访问根节点 arr[0]=${tree[0]}，再递归访问左子树和右子树。适用于复制整棵树`,
    `Preorder (Root→L→R): visit root arr[0]=${tree[0]} first, then left subtree, then right. Used for tree cloning`,
    'highlight', [0], 'primary', 0, 0, 1,
    { tree: { traversalPath: preorderPath.slice(0, 3).map(String) } },
  ))
  steps[steps.length - 1].events = [{ type: 'tree.visit', nodeId: '0' }]
  steps.push(makeStep(sid++, 4,
    `先序遍历完成：[${preorderPath.map(i => tree[i]).join(', ')}]`,
    `Preorder complete: [${preorderPath.map(i => tree[i]).join(', ')}]`,
    'mark', preorderPath, 'success', 0, 0, nums.length,
    { tree: { traversalPath: preorderPath.map(String) } },
  ))
  steps[steps.length - 1].events = [{ type: 'tree.compare', nodeId: '0', value: 8, result: 'equal' }]

  // Postorder
  const postorderPath = [3, 9, 4, 10, 1, 11, 12, 6, 13, 14, 7, 2, 0]
  steps.push(makeStep(sid++, 5,
    `后序遍历（L→R→根）：先访问左右子树，最后访问根节点。适用于删除树或计算子树大小`,
    `Postorder (L→R→Root): visit children first, then root. Used for tree deletion or subtree size computation`,
    'highlight', [1, 2], 'primary', 0, 0, 2,
    { tree: { traversalPath: postorderPath.slice(0, 4).map(String) } },
  ))
  steps[steps.length - 1].events = [{ type: 'tree.visit', nodeId: '1' }]
  steps.push(makeStep(sid++, 5,
    `后序遍历完成：[${postorderPath.map(i => tree[i]).join(', ')}]`,
    `Postorder complete: [${postorderPath.map(i => tree[i]).join(', ')}]`,
    'mark', postorderPath, 'success', 0, 0, nums.length,
    { tree: { traversalPath: postorderPath.map(String) } },
  ))
  steps[steps.length - 1].events = [{ type: 'tree.compare', nodeId: '0', value: 8, result: 'equal' }]

  // Layer order
  steps.push(makeStep(sid++, 6,
    `层序遍历（BFS）：按层级从上到下、从左到右访问所有节点：[${[0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14].map(i => tree[i]).join(', ')}]。使用队列逐层处理`,
    `Level-order (BFS): visit top-to-bottom, left-to-right: [${[0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14].map(i => tree[i]).join(', ')}]. Uses queue for level-by-level processing`,
    'mark', [], 'success', 0, 0, nums.length,
    { tree: { traversalPath: [0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14].map(String) } },
  ))

  return { algorithm: 'binary_tree', complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(h)' }, presentation: { engine: 'scene', module: 'tree' }, initialState: { type: 'tree', data: tree }, steps }
}
