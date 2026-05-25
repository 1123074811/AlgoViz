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
    value = JSON.parse(raw)
  } catch {
    return {
      kind: 'unknown', raw, value: null, valid: false,
      message: '输入不是合法 JSON',
      promptContext: '',
      summary: '无法解析',
    }
  }

  const kind = identifyKind(value)
  const promptContext = buildPromptContext(kind, value)
  const summary = buildSummary(kind, value)

  return {
    kind, raw, value, valid: true,
    promptContext, summary,
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
- 遍历路径放入 teachingState.tree.traversalPath
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
      const arr = value as unknown[]
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
      return `树 (根=${String(obj.root)}, ${nodeCount} 节点)`
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
