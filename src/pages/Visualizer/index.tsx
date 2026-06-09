import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAlgorithmStore, type AIHistoryEntry } from '@/store/algorithmStore'
import { getPreset, generatePreset, hasGenerator } from '@/presets'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { getApiConfig, parseInputData } from '@/ai'
import { useAIGenerator } from '@/hooks/useAIGenerator'
import type { AnimationScript } from '@/types/animation'
import { compileAndValidateCode } from '@/utils/codeCompiler'
import { parseAlgorithmInput, getLeetCodeDefault, getLeetCodePlaceholder } from '@/utils/inputParser'
import { ALGORITHM_DEFS } from '@/data/algorithmDefs'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'
import PlaybackControls from '@/components/Controls/PlaybackControls'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import InputDataPanel from '@/components/Editor/InputDataPanel'
import RunDataPanel from '@/components/Editor/RunDataPanel'
import { REQUEST_AI_REPAIR_EVENT } from '@/components/ErrorBoundary'
import { getSceneDiagnosticSummary, getSceneEventStats, usesSceneEngine } from '@/scene'
import { getOperationsForAlgo } from '@/presets/operationPresets'
import { getCodeTemplate, type CodeLang } from './codeTemplates'
import DefinitionCard from './DefinitionCard'
import { useResizablePanels } from './useResizablePanels'

const ALGO_DESC_ZH: Record<string, string> = {
  bubble_sort: '重复遍历数列，依次比较相邻元素，如果顺序错误则交换位置。每轮将最大值"冒泡"到末尾。',
  selection_sort: '每次从未排序区间选择最小的元素，放到已排序区间的末尾。',
  insertion_sort: '将未排序元素依次插入到已排序序列的合适位置，类似整理扑克牌。',
  merge_sort: '分治法：将数组递归二分，排序后合并两个有序子数组。',
  quick_sort: '选取基准元素，将数组分为小于和大于基准的两部分，递归排序。',
  shell_sort: '插入排序的改进版，通过比较相隔一定间隔的元素，逐步缩小间隔直到1。',
  heap_sort: '利用二叉堆数据结构，每次将最大值移到堆顶，再与末尾交换。',
  counting_sort: '非比较排序，统计每个元素的出现次数，再按顺序重建数组。',
  radix_sort: '按位排序，从最低位到最高位，每位用稳定的计数排序。',
  bucket_sort: '将元素分布到多个桶中，每个桶内排序后合并。',
  bfs_graph: '从起点开始逐层遍历图的节点，使用队列实现。',
  dfs_graph: '从起点开始沿一条路径深入直到无法继续，然后回溯。',
  dijkstra: '贪心算法，每次选择距离起点最近的未访问节点，更新其邻居的距离。',
  bellman_ford: '动态规划算法，对所有边进行 n-1 轮松弛操作，可处理负权边。',
  a_star: '启发式搜索，结合实际距离和预估距离，用优先队列选择最优路径。',
  floyd: '动态规划算法，考虑所有节点作为中间节点，更新最短路径。',
  prim: '从任意节点开始，每次选择权重最小的边连接未访问节点。',
  kruskal: '将所有边按权重排序，依次选择不形成环的边。',
  topological_sort: '对有向无环图进行线性排序，使得所有边方向一致。',
  binary_tree: '每个节点最多有两个子节点，左子节点 < 右子节点。',
  bst: '二叉搜索树：左子树所有节点 < 根 < 右子树所有节点。',
  avl_tree: '自平衡二叉搜索树，任意节点左右子树高度差不超过 1。',
  heap_ds: '完全二叉树，父节点值大于（或小于）子节点值。',
  trie: '字典树 / 前缀树，用于高效存储和查找字符串。',
  union_find: '并查集：维护不相交集合的合并与查询操作。',
  hash_table: '哈希表：通过哈希函数实现 O(1) 平均查找时间。',
  knapsack_01: '01背包：每件物品只能选一次，求最大总价值。',
  unbounded_knapsack: '完全背包：每件物品可选无限次，求最大总价值。',
  lcs: '最长公共子序列：在两个序列中找到最长的公共子序列。',
  lis: '最长递增子序列：在数组中找到最长的严格递增子序列。',
  edit_distance: '编辑距离：将一个字符串转换为另一个所需的最少操作次数。',
  matrix_chain: '矩阵链乘：找到矩阵链乘的最优括号化方案。',
  interval_dp: '区间DP：通过分割区间来求解最优子结构。',
  binary_search: '在有序数组中每次取中间值比较，将搜索范围缩小一半。',
  backtracking: '回溯算法：尝试所有可能的选择，遇到不合法情况立即回退。',
  n_queens: '在 N×N 棋盘上放置 N 个皇后，使它们互不攻击。',
  sudoku: '用数字 1-9 填充 9×9 网格，每行每列每宫不重复。',
  kmp: 'KMP 字符串匹配：利用前缀函数（LPS）避免重复比较。',
  manacher: 'Manacher 算法：线性时间求最长回文子串。',
  segment_tree: '线段树：支持区间查询和单点/区间更新。',
  fenwick_tree: '树状数组 / BIT：支持前缀和查询和单点更新。',
  monotonic_stack: '单调栈：维护栈内元素单调递增或递减，用于查找下一个更大/更小元素。',
  sliding_window: '滑动窗口：维护一个大小可变的窗口，在线性时间内扫描数组。',
  btree: 'B树：多路平衡搜索树，节点可容纳多个关键码，广泛应用于数据库索引。',
  bplus_tree: 'B+树：B树变体，数据只存储在叶子层，叶子通过链表连接，支持高效范围查询。',
}

const ALGO_DESC_EN: Record<string, string> = {
  bubble_sort: 'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.',
  selection_sort: 'Finds the minimum element from the unsorted part and puts it at the beginning.',
  insertion_sort: 'Builds the sorted array one item at a time, inserting each new item into its correct position.',
  merge_sort: 'Divide and conquer: recursively splits the array in half, then merges sorted subarrays.',
  quick_sort: 'Selects a pivot element and partitions the array into elements less than and greater than the pivot.',
  shell_sort: 'An extension of insertion sort that allows exchange of far apart elements.',
  heap_sort: 'Uses a binary heap data structure to repeatedly extract the maximum element.',
  counting_sort: 'Non-comparison sort: counts occurrences of each element and reconstructs in order.',
  radix_sort: 'Sorts by individual digits, from least to most significant, using stable counting sort.',
  bucket_sort: 'Distributes elements into buckets, sorts each bucket, then concatenates.',
  bfs_graph: 'Traverses the graph level by level from the start node using a queue.',
  dfs_graph: 'Explores a path as far as possible before backtracking to explore other branches.',
  dijkstra: 'Greedy algorithm: finds the shortest path from a start node to all others.',
  bellman_ford: 'DP algorithm: relaxes all edges n-1 times, handles negative weights.',
  a_star: 'Heuristic search combining actual and estimated distances with a priority queue.',
  floyd: 'DP algorithm: considers all nodes as intermediates to update shortest paths.',
  prim: 'Grows a MST from any node, selecting minimal weight edges to unvisited nodes.',
  kruskal: 'Sorts edges by weight and adds them if they connect different components.',
  topological_sort: 'Linearly orders vertices of a DAG such that all edges go forward.',
  binary_search: 'Repeatedly divides the search interval in half in a sorted array.',
  binary_tree: 'A tree where each node has at most two children.',
  bst: 'Binary Search Tree: left subtree < root < right subtree.',
  avl_tree: 'Self-balancing BST where heights of subtrees differ by at most 1.',
  heap_ds: 'Complete binary tree where parent values are greater (or less) than children.',
  trie: 'Prefix tree for efficient string storage and lookup.',
  union_find: 'Union-Find / Disjoint Set Union: tracks elements partitioned into disjoint sets.',
  hash_table: 'Hash table: achieves O(1) average lookup using a hash function.',
  knapsack_01: '0/1 Knapsack: each item can be taken at most once, maximize total value.',
  unbounded_knapsack: 'Unbounded knapsack: each item can be taken unlimited times.',
  lcs: 'Longest Common Subsequence: finds the longest subsequence common to two sequences.',
  lis: 'Longest Increasing Subsequence: finds the longest strictly increasing subsequence.',
  edit_distance: 'Edit Distance / Levenshtein: min operations to transform one string into another.',
  matrix_chain: 'Matrix Chain Multiplication: finds optimal parenthesization to minimize operations.',
  interval_dp: 'Interval DP: solves optimal substructure by splitting intervals.',
  n_queens: 'Places N queens on an N×N board so no two attack each other.',
  sudoku: 'Fills a 9×9 grid with digits 1-9 following constraints.',
  kmp: 'KMP: avoids redundant character comparisons using prefix function (LPS).',
  manacher: "Manacher's: finds longest palindromic substring in linear time.",
  segment_tree: 'Segment Tree: supports range queries and point/range updates.',
  fenwick_tree: 'Fenwick Tree / BIT: supports prefix sum queries and point updates.',
  monotonic_stack: 'Monotonic Stack: maintains monotonic stack for next greater/smaller element.',
  sliding_window: 'Sliding Window: maintains a variable-size window for linear scans.',
  btree: 'B-Tree: multi-way balanced search tree where nodes hold multiple keys, widely used in database indexes.',
  bplus_tree: 'B+ Tree: B-Tree variant storing data only in leaf nodes connected via a linked list, enabling efficient range queries.',
}

function getAlgorithmDesc(id: string): string {
  return ALGO_DESC_ZH[id] || ''
}

function getAlgorithmDescEn(id: string): string {
  return ALGO_DESC_EN[id] || ''
}


function getConcreteAlgoId(algoId: string, opId: string): string {
  if (algoId.startsWith('linked_list_') || algoId === 'doubly_linked_list' || algoId === 'linked_list') {
    return `linked_list_${opId}`
  }
  if (algoId.startsWith('bst_') || algoId === 'avl_tree' || algoId === 'red_black_tree' || algoId === 'bst' || algoId === 'avl_insert') {
    return `bst_${opId}`
  }
  if (algoId === 'btree') {
    return `btree_${opId}`
  }
  if (algoId === 'bplus_tree') {
    return `bplus_tree_${opId}`
  }
  return algoId
}

let currentAnalysisController: AbortController | null = null

export default function Visualizer() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'

  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm)
  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)
  const aiStatus = useAlgorithmStore((s) => s.aiStatus)
  const aiError = useAlgorithmStore((s) => s.aiError)
  const aiRawResponse = useAlgorithmStore((s) => s.aiRawResponse)
  const setAIStatus = useAlgorithmStore((s) => s.setAIStatus)
  const addAIHistory = useAlgorithmStore((s) => s.addAIHistory)

  const [codeByScope, setCodeByScope] = useState<Record<string, string>>({})
  const [codeLanguage, setCodeLanguage] = useState<CodeLang>(() => {
    return (localStorage.getItem('algoviz-editor-code-lang') as CodeLang) || 'python'
  })
  const [inputDataByScope, setInputDataByScope] = useState<Record<string, string>>({})
  const [inputFormat, setInputFormat] = useState<'leetcode' | 'json'>(() => {
    return (localStorage.getItem('algoviz-input-format') as 'leetcode' | 'json') || 'leetcode'
  })
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [showDefinition, setShowDefinition] = useState(false)
  const [operationIdByAlgo, setOperationIdByAlgo] = useState<Record<string, string>>({})
  const [operationParam, setOperationParam] = useState<string>('5')

  const operations = selectedAlgorithm ? getOperationsForAlgo(selectedAlgorithm.id) : undefined
  const hasOperations = operations && operations.length > 0

  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])
  const prevAlgoId = useRef<string | null>(null)
  const {
    leftWidth,
    rightWidth,
    editorHeight,
    isDesktop,
    handleLeftResizeStart,
    handleRightResizeStart,
    handleEditorHeightResizeStart,
  } = useResizablePanels(editorRef)

  const {
    visualState,
    currentStepData,
    isPlaying,
    speed,
    currentStep,
    totalSteps,
    setSpeed,
    stepForward,
    stepBackward,
    reset,
    goToEnd,
    togglePlay,
    loadScript,
  } = useAnimationEngine(animationScript)

  const hasApiConfig = getApiConfig() !== null

  // Map algorithm → default input + type hint
  const DEFAULT_INPUTS = useMemo<Record<string, { value: string; hint: string }>>(() => ({
    // 排序 — 经典乱序数组
    bubble_sort:     { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组，元素互不相等' },
    selection_sort:  { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组，元素互不相等' },
    insertion_sort:  { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
    merge_sort:      { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
    quick_sort:      { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
    heap_sort:       { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
    shell_sort:      { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组，观察 gap 递减过程' },
    counting_sort:   { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '正整数数组，值域不宜过大' },
    radix_sort:      { value: '[53, 38, 101, 12, 99, 2, 77]', hint: '整数数组，逐位比较效果更明显' },
    bucket_sort:     { value: '[53, 38, 101, 12, 99, 2, 77]', hint: '整数数组，值域均匀时效果好' },
    // 搜索与滑动
    binary_search:   { value: '[1, 3, 5, 7, 9, 11, 13, 15]', hint: '有序整数数组（必须已排序）' },
    gcd_euclidean:   { value: '{\n  "a": 48,\n  "b": 18\n}', hint: '两个整数 a 与 b，演示辗转相除过程' },
    sliding_window:  { value: '[2, 1, 5, 1, 3, 2]', hint: '整数数组，窗口 k=3' },
    monotonic_stack: { value: '[2, 1, 5, 6, 2, 3]', hint: '整数数组，找下一个更大的元素' },
    // DP 类
    knapsack_01:       { value: '[3, 4, 5, 2]', hint: '物品重量数组，价值=2×重量' },
    unbounded_knapsack:{ value: '[3, 4, 5, 2]', hint: '物品重量数组，价值=2×重量' },
    lis:               { value: '[10, 9, 2, 5, 3, 7, 101, 18]', hint: '整数数组，LCS 经典用例' },
    matrix_chain:      { value: '[40, 20, 30, 10, 30]', hint: '矩阵维度数组 [p0,p1,...,pn]' },
    interval_dp:       { value: '[3, 1, 5, 8]', hint: '整数数组，戳气球问题' },
    // 字符串 — 自然字符串输入
    lcs:           { value: '["ABCBDAB", "BDCABA"]', hint: '两个字符串 [串1, 串2]' },
    edit_distance: { value: '["horse", "ros"]', hint: '两个字符串 [word1, word2]' },
    kmp:           { value: '["ABABABCABABABCABAB", "ABABC"]', hint: '字符串数组 [text, pattern]' },
    manacher:      { value: '"babad"', hint: '回文字符串，最长回文=aba/bab' },
    // 图/树/回溯 — 用数字表示
    n_queens:      { value: '4', hint: '整数 N，推荐 4~8' },
    sudoku:        { value: '[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]]', hint: '9×9 数独棋盘，0 表示空格' },
    backtracking:  { value: '[1, 2, 3]', hint: '整数数组，全排列/子集输入' },
    // 高级数据结构与基础结构操作
    segment_tree:  { value: '[1, 3, 5, 7, 9, 11]', hint: '整数数组，支持区间查询' },
    fenwick_tree:  { value: '[3, 2, -1, 6, 5, 4, -3, 3]', hint: '整数数组，可含负数' },
    linked_list_insert: { value: '[1, 2, 3]', hint: '单链表初始数值数组' },
    linked_list_delete: { value: '[1, 2, 3]', hint: '单链表初始数值数组' },
    linked_list_search: { value: '[1, 2, 3]', hint: '单链表初始数值数组' },
    binary_tree_traverse: { value: '[8, 3, 10, 1, 6, 14]', hint: '二叉树层序数组' },
    bst_insert: { value: '[8, 3, 10, 1, 6, 14]', hint: '二叉搜索树初始数值数组' },
    bst_delete: { value: '[8, 3, 10, 1, 6, 14]', hint: '二叉搜索树初始数值数组' },
    bst_search: { value: '[8, 3, 10, 1, 6, 14]', hint: '二叉搜索树初始数值数组' },
    avl_insert: { value: '[8, 3, 10, 1, 6, 14]', hint: 'AVL自平衡树初始数组' },
    stack: { value: '[1, 2, 3]', hint: '栈初始入栈元素列表' },
    queue: { value: '[1, 2, 3]', hint: '队列初始入队元素列表' },
    heap_ds: { value: '[4, 10, 3, 5, 1, 2]', hint: '堆初始数组' },
    trie: { value: '["cat", "car", "dog"]', hint: '字典树单词列表' },
    hash_table: { value: '{"key1": "value1", "key2": "value2"}', hint: '初始键值对' },
    union_find: { value: '[[0, 1], [1, 2], [3, 4]]', hint: '并查集连通边列表' },
    btree: { value: '[10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37]', hint: 'B树初始关键码数组 (t=2)' },
    bplus_tree: { value: '[10, 20, 30, 35, 40, 45, 50, 60]', hint: 'B+树初始关键码数组 (t=2)' },
    leetcode_hot100: { value: '{"nums":[2,7,11,15],"target":9}', hint: 'Two Sum 示例：nums + target' },
    acm_templates: { value: '[2, 3, 5, 7, 11, 13]', hint: '竞赛模板演示数组' },
    bfs_graph: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"},\n    {"id": "5", "label": "F"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1"},\n    {"source": "0", "target": "2"},\n    {"source": "1", "target": "3"},\n    {"source": "1", "target": "4"},\n    {"source": "2", "target": "5"}\n  ]\n}',
      hint: '无向图 JSON (nodes + edges)。LeetCode格式请切到 LeetCode 模式'
    },
    dfs_graph: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"},\n    {"id": "5", "label": "F"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1"},\n    {"source": "0", "target": "2"},\n    {"source": "1", "target": "3"},\n    {"source": "1", "target": "4"},\n    {"source": "2", "target": "5"}\n  ]\n}',
      hint: '无向图 JSON (nodes + edges)。LeetCode格式请切到 LeetCode 模式'
    },
    dijkstra: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 4},\n    {"source": "0", "target": "2", "weight": 2},\n    {"source": "1", "target": "2", "weight": 1},\n    {"source": "1", "target": "3", "weight": 5},\n    {"source": "2", "target": "3", "weight": 8},\n    {"source": "2", "target": "4", "weight": 10},\n    {"source": "3", "target": "4", "weight": 2}\n  ]\n}',
      hint: '带权无向图 JSON (nodes + edges + weight)。LeetCode格式请切到 LeetCode 模式'
    },
    prim: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 2},\n    {"source": "0", "target": "3", "weight": 6},\n    {"source": "1", "target": "2", "weight": 3},\n    {"source": "1", "target": "3", "weight": 8},\n    {"source": "1", "target": "4", "weight": 5},\n    {"source": "2", "target": "4", "weight": 7},\n    {"source": "3", "target": "4", "weight": 9}\n  ]\n}',
      hint: '带权无向图 JSON。LeetCode格式请切到 LeetCode 模式'
    },
    kruskal: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 2},\n    {"source": "0", "target": "3", "weight": 6},\n    {"source": "1", "target": "2", "weight": 3},\n    {"source": "1", "target": "3", "weight": 8},\n    {"source": "1", "target": "4", "weight": 5},\n    {"source": "2", "target": "4", "weight": 7},\n    {"source": "3", "target": "4", "weight": 9}\n  ]\n}',
      hint: '带权无向图 JSON。LeetCode格式请切到 LeetCode 模式'
    },
    topological_sort: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1"},\n    {"source": "0", "target": "2"},\n    {"source": "1", "target": "3"},\n    {"source": "2", "target": "3"},\n    {"source": "3", "target": "4"}\n  ]\n}',
      hint: '有向无环图(DAG) JSON。LeetCode格式请切到 LeetCode 模式'
    },
    floyd: {
      value: '[[0, 3, 999, 7], [8, 0, 2, 999], [999, 999, 0, 1], [6, 999, 999, 0]]',
      hint: '距离矩阵 (999=∞)'
    },
    a_star: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "S"},\n    {"id": "1", "label": "A"},\n    {"id": "2", "label": "B"},\n    {"id": "3", "label": "C"},\n    {"id": "4", "label": "G"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 1},\n    {"source": "0", "target": "2", "weight": 4},\n    {"source": "1", "target": "2", "weight": 2},\n    {"source": "1", "target": "3", "weight": 5},\n    {"source": "2", "target": "3", "weight": 1},\n    {"source": "3", "target": "4", "weight": 3},\n    {"source": "2", "target": "4", "weight": 7}\n  ],\n  "start": "0",\n  "goal": "4",\n  "heuristics": {"0": 4, "1": 3, "2": 2, "3": 1, "4": 0}\n}',
      hint: '有向图 + start/goal + heuristics'
    },
    bellman_ford: {
      value: '{\n  "nodes": [\n    {"id": "0", "label": "S"},\n    {"id": "1", "label": "A"},\n    {"id": "2", "label": "B"},\n    {"id": "3", "label": "C"},\n    {"id": "4", "label": "D"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 5},\n    {"source": "0", "target": "2", "weight": 4},\n    {"source": "1", "target": "3", "weight": 3},\n    {"source": "2", "target": "1", "weight": -2},\n    {"source": "2", "target": "3", "weight": 7},\n    {"source": "3", "target": "4", "weight": 2},\n    {"source": "1", "target": "4", "weight": 6}\n  ]\n}',
      hint: '带权有向图 JSON (支持自定义顶点与权值)'
    },
  }), [])

  const inputScopeKey = `${selectedAlgorithm?.id ?? 'none'}:${inputFormat}`
  const defaultInputData = selectedAlgorithm?.id
    ? inputFormat === 'leetcode'
      ? getLeetCodeDefault(selectedAlgorithm.id) ?? ''
      : DEFAULT_INPUTS[selectedAlgorithm.id]?.value ?? ''
    : ''
  const inputData = inputDataByScope[inputScopeKey] ?? defaultInputData
  const setInputData = useCallback((nextValue: string) => {
    setInputDataByScope((prev) => (
      prev[inputScopeKey] === nextValue ? prev : { ...prev, [inputScopeKey]: nextValue }
    ))
  }, [inputScopeKey])

  const defaultOperationId = (() => {
    if (!selectedAlgorithm) return ''
    if (selectedAlgorithm.id.endsWith('_insert') || selectedAlgorithm.id === 'avl_insert') return 'insert'
    if (selectedAlgorithm.id.endsWith('_delete')) return 'delete'
    if (selectedAlgorithm.id.endsWith('_search')) return 'search'
    if (selectedAlgorithm.id === 'btree' || selectedAlgorithm.id === 'bplus_tree') return operations?.[0]?.id ?? ''
    return ''
  })()
  const currentOperationId = selectedAlgorithm
    ? operationIdByAlgo[selectedAlgorithm.id] ?? defaultOperationId
    : ''
  const setCurrentOperationId = useCallback((nextValue: string) => {
    if (!selectedAlgorithm?.id) return
    setOperationIdByAlgo((prev) => (
      prev[selectedAlgorithm.id] === nextValue ? prev : { ...prev, [selectedAlgorithm.id]: nextValue }
    ))
  }, [selectedAlgorithm])
  const currentOperation = currentOperationId
    ? operations?.find((op) => op.id === currentOperationId)
    : undefined
  const codeScopeKey = `${selectedAlgorithm?.id ?? 'none'}:${currentOperationId || 'main'}:${codeLanguage}`
  const defaultCode = currentOperation
    ? currentOperation.code[codeLanguage] || currentOperation.code.python || ''
    : selectedAlgorithm
      ? getCodeTemplate(selectedAlgorithm.id, codeLanguage)
      : ''
  const code = codeByScope[codeScopeKey] ?? defaultCode
  const setCode = useCallback((nextValue: string) => {
    setCodeByScope((prev) => (
      prev[codeScopeKey] === nextValue ? prev : { ...prev, [codeScopeKey]: nextValue }
    ))
  }, [codeScopeKey])
  const codeDiagnostics = useMemo(() => {
    if (!code.trim()) return []
    const result = compileAndValidateCode(code, codeLanguage)
    return [...result.errors, ...result.warnings]
  }, [code, codeLanguage])

  // Parse input data from text — returns the natural type for the algorithm
  const parsedInput = useCallback((): unknown => {
    if (!selectedAlgorithm?.id) return [5, 3, 8, 1, 9, 2]
    if (!inputData.trim()) {
      const def = selectedAlgorithm?.id ? DEFAULT_INPUTS[selectedAlgorithm.id] : null
      if (def) {
        try { return JSON.parse(def.value) } catch { /* ignore */ }
      }
      return [5, 3, 8, 1, 9, 2]
    }
    return parseAlgorithmInput(inputData, inputFormat, selectedAlgorithm.id)
  }, [inputData, selectedAlgorithm, inputFormat, DEFAULT_INPUTS])

  // Raw-string variant of parsedInput for the shared AI generator hook (it parses
  // an explicit string — the current box or the AI's @sample — not just state).
  const parseInputRaw = useCallback(
    (raw: string): { valid: boolean; value: unknown } => {
      const trimmed = raw.trim()
      if (!trimmed) return { valid: false, value: null }
      if (inputFormat === 'json') {
        try { return { valid: true, value: JSON.parse(trimmed) } } catch { return { valid: false, value: null } }
      }
      // LeetCode format never throws; treat any non-empty input as parseable.
      return { valid: true, value: parseAlgorithmInput(trimmed, inputFormat, selectedAlgorithm?.id ?? '') }
    },
    [inputFormat, selectedAlgorithm],
  )

  // Live mode (recognized built-in or AI generator) + input-driven live regen.
  // applyScript also loadScript()s so the playback engine picks up the new script.
  const { liveAlgoId, generator, analyze: analyzeGenerator, reset: resetGenerator } = useAIGenerator({
    inputData,
    parseInput: parseInputRaw,
    applyScript: useCallback((s: AnimationScript) => { setAnimationScript(s); loadScript(s) }, [setAnimationScript, loadScript]),
    setStatus: setAIStatus,
  })

  // Mirror live mode in a ref so the preset effect can detect it without taking
  // liveAlgoId/generator as deps (which would re-run the preset path on analysis).
  const liveModeRef = useRef(false)
  useEffect(() => {
    liveModeRef.current = liveAlgoId !== null || generator !== null
  }, [liveAlgoId, generator])

  // Load preset or regenerate when algorithm or input changes
  useEffect(() => {
    if (!selectedAlgorithm) return

    // In AI live mode, an input change is handled by the useAIGenerator hook (it
    // re-runs the recognized preset / AI generator). Skip the built-in preset path
    // so it doesn't overwrite the AI result or reset the 'success' status. When the
    // user switches to a different algorithm, fall through and clear live mode.
    const algoChanged = prevAlgoId.current !== selectedAlgorithm.id
    if (liveModeRef.current && !algoChanged) return
    if (liveModeRef.current && algoChanged) resetGenerator()

    setAIStatus('idle')

    // Set default input when switching to a different algorithm
    if (algoChanged) {
      prevAlgoId.current = selectedAlgorithm.id
    }

    // If a custom operation is selected, load its code and script dynamically if dynamic generator is available
    if (currentOperationId && selectedAlgorithm) {
      const concreteAlgoId = getConcreteAlgoId(selectedAlgorithm.id, currentOperationId)
      if (hasGenerator(concreteAlgoId)) {
        const baseData = parsedInput()
        const paramVal = Number(operationParam) || 5
        const script = generatePreset(concreteAlgoId, { data: baseData, param: paramVal })
        if (script) {
          setAnimationScript(script)
          return
        }
      }

      // Fallback to static op script if no dynamic generator
      const op = operations?.find(o => o.id === currentOperationId)
      if (op) {
        setAnimationScript(op.script)
        return
      }
    }

    if (selectedAlgorithm.hasPreset) {
      // Try generator first (dynamic, responds to input changes)
      if (hasGenerator(selectedAlgorithm.id)) {
        const data = parsedInput()
        const script = generatePreset(selectedAlgorithm.id, data)
        if (script) {
          setAnimationScript(script)
          return
        }
      }
      // Fallback to static preset
      const preset = getPreset(selectedAlgorithm.id)
      if (preset) {
        setAnimationScript(preset)
        return
      }
    }
    setAnimationScript(null)
  }, [selectedAlgorithm, inputData, operationParam, setAnimationScript, parsedInput, currentOperationId, operations, resetGenerator, setAIStatus])

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  // Update Monaco editor decorations based on current step
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !animationScript) return

    const steps = animationScript.steps
    const currentCodeLine = steps[currentStep - 1]?.codeLine ?? -1

    const newDecorations: Parameters<typeof editor.deltaDecorations>[1] = []

    // Visited lines (before current)
    const visitedLines = new Set<number>()
    const maxIdx = Math.min(currentStep - 1, steps.length)
    for (let i = 0; i < maxIdx; i++) {
      if (steps[i]) visitedLines.add(steps[i].codeLine)
    }

    for (const line of visitedLines) {
      if (line !== currentCodeLine) {
        newDecorations.push({
          range: { startLineNumber: line + 1, startColumn: 1, endLineNumber: line + 1, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: 'visited-line',
            glyphMarginClassName: 'visited-glyph',
          },
        })
      }
    }

    // Current active line
    if (currentCodeLine >= 0) {
      newDecorations.push({
        range: { startLineNumber: currentCodeLine + 1, startColumn: 1, endLineNumber: currentCodeLine + 1, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'active-line',
          glyphMarginClassName: 'active-glyph',
        },
      })
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
  }, [currentStep, animationScript])
  const handleAIAnalyze = useCallback(async () => {
    const compResult = compileAndValidateCode(code, codeLanguage)
    if (!compResult.success) {
      setAIStatus('error', `[${compResult.errors[0].type}] ${compResult.errors[0].message} (第 ${compResult.errors[0].line} 行)${compResult.errors[0].context ? `\n\n代码上下文:\n\`\`\`\n${compResult.errors[0].context}\n\`\`\`` : ''}`)
      setAnimationScript(null)
      return
    }

    if (!hasApiConfig) {
      setAIStatus('error', t('controls.aiConfigureHint'))
      return
    }

    currentAnalysisController?.abort()
    const controller = new AbortController()
    currentAnalysisController = controller

    setAIStatus('analyzing')

    const currentValid = inputData.trim() !== '' && parseInputData(inputData).valid

    try {
      const result = await analyzeGenerator(
        { code, language: codeLanguage, inputData, algorithmName: selectedAlgorithm?.name, signal: controller.signal },
        currentValid,
        setInputData,
      )

      if (controller.signal.aborted) return
      currentAnalysisController = null

      if (!result.ok) {
        // analyze() already set the error status; nothing recorded in history on failure.
        if (result.error === 'AbortError') return
        return
      }

      const entry: AIHistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        algorithmId: selectedAlgorithm?.id ?? 'unknown',
        algorithmName: selectedAlgorithm?.name ?? '未知算法',
        code,
        language: codeLanguage,
        // Record the input the animation was actually generated from (may be the
        // AI @sample when the box was empty/invalid), so restore stays consistent.
        inputData: result.usedInput ?? inputData,
        status: 'success',
        script: result.script,
        ...(result.generatorBody ? { generatorBody: result.generatorBody, generatorType: result.generatorType } : {}),
      }
      addAIHistory(entry)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setAIStatus('error', e instanceof Error ? e.message : t('common.error'))
    }
  }, [addAIHistory, analyzeGenerator, code, codeLanguage, hasApiConfig, inputData, selectedAlgorithm, setAIStatus, setAnimationScript, setInputData, t])

  useEffect(() => {
    const handleRepairRequest = () => {
      void handleAIAnalyze()
    }
    window.addEventListener(REQUEST_AI_REPAIR_EVENT, handleRepairRequest)
    return () => window.removeEventListener(REQUEST_AI_REPAIR_EVENT, handleRepairRequest)
  }, [handleAIAnalyze])

  if (!selectedAlgorithm) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="code2" size={28} className="text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-slate-600 mb-2">
            {t('visualizer.emptyTitle')}
          </h2>
          <p className="text-sm text-muted max-w-xs">
            {t('visualizer.emptySubtitle')}
          </p>
        </div>
      </div>
    )
  }

  const complexity = animationScript?.complexity
  const isSceneEngineActive = usesSceneEngine(animationScript)
  const sceneEventStats = getSceneEventStats(animationScript)
  const sceneDiagnosticSummary = getSceneDiagnosticSummary(animationScript)

  return (
    <div className="h-full flex flex-col">
      {/* Three-column layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Left: Code Editor (35%) */}
        <div 
          id="left-workspace-panel"
          className="xl:flex-none h-[42%] xl:h-auto border-b xl:border-b-0 border-border flex flex-col bg-white min-w-0 min-h-0"
          style={isDesktop ? { width: `${leftWidth}%` } : undefined}
        >
          {/* Top: Code Editor Panel */}
          <div 
            className="flex-1 xl:flex-none flex flex-col min-h-0"
            style={isDesktop ? { height: `${editorHeight}%` } : undefined}
          >
            <CodeEditorPanel
              value={code}
              language={codeLanguage}
              onChange={setCode}
              onMount={handleEditorMount}
              diagnostics={codeDiagnostics}
              disabled={aiStatus === 'analyzing'}
              title={selectedAlgorithm.name}
              className="flex-1"
              rightSlot={
                <>
                {/* Language selector */}
                <select
                  value={codeLanguage}
                  onChange={(e) => {
                    const lang = e.target.value as CodeLang
                    setCodeLanguage(lang)
                    localStorage.setItem('algoviz-editor-code-lang', lang)
                  }}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border
                             bg-white text-slate-600 outline-none cursor-pointer
                             focus:border-primary"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </select>
                {selectedAlgorithm.hasPreset && (
                  <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                    {t('sidebar.presetBadge')}
                  </span>
                )}
                </>
              }
            />
          </div>

          {/* Horizontal Drag Resizer Bar */}
          <div 
            onMouseDown={handleEditorHeightResizeStart}
            className="hidden xl:flex h-[6px] hover:h-[10px] w-full cursor-row-resize hover:bg-primary/10 hover:border-t hover:border-b hover:border-primary/20 transition-all shrink-0 select-none items-center justify-center bg-slate-50 border-t border-b border-border group"
            title={lang === 'zh' ? '拖动调整高度' : 'Drag to resize'}
          >
            <div className="h-[1.5px] w-5 bg-slate-300 group-hover:bg-primary rounded-full transition-all" />
          </div>

          {/* Bottom: Inputs and Outputs Container */}
          <div 
            className="xl:flex-none flex flex-col xl:overflow-hidden overflow-y-auto shrink-0 min-h-0"
            style={isDesktop ? { height: `${100 - editorHeight}%` } : undefined}
          >
            <div className="flex-1 flex flex-col min-h-0">
              {/* Format Selector */}
              <div className="flex items-center gap-1.5 px-1.5 py-1 border-b border-border bg-muted/30 shrink-0">
                <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                  {lang === 'zh' ? '格式' : 'Fmt'}
                </span>
                <select
                  value={inputFormat}
                  onChange={(e) => {
                    const fmt = e.target.value as 'leetcode' | 'json'
                    setInputFormat(fmt)
                    localStorage.setItem('algoviz-input-format', fmt)
                    // Update input data to match new format
                    if (selectedAlgorithm?.id) {
                      if (fmt === 'leetcode') {
                        const lcDefault = getLeetCodeDefault(selectedAlgorithm.id)
                        if (lcDefault) setInputData(lcDefault)
                      } else {
                        const defInput = DEFAULT_INPUTS[selectedAlgorithm.id]
                        if (defInput) setInputData(defInput.value)
                      }
                    }
                  }}
                  className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="leetcode">LeetCode</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              {hasOperations ? (
                <div className="flex flex-col gap-2 flex-1 min-h-0 p-1">
                  <InputDataPanel
                    value={inputData}
                    onChange={setInputData}
                    title={lang === 'zh' ? '原始数据 (初始结构)' : 'Original Data (Initial Structure)'}
                    helperText={lang === 'zh' ? '用于构建初始数据结构的数组' : 'Initial elements for building the data structure'}
                    placeholder={selectedAlgorithm?.id ? (inputFormat === 'leetcode' ? getLeetCodePlaceholder(selectedAlgorithm.id) : (DEFAULT_INPUTS[selectedAlgorithm.id]?.value ?? '[5, 3, 8, 1, 9, 2]')) : '[5, 3, 8, 1, 9, 2]'}
                    disabled={aiStatus === 'analyzing'}
                    className="h-24 xl:flex-1 xl:h-auto xl:min-h-0"
                  />
                  <InputDataPanel
                    value={operationParam}
                    onChange={setOperationParam}
                    title={(() => {
                      if (currentOperationId === 'insert') return lang === 'zh' ? '操作输入 (插入节点的值)' : 'Operation Parameter (Value to Insert)'
                      if (currentOperationId === 'delete') return lang === 'zh' ? '操作输入 (删除节点的值)' : 'Operation Parameter (Value to Delete)'
                      if (currentOperationId === 'range_query') return lang === 'zh' ? '操作输入 (范围查询 low, high)' : 'Operation Parameter (Range Query low, high)'
                      return lang === 'zh' ? '操作输入 (查找节点的值)' : 'Operation Parameter (Value to Search)'
                    })()}
                    helperText={currentOperationId === 'range_query' ? (lang === 'zh' ? '输入范围，如 30, 60' : 'Enter range, e.g. 30, 60') : (lang === 'zh' ? '输入一个具体的数值' : 'Enter a specific numeric value')}
                    placeholder={currentOperationId === 'range_query' ? '30, 60' : '5'}
                    disabled={aiStatus === 'analyzing'}
                    className="h-20 xl:h-24 xl:shrink-0"
                  />
                  <RunDataPanel
                    script={animationScript}
                    visualState={visualState}
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    lang={lang}
                    title={lang === 'zh' ? '操作输出' : 'Operation Output'}
                    className="h-20 xl:h-24 xl:shrink-0"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2 flex-1 min-h-0 p-1">
                  <InputDataPanel
                    value={inputData}
                    onChange={setInputData}
                    title={t('visualizer.inputData')}
                    helperText={(() => {
                      const def = selectedAlgorithm?.id ? DEFAULT_INPUTS[selectedAlgorithm.id] : null
                      if (def) return def.hint
                      const info = parseInputData(inputData)
                      return info.valid ? `类型: ${info.kind} · ${info.summary}` : '支持数组、字符串、JSON 对象'
                    })()}
                    placeholder={(() => {
                      if (inputFormat === 'leetcode' && selectedAlgorithm?.id) return getLeetCodePlaceholder(selectedAlgorithm.id)
                      const def = selectedAlgorithm?.id ? DEFAULT_INPUTS[selectedAlgorithm.id] : null
                      return def?.value ?? '[5, 3, 8, 1, 9, 2]'
                    })()}
                    disabled={aiStatus === 'analyzing'}
                    className="h-28 xl:flex-1 xl:h-auto xl:min-h-0"
                  />
                  <RunDataPanel
                    script={animationScript}
                    visualState={visualState}
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    lang={lang}
                    className="h-20 xl:h-24 xl:shrink-0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Left-Center Resizer Bar */}
        <div 
          onMouseDown={handleLeftResizeStart}
          className="hidden xl:flex w-[6px] hover:w-[10px] h-full cursor-col-resize hover:bg-primary/10 hover:border-r hover:border-l hover:border-primary/20 transition-all shrink-0 select-none items-center justify-center bg-slate-50 border-r border-l border-border group"
          title={lang === 'zh' ? '拖动调整宽度' : 'Drag to resize'}
        >
          <div className="w-[1.5px] h-5 bg-slate-300 group-hover:bg-primary rounded-full transition-all" />
        </div>

        {/* Center: Canvas (45%) */}
        <div 
          className="flex-1 xl:flex-none border-b xl:border-b-0 border-border min-w-0 min-h-0 flex flex-col"
          style={isDesktop ? { width: `${100 - leftWidth - rightWidth}%` } : undefined}
        >
          {hasOperations && (
            <div className="bg-surface border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Icon name="workflow" size={14} className="text-primary animate-pulse" />
                {lang === 'zh' ? '数据结构操作演示' : 'Data Structure Operations'}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {operations.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => {
                      setCurrentOperationId(op.id)
                      if (op.id === 'insert') setOperationParam('5')
                      else if (op.id === 'delete') setOperationParam('14')
                      else if (op.id === 'search') setOperationParam('10')
                      else if (op.id === 'range_query') setOperationParam('30, 60')
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all border
                      ${currentOperationId === op.id
                        ? 'bg-primary text-white border-primary shadow-sm font-semibold'
                        : 'bg-white text-slate-600 border-border hover:bg-slate-50'
                      }`}
                  >
                    {lang === 'zh' ? op.label : op.labelEn}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <VisualizationCanvas
              script={animationScript}
              visualState={visualState}
              currentStepData={currentStepData}
              speed={speed}
            />
          </div>
        </div>

        {/* Center-Right Resizer Bar */}
        <div 
          onMouseDown={handleRightResizeStart}
          className="hidden xl:flex w-[6px] hover:w-[10px] h-full cursor-col-resize hover:bg-primary/10 hover:border-r hover:border-l hover:border-primary/20 transition-all shrink-0 select-none items-center justify-center bg-slate-50 border-r border-l border-border group"
          title={lang === 'zh' ? '拖动调整宽度' : 'Drag to resize'}
        >
          <div className="w-[1.5px] h-5 bg-slate-300 group-hover:bg-primary rounded-full transition-all" />
        </div>

        {/* Right: Info Panel (20%) */}
        <div 
          className="xl:flex-none h-44 xl:h-auto flex flex-col bg-white min-w-0 shrink-0"
          style={isDesktop ? { width: `${rightWidth}%` } : undefined}
        >
          <div className="h-9 border-b border-border flex items-center px-3 bg-surface shrink-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Icon name="info" size={14} />
              {t('visualizer.algorithmInfo')}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* AI Status Banner */}
            {aiStatus !== 'idle' && (
              <div className={`p-3 rounded-lg border ${
                aiStatus === 'analyzing' ? 'border-warning-50 bg-warning-50' :
                aiStatus === 'success' ? 'border-green-100 bg-green-50' :
                'border-red-100 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {aiStatus === 'analyzing' && (
                      <Icon name="loader2" size={14} className="text-warning animate-spin" />
                    )}
                    <span className={`text-xs font-semibold ${
                      aiStatus === 'analyzing' ? 'text-warning' :
                      aiStatus === 'success' ? 'text-green-600' :
                      'text-red-500'
                    }`}>
                      {aiStatus === 'analyzing' ? t('controls.aiAnalyzing') :
                       aiStatus === 'success' ? t('controls.aiSuccess') : t('controls.aiFailed')}
                    </span>
                  </div>
                  {aiStatus === 'analyzing' && (
                    <button
                      onClick={() => {
                        currentAnalysisController?.abort()
                        currentAnalysisController = null
                        setAIStatus('idle')
                      }}
                      className="text-[10px] text-warning underline cursor-pointer border-none bg-transparent"
                    >
                      取消
                    </button>
                  )}
                </div>
                {aiError && (
                  <>
                    <p className="text-[11px] text-red-500 leading-relaxed mt-1">{aiError}</p>
                    {aiRawResponse && (
                      <button
                        onClick={() => setShowRawResponse(!showRawResponse)}
                        className="text-[10px] text-slate-400 underline cursor-pointer border-none bg-transparent mt-1"
                      >
                        {showRawResponse ? '隐藏原始响应' : '查看原始响应'}
                      </button>
                    )}
                    {showRawResponse && aiRawResponse && (
                      <pre className="text-[10px] text-slate-500 mt-1 p-2 bg-slate-100 rounded max-h-32 overflow-auto whitespace-pre-wrap">
                        {aiRawResponse.slice(0, 2000)}
                      </pre>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Current Step Description */}
            {currentStepData && (
              <div className="p-3 rounded-lg border border-warning-50 bg-warning-50">
                <div className="text-[10px] text-warning uppercase tracking-wide font-semibold mb-1">
                  {t('visualizer.stepLabel')} {currentStepData.stepId}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {lang === 'zh' ? currentStepData.description.zh : currentStepData.description.en}
                </p>
              </div>
            )}

            {/* Render Engine */}
            <div className="p-3 rounded-lg border border-border bg-surface">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">{lang === 'zh' ? '渲染引擎' : 'Render Engine'}</h4>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSceneEngineActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {isSceneEngineActive ? (lang === 'zh' ? '物理场景引擎' : 'Scene Engine') : (lang === 'zh' ? '经典渲染器' : 'Classic Renderer')}
                </span>
                {animationScript?.presentation?.module && (
                  <span className="text-[10px] font-code text-slate-400">{animationScript.presentation.module}</span>
                )}
              </div>
              {isSceneEngineActive && (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-slate-400">{lang === 'zh' ? '动画帧数' : 'event steps'}</div>
                      <div className="font-code font-semibold text-slate-700">{sceneEventStats.eventSteps}</div>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-slate-400">{lang === 'zh' ? '动作指令数' : 'events'}</div>
                      <div className="font-code font-semibold text-slate-700">{sceneEventStats.totalEvents}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <span className={`rounded-full px-2 py-0.5 ${sceneDiagnosticSummary.errors > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {lang === 'zh' ? '错误' : 'errors'} {sceneDiagnosticSummary.errors}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 ${sceneDiagnosticSummary.warnings > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                      {lang === 'zh' ? '警告' : 'warnings'} {sceneDiagnosticSummary.warnings}
                    </span>
                  </div>
                  {sceneDiagnosticSummary.diagnostics.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {sceneDiagnosticSummary.diagnostics.slice(0, 2).map((diagnostic) => (
                        <div key={`${diagnostic.stepId}-${diagnostic.eventIndex}-${diagnostic.message}`} className="rounded-lg bg-red-50 px-2 py-1 text-[10px] text-red-600">
                          {lang === 'zh' ? `第 ${diagnostic.stepId} 步` : `Step ${diagnostic.stepId}`}: {diagnostic.message}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stats */}
            <div className="p-3 rounded-lg border border-border bg-surface">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">{t('visualizer.liveStats')}</h4>
              <div className="space-y-1.5">
                {[
                  { label: t('visualizer.comparisons'), value: currentStepData?.stats.comparisons ?? 0 },
                  { label: t('visualizer.swaps'), value: currentStepData?.stats.swaps ?? 0 },
                  { label: t('visualizer.accesses'), value: currentStepData?.stats.accesses ?? 0 },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">{stat.label}</span>
                    <span className="text-xs font-code font-medium text-slate-700">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Complexity */}
            {complexity && (
              <div className="p-3 rounded-lg border border-border bg-surface">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">{t('visualizer.complexity')}</h4>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('visualizer.best')}</span>
                    <span className="font-code text-green-600">{complexity.time.best}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('visualizer.average')}</span>
                    <span className="font-code text-yellow-600">{complexity.time.average}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('visualizer.worst')}</span>
                    <span className="font-code text-red-500">{complexity.time.worst}</span>
                  </div>
                  <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between">
                    <span className="text-slate-400">{t('visualizer.space')}</span>
                    <span className="font-code text-slate-600">{complexity.space}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Algorithm Info */}
            <div className="p-3 rounded-lg border border-border bg-surface">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                {selectedAlgorithm.name}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'zh' ? getAlgorithmDesc(selectedAlgorithm.id) : getAlgorithmDescEn(selectedAlgorithm.id)}
              </p>
            </div>

            {/* Detailed Algorithm Definition (collapsible) */}
            {ALGORITHM_DEFS[selectedAlgorithm.id] && (
              <DefinitionCard
                def={ALGORITHM_DEFS[selectedAlgorithm.id]}
                lang={lang}
                expanded={showDefinition}
                onToggle={() => setShowDefinition(!showDefinition)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Control Bar */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentStep={currentStep}
        totalSteps={totalSteps}
        speed={speed}
        onReset={reset}
        onStepBackward={stepBackward}
        onTogglePlay={togglePlay}
        onStepForward={stepForward}
        onGoToEnd={goToEnd}
        onSpeedChange={setSpeed}
        labels={{
          reset: t('controls.reset'),
          prevStep: t('controls.prevStep'),
          play: t('controls.play'),
          pause: t('controls.pause'),
          nextStep: t('controls.nextStep'),
          end: t('controls.end'),
          speed: t('controls.speed'),
        }}
        extraActions={
          <button
            onClick={handleAIAnalyze}
            disabled={aiStatus === 'analyzing' || !hasApiConfig}
            className="flex items-center gap-1.5 px-2 sm:px-3 h-8 rounded-lg text-xs sm:text-sm font-medium
                       bg-gradient-to-r from-violet-500 to-purple-600 text-white
                       hover:from-violet-600 hover:to-purple-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all cursor-pointer border-none shadow-sm"
            title={!hasApiConfig ? t('controls.aiConfigureHint') : t('controls.aiAnalyze')}
          >
            {aiStatus === 'analyzing' ? (
              <Icon name="loader2" size={14} className="animate-spin" />
            ) : (
              <Icon name="brain" size={14} />
            )}
            <span className="hidden sm:inline">{t('controls.aiAnalyze')}</span>
          </button>
        }
      />

      <style>{`
        .active-line {
          background: rgba(245, 158, 11, 0.12) !important;
          border-left: 3px solid #F59E0B;
        }
        .visited-line {
          background: rgba(37, 99, 235, 0.04) !important;
          border-left: 3px solid #93C5FD;
        }
        .active-glyph {
          background: transparent !important;
          width: 18px !important;
          margin-left: 2px;
        }
        .active-glyph::after {
          content: '▶';
          position: absolute;
          left: 1px;
          top: 50%;
          transform: translateY(-50%);
          color: #F59E0B;
          font-size: 10px;
          animation: arrow-blink 0.8s ease-in-out infinite alternate;
        }
        .visited-glyph {
          background: #93C5FD;
          width: 3px !important;
          margin-left: 4px;
          border-radius: 2px;
        }
        @keyframes arrow-blink {
          from { opacity: 1; transform: translateY(-50%) scale(1); }
          to { opacity: 0.6; transform: translateY(-50%) scale(1.1); }
        }
        @keyframes pulse-glow {
          from { opacity: 0.8; r: 1; }
          to { opacity: 0.1; r: 1.2; }
        }
      `}</style>
    </div>
  )
}
