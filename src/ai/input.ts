export type InputDataKind = 'array' | 'graph' | 'tree' | 'matrix' | 'linked_list' | 'unknown'

export interface ParsedInputData {
  kind: InputDataKind
  raw: string
  value: unknown
  valid: boolean
  message?: string
  promptContext: string
  /** Summary for UI display */
  summary: string
}

export function parseInputData(inputData: string): ParsedInputData {
  const raw = inputData.trim()
  const input = normalizeInputText(raw)
  let value: unknown

  if (!raw) {
    return {
      kind: 'unknown',
      raw,
      value: null,
      valid: true,
      promptContext: '未提供输入数据，请根据代码中的默认数据或算法逻辑生成 AnimationScript。',
      summary: '未提供输入',
    }
  }

  try {
    value = JSON.parse(input.json)
  } catch {
    return {
      kind: 'unknown', raw, value: null, valid: false,
      message: '输入不是合法 JSON，也不是 LeetCode 形式（如 root = [1,2,null]）',
      promptContext: '',
      summary: '无法解析',
    }
  }

  if (input.assignmentName === 'root' && Array.isArray(value)) {
    value = levelOrderArrayToTreeInput(value)
  } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && Array.isArray((value as Record<string, unknown>).root)) {
    const obj = value as Record<string, unknown>
    value = {
      ...levelOrderArrayToTreeInput(obj.root as unknown[]),
      ...Object.fromEntries(Object.entries(obj).filter(([key]) => key !== 'root')),
    }
  } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && looksLikeTreeInput(value as Record<string, unknown>)) {
    value = normalizeTreeInputObject(value as Record<string, unknown>)
  }

  const kind = identifyKind(value)
  const promptContext = buildPromptContext(kind, value)
  const summary = buildSummary(kind, value)

  return {
    kind, raw, value, valid: true,
    promptContext, summary,
  }
}

interface NormalizedInputText {
  json: string
  assignmentName?: string
}

export function normalizeInputText(raw: string): NormalizedInputText {
  const trimmed = raw.trim()
  if (!trimmed) return { json: trimmed }

  const multiAssignments = parseMultiAssignments(trimmed)
  if (multiAssignments) return multiAssignments

  const assignment = trimmed.match(/^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/)
  const assignmentName = assignment ? assignment[1].trim() : undefined
  if (assignment && assignmentName !== 'root') {
    return { json: `{${JSON.stringify(assignmentName)}:${toJsonLiteral(assignment[2])}}`, assignmentName }
  }

  const candidate = assignment ? assignment[2].trim() : trimmed

  const json = candidate
    .replace(/\bNone\b/g, 'null')
    .replace(/\bnil\b/g, 'null')
    .replace(/\bNULL\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
  return { json, assignmentName }
}

function parseMultiAssignments(raw: string): NormalizedInputText | null {
  const parts = splitAssignmentParts(raw)
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.length < 2 || !parts.every(part => /^[A-Za-z_$][\w$]*\s*=/.test(part))) return null

  const entries: string[] = []
  for (const part of parts) {
    const eq = part.indexOf('=')
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (!key || !value) return null
    entries.push(`${JSON.stringify(key)}:${toJsonLiteral(value)}`)
  }

  return { json: `{${entries.join(',')}}` }
}

function splitAssignmentParts(raw: string): string[] {
  const parts: string[] = []
  let start = 0
  let depth = 0
  let quote: '"' | "'" | null = null

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const prev = raw[i - 1]

    if (quote) {
      if (ch === quote && prev !== '\\') quote = null
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '[' || ch === '{' || ch === '(') depth++
    else if (ch === ']' || ch === '}' || ch === ')') depth = Math.max(0, depth - 1)

    const isSeparator = ch === ';' || ch === '\n' || ch === '\r' || (
      ch === ',' && depth === 0 && /^[\s\r\n]*[A-Za-z_$][\w$]*\s*=/.test(raw.slice(i + 1))
    )
    if (isSeparator) {
      parts.push(raw.slice(start, i))
      start = i + 1
    }
  }

  parts.push(raw.slice(start))
  return parts
}

function toJsonLiteral(value: string): string {
  const trimmed = value.trim()
  if (/^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) return trimmed
  if (/^(true|false|null)$/i.test(trimmed)) return trimmed.toLowerCase()
  if (/^(True|False|None|nil|NULL)$/.test(trimmed)) {
    return trimmed
      .replace(/^True$/, 'true')
      .replace(/^False$/, 'false')
      .replace(/^(None|nil|NULL)$/, 'null')
  }
  return trimmed
    .replace(/\bNone\b/g, 'null')
    .replace(/\bnil\b/g, 'null')
    .replace(/\bNULL\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
}

function levelOrderArrayToTreeInput(values: unknown[]): Record<string, unknown> {
  const present = values.map((value) => value !== null && value !== undefined)
  const nodes = values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value !== null && value !== undefined)
  const children: Record<string, string[]> = {}
  const treeNodes: Array<{ id: string; value: string | number }> = []

  for (const { value, index } of nodes) {
    const id = String(index)
    const displayValue = typeof value === 'number' || typeof value === 'string' ? value : String(value)
    treeNodes.push({ id, value: displayValue })
    const childIds: string[] = []
    const left = index * 2 + 1
    const right = index * 2 + 2
    if (present[left]) childIds.push(String(left))
    if (present[right]) childIds.push(String(right))
    children[id] = childIds
  }

  return {
    root: present[0] ? '0' : null,
    children,
    treeNodes,
    source: values,
    format: 'leetcode_level_order',
  }
}

function looksLikeTreeInput(value: Record<string, unknown>): boolean {
  return value.root !== undefined && value.children !== undefined && typeof value.children === 'object'
}

function normalizeTreeInputObject(value: Record<string, unknown>): Record<string, unknown> {
  const children = value.children
  if (!children || typeof children !== 'object' || Array.isArray(children)) return value
  const childMap = children as Record<string, unknown>
  const existingTreeNodes = Array.isArray(value.treeNodes)
    ? value.treeNodes as Array<{ id?: unknown; value?: unknown }>
    : []
  const knownIds = new Set(existingTreeNodes.map(node => String(node.id)))
  const childRefs = Object.values(childMap).flatMap(raw => Array.isArray(raw) ? raw.map(String) : [])
  const refsHaveDuplicates = new Set(childRefs).size !== childRefs.length
  const refsMissingNodes = existingTreeNodes.length > 0 && childRefs.some(ref => !knownIds.has(ref))
  const hasOccurrenceKeys = Object.keys(childMap).some(key => /_\d+$/.test(key))

  if (existingTreeNodes.length > 0 && !refsHaveDuplicates && !refsMissingNodes && !hasOccurrenceKeys) return value

  const rootValue = String(value.root)
  const normalizedChildren: Record<string, string[]> = {}
  const normalizedNodes: Array<{ id: string; value: string | number }> = []
  const nextByValue = new Map<string, number>()
  const usedChildKey = new Map<string, number>()

  const displayValueFor = (rawId: string): string | number => {
    const fromTreeNodes = existingTreeNodes.find(node => String(node.id) === rawId)?.value
    if (typeof fromTreeNodes === 'number' || typeof fromTreeNodes === 'string') return fromTreeNodes
    const withoutOccurrence = rawId.replace(/_\d+$/, '')
    const numeric = Number(withoutOccurrence)
    return Number.isFinite(numeric) && withoutOccurrence.trim() !== '' ? numeric : withoutOccurrence
  }

  const allocate = (rawId: string): string => {
    const base = rawId.replace(/_\d+$/, '')
    const index = nextByValue.get(base) ?? 0
    nextByValue.set(base, index + 1)
    const id = `n${normalizedNodes.length}`
    normalizedNodes.push({ id, value: displayValueFor(rawId) })
    normalizedChildren[id] = []
    return id
  }

  const sourceKeyFor = (rawId: string): string => {
    const base = rawId.replace(/_\d+$/, '')
    const hasOccurrenceVariant = Object.keys(childMap).some(key => key !== base && key.replace(/_\d+$/, '') === base)
    if (!hasOccurrenceVariant && Object.prototype.hasOwnProperty.call(childMap, rawId)) return rawId
    const seen = usedChildKey.get(base) ?? 0
    const candidates = seen === 0 ? [base, `${base}_${seen}`] : [`${base}_${seen}`, base]
    usedChildKey.set(base, seen + 1)
    return candidates.find(candidate => Object.prototype.hasOwnProperty.call(childMap, candidate)) ?? rawId
  }

  const rootId = allocate(rootValue)
  const queue: Array<{ rawId: string; id: string }> = [{ rawId: rootValue, id: rootId }]

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor]
    const rawChildren = childMap[sourceKeyFor(current.rawId)]
    if (!Array.isArray(rawChildren)) continue
    for (const childRaw of rawChildren) {
      if (childRaw === null || childRaw === undefined) continue
      const childRawId = String(childRaw)
      const childId = allocate(childRawId)
      normalizedChildren[current.id].push(childId)
      queue.push({ rawId: childRawId, id: childId })
    }
  }

  return {
    ...value,
    root: rootId,
    children: normalizedChildren,
    treeNodes: normalizedNodes,
    originalRoot: value.root,
    format: value.format ?? 'normalized_tree',
  }
}

function identifyKind(value: unknown): InputDataKind {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array'
    if (Array.isArray(value[0]) && value.every((row) => Array.isArray(row) && row.every((c: unknown) => typeof c === 'number'))) {
      return 'matrix'
    }
    // Check if it's an array of objects with id (could be graph nodes)
    if (value.every(v => typeof v === 'object' && v !== null && 'id' in (v as object))) {
      return 'unknown' // ambiguous - could be graph nodes
    }
    return 'array'
  }

  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>

    // Graph: has nodes + edges
    if (obj.nodes && Array.isArray(obj.nodes) && obj.edges && Array.isArray(obj.edges)) {
      return 'graph'
    }

    // Tree: has root + children
    if (obj.root !== undefined && obj.children && typeof obj.children === 'object') {
      return 'tree'
    }

    // Tree: has treeNodes
    if (obj.treeNodes && Array.isArray(obj.treeNodes)) {
      return 'tree'
    }

    // Matrix object: has rows + cols + data
    if (obj.rows !== undefined && obj.cols !== undefined && Array.isArray(obj.data)) {
      return 'matrix'
    }

    // Common LeetCode multi-input objects whose primary structure is an array.
    if (['nums', 'arr', 'array', 'values', 'heights', 'temperatures', 'prices', 'intervals', 'ranges', 'segments', 'stones', 'piles'].some(key => Array.isArray(obj[key]))) {
      return 'array'
    }

    // Linked list: has values + head
    if (obj.values && Array.isArray(obj.values) && obj.head !== undefined) {
      return 'linked_list'
    }

    // Linked list: has nodes with next pointers
    if (obj.nodes && Array.isArray(obj.nodes) && obj.nodes.every((n: unknown) => typeof n === 'object' && n !== null && ('next' in (n as object) || 'val' in (n as object)))) {
      return 'linked_list'
    }

    // Adjacency list
    if (obj.adjacencyList && typeof obj.adjacencyList === 'object') {
      return 'graph'
    }

    // Adjacency matrix
    if (obj.adjacencyMatrix && Array.isArray(obj.adjacencyMatrix)) {
      return 'graph'
    }

    return 'unknown'
  }

  return 'unknown'
}

function buildPromptContext(kind: InputDataKind, value: unknown): string {
  switch (kind) {
    case 'array':
      return `输入数据类型: array（数组）
输入数据: ${JSON.stringify(value)}

initialState 要求:
- type 必须为 "array"
- data 必须等于以上数组
- action.targets 使用数组下标（0 开始）
- 排序/搜索等算法逐步展示比较、交换、标记操作`

    case 'graph':
      return `输入数据类型: graph（图）
输入数据: ${JSON.stringify(value)}

initialState 要求:
- type 必须为 "graph"
- nodes 必须保留所有节点 id（字符串类型）
- edges 必须保留 source/target/weight
- data 可用 [] 兼容
- 节点访问状态、队列、栈、距离放入 teachingState.graph
- 边高亮可用 teachingState.graph.edgeStates 或 action.type="edge"`

    case 'tree':
      return `输入数据类型: tree（树）
输入数据: ${JSON.stringify(value)}

initialState 要求:
- type 必须为 "tree"
- root 必须保留
- children 必须表达父子关系
- 节点值写入 treeNodes（可选）
- 如果输入来自 LeetCode 层序数组，source 保留原数组；children/treeNodes 已按非 null 节点生成，重复值不能当作节点 id
- 遍历路径放入 teachingState.tree.traversalPath
- 如果代码使用 Queue/队列，请用 queueCreate/queueEnqueue/queueDequeue 显式展示队列，或在 teachingState.queue 中写入当前队列
- 旋转、平衡因子等放入 teachingState.tree`

    case 'matrix':
      return `输入数据类型: matrix（矩阵）
输入数据: ${JSON.stringify(value)}

initialState 要求:
- type 必须为 "matrix"
- data 保留为二维数组或扁平数组
- labels 可用行/列标签
- 单元格高亮使用线性下标 index = row * cols + col`

    case 'linked_list':
      return `输入数据类型: linked_list（链表）
输入数据: ${JSON.stringify(value)}

initialState 要求:
- type 必须为 "linked_list"
- data 保留节点值数组
- 指针变化放入 teachingState.variables`

    default:
      return `输入数据: ${JSON.stringify(value)}`
  }
}

function buildSummary(kind: InputDataKind, value: unknown): string {
  switch (kind) {
    case 'array': {
      const arr = Array.isArray(value)
        ? value as unknown[]
        : extractPrimaryArray(value as Record<string, unknown>)
      return `数组 [${arr.length} 个元素]`
    }
    case 'graph': {
      const obj = value as Record<string, unknown>
      const nodes = obj.nodes as unknown[] | undefined
      const edges = obj.edges as unknown[] | undefined
      return `图 (${nodes?.length ?? 0} 节点, ${edges?.length ?? 0} 边)`
    }
    case 'tree': {
      const obj = value as Record<string, unknown>
      const children = obj.children as Record<string, unknown> | undefined
      const nodeCount = children ? Object.keys(children).length : 0
      const rootValue = Array.isArray(obj.treeNodes)
        ? (obj.treeNodes as Array<{ id?: unknown; value?: unknown }>).find(node => String(node.id) === String(obj.root))?.value
        : undefined
      return `树 (根=${String(rootValue ?? obj.root)}, ${nodeCount} 节点)`
    }
    case 'matrix': {
      const arr = value as unknown[][]
      return arr.length > 0 && Array.isArray(arr[0]) ? `矩阵 [${arr.length}×${arr[0].length}]` : '矩阵'
    }
    case 'linked_list': {
      const obj = value as Record<string, unknown>
      const vals = obj.values as unknown[] | undefined
      return `链表 (${vals?.length ?? 0} 节点)`
    }
    default:
      return '未知结构'
  }
}

function extractPrimaryArray(obj: Record<string, unknown>): unknown[] {
  for (const key of ['nums', 'arr', 'array', 'values', 'heights', 'temperatures', 'prices', 'intervals', 'ranges', 'segments', 'stones', 'piles']) {
    if (Array.isArray(obj[key])) return obj[key]
  }
  return []
}
