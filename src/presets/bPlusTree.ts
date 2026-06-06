import type { AnimationScript } from '@/types/animation'

export function generateBPlusTree(): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: {
      zh: 'B+树 — 内部节点仅存路由关键码，所有数据存于叶子节点，叶子间通过链表相连',
      en: 'B+ Tree — internal nodes store only routing keys, all data in leaf nodes linked via a list',
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{
      type: 'tree.create', variant: 'btree', rootId: 'internal_0',
      nodes: [
        { id: 'internal_0', value: '[30, 60]' },
        { id: 'internal_1', value: '[10, 20]' },
        { id: 'internal_2', value: '[40, 50]' },
        { id: 'internal_3', value: '[70, 80]' },
        { id: 'leaf_0', value: '1·5·10' },
        { id: 'leaf_1', value: '15·20' },
        { id: 'leaf_2', value: '30·35·40' },
        { id: 'leaf_3', value: '45·50·60' },
        { id: 'leaf_4', value: '65·70·75·80' },
      ],
      edges: [
        { parentId: 'internal_0', childId: 'internal_1', port: 'child_0' },
        { parentId: 'internal_0', childId: 'internal_2', port: 'child_1' },
        { parentId: 'internal_0', childId: 'internal_3', port: 'child_2' },
        { parentId: 'internal_1', childId: 'leaf_0', port: 'child_0' },
        { parentId: 'internal_1', childId: 'leaf_1', port: 'child_1' },
        { parentId: 'internal_2', childId: 'leaf_2', port: 'child_0' },
        { parentId: 'internal_2', childId: 'leaf_3', port: 'child_1' },
        { parentId: 'internal_3', childId: 'leaf_4', port: 'child_0' },
      ],
    }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 2,
    description: {
      zh: 'search(45) → 从根 internal_0 开始: 30 ≤ 45 < 60，进入 child_1 → internal_2',
      en: 'search(45) → from root: 30 ≤ 45 < 60, go child_1 → internal_2',
    },
    action: { type: 'highlight', targets: [0], color: 'primary' },
    events: [{ type: 'tree.visit', nodeId: 'internal_0' }],
    stats: { comparisons: 2, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 3,
    description: {
      zh: 'search(45) → internal_2 [40, 50]: 40 ≤ 45 < 50，进入 leaf_3',
      en: 'search(45) → internal_2 [40, 50]: 40 ≤ 45 < 50, go to leaf_3',
    },
    action: { type: 'highlight', targets: [3], color: 'primary' },
    events: [{ type: 'tree.visit', nodeId: 'internal_2' }],
    stats: { comparisons: 2, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 4,
    description: {
      zh: 'search(45) → 在叶子 leaf_3 [45=Ivy, 50=Jack, 60=Kate] 中找到 45 → "Ivy"',
      en: 'search(45) → found in leaf leaf_3, returns "Ivy"',
    },
    action: { type: 'highlight', targets: [7], color: 'success' },
    events: [{ type: 'tree.visit', nodeId: 'leaf_3' }],
    stats: { comparisons: 2, swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: {
      zh: 'range_query(30, 60) → 在 leaf_2 找到起点 30，沿叶子链表扫描到 60 停止',
      en: 'range_query(30, 60) → find start at leaf_2, follow leaf linked list to 60',
    },
    action: { type: 'highlight', targets: [6, 7], color: 'success' },
    events: [
      { type: 'tree.visit', nodeId: 'leaf_2' },
      { type: 'tree.visit', nodeId: 'leaf_3' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 8 },
  })

  steps.push({
    stepId: sid++, codeLine: 6,
    description: {
      zh: 'B+树优势：范围查询利用叶子链表 O(k) 扫描，无需回溯内部节点',
      en: 'B+ Tree advantage: range queries use leaf linked list O(k) scan, no need to revisit internal nodes',
    },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'bplus_tree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree' },
    initialState: { type: 'tree', data: [] },
    steps,
  }
}
