import type { AnimationScript } from '@/types/animation'

const DEFAULT_KEYS = [10, 20, 30, 35, 40, 45, 50, 60]

function parseKeys(input: unknown): { keys: number[]; target?: number; range?: [number, number] } {
  const objectInput = typeof input === 'object' && input !== null && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null
  const source = Array.isArray(input)
    ? input
    : objectInput?.keys ?? objectInput?.nums ?? objectInput?.data

  const values = Array.isArray(source)
    ? source.map(Number).filter(Number.isFinite)
    : []
  const keys = Array.from(new Set((values.length > 0 ? values : DEFAULT_KEYS).map(v => Math.trunc(v))))
    .sort((a, b) => a - b)
    .slice(0, 18)

  const target = typeof objectInput?.target === 'number'
    ? Math.trunc(objectInput.target)
    : typeof objectInput?.key === 'number'
      ? Math.trunc(objectInput.key)
      : undefined
  const rangeSource = objectInput?.range
  const range = Array.isArray(rangeSource) && rangeSource.length >= 2
    ? [Number(rangeSource[0]), Number(rangeSource[1])].filter(Number.isFinite) as number[]
    : []

  return {
    keys,
    target,
    range: range.length === 2 ? [Math.min(range[0], range[1]), Math.max(range[0], range[1])] : undefined,
  }
}

function keyList(keys: number[]): string {
  return `[${keys.join(', ')}]`
}

function chunkKeys(keys: number[]): number[][] {
  const leafSize = keys.length <= 6 ? 2 : 3
  const leaves: number[][] = []
  for (let i = 0; i < keys.length; i += leafSize) {
    leaves.push(keys.slice(i, i + leafSize))
  }
  return leaves
}

function leafIndexForKey(leaves: number[][], key: number): number {
  const found = leaves.findIndex((leaf, index) => {
    const next = leaves[index + 1]?.[0]
    return next === undefined ? key >= leaf[0] : key < next
  })
  return Math.max(0, found)
}

export function generateBPlusTree(input?: unknown): AnimationScript {
  const { keys, target, range } = parseKeys(input)
  const leaves = chunkKeys(keys)
  const routingKeys = leaves.slice(1).map(leaf => leaf[0])
  const searchKey = target ?? keys[Math.floor(keys.length / 2)] ?? DEFAULT_KEYS[0]
  const searchLeafIndex = leafIndexForKey(leaves, searchKey)
  const searchLeaf = leaves[searchLeafIndex] ?? leaves[0] ?? []
  const rangeBounds: [number, number] = range ?? [
    keys[Math.max(0, Math.floor(keys.length / 3))] ?? searchKey,
    keys[Math.min(keys.length - 1, Math.floor((keys.length * 2) / 3))] ?? searchKey,
  ]
  const rangeLeafIds = leaves
    .map((leaf, index) => ({ leaf, index }))
    .filter(({ leaf }) => leaf.some(key => key >= rangeBounds[0] && key <= rangeBounds[1]))
    .map(({ index }) => `leaf_${index}`)

  const steps: AnimationScript['steps'] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: {
      zh: `B+树 — 根据输入关键码构建叶子链：${keyList(keys)}`,
      en: `B+ Tree — build linked leaves from input keys: ${keyList(keys)}`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{
      type: 'tree.create',
      variant: 'btree',
      rootId: 'internal_0',
      nodes: [
        { id: 'internal_0', value: keyList(routingKeys) },
        ...leaves.map((leaf, index) => ({ id: `leaf_${index}`, value: leaf.join('·') })),
      ],
      edges: leaves.map((_, index) => ({
        parentId: 'internal_0',
        childId: `leaf_${index}`,
        port: `child_${index}`,
      })),
    }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 2,
    description: {
      zh: `search(${searchKey}) → 从根路由关键码 ${keyList(routingKeys)} 定位到 leaf_${searchLeafIndex}`,
      en: `search(${searchKey}) → use root routing keys ${keyList(routingKeys)} to choose leaf_${searchLeafIndex}`,
    },
    action: { type: 'highlight', targets: [0], color: 'primary' },
    events: [{ type: 'tree.visit', nodeId: 'internal_0' }],
    stats: { comparisons: Math.max(1, routingKeys.length), swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 3,
    description: {
      zh: `search(${searchKey}) → 在 leaf_${searchLeafIndex} ${keyList(searchLeaf)} 中${searchLeaf.includes(searchKey) ? '找到' : '查找'} ${searchKey}`,
      en: `search(${searchKey}) → inspect leaf_${searchLeafIndex} ${keyList(searchLeaf)}`,
    },
    action: { type: 'highlight', targets: [searchLeafIndex + 1], color: searchLeaf.includes(searchKey) ? 'success' : 'warning' },
    events: [{ type: 'tree.visit', nodeId: `leaf_${searchLeafIndex}` }],
    stats: { comparisons: Math.max(1, searchLeaf.length), swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: {
      zh: `range_query(${rangeBounds[0]}, ${rangeBounds[1]}) → 沿叶子链扫描 ${rangeLeafIds.join(' → ') || '空区间'}`,
      en: `range_query(${rangeBounds[0]}, ${rangeBounds[1]}) → scan leaves ${rangeLeafIds.join(' -> ') || 'empty range'}`,
    },
    action: { type: 'highlight', targets: [], color: 'success' },
    events: rangeLeafIds.map(nodeId => ({ type: 'tree.visit' as const, nodeId })),
    stats: { comparisons: 0, swaps: 0, accesses: rangeLeafIds.reduce((sum, id) => {
      const index = Number(id.replace('leaf_', ''))
      return sum + (leaves[index]?.length ?? 0)
    }, 0) },
  })

  steps.push({
    stepId: sid++, codeLine: 6,
    description: {
      zh: 'B+树优势：范围查询利用叶子链表 O(k) 扫描，无需回溯内部节点',
      en: 'B+ Tree advantage: range queries use linked leaves for O(k) scan without revisiting internal nodes',
    },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'bplus_tree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree' },
    initialState: { type: 'tree', data: keys },
    steps,
  }
}
