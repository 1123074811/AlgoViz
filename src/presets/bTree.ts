import type { AnimationScript } from '@/types/animation'

const DEFAULT_KEYS = [10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37]

function parseKeys(input: unknown): number[] {
  const source = Array.isArray(input)
    ? input
    : typeof input === 'object' && input !== null
      ? ((input as Record<string, unknown>).keys
        ?? (input as Record<string, unknown>).nums
        ?? (input as Record<string, unknown>).data)
      : input

  const values = Array.isArray(source)
    ? source.map(Number).filter(Number.isFinite)
    : []
  const keys = values.length > 0 ? values : DEFAULT_KEYS
  return Array.from(new Set(keys.map(v => Math.trunc(v)))).sort((a, b) => a - b).slice(0, 15)
}

function keyList(keys: number[]): string {
  return `[${keys.join(', ')}]`
}

function clampSplitIndex(index: number, length: number): number {
  return Math.max(1, Math.min(length - 2, index))
}

function buildBTreeShape(keys: number[]) {
  if (keys.length <= 3) {
    return { rootKeys: keys, children: [] as number[][] }
  }

  const splitIndices = keys.length >= 7
    ? [
      clampSplitIndex(Math.floor(keys.length / 4), keys.length),
      clampSplitIndex(Math.floor(keys.length / 2), keys.length),
      clampSplitIndex(Math.floor((keys.length * 3) / 4), keys.length),
    ]
    : [clampSplitIndex(Math.floor(keys.length / 2), keys.length)]

  const uniqueSplitIndices = Array.from(new Set(splitIndices)).sort((a, b) => a - b)
  const rootKeys = uniqueSplitIndices.map(index => keys[index])
  const children: number[][] = []
  let start = 0
  for (const index of uniqueSplitIndices) {
    children.push(keys.slice(start, index))
    start = index + 1
  }
  children.push(keys.slice(start))

  return { rootKeys, children }
}

function chooseInsertKey(keys: number[], child: number[]): number {
  const taken = new Set(keys)
  for (let i = 0; i < child.length - 1; i++) {
    const candidate = Math.floor((child[i] + child[i + 1]) / 2)
    if (candidate > child[i] && candidate < child[i + 1] && !taken.has(candidate)) return candidate
  }
  let candidate = (child[child.length - 1] ?? keys[keys.length - 1] ?? 0) + 1
  while (taken.has(candidate)) candidate += 1
  return candidate
}

export function generateBTree(input?: unknown): AnimationScript {
  const keys = parseKeys(input)
  const { rootKeys, children } = buildBTreeShape(keys)
  const hasChildren = children.length > 0
  const searchChildIndex = hasChildren
    ? Math.max(0, children.findIndex(child => child.length > 0))
    : -1
  const searchChild = searchChildIndex >= 0 ? children[searchChildIndex] : []
  const searchKey = searchChild[Math.floor(searchChild.length / 2)] ?? rootKeys[Math.floor(rootKeys.length / 2)] ?? keys[0]
  const insertChildIndex = searchChildIndex >= 0 ? searchChildIndex : 0
  const insertChild = hasChildren ? children[insertChildIndex] : rootKeys
  const insertKey = chooseInsertKey(keys, insertChild)
  const insertedChild = Array.from(new Set([...insertChild, insertKey])).sort((a, b) => a - b)

  const nodes = [
    { id: 'root', value: keyList(rootKeys) },
    ...children.map((child, index) => ({ id: `child${index}`, value: keyList(child) })),
  ]
  const edges = children.map((_, index) => ({
    parentId: 'root',
    childId: `child${index}`,
    port: `child_${index}`,
  }))

  const steps: AnimationScript['steps'] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `B树 — 根据输入关键码构建多路平衡结构：${keyList(keys)}`, en: `B-Tree — build a multi-way balanced structure from keys: ${keyList(keys)}` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{
      type: 'tree.create',
      variant: 'btree',
      rootId: 'root',
      nodes,
      edges,
    }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 2,
    description: hasChildren
      ? { zh: `search(${searchKey}) → 从根 ${keyList(rootKeys)} 判断范围，进入 child_${searchChildIndex}`, en: `search(${searchKey}) → compare at root ${keyList(rootKeys)}, go to child_${searchChildIndex}` }
      : { zh: `search(${searchKey}) → 根节点 ${keyList(rootKeys)} 即为叶子，直接查找`, en: `search(${searchKey}) → root ${keyList(rootKeys)} is also a leaf` },
    action: { type: 'highlight', targets: [0], color: 'primary' },
    events: [{ type: 'tree.visit', nodeId: 'root' }],
    stats: { comparisons: Math.max(1, rootKeys.length), swaps: 0, accesses: 1 },
  })

  if (hasChildren) {
    steps.push({
      stepId: sid++, codeLine: 3,
      description: { zh: `search(${searchKey}) → 在 child${searchChildIndex} ${keyList(searchChild)} 中找到 ${searchKey}`, en: `search(${searchKey}) → found ${searchKey} in child${searchChildIndex} ${keyList(searchChild)}` },
      action: { type: 'highlight', targets: [searchChildIndex + 1], color: 'success' },
      events: [{ type: 'tree.visit', nodeId: `child${searchChildIndex}` }],
      stats: { comparisons: Math.max(1, searchChild.length), swaps: 0, accesses: 1 },
    })
  }

  steps.push({
    stepId: sid++, codeLine: 4,
    description: hasChildren
      ? { zh: `insert(${insertKey}) → 插入 child_${insertChildIndex}，节点关键码变为 ${keyList(insertedChild)}`, en: `insert(${insertKey}) → insert into child_${insertChildIndex}, keys become ${keyList(insertedChild)}` }
      : { zh: `insert(${insertKey}) → 插入根节点，关键码变为 ${keyList(insertedChild)}`, en: `insert(${insertKey}) → insert into root, keys become ${keyList(insertedChild)}` },
    action: { type: 'insert', targets: [hasChildren ? insertChildIndex + 1 : 0], color: 'success' },
    events: [{
      type: 'tree.update_metadata',
      nodeId: hasChildren ? `child${insertChildIndex}` : 'root',
      metadata: { keys: keyList(insertedChild) },
    }],
    stats: { comparisons: Math.max(1, rootKeys.length), swaps: 0, accesses: 1 },
  })

  steps.push({
    stepId: sid++, codeLine: 5,
    description: { zh: 'B树结构保持平衡，所有叶子在同一层', en: 'B-Tree stays balanced, all leaves remain on the same level' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'scene.clear_highlight' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'btree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree' },
    initialState: { type: 'tree', data: keys },
    steps,
  }
}
