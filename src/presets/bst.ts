import type { AnimationScript, TeachingState, ActionColor } from '@/types/animation'
import { makeStep } from './utils'

function bstTeaching(target: number, currentIdx: number, currentVal: number, path: number[], role: 'searching' | 'inserting' | 'root'): TeachingState {
  return {
    tree: {
      nodeStates: [
        { id: String(currentIdx), role: role === 'root' ? 'root' : 'current', color: 'warning' as ActionColor },
        ...path.filter(p => p !== currentIdx).map(p => ({ id: String(p), role: 'path' as const })),
      ],
      traversalPath: [String(currentIdx)],
    },
    variables: { target, 'current': currentVal },
  }
}

export function generateBST(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const inserts = [8, 3, 10, 1, 6, 14, 4, 7, 13]
  const bst: number[] = []
  const initialBst = [...bst]

  steps.push(makeStep(sid++, 0,
    '从空树开始，依次插入 [8,3,10,1,6,14,4,7,13]，演示 BST 的插入过程。BST 性质：左子树所有节点 < 根 < 右子树所有节点',
    'Start from empty tree, insert [8,3,10,1,6,14,4,7,13]. BST property: all left subtree nodes < root < all right subtree nodes',
    'highlight', [], 'primary', 0, 0, 0,
  ))

  for (const v of inserts) {
    if (bst.length === 0) {
      bst.push(v)
      steps.push(makeStep(sid++, 3,
        `插入根节点 ${v}。空树时直接成为根节点`,
        `Insert root node ${v}. In empty tree, becomes root directly`,
        'insert', [0], 'success', 0, 0, 1,
        { tree: { nodeStates: [{ id: '0', role: 'root', color: 'success' as ActionColor }] } },
      ))
      steps[steps.length - 1].events = [{ type: 'tree.create', variant: 'bst', rootId: '0', nodes: [{ id: '0', value: v }], edges: [] }]
    } else {
      let i = 0
      let depth = 0
      const path: number[] = [0]
      steps.push(makeStep(sid++, 5,
        `插入 ${v}：从根节点 arr[0]=${bst[0]} 开始比较。${v < bst[0] ? v + ' < ' + bst[0] + '，走左子树' : v + ' > ' + bst[0] + '，走右子树'}`,
        `Insert ${v}: start from root arr[0]=${bst[0]}. ${v < bst[0] ? v + ' < ' + bst[0] + ', go left' : v + ' > ' + bst[0] + ', go right'}`,
        'highlight', [0], 'warning', 0, 0, 1,
        bstTeaching(v, 0, bst[0], path, 'searching'),
      ))
      steps[steps.length - 1].events = [{ type: 'tree.compare', nodeId: '0', value: v, result: v < bst[0] ? 'less' : 'greater' }]
      while (i < bst.length && bst[i] !== 0) {
        const goLeft = v < bst[i]
        const nextIdx = goLeft ? 2 * i + 1 : 2 * i + 2
        path.push(nextIdx)
        while (bst.length <= nextIdx) bst.push(0)
        steps.push(makeStep(sid++, 6,
          `比较 ${v} ${goLeft ? '<' : '>'} ${bst[i]}，进入${goLeft ? '左' : '右'}子节点 arr[${nextIdx}]`,
          `Compare ${v} ${goLeft ? '<' : '>'} ${bst[i]}, go ${goLeft ? 'left' : 'right'} to arr[${nextIdx}]`,
          'compare', [i, nextIdx], 'warning', depth + 1, 0, 2,
          bstTeaching(v, nextIdx, bst[nextIdx] || 0, path, 'searching'),
        ))
        steps[steps.length - 1].events = [{ type: 'tree.compare', nodeId: String(i), value: v, result: goLeft ? 'less' : 'greater' }]
        if (bst[nextIdx] === 0 || bst[nextIdx] === undefined) break
        i = nextIdx
        depth++
      }
      const insertIdx = v < bst[i] ? 2 * i + 1 : 2 * i + 2
      while (bst.length <= insertIdx) bst.push(0)
      bst[insertIdx] = v
      steps.push(makeStep(sid++, 8,
        `找到空位 arr[${insertIdx}]，插入新节点 ${v}（深度=${depth + 1}）。BST 平均查找/插入 O(log n)，但最坏退化为链表 O(n)`,
        `Found empty slot arr[${insertIdx}], insert new node ${v} (depth=${depth + 1}). BST average O(log n) but worst O(n) when skewed`,
        'insert', [insertIdx], 'success', depth + 1, 0, 3,
        { tree: { nodeStates: [{ id: String(insertIdx), role: 'child', color: 'success' as ActionColor }] } },
      ))
      steps[steps.length - 1].events = [{ type: 'tree.insert', parentId: String(i), node: { id: String(insertIdx), value: v }, side: v < bst[i] ? 'left' : 'right' }]
    }
  }

  const allIndices = bst.map((_v, k) => bst[k] ? k : null).filter((k): k is number => k !== null)
  steps.push(makeStep(sid++, 10,
    `BST 构建完成！9 个节点已按二叉搜索树性质组织。中序遍历可得有序序列：[1,3,4,6,7,8,10,13,14]`,
    `BST built with 9 nodes. In-order traversal yields sorted: [1,3,4,6,7,8,10,13,14]`,
    'mark', allIndices, 'success', sid, 0, inserts.length * 3,
    { tree: { nodeStates: allIndices.map(i => ({ id: String(i), role: 'selected' as const, color: 'success' as ActionColor })) } },
  ))

  return { algorithm: 'bst', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' }, presentation: { engine: 'scene', module: 'tree', variant: 'bst' }, initialState: { type: 'tree', data: initialBst }, steps }
}
