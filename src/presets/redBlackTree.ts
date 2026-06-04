import type { AnimationScript, AnimationStep, ActionColor } from '@/types/animation'

export function generateRedBlackTree(): AnimationScript {
  const tree = [13, 8, 17, 1, 11, 15, 25, '', 6, '', '', '', '', 22, 27]
  const steps: AnimationStep[] = []
  let sid = 1
  const nums = tree.map(v => v === '' ? 0 : Number(v))

  // Construct active nodes and edges dynamically based on standard binary tree array layout
  const nodes = nums
    .map((v, i) => ({ id: String(i), value: v }))
    .filter(n => n.value !== 0)

  const edges: { parentId: string; childId: string; port: 'left' | 'right' }[] = []
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) continue
    const leftIdx = 2 * i + 1
    const rightIdx = 2 * i + 2
    if (leftIdx < nums.length && nums[leftIdx] !== 0) {
      edges.push({ parentId: String(i), childId: String(leftIdx), port: 'left' })
    }
    if (rightIdx < nums.length && nums[rightIdx] !== 0) {
      edges.push({ parentId: String(i), childId: String(rightIdx), port: 'right' })
    }
  }

  steps.push({
    stepId: sid++,
    codeLine: 0,
    description: { zh: '红黑树 — 自平衡二叉搜索树，节点分红色/黑色', en: 'Red-Black Tree — self-balancing BST, nodes are red/black' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    events: [{ type: 'tree.create', variant: 'binary', rootId: '0', nodes, edges }],
    teachingState: {
      tree: {
        nodeStates: [
          { id: '0', role: 'root', rbColor: 'black', color: 'primary' as ActionColor },
          { id: '1', role: 'child', rbColor: 'red', color: 'danger' as ActionColor },
          { id: '2', role: 'child', rbColor: 'black', color: 'muted' as ActionColor },
        ],
      },
    },
  })

  steps.push({
    stepId: sid++,
    codeLine: 1,
    description: { zh: '5 条性质：①节点红/黑 ②根黑 ③叶(NIL)黑 ④红节点子必黑 ⑤黑高相等', en: '5 properties: nodes red/black, root black, leaves black, red children black, equal black-height' },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
    events: [{ type: 'tree.compare', nodeId: '0', value: 13, result: 'equal' }],
    teachingState: {
      tree: {
        nodeStates: [
          { id: '0', role: 'root', rbColor: 'black', color: 'primary' as ActionColor },
          { id: '1', role: 'parent', rbColor: 'red', color: 'danger' as ActionColor },
          { id: '2', role: 'child', rbColor: 'black', color: 'muted' as ActionColor },
        ],
      },
    },
  })

  steps.push({
    stepId: sid++,
    codeLine: 3,
    description: { zh: `插入 6：父节点为红色，需要检查叔叔节点并通过变色或旋转恢复红黑树性质`, en: `Insert 6: parent is red, check uncle and restore red-black properties by recoloring or rotation` },
    action: { type: 'compare', targets: [5], color: 'warning' },
    stats: { comparisons: 1, swaps: 0, accesses: 3 },
    events: [{ type: 'tree.insert', parentId: '1', node: { id: '8', value: 6 }, side: 'left' }, { type: 'tree.compare', nodeId: '1', value: 6, result: 'less' }],
    teachingState: {
      tree: {
        nodeStates: [
          { id: '1', role: 'parent', rbColor: 'red', color: 'danger' as ActionColor },
          { id: '8', role: 'current', rbColor: 'red', color: 'warning' as ActionColor },
          { id: '4', role: 'child', rbColor: 'black', color: 'muted' as ActionColor },
        ],
      },
      variables: { parent: 8, inserted: 6, case: 'red parent' },
    },
  })

  steps.push({
    stepId: sid++,
    codeLine: 5,
    description: { zh: '旋转和变色后红黑树恢复平衡：根保持黑色，红节点的子节点均为黑色，黑高一致', en: 'After rotation and recoloring, the tree is balanced: root is black, red nodes have black children, and black-height is consistent' },
    action: { type: 'mark', targets: [0, 1, 2, 5], color: 'success' },
    stats: { comparisons: 1, swaps: 0, accesses: 5 },
    events: [{ type: 'tree.rotate', rotation: 'left', pivotId: '1' }],
    teachingState: {
      tree: {
        nodeStates: [
          { id: '0', role: 'root', rbColor: 'black', color: 'success' as ActionColor },
          { id: '1', role: 'balanced', rbColor: 'black', color: 'success' as ActionColor },
          { id: '2', role: 'balanced', rbColor: 'black', color: 'success' as ActionColor },
          { id: '8', role: 'balanced', rbColor: 'red', color: 'success' as ActionColor },
        ],
      },
    },
  })

  steps.push({ stepId: sid++, codeLine: 6, description: { zh: `查找 O(log n) | 插入/删除 O(log n) | 最坏情况也平衡`, en: `Search O(log n) | Insert/Delete O(log n) | Balanced even in worst case` }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 1, swaps: 0, accesses: 5 }, events: [{ type: 'tree.visit', nodeId: '0' }] })

  return { algorithm: 'red_black_tree', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' }, presentation: { engine: 'scene', module: 'tree' }, initialState: { type: 'tree', data: nums }, steps }
}
