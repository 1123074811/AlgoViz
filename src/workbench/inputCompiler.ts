import {
  parseAlgorithmInput,
  type InputFormat,
} from '@/utils/inputParser'

export interface InputDiagnostic {
  severity: 'error'
  code: 'E_INPUT_EMPTY' | 'E_INPUT_SYNTAX' | 'E_INPUT_TYPE' | 'E_INPUT_DOMAIN'
  message: string
  line: number
  column: number
}

export interface InputCompilation {
  status: 'waiting' | 'incomplete' | 'error' | 'ready'
  value?: unknown
  diagnostics: InputDiagnostic[]
}

export function compileOperationInput(raw: string, operationId: string): InputCompilation {
  if (!raw.trim()) {
    return { status: 'waiting', diagnostics: [diagnostic('E_INPUT_EMPTY', '等待操作参数')] }
  }
  if (operationId === 'range_query') {
    const values = raw.split(',').map(value => Number(value.trim()))
    if (values.length !== 2 || values.some(value => !Number.isFinite(value))) {
      return { status: 'error', diagnostics: [diagnostic('E_INPUT_TYPE', '范围查询需要 low, high 两个数值')] }
    }
    return values[0] <= values[1]
      ? { status: 'ready', value: values, diagnostics: [] }
      : { status: 'error', diagnostics: [diagnostic('E_INPUT_DOMAIN', '范围下界 low 不能大于 high')] }
  }
  const value = Number(raw.trim())
  return Number.isFinite(value)
    ? { status: 'ready', value, diagnostics: [] }
    : { status: 'error', diagnostics: [diagnostic('E_INPUT_TYPE', '操作参数必须是有限数值')] }
}

const ARRAY_ALGORITHMS = new Set([
  'bubble_sort', 'selection_sort', 'insertion_sort', 'merge_sort', 'quick_sort',
  'heap_sort', 'shell_sort', 'counting_sort', 'radix_sort', 'bucket_sort',
  'sliding_window', 'monotonic_stack', 'lis', 'fenwick_tree', 'segment_tree',
  'stack', 'queue', 'heap_ds', 'set', 'deque', 'bitset', 'backtracking',
  'subsets', 'linked_list_insert', 'linked_list_delete', 'linked_list_search',
  'linked_list_reversal', 'reservoir_sampling', 'acm_templates',
])

const GRAPH_ALGORITHMS = new Set([
  'bfs_graph', 'dfs_graph', 'dijkstra', 'prim', 'kruskal', 'topological_sort',
  'bellman_ford', 'a_star', 'union_find', 'tarjan_scc',
])

const TREE_ARRAY_ALGORITHMS = new Set([
  'binary_tree_traverse', 'path_sum_iii', 'bst_insert', 'bst_delete', 'bst_search',
  'avl_insert', 'red_black_tree', 'btree', 'bplus_tree', 'btree_search',
  'btree_insert', 'bplus_tree_search', 'bplus_tree_range_query',
])

const MATRIX_ALGORITHMS = new Set(['floyd', 'grid_dp', 'grid_pathfinding', 'sudoku'])

export function compileAlgorithmInput(
  raw: string,
  format: InputFormat,
  algorithmId: string,
): InputCompilation {
  if (!raw.trim()) {
    return {
      status: 'waiting',
      diagnostics: [diagnostic('E_INPUT_EMPTY', '等待输入数据 / Waiting for input')],
    }
  }

  const structure = scanStructure(raw)
  if (structure.status !== 'ready') return structure

  let value: unknown
  if (format === 'json') {
    try {
      value = JSON.parse(raw)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const position = Number(message.match(/position\s+(\d+)/i)?.[1] ?? 0)
      const location = offsetLocation(raw, position)
      return {
        status: 'error',
        diagnostics: [{
          ...diagnostic('E_INPUT_SYNTAX', `JSON 语法错误：${message}`),
          ...location,
        }],
      }
    }
  } else {
    value = parseAlgorithmInput(raw, format, algorithmId)
  }

  const domainError = validateDomain(algorithmId, value)
  return domainError
    ? { status: 'error', diagnostics: [domainError] }
    : { status: 'ready', value, diagnostics: [] }
}

function scanStructure(raw: string): InputCompilation {
  const stack: Array<{ char: string; offset: number }> = []
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  let quote: '"' | "'" | null = null
  let escaped = false

  for (let offset = 0; offset < raw.length; offset++) {
    const char = raw[offset]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '(' || char === '[' || char === '{') {
      stack.push({ char, offset })
      continue
    }
    if (char === ')' || char === ']' || char === '}') {
      const opening = stack.pop()
      if (!opening || opening.char !== pairs[char]) {
        const location = offsetLocation(raw, offset)
        return {
          status: 'error',
          diagnostics: [{
            ...diagnostic('E_INPUT_SYNTAX', `括号不匹配：意外的 '${char}'`),
            ...location,
          }],
        }
      }
    }
  }

  if (quote || stack.length > 0) {
    const opening = stack[stack.length - 1]
    const location = offsetLocation(raw, opening?.offset ?? raw.length)
    return {
      status: 'incomplete',
      diagnostics: [{
        ...diagnostic(
          'E_INPUT_SYNTAX',
          quote ? '字符串尚未闭合，等待继续输入' : `输入尚未闭合，等待 '${closingFor(opening.char)}'`,
        ),
        ...location,
      }],
    }
  }

  return { status: 'ready', diagnostics: [] }
}

function validateDomain(algorithmId: string, value: unknown): InputDiagnostic | null {
  if (algorithmId === 'sliding_window') {
    const object = asObject(value)
    if (!object || !numberArray(object.nums) || !Number.isInteger(object.k)) {
      return diagnostic('E_INPUT_TYPE', '滑动窗口输入需要数值数组 nums 和整数 k')
    }
    return Number(object.k) >= 1 && Number(object.k) <= object.nums.length
      ? null
      : diagnostic('E_INPUT_DOMAIN', '窗口大小 k 必须在 1 到 nums.length 之间')
  }

  if (algorithmId === 'gcd_euclidean') {
    const object = asObject(value)
    return object && Number.isInteger(object.a) && Number.isInteger(object.b)
      ? null
      : diagnostic('E_INPUT_TYPE', 'GCD 输入必须包含整数 a 和 b')
  }

  if (algorithmId === 'binary_search') {
    const object = asObject(value)
    const values = Array.isArray(object?.nums) ? object.nums : Array.isArray(value) ? value : null
    if (!numberArray(values)) return diagnostic('E_INPUT_TYPE', '二分查找需要数值数组 nums')
    if (!values.every((item, index) => index === 0 || Number(values[index - 1]) <= Number(item))) {
      return diagnostic('E_INPUT_DOMAIN', '二分查找输入必须按升序排列')
    }
    return null
  }

  if (algorithmId === 'knapsack_01' || algorithmId === 'unbounded_knapsack') {
    const object = asObject(value)
    if (!object || !numberArray(object.weights) || !numberArray(object.values) || !finiteNumber(object.capacity)) {
      return diagnostic('E_INPUT_TYPE', '背包输入需要 weights、values 数值数组和 capacity 数值')
    }
    if (object.weights.length !== object.values.length) {
      return diagnostic('E_INPUT_DOMAIN', 'weights 与 values 长度必须一致')
    }
    if (object.weights.some(item => Number(item) <= 0) || Number(object.capacity) < 0) {
      return diagnostic('E_INPUT_DOMAIN', '重量必须大于 0，capacity 不能为负数')
    }
    return null
  }

  if (algorithmId === 'kmp' || algorithmId === 'kmp_automaton') {
    const object = asObject(value)
    return object && typeof object.text === 'string' && typeof object.pattern === 'string' && object.pattern.length > 0
      ? null
      : diagnostic('E_INPUT_TYPE', '字符串匹配需要 text 和非空 pattern')
  }

  if (algorithmId === 'lcs' || algorithmId === 'edit_distance') {
    const object = asObject(value)
    const validObject = object && (
      (typeof object.text1 === 'string' && typeof object.text2 === 'string')
      || (typeof object.word1 === 'string' && typeof object.word2 === 'string')
    )
    return validObject || (Array.isArray(value) && value.length >= 2 && value.every(item => typeof item === 'string'))
      ? null
      : diagnostic('E_INPUT_TYPE', '该算法需要两个字符串输入')
  }

  if (algorithmId === 'manacher') {
    return typeof value === 'string'
      ? null
      : diagnostic('E_INPUT_TYPE', 'Manacher 输入必须是字符串')
  }

  if (algorithmId === 'trie') {
    return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.length > 0)
      ? null
      : diagnostic('E_INPUT_TYPE', 'Trie 输入必须是非空字符串数组 words')
  }

  if (algorithmId === 'n_queens') {
    return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 10
      ? null
      : diagnostic('E_INPUT_DOMAIN', 'N 皇后要求整数 n，范围为 1~10')
  }

  if (algorithmId === 'reservoir_sampling') {
    const object = asObject(value)
    const stream = object?.stream ?? object?.data ?? value
    if (!numberArray(stream)) return diagnostic('E_INPUT_TYPE', '水塘抽样需要数值数组 stream')
    if (object?.seed !== undefined && !Number.isInteger(object.seed)) {
      return diagnostic('E_INPUT_TYPE', '水塘抽样 seed 必须是整数')
    }
    return stream.length > 0
      ? null
      : diagnostic('E_INPUT_DOMAIN', '水塘抽样的数据流不能为空')
  }

  if (algorithmId === 'matrix_chain' || algorithmId === 'interval_dp') {
    return numberArray(value) && value.length >= 2
      ? null
      : diagnostic('E_INPUT_TYPE', '该算法需要至少两个数值组成的数组')
  }

  if (MATRIX_ALGORITHMS.has(algorithmId)) {
    const matrix = matrixFrom(value)
    if (!matrix || matrix.length === 0 || !matrix.every(row => row.length === matrix[0].length && numberArray(row))) {
      return diagnostic('E_INPUT_TYPE', '输入必须是非空、等宽的数值矩阵')
    }
    if (algorithmId === 'sudoku' && (
      matrix.length !== 9
      || matrix.some(row => row.length !== 9 || row.some(item => !Number.isInteger(item) || Number(item) < 0 || Number(item) > 9))
    )) {
      return diagnostic('E_INPUT_DOMAIN', '数独必须是 9×9 矩阵，元素范围为 0~9')
    }
    if (algorithmId === 'sudoku' && hasSudokuConflict(matrix as number[][])) {
      return diagnostic('E_INPUT_DOMAIN', '数独初始盘面在行、列或 3×3 宫内存在重复数字')
    }
    if (algorithmId === 'grid_pathfinding') {
      const object = asObject(value)
      const start = object?.start
      const target = object?.target
      if (!coordinate(start) || !coordinate(target)) {
        return diagnostic('E_INPUT_TYPE', '网格寻路需要二维坐标 start 和 target')
      }
      const inBounds = ([row, col]: number[]) =>
        row >= 0 && row < matrix.length && col >= 0 && col < matrix[0].length
      if (!inBounds(start) || !inBounds(target)) {
        return diagnostic('E_INPUT_DOMAIN', 'start 和 target 必须位于网格范围内')
      }
      if (matrix.some(row => row.some(item => item !== 0 && item !== 1))) {
        return diagnostic('E_INPUT_DOMAIN', '网格寻路只接受 0（通路）和 1（墙）')
      }
      if (matrix[start[0]][start[1]] === 1 || matrix[target[0]][target[1]] === 1) {
        return diagnostic('E_INPUT_DOMAIN', 'start 和 target 不能位于墙上')
      }
    }
    return null
  }

  if (GRAPH_ALGORITHMS.has(algorithmId)) return validateGraph(value, algorithmId)

  if (algorithmId === 'convex_hull') {
    const object = asObject(value)
    const points = Array.isArray(object?.points) ? object.points : value
    return Array.isArray(points)
      && points.length >= 3
      && points.every(point => Array.isArray(point) && point.length >= 2 && finiteNumber(point[0]) && finiteNumber(point[1]))
      && new Set(points.map(point => `${point[0]},${point[1]}`)).size >= 3
      ? null
      : diagnostic('E_INPUT_TYPE', '凸包输入至少需要 3 个二维数值点')
  }

  if (algorithmId === 'hash_table' || algorithmId === 'map') {
    return asObject(value)
      ? null
      : diagnostic('E_INPUT_TYPE', '映射结构输入必须是 JSON/键值对象')
  }

  if (TREE_ARRAY_ALGORITHMS.has(algorithmId)) {
    const object = asObject(value)
    const items = Array.isArray(object?.source)
      ? object.source
      : Array.isArray(object?.root)
        ? object.root
        : Array.isArray(object?.keys)
          ? object.keys
          : Array.isArray(object?.nums)
            ? object.nums
            : value
    return Array.isArray(items)
      && items.length > 0
      && items.every(item => item === null || finiteNumber(item))
      ? null
      : diagnostic('E_INPUT_TYPE', '树输入必须是非空层序/关键码数值数组，可使用 null 表示空节点')
  }

  if (ARRAY_ALGORITHMS.has(algorithmId)) {
    const object = asObject(value)
    const items = Array.isArray(object?.nums)
      ? object.nums
      : Array.isArray(object?.data)
        ? object.data
        : value
    if (!numberArray(items)) return diagnostic('E_INPUT_TYPE', '该算法需要数值数组输入')
    if ((algorithmId === 'counting_sort' || algorithmId === 'radix_sort') && items.some(item => !Number.isInteger(item) || item < 0)) {
      return diagnostic('E_INPUT_DOMAIN', '计数/基数排序只接受非负整数')
    }
  }

  return containsInvalidNumber(value)
    ? diagnostic('E_INPUT_DOMAIN', '输入包含 NaN 或无穷数')
    : null
}

function hasSudokuConflict(board: number[][]): boolean {
  const duplicate = (values: number[]) => {
    const nonZero = values.filter(Boolean)
    return new Set(nonZero).size !== nonZero.length
  }
  for (let index = 0; index < 9; index++) {
    if (duplicate(board[index]) || duplicate(board.map(row => row[index]))) return true
  }
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const values = Array.from({ length: 9 }, (_, offset) =>
        board[boxRow * 3 + Math.floor(offset / 3)][boxCol * 3 + offset % 3],
      )
      if (duplicate(values)) return true
    }
  }
  return false
}

function validateGraph(value: unknown, algorithmId: string): InputDiagnostic | null {
  const object = asObject(value)
  if (!object || !Array.isArray(object.nodes) || !Array.isArray(object.edges) || object.nodes.length === 0) {
    return diagnostic('E_INPUT_TYPE', '图输入需要非空 nodes 和 edges')
  }
  const nodeIds = new Set(object.nodes.flatMap(node => {
    const record = asObject(node)
    return record && (typeof record.id === 'string' || typeof record.id === 'number')
      ? [String(record.id)]
      : []
  }))
  if (nodeIds.size !== object.nodes.length) return diagnostic('E_INPUT_TYPE', '每个图节点必须具有唯一 id')
  for (const edge of object.edges) {
    const record = asObject(edge)
    if (!record || !nodeIds.has(String(record.source)) || !nodeIds.has(String(record.target))) {
      return diagnostic('E_INPUT_DOMAIN', '图边的 source/target 必须引用已声明节点')
    }
    if (record.weight !== undefined && !finiteNumber(record.weight)) {
      return diagnostic('E_INPUT_TYPE', '图边权重必须是有限数值')
    }
    if ((algorithmId === 'dijkstra' || algorithmId === 'a_star') && Number(record.weight ?? 1) < 0) {
      return diagnostic('E_INPUT_DOMAIN', `${algorithmId === 'dijkstra' ? 'Dijkstra' : 'A*'} 不接受负权边`)
    }
  }
  for (const key of ['start', 'goal']) {
    if (object[key] !== undefined && !nodeIds.has(String(object[key]))) {
      return diagnostic('E_INPUT_DOMAIN', `${key} 必须引用已声明节点`)
    }
  }
  return null
}

function matrixFrom(value: unknown): unknown[][] | null {
  if (Array.isArray(value) && value.every(Array.isArray)) return value
  const object = asObject(value)
  for (const key of ['matrix', 'grid', 'board']) {
    if (Array.isArray(object?.[key]) && object[key].every(Array.isArray)) return object[key] as unknown[][]
  }
  return null
}

function numberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every(finiteNumber)
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function coordinate(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => Number.isInteger(item))
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function containsInvalidNumber(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value)
  if (Array.isArray(value)) return value.some(containsInvalidNumber)
  if (value && typeof value === 'object') return Object.values(value).some(containsInvalidNumber)
  return false
}

function closingFor(opening: string): string {
  return opening === '(' ? ')' : opening === '[' ? ']' : '}'
}

function offsetLocation(raw: string, offset: number): { line: number; column: number } {
  const before = raw.slice(0, Math.max(0, offset))
  const lines = before.split('\n')
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}

function diagnostic(
  code: InputDiagnostic['code'],
  message: string,
): InputDiagnostic {
  return { severity: 'error', code, message, line: 1, column: 1 }
}
