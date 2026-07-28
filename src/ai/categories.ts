import type { QualityRule } from './quality/types'
import type { AlgorithmCategory } from '@/generator'
import { CATEGORY_PROMPTS } from './prompt/categories'
import { CATEGORY_RULES } from './quality/rules/category'

export type { AlgorithmCategory } from '@/generator'

export const ALL_CATEGORIES: AlgorithmCategory[] = [
  'linear', 'recursion', 'grid', 'graph', 'tree', 'dp', 'structure',
]

export interface CategoryProfile {
  id: AlgorithmCategory
  /** 提示词中该类别专属章节（WS2 填充实际内容）。 */
  promptModule: string
  /** 该类别专属质量规则（WS5 填充实际规则）。 */
  rules: QualityRule[]
}

const GRID_ALGOS = /islands?|flood|maze|grid|matrix.?path|num_islands/i
const RECURSION_ALGOS = /dfs|backtrack|permut|combin|subset|divide|recursion|n_queens|sudoku/i
const GRAPH_ALGOS = /bfs|dfs_graph|dijkstra|prim|kruskal|topolog|bellman|floyd|a_?star|union_find/i
const TREE_ALGOS = /tree|bst|avl|trie|heap|btree|b_?plus/i
const DP_ALGOS = /\bdp\b|knapsack|lcs|lis|edit_distance|matrix_chain|interval_dp|digit[_-]?dp|数位|memo|记忆化|memoiz/i
const STRUCT_ALGOS = /stack|queue|deque|hash|\bset\b|bitset|priority/i

/** 确定性分类器：优先 declaredCategory(@category)，否则按 algorithm/type/code 推断。 */
export function classifyAlgorithm(input: {
  algorithm?: string
  type?: string
  declaredCategory?: string
  code?: string
}): AlgorithmCategory {
  const d = input.declaredCategory?.toLowerCase()
  if (d && (ALL_CATEGORIES as string[]).includes(d)) return d as AlgorithmCategory
  const hay = `${input.algorithm ?? ''} ${input.code ?? ''}`
  if (input.type === 'graph' || GRAPH_ALGOS.test(hay)) return 'graph'
  if (GRID_ALGOS.test(hay)) return 'grid'
  if (input.type === 'tree' || TREE_ALGOS.test(hay)) return 'tree'
  if (DP_ALGOS.test(hay)) return 'dp'
  if (RECURSION_ALGOS.test(hay)) return 'recursion'
  if (STRUCT_ALGOS.test(hay)) return 'structure'
  return 'linear'
}

/** 各类别 profile。promptModule/rules 由 WS2/WS5 填充；此处给空骨架。 */
export const CATEGORY_PROFILES: Record<AlgorithmCategory, CategoryProfile> =
  ALL_CATEGORIES.reduce((acc, id) => {
    acc[id] = { id, promptModule: CATEGORY_PROMPTS[id] ?? '', rules: CATEGORY_RULES[id] ?? [] }
    return acc
  }, {} as Record<AlgorithmCategory, CategoryProfile>)
