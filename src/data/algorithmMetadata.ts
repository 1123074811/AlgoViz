export type AlgorithmLang = 'zh' | 'en'

export interface AlgorithmDefaultInput {
  value: string
  hint: string
}

export const ALGORITHM_DESCRIPTIONS: Record<AlgorithmLang, Record<string, string>> = {
  zh: {
    bubble_sort:
      '重复遍历数列，依次比较相邻元素，如果顺序错误则交换位置。每轮将最大值"冒泡"到末尾。',
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
  },
  en: {
    bubble_sort:
      'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.',
    selection_sort:
      'Finds the minimum element from the unsorted part and puts it at the beginning.',
    insertion_sort:
      'Builds the sorted array one item at a time, inserting each new item into its correct position.',
    merge_sort:
      'Divide and conquer: recursively splits the array in half, then merges sorted subarrays.',
    quick_sort:
      'Selects a pivot element and partitions the array into elements less than and greater than the pivot.',
    shell_sort: 'An extension of insertion sort that allows exchange of far apart elements.',
    heap_sort: 'Uses a binary heap data structure to repeatedly extract the maximum element.',
    counting_sort:
      'Non-comparison sort: counts occurrences of each element and reconstructs in order.',
    radix_sort:
      'Sorts by individual digits, from least to most significant, using stable counting sort.',
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
    edit_distance:
      'Edit Distance / Levenshtein: min operations to transform one string into another.',
    matrix_chain:
      'Matrix Chain Multiplication: finds optimal parenthesization to minimize operations.',
    interval_dp: 'Interval DP: solves optimal substructure by splitting intervals.',
    n_queens: 'Places N queens on an N×N board so no two attack each other.',
    sudoku: 'Fills a 9×9 grid with digits 1-9 following constraints.',
    kmp: 'KMP: avoids redundant character comparisons using prefix function (LPS).',
    manacher: "Manacher's: finds longest palindromic substring in linear time.",
    segment_tree: 'Segment Tree: supports range queries and point/range updates.',
    fenwick_tree: 'Fenwick Tree / BIT: supports prefix sum queries and point updates.',
    monotonic_stack: 'Monotonic Stack: maintains monotonic stack for next greater/smaller element.',
    sliding_window: 'Sliding Window: maintains a variable-size window for linear scans.',
    btree:
      'B-Tree: multi-way balanced search tree where nodes hold multiple keys, widely used in database indexes.',
    bplus_tree:
      'B+ Tree: B-Tree variant storing data only in leaf nodes connected via a linked list, enabling efficient range queries.',
  },
}

export function getAlgorithmDescription(id: string, lang: AlgorithmLang): string {
  return ALGORITHM_DESCRIPTIONS[lang][id] || ''
}

export const ALGORITHM_DEFAULT_INPUTS: Record<string, AlgorithmDefaultInput> = {
  bubble_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组，元素互不相等' },
  selection_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组，元素互不相等' },
  insertion_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
  merge_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
  quick_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
  heap_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组' },
  shell_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '整数数组，观察 gap 递减过程' },
  counting_sort: { value: '[5, 3, 8, 1, 9, 2, 7, 4]', hint: '正整数数组，值域不宜过大' },
  radix_sort: { value: '[53, 38, 101, 12, 99, 2, 77]', hint: '整数数组，逐位比较效果更明显' },
  bucket_sort: { value: '[53, 38, 101, 12, 99, 2, 77]', hint: '整数数组，值域均匀时效果好' },
  binary_search: { value: '[1, 3, 5, 7, 9, 11, 13, 15]', hint: '有序整数数组（必须已排序）' },
  gcd_euclidean: {
    value: '{\n  "a": 48,\n  "b": 18\n}',
    hint: '两个整数 a 与 b，演示辗转相除过程',
  },
  sliding_window: { value: '[2, 1, 5, 1, 3, 2]', hint: '整数数组，窗口 k=3' },
  monotonic_stack: { value: '[2, 1, 5, 6, 2, 3]', hint: '整数数组，找下一个更大的元素' },
  knapsack_01: { value: '[3, 4, 5, 2]', hint: '物品重量数组，价值=2×重量' },
  unbounded_knapsack: { value: '[3, 4, 5, 2]', hint: '物品重量数组，价值=2×重量' },
  lis: { value: '[10, 9, 2, 5, 3, 7, 101, 18]', hint: '整数数组，LCS 经典用例' },
  matrix_chain: { value: '[40, 20, 30, 10, 30]', hint: '矩阵维度数组 [p0,p1,...,pn]' },
  interval_dp: { value: '[3, 1, 5, 8]', hint: '整数数组，戳气球问题' },
  lcs: { value: '["ABCBDAB", "BDCABA"]', hint: '两个字符串 [串1, 串2]' },
  edit_distance: { value: '["horse", "ros"]', hint: '两个字符串 [word1, word2]' },
  kmp: { value: '["ABABABCABABABCABAB", "ABABC"]', hint: '字符串数组 [text, pattern]' },
  manacher: { value: '"babad"', hint: '回文字符串，最长回文=aba/bab' },
  n_queens: { value: '4', hint: '整数 N，推荐 4~8' },
  sudoku: {
    value:
      '[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]]',
    hint: '9×9 数独棋盘，0 表示空格',
  },
  backtracking: { value: '[1, 2, 3]', hint: '整数数组，全排列/子集输入' },
  segment_tree: { value: '[1, 3, 5, 7, 9, 11]', hint: '整数数组，支持区间查询' },
  fenwick_tree: { value: '[3, 2, -1, 6, 5, 4, -3, 3]', hint: '整数数组，可含负数' },
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
  leetcode_hot100: {
    value: '{"nums":[2,7,11,15],"target":9}',
    hint: 'Two Sum 示例：nums + target',
  },
  acm_templates: { value: '[2, 3, 5, 7, 11, 13]', hint: '竞赛模板演示数组' },
  bfs_graph: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"},\n    {"id": "5", "label": "F"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1"},\n    {"source": "0", "target": "2"},\n    {"source": "1", "target": "3"},\n    {"source": "1", "target": "4"},\n    {"source": "2", "target": "5"}\n  ]\n}',
    hint: '无向图 JSON (nodes + edges)。LeetCode格式请切到 LeetCode 模式',
  },
  dfs_graph: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"},\n    {"id": "5", "label": "F"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1"},\n    {"source": "0", "target": "2"},\n    {"source": "1", "target": "3"},\n    {"source": "1", "target": "4"},\n    {"source": "2", "target": "5"}\n  ]\n}',
    hint: '无向图 JSON (nodes + edges)。LeetCode格式请切到 LeetCode 模式',
  },
  dijkstra: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 4},\n    {"source": "0", "target": "2", "weight": 2},\n    {"source": "1", "target": "2", "weight": 1},\n    {"source": "1", "target": "3", "weight": 5},\n    {"source": "2", "target": "3", "weight": 8},\n    {"source": "2", "target": "4", "weight": 10},\n    {"source": "3", "target": "4", "weight": 2}\n  ]\n}',
    hint: '带权无向图 JSON (nodes + edges + weight)。LeetCode格式请切到 LeetCode 模式',
  },
  prim: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 2},\n    {"source": "0", "target": "3", "weight": 6},\n    {"source": "1", "target": "2", "weight": 3},\n    {"source": "1", "target": "3", "weight": 8},\n    {"source": "1", "target": "4", "weight": 5},\n    {"source": "2", "target": "4", "weight": 7},\n    {"source": "3", "target": "4", "weight": 9}\n  ]\n}',
    hint: '带权无向图 JSON。LeetCode格式请切到 LeetCode 模式',
  },
  kruskal: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 2},\n    {"source": "0", "target": "3", "weight": 6},\n    {"source": "1", "target": "2", "weight": 3},\n    {"source": "1", "target": "3", "weight": 8},\n    {"source": "1", "target": "4", "weight": 5},\n    {"source": "2", "target": "4", "weight": 7},\n    {"source": "3", "target": "4", "weight": 9}\n  ]\n}',
    hint: '带权无向图 JSON。LeetCode格式请切到 LeetCode 模式',
  },
  topological_sort: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "A"},\n    {"id": "1", "label": "B"},\n    {"id": "2", "label": "C"},\n    {"id": "3", "label": "D"},\n    {"id": "4", "label": "E"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1"},\n    {"source": "0", "target": "2"},\n    {"source": "1", "target": "3"},\n    {"source": "2", "target": "3"},\n    {"source": "3", "target": "4"}\n  ]\n}',
    hint: '有向无环图(DAG) JSON。LeetCode格式请切到 LeetCode 模式',
  },
  floyd: {
    value: '[[0, 3, 999, 7], [8, 0, 2, 999], [999, 999, 0, 1], [6, 999, 999, 0]]',
    hint: '距离矩阵 (999=∞)',
  },
  a_star: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "S"},\n    {"id": "1", "label": "A"},\n    {"id": "2", "label": "B"},\n    {"id": "3", "label": "C"},\n    {"id": "4", "label": "G"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 1},\n    {"source": "0", "target": "2", "weight": 4},\n    {"source": "1", "target": "2", "weight": 2},\n    {"source": "1", "target": "3", "weight": 5},\n    {"source": "2", "target": "3", "weight": 1},\n    {"source": "3", "target": "4", "weight": 3},\n    {"source": "2", "target": "4", "weight": 7}\n  ],\n  "start": "0",\n  "goal": "4",\n  "heuristics": {"0": 4, "1": 3, "2": 2, "3": 1, "4": 0}\n}',
    hint: '有向图 + start/goal + heuristics',
  },
  bellman_ford: {
    value:
      '{\n  "nodes": [\n    {"id": "0", "label": "S"},\n    {"id": "1", "label": "A"},\n    {"id": "2", "label": "B"},\n    {"id": "3", "label": "C"},\n    {"id": "4", "label": "D"}\n  ],\n  "edges": [\n    {"source": "0", "target": "1", "weight": 5},\n    {"source": "0", "target": "2", "weight": 4},\n    {"source": "1", "target": "3", "weight": 3},\n    {"source": "2", "target": "1", "weight": -2},\n    {"source": "2", "target": "3", "weight": 7},\n    {"source": "3", "target": "4", "weight": 2},\n    {"source": "1", "target": "4", "weight": 6}\n  ]\n}',
    hint: '带权有向图 JSON (支持自定义顶点与权值)',
  },
}
