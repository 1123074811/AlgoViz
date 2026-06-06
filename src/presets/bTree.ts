import type { AnimationScript } from '@/types/animation'

export function generateBTree(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: 'B树 — 多路平衡搜索树，节点可容纳多个关键码', en: 'B-Tree — multi-way balanced search tree, nodes hold multiple keys' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{
      type: 'tree.create', variant: 'btree', rootId: 'root',
      nodes: [
        { id: 'root', value: '[10, 20, 30]' },
        { id: 'child0', value: '[3, 7]' },
        { id: 'child1', value: '[13, 17]' },
        { id: 'child2', value: '[23, 27]' },
        { id: 'child3', value: '[33, 37]' },
      ],
      edges: [
        { parentId: 'root', childId: 'child0', port: 'child_0' },
        { parentId: 'root', childId: 'child1', port: 'child_1' },
        { parentId: 'root', childId: 'child2', port: 'child_2' },
        { parentId: 'root', childId: 'child3', port: 'child_3' },
      ],
    }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: `search(17) → 从根开始查找: 10 ≤ 17 < 20，进入 child_1`, en: `search(17) → start from root: 10 ≤ 17 < 20, go to child_1` },
    action: { type: 'highlight', targets: [0], color: 'primary' },
    events: [{ type: 'tree.visit', nodeId: 'root' }],
    stats: { comparisons: 2, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 3,
    description: { zh: `search(17) → 在 child1 [13, 17] 中找到 17`, en: `search(17) → found 17 in child1 [13, 17]` },
    action: { type: 'highlight', targets: [2], color: 'success' },
    events: [{ type: 'tree.visit', nodeId: 'child1' }],
    stats: { comparisons: 2, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: `insert(15) → 15 < 20 走 child_1，插入到 [13, 17] 中`, en: `insert(15) → 15 < 20 goes to child_1, insert into [13, 17]` },
    action: { type: 'insert', targets: [0], color: 'success' },
    events: [{ type: 'tree.update_metadata', nodeId: 'child1', metadata: { keys: '[13, 15, 17]' } }],
    stats: { comparisons: 2, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: 'B树结构保持平衡，所有叶子在同一层', en: 'B-Tree stays balanced, all leaves at the same level' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'btree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree' },
    initialState: { type: 'tree', data: [] },
    steps,
  }
}
