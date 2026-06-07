import type { QualityRule } from './quality/types'
import { CATEGORY_PROMPTS } from './prompt/categories'
import { CATEGORY_RULES } from './quality/rules/category'

export type AlgorithmCategory =
  | 'linear' // 排序/查找/双指针/滑动窗口（array、string）
  | 'recursion' // DFS/回溯/分治/树递归 —— 必须驱动调用栈
  | 'grid' // 迷宫/岛屿/棋盘/网格寻路
  | 'graph' // BFS/DFS 图/最短路/MST/拓扑
  | 'tree' // BST/AVL/堆/Trie/B 树
  | 'dp' // 2D 动态规划
  | 'structure' // 栈/队列/哈希/集合/位集 等数据结构操作

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
const DP_ALGOS = /\bdp\b|knapsack|lcs|lis|edit_distance|matrix_chain|interval_dp/i
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
