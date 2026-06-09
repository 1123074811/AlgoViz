/** Universal LeetCode code-format input parser for all algorithm types */

export type InputFormat = 'leetcode' | 'json'

// ─── Public API ──────────────────────────────────────────────────────────

/** Parse user input text based on format and algorithm type */
export function parseAlgorithmInput(
  raw: string,
  format: InputFormat,
  algoId: string,
): unknown {
  if (format === 'json') {
    try { return JSON.parse(raw) } catch { return raw }
  }
  return parseCodeInput(raw, algoId)
}

/** Detect the appropriate LeetCode-format hint for each algorithm */
export function getLeetCodePlaceholder(algoId: string): string {
  if (algoId === 'gcd_euclidean') return 'a = 48, b = 18'
  if (algoId === 'sudoku') return 'board = [[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]]'
  if (algoId === 'btree' || algoId === 'bplus_tree') return 'keys = [10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37]'
  if (algoId === 'leetcode_hot100') return 'nums = [2, 7, 11, 15], target = 9'
  if (algoId === 'acm_templates') return 'nums = [2, 3, 5, 7, 11, 13]'
  if (GRAPH_ALGOS.has(algoId)) return 'n = 5, edges = [[0,1,4],[0,2,2],[1,3,5]]'
  if (STRING_ALGOS.has(algoId)) return 's = "babad" 或 text = "ABABC", pattern = "ABABC"'
  if (MATRIX_ALGOS.has(algoId)) return 'weights = [2,3,4], values = [3,4,5], capacity = 8'
  if (TREE_ALGOS.has(algoId)) return 'root = [8,3,10,1,6,null,14]'
  return 'nums = [5, 3, 8, 1, 9, 2]'
}

/** Get the LeetCode-format default value for each algorithm */
export function getLeetCodeDefault(algoId: string): string {
  return LEETCODE_DEFAULTS[algoId] ?? LEETCODE_DEFAULTS['_default']
}

// ─── Algorithm classification ────────────────────────────────────────────

const GRAPH_ALGOS = new Set([
  'bfs_graph','dfs_graph','dijkstra','prim','kruskal',
  'topological_sort','bellman_ford','a_star','union_find','tarjan_scc',
])

const STRING_ALGOS = new Set([
  'kmp','manacher','lcs','edit_distance','kmp_automaton',
])

const MATRIX_ALGOS = new Set([
  'knapsack_01','unbounded_knapsack','matrix_chain','interval_dp',
  'n_queens','sudoku','floyd',
])

const TREE_ALGOS = new Set([
  'binary_tree_traverse','bst_insert','bst_delete','bst_search',
  'avl_insert','trie','heap_ds','btree','bplus_tree','path_sum_iii',
  'btree_search','btree_insert','bplus_tree_search','bplus_tree_range_query',
])

/** 点集类（几何）：输入为 points = [[x,y],...]。 */
const POINTS_ALGOS = new Set([
  'convex_hull',
])

// ─── LeetCode defaults ────────────────────────────────────────────────────

const LEETCODE_DEFAULTS: Record<string, string> = {
  // Sorting
  bubble_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  selection_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  insertion_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  merge_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  quick_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  heap_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  shell_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  counting_sort: 'nums = [5, 3, 8, 1, 9, 2, 7, 4]',
  radix_sort: 'nums = [170, 45, 75, 90, 802, 24, 2, 66]',
  bucket_sort: 'nums = [42, 32, 33, 52, 37, 47, 51]',
  // Searching
  binary_search: 'nums = [1, 3, 5, 7, 9, 11, 13, 15], target = 7',
  // Sliding window / monotonic stack
  sliding_window: 'nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3',
  monotonic_stack: 'nums = [2, 1, 5, 6, 2, 3]',
  // DP
  lis: 'nums = [10, 9, 2, 5, 3, 7, 101, 18]',
  knapsack_01: 'weights = [2, 3, 4, 5], values = [3, 4, 5, 8], capacity = 8',
  unbounded_knapsack: 'weights = [2, 3, 5], values = [3, 4, 7], capacity = 8',
  matrix_chain: 'dims = [10, 20, 30, 40, 30]',
  interval_dp: 'stones = [3, 4, 5, 2, 6]',
  // Strings
  kmp: 'text = "ABABABCABABABCABAB", pattern = "ABABC"',
  manacher: 's = "babad"',
  lcs: 'text1 = "ABCBDAB", text2 = "BDCABA"',
  edit_distance: 'word1 = "horse", word2 = "ros"',
  // Graph
  bfs_graph: 'n = 6, edges = [[0,1],[0,2],[1,3],[1,4],[2,5]]',
  dfs_graph: 'n = 6, edges = [[0,1],[0,2],[1,3],[1,4],[2,5]]',
  dijkstra: 'n = 5, edges = [[0,1,4],[0,2,2],[1,2,1],[1,3,5],[2,3,8],[2,4,10],[3,4,2]]',
  prim: 'n = 5, edges = [[0,1,2],[0,3,6],[1,2,3],[1,3,8],[1,4,5],[2,4,7],[3,4,9]]',
  kruskal: 'n = 5, edges = [[0,1,2],[0,3,6],[1,2,3],[1,3,8],[1,4,5],[2,4,7],[3,4,9]]',
  topological_sort: 'n = 5, edges = [[0,1],[0,2],[1,3],[2,3],[3,4]]',
  bellman_ford: 'n = 5, edges = [[0,1,5],[0,2,4],[1,3,3],[2,1,-2],[2,3,7],[3,4,2],[1,4,6]]',
  a_star: 'n = 5, edges = [[0,1,1],[0,2,4],[1,2,2],[1,3,5],[2,3,1],[3,4,3],[2,4,7]], start = 0, goal = 4',
  union_find: 'n = 6, edges = [[0,1],[1,2],[3,4],[4,5],[2,4]]',
  floyd: 'matrix = [[0,3,999,7],[8,0,2,999],[999,999,0,1],[6,999,999,0]]',
  // Data structures
  stack: 'nums = [1, 2, 3]',
  queue: 'nums = [1, 2, 3]',
  heap_ds: 'nums = [4, 10, 3, 5, 1, 2]',
  trie: 'words = ["cat", "car", "dog"]',
  hash_table: 'pairs = {"name": "Alice", "age": "25", "city": "Beijing"}',
  // Trees
  binary_tree_traverse: 'root = [8, 3, 10, 1, 6, null, 14]',
  path_sum_iii: 'root = [10, 5, -3, 3, 2, null, 11, 3, -2, null, 1], targetSum = 8',
  bst_insert: 'nums = [8, 3, 10, 1, 6, 14]',
  bst_delete: 'nums = [8, 3, 10, 1, 6, 14]',
  bst_search: 'nums = [8, 3, 10, 1, 6, 14]',
  avl_insert: 'nums = [8, 3, 10, 1, 6, 14]',
  btree: 'keys = [10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37]',
  bplus_tree: 'keys = [10, 20, 30, 35, 40, 45, 50, 60]',
  // Backtracking / puzzles
  n_queens: 'n = 4',
  sudoku: 'board = [[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]]',
  backtracking: 'nums = [1, 2, 3]',
  // Misc
  segment_tree: 'nums = [1, 3, 5, 7, 9, 11]',
  fenwick_tree: 'nums = [3, 2, -1, 6, 5, 4, -3, 3]',
  linked_list_insert: 'nums = [1, 2, 3], param = 5',
  linked_list_delete: 'nums = [1, 2, 3], param = 3',
  linked_list_search: 'nums = [1, 2, 3], param = 3',
  gcd_euclidean: 'a = 48, b = 18',
  leetcode_hot100: 'nums = [2, 7, 11, 15], target = 9',
  acm_templates: 'nums = [2, 3, 5, 7, 11, 13]',
  // 进阶/新模块（图/字符串/几何/概率）—— 类型匹配的默认输入
  tarjan_scc: 'n = 5, edges = [[0,1],[1,2],[2,0],[2,3],[3,4],[4,3]]',
  kmp_automaton: 'text = "ababaab", pattern = "aba"',
  convex_hull: 'points = [[0,0],[4,0],[5,3],[2,5],[1,1],[3,2]]',
  reservoir_sampling: 'nums = [10, 20, 30, 40, 50, 60]',
  btree_search: 'keys = [10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37]',
  btree_insert: 'keys = [10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37]',
  bplus_tree_search: 'keys = [10, 20, 30, 35, 40, 45, 50, 60]',
  bplus_tree_range_query: 'keys = [10, 20, 30, 35, 40, 45, 50, 60]',
  _default: 'nums = [5, 3, 8, 1, 9, 2]',
}

// ─── Code parser engine ───────────────────────────────────────────────────

function parseCodeInput(raw: string, algoId: string): unknown {
  const s = raw.trim()

  // Try JSON first if it looks like JSON
  if (s.startsWith('{') || s.startsWith('[')) {
    try { return JSON.parse(s) } catch { /* fall through to code parser */ }
  }

  // ── Extract variable assignments from code ──────────────────────────
  const vars = extractAllVariables(s)

  // Route based on algorithm type
  if (GRAPH_ALGOS.has(algoId) || algoId === 'union_find') {
    return parseGraphCodeVars(vars, s)
  }
  if (STRING_ALGOS.has(algoId)) {
    return parseStringCodeVars(vars, algoId)
  }
  if (MATRIX_ALGOS.has(algoId)) {
    return parseMatrixCodeVars(vars, algoId, s)
  }
  if (TREE_ALGOS.has(algoId)) {
    return parseTreeCodeVars(vars, s)
  }
  if (POINTS_ALGOS.has(algoId)) {
    return parsePointsCodeVars(vars)
  }
  if (algoId === 'binary_search') {
    return parseArrayTargetCodeVars(vars)
  }
  if (algoId === 'leetcode_hot100') {
    return parseArrayTargetCodeVars(vars)
  }
  if (algoId === 'gcd_euclidean') {
    return parseGcdCodeVars(vars)
  }

  // Default: return the first array found, or the raw string
  return parseDefaultCodeVars(vars, s)
}

// ─── Variable extraction ──────────────────────────────────────────────────

interface ParsedVars {
  [key: string]: unknown
}

function extractAllVariables(s: string): ParsedVars {
  const vars: ParsedVars = {}
  // Clean up common code noise
  let cleaned = s
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\bconst\s+|\blet\s+|\bvar\s+|\bint\s+|\bauto\s+/g, '')
    .replace(/\bvector\s*<.*?>\s*/g, '')
    .replace(/\bstring\s+|\bchar\s+/g, '')
    .replace(/;\s*$/gm, '')
    .replace(/,\s*$/, '')

  // Extract simple assignments: varname = value
  const assignRe = /(\w+)\s*[:=]\s*(.+?)(?=\s*,\s*\w+\s*[:=]|\s*$)/g
  let match: RegExpExecArray | null
  while ((match = assignRe.exec(cleaned)) !== null) {
    const name = match[1].trim()
    const rawVal = match[2].trim()
    vars[name] = parseValue(rawVal)
  }

  // If no named vars, try to find bare arrays or numbers
  if (Object.keys(vars).length === 0) {
    const allArrays = extractAllArrays(cleaned)
    if (allArrays.length > 0) {
      vars._array = allArrays[allArrays.length - 1] // last array = most likely the data
    }
    const numMatch = cleaned.match(/\b(\d+)\b/)
    if (numMatch && !vars._array) {
      vars._n = parseInt(numMatch[1])
    }
  }

  return vars
}

/** Parse a raw value string into JS value */
function parseValue(raw: string): unknown {
  raw = raw.trim()

  // Number
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)

  // String (double or single quoted)
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }

  // Array
  if (raw.startsWith('[')) {
    try {
      const arrStr = extractMatchingBrackets(raw)
      return JSON.parse(arrStr)
    } catch { return raw }
  }

  // Object
  if (raw.startsWith('{')) {
    try {
      const objStr = extractMatchingBraces(raw)
      return JSON.parse(objStr)
    } catch { return raw }
  }

  return raw
}

function extractAllArrays(s: string): unknown[][] {
  const results: unknown[][] = []
  const re = /\[/g
  let match: RegExpExecArray | null
  while ((match = re.exec(s)) !== null) {
    try {
      const arr = JSON.parse(extractMatchingBrackets(s.slice(match.index)))
      if (Array.isArray(arr)) results.push(arr)
    } catch { continue }
  }
  return results
}

function extractMatchingBrackets(s: string): string {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '[') depth++
    else if (s[i] === ']') { depth--; if (depth === 0) return s.slice(0, i + 1) }
  }
  return s
}

function extractMatchingBraces(s: string): string {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') { depth--; if (depth === 0) return s.slice(0, i + 1) }
  }
  return s
}

// ─── Type-specific parsers ─────────────────────────────────────────────────

function parseGraphCodeVars(vars: ParsedVars, _s: string): unknown {
  let n: number | undefined
  let edges: unknown[][] | undefined
  let start: string | undefined
  let goal: string | undefined

  if (typeof vars.n === 'number') n = vars.n
  if (Array.isArray(vars.edges)) edges = vars.edges as unknown[][]
  if (typeof vars._n === 'number' && n === undefined) n = vars._n
  if (Array.isArray(vars._array) && !edges) edges = vars._array as unknown[][]
  if (typeof vars.start === 'string' || typeof vars.start === 'number') start = String(vars.start)
  if (typeof vars.goal === 'string' || typeof vars.goal === 'number') goal = String(vars.goal)

  if (edges) {
    const nodeSet = new Set<string>()
    let maxId = -1
    const graphEdges: Array<{ source: string; target: string; weight?: number }> = []
    for (const pair of edges) {
      if (Array.isArray(pair) && pair.length >= 2) {
        const s = String(pair[0]), t = String(pair[1])
        const si = parseInt(s), ti = parseInt(t)
        if (!isNaN(si)) maxId = Math.max(maxId, si)
        if (!isNaN(ti)) maxId = Math.max(maxId, ti)
        nodeSet.add(s); nodeSet.add(t)
        graphEdges.push({ source: s, target: t, weight: pair.length >= 3 ? Number(pair[2]) : undefined })
      }
    }
    if (n === undefined) n = Math.max(maxId + 1, nodeSet.size)
    const nodeCount = Math.max(n, maxId + 1)
    const result: Record<string, unknown> = {
      nodes: Array.from({ length: nodeCount }, (_, i) => ({ id: String(i), label: String(i) })),
      edges: graphEdges,
    }
    if (start) result.start = start
    if (goal) result.goal = goal
    return result
  }
  return vars
}

function parsePointsCodeVars(vars: ParsedVars): unknown {
  // points = [[x,y],...]；兼容 pts / 裸二维数组。
  const pts = Array.isArray(vars.points) ? vars.points
    : Array.isArray(vars.pts) ? vars.pts
    : Array.isArray(vars._array) ? vars._array
    : undefined
  return pts ? { points: pts } : vars
}

function parseStringCodeVars(vars: ParsedVars, algoId: string): unknown {
  // For KMP / KMP 自动机: text + pattern
  if (algoId === 'kmp' || algoId === 'kmp_automaton') {
    if (typeof vars.text === 'string' && typeof vars.pattern === 'string') {
      return { text: vars.text, pattern: vars.pattern }
    }
    if (typeof vars.s === 'string' && typeof vars.p === 'string') {
      return { text: vars.s, pattern: vars.p }
    }
  }
  // For Manacher: s
  if (algoId === 'manacher') {
    if (typeof vars.s === 'string') return vars.s
    if (typeof vars.str === 'string') return vars.str
  }
  // For LCS / EditDistance: text1 + text2 or word1 + word2
  if (algoId === 'lcs' || algoId === 'edit_distance') {
    const s1 = typeof vars.text1 === 'string' ? vars.text1 : typeof vars.word1 === 'string' ? vars.word1 : typeof vars.s1 === 'string' ? vars.s1 : undefined
    const s2 = typeof vars.text2 === 'string' ? vars.text2 : typeof vars.word2 === 'string' ? vars.word2 : typeof vars.s2 === 'string' ? vars.s2 : typeof vars.pattern === 'string' ? vars.pattern : undefined
    if (s1 && s2) return { text1: s1, text2: s2 }
    if (s1) return [s1, s2 ?? '']
  }
  // Fallback: return first string found
  for (const val of Object.values(vars)) {
    if (typeof val === 'string') return val
  }
  return vars
}

function parseMatrixCodeVars(vars: ParsedVars, _algoId: string, _s: string): unknown {
  if (Array.isArray(vars.intervals)) return vars
  if (Array.isArray(vars.ranges)) return vars
  if (Array.isArray(vars.segments)) return vars
  // Knapsack: weights + values + capacity
  if (Array.isArray(vars.weights) && Array.isArray(vars.values) && typeof vars.capacity === 'number') {
    return vars
  }
  // Matrix chain: dims
  if (Array.isArray(vars.dims)) return vars.dims
  // Interval DP: stones
  if (Array.isArray(vars.stones)) return vars.stones
  // N-Queens: n
  if (typeof vars.n === 'number') return vars.n
  // Floyd: matrix
  if (Array.isArray(vars.matrix)) return vars.matrix
  // Sudoku: board
  if (Array.isArray(vars.board)) return vars.board
  // Default: return first array
  if (Array.isArray(vars._array)) return vars._array
  return vars
}

function parseTreeCodeVars(vars: ParsedVars, _s: string): unknown {
  // root for binary tree
  if (Array.isArray(vars.root)) {
    const source = [...vars.root]
    const root = vars.root.map(v => v === null || v === 'null' ? 0 : Number(v))
    return Object.keys(vars).length > 1 ? { ...vars, root, source } : root
  }
  // keys for B-Tree / B+ Tree
  if (Array.isArray(vars.keys)) return vars.keys
  // nums
  if (Array.isArray(vars.nums)) return vars.nums
  // words for trie
  if (Array.isArray(vars.words)) return vars.words
  // Fallback
  if (Array.isArray(vars._array)) return vars._array
  return vars
}

function parseArrayTargetCodeVars(vars: ParsedVars): unknown {
  const nums = Array.isArray(vars.nums)
    ? vars.nums
    : Array.isArray(vars.arr)
      ? vars.arr
      : Array.isArray(vars.array)
        ? vars.array
        : Array.isArray(vars._array)
          ? vars._array
          : undefined
  const target = typeof vars.target === 'number'
    ? vars.target
    : typeof vars.param === 'number'
      ? vars.param
      : undefined

  if (nums && target !== undefined) return { nums, target, data: nums, param: target }
  if (nums) return nums
  return vars
}

function parseGcdCodeVars(vars: ParsedVars): unknown {
  const a = typeof vars.a === 'number' ? vars.a : typeof vars.x === 'number' ? vars.x : undefined
  const b = typeof vars.b === 'number' ? vars.b : typeof vars.y === 'number' ? vars.y : undefined
  if (a !== undefined && b !== undefined) return { a, b }
  if (Array.isArray(vars.nums)) return vars.nums
  if (Array.isArray(vars.arr)) return vars.arr
  if (Array.isArray(vars.array)) return vars.array
  if (Array.isArray(vars._array)) return vars._array
  return vars
}

function parseDefaultCodeVars(vars: ParsedVars, _s: string): unknown {
  // For simple algorithms, return the first array or number
  if (Array.isArray(vars.nums)) return vars.nums
  if (Array.isArray(vars.arr)) return vars.arr
  if (Array.isArray(vars.array)) return vars.array
  if (Array.isArray(vars._array)) return vars._array
  if (typeof vars.target === 'number' && Array.isArray(vars.nums)) {
    return { data: vars.nums, param: vars.target }
  }
  if (typeof vars.k === 'number' && Array.isArray(vars.nums)) {
    return vars
  }
  if (typeof vars.n === 'number') return vars.n
  // Return raw vars object
  return vars
}
