import type { AnimationScript, TeachingState, ActionColor } from '@/types/animation'
import { makeStep } from './utils'

function avlTeaching(nodeId: string, role: 'current' | 'rotating' | 'balanced' | 'path', height?: number, bf?: number): TeachingState {
  return {
    tree: {
      nodeStates: [{
        id: nodeId,
        role,
        color: (role === 'rotating' ? 'danger' : role === 'balanced' ? 'success' : 'warning') as ActionColor,
        height,
        balanceFactor: bf,
      }],
    },
    variables: height !== undefined ? { height, bf: bf ?? 0 } : undefined,
  }
}

export function generateAVLTree(): AnimationScript {
  const tree = [8, 3, 10, 1, 6, 0, 14, 0, 0, 4]
  const steps: AnimationScript['steps'] = []
  let sid = 1

  steps.push(makeStep(sid++, 0,
    'AVL 树（自平衡二叉搜索树）演示。AVL 要求任意节点的左右子树高度差（平衡因子）不超过 1，插入后若失衡则通过旋转修复',
    'AVL Tree (self-balancing BST) demo. AVL requires |balanceFactor| ≤ 1 for every node, rebalance via rotation after insertion',
    'highlight', [], 'primary', 0, 0, 0,
    { tree: { nodeStates: [{ id: '0', role: 'root', height: 3, balanceFactor: 0, color: 'primary' }] } },
  ))

  steps.push(makeStep(sid++, 1,
    '依次插入 [8,3,10,1,6,14,4]。插入 4 后节点 3 的平衡因子变为 -2（左子树高 0，右子树高 2），触发失衡',
    'Insert [8,3,10,1,6,14,4]. After inserting 4, node 3 gets bf=-2 (left h=0, right h=2), triggering imbalance',
    'highlight', [0, 1, 2, 3, 4, 5, 6], 'warning', 0, 0, 7,
    {
      tree: {
        nodeStates: [
          { id: '0', role: 'path', height: 3, balanceFactor: 0, color: 'primary' },
          { id: '1', role: 'current', height: 2, balanceFactor: -2, color: 'warning' },
          { id: '4', role: 'child', height: 1, balanceFactor: 1, color: 'warning' },
          { id: '9', role: 'child', height: 0, balanceFactor: 0, color: 'warning' },
        ],
      },
    },
  ))

  steps.push(makeStep(sid++, 5,
    '检测到 RL 型失衡：节点 3 的右孩子 6 有左孩子 4。RL 旋转 = 先对 6 做右旋，再对 3 做左旋',
    'RL-case detected: right child 6 of node 3 has left child 4. RL rotation = right-rotate 6 first, then left-rotate 3',
    'compare', [1, 4, 9], 'warning', 1, 0, 4,
    {
      tree: {
        nodeStates: [
          { id: '1', role: 'rotating', height: 2, balanceFactor: -2, color: 'danger' },
          { id: '4', role: 'rotating', height: 1, balanceFactor: 1, color: 'danger' },
          { id: '9', role: 'rotating', height: 0, color: 'danger' },
        ],
        rotation: { type: 'right-left', pivot: 3, child: 6 },
      },
    },
  ))

  steps.push(makeStep(sid++, 7,
    'RL 旋转完成：先对 6 右旋（4 上移，6 下降为 4 的右孩子），再对 3 左旋（4 上移到 3 的位置）。所有节点平衡因子恢复 |bf|≤1',
    'RL rotation done: right-rotate 6 (4 moves up, 6 becomes 4\'s right child), then left-rotate 3 (4 replaces 3). All |bf|≤1 restored',
    'swap', [1, 4, 6, 9], 'danger', 1, 1, 6,
    {
      tree: {
        nodeStates: [
          { id: '0', role: 'balanced', height: 3, balanceFactor: 0, color: 'success' },
          { id: '2', role: 'balanced', height: 1, balanceFactor: 0, color: 'success' },
          { id: '6', role: 'balanced', height: 0, balanceFactor: 0, color: 'success' },
        ],
        rotation: { type: 'right-left', pivot: 3, child: 6 },
      },
    },
  ))

  steps.push(makeStep(sid++, 8,
    'AVL 树保持平衡！高度=3，所有 |bf|≤1。AVL 通过旋转保证 O(log n) 的查找/插入/删除时间',
    'AVL balanced! Height=3, all |bf|≤1. AVL guarantees O(log n) operations via rotations',
    'mark', [0, 1, 2, 3, 4, 5, 6, 9], 'success', 2, 1, 8,
    {
      tree: {
        nodeStates: [
          { id: '0', role: 'balanced', height: 3, balanceFactor: 0, color: 'success' },
          { id: '1', role: 'balanced', height: 1, balanceFactor: 0, color: 'success' },
          { id: '2', role: 'balanced', height: 1, balanceFactor: 0, color: 'success' },
          { id: '4', role: 'balanced', height: 1, balanceFactor: 1, color: 'success' },
          { id: '6', role: 'balanced', height: 1, balanceFactor: 1, color: 'success' },
        ],
      },
    },
  ))

  return { algorithm: 'avl_tree', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' }, initialState: { type: 'tree', data: tree }, steps }
}
