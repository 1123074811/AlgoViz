import { create } from 'zustand'
import type { AnimationScript } from '@/types/animation'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type AlgorithmCategory =
  | 'sorting'
  | 'graph'
  | 'data-structure'
  | 'dp'
  | 'search-backtrack'
  | 'advanced'
  | 'interview'
  | 'contest'

export interface AlgorithmType {
  id: string
  name: string
  nameEn: string
  category: AlgorithmCategory
  difficulty: Difficulty
  hasPreset: boolean
  defaultCode: string
  defaultLanguage: string
}

const DEFAULT_ALGORITHMS: AlgorithmType[] = [
  // ============ 排序算法 ============
  {
    id: 'bubble_sort', name: '冒泡排序', nameEn: 'Bubble Sort', category: 'sorting', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
  },
  {
    id: 'selection_sort', name: '选择排序', nameEn: 'Selection Sort', category: 'sorting', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def selection_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`,
  },
  {
    id: 'insertion_sort', name: '插入排序', nameEn: 'Insertion Sort', category: 'sorting', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
  },
  {
    id: 'shell_sort', name: '希尔排序', nameEn: 'Shell Sort', category: 'sorting', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def shell_sort(arr):
    n = len(arr)
    gap = n // 2
    while gap > 0:
        for i in range(gap, n):
            temp = arr[i]
            j = i
            while j >= gap and arr[j - gap] > temp:
                arr[j] = arr[j - gap]
                j -= gap
            arr[j] = temp
        gap //= 2
    return arr`,
  },
  {
    id: 'merge_sort', name: '归并排序', nameEn: 'Merge Sort', category: 'sorting', difficulty: 'medium',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result`,
  },
  {
    id: 'quick_sort', name: '快速排序', nameEn: 'Quick Sort', category: 'sorting', difficulty: 'medium',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    left = [x for x in arr[1:] if x <= pivot]
    right = [x for x in arr[1:] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)`,
  },
  {
    id: 'heap_sort', name: '堆排序', nameEn: 'Heap Sort', category: 'sorting', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def heapify(arr, n, i):
    largest = i
    l, r = 2 * i + 1, 2 * i + 2
    if l < n and arr[l] > arr[largest]: largest = l
    if r < n and arr[r] > arr[largest]: largest = r
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    for i in range(n - 1, 0, -1):
        arr[i], arr[0] = arr[0], arr[i]
        heapify(arr, i, 0)
    return arr`,
  },
  {
    id: 'counting_sort', name: '计数排序', nameEn: 'Counting Sort', category: 'sorting', difficulty: 'easy',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def counting_sort(arr):
    if not arr: return arr
    max_val = max(arr)
    count = [0] * (max_val + 1)
    for num in arr:
        count[num] += 1
    result = []
    for i, c in enumerate(count):
        result.extend([i] * c)
    return result`,
  },
  {
    id: 'radix_sort', name: '基数排序', nameEn: 'Radix Sort', category: 'sorting', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def counting_sort_for_radix(arr, exp):
    n = len(arr)
    output = [0] * n
    count = [0] * 10
    for i in range(n):
        count[(arr[i] // exp) % 10] += 1
    for i in range(1, 10):
        count[i] += count[i - 1]
    for i in range(n - 1, -1, -1):
        digit = (arr[i] // exp) % 10
        output[count[digit] - 1] = arr[i]
        count[digit] -= 1
    return output[:]

def radix_sort(arr):
    max_val = max(arr) if arr else 0
    exp = 1
    while max_val // exp > 0:
        arr = counting_sort_for_radix(arr, exp)
        exp *= 10
    return arr`,
  },
  {
    id: 'bucket_sort', name: '桶排序', nameEn: 'Bucket Sort', category: 'sorting', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def bucket_sort(arr):
    if not arr: return arr
    n = len(arr)
    buckets = [[] for _ in range(n)]
    for num in arr:
        idx = int(n * num / (max(arr) + 1)) if max(arr) > 0 else 0
        buckets[min(idx, n - 1)].append(num)
    for b in buckets:
        b.sort()
    return [x for b in buckets for x in b]`,
  },

  // ============ 图算法 ============
  {
    id: 'bfs_graph', name: '广度优先搜索', nameEn: 'BFS (Graph)', category: 'graph', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `from collections import deque

def bfs(graph, start):
    visited = set()
    queue = deque([start])
    visited.add(start)
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return visited`,
  },
  {
    id: 'dfs_graph', name: '深度优先搜索', nameEn: 'DFS (Graph)', category: 'graph', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    return visited`,
  },
  {
    id: 'dijkstra', name: 'Dijkstra 最短路径', nameEn: "Dijkstra's Algorithm", category: 'graph', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `import heapq

def dijkstra(graph, start):
    dist = {node: float('inf') for node in graph}
    dist[start] = 0
    pq = [(0, start)]
    while pq:
        d, node = heapq.heappop(pq)
        if d > dist[node]: continue
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))
    return dist`,
  },
  {
    id: 'bellman_ford', name: 'Bellman-Ford', nameEn: 'Bellman-Ford', category: 'graph', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def bellman_ford(edges, n, start):
    dist = [float('inf')] * n
    dist[start] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    return dist`,
  },
  {
    id: 'a_star', name: 'A* 搜索', nameEn: 'A* Search', category: 'graph', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `import heapq

def heuristic(a, b):
    return abs(a[0]-b[0]) + abs(a[1]-b[1])

def a_star(grid, start, goal):
    open_set = [(0, start)]
    g_score = {start: 0}
    while open_set:
        _, current = heapq.heappop(open_set)
        if current == goal:
            return g_score[current]
        for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
            neighbor = (current[0]+dx, current[1]+dy)
            if 0 <= neighbor[0] < len(grid) and 0 <= neighbor[1] < len(grid[0]):
                tentative_g = g_score[current] + 1
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    g_score[neighbor] = tentative_g
                    f = tentative_g + heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f, neighbor))
    return -1`,
  },
  {
    id: 'floyd', name: 'Floyd-Warshall', nameEn: 'Floyd-Warshall', category: 'graph', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def floyd_warshall(graph):
    n = len(graph)
    dist = [row[:] for row in graph]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist`,
  },
  {
    id: 'prim', name: 'Prim 最小生成树', nameEn: "Prim's Algorithm", category: 'graph', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `import heapq

def prim(graph, n):
    visited = [False] * n
    pq = [(0, 0, -1)]
    mst = []
    while pq and len(mst) < n - 1:
        w, u, prev = heapq.heappop(pq)
        if visited[u]: continue
        visited[u] = True
        if prev != -1: mst.append((prev, u, w))
        for v, weight in graph[u]:
            if not visited[v]:
                heapq.heappush(pq, (weight, v, u))
    return mst`,
  },
  {
    id: 'kruskal', name: 'Kruskal 最小生成树', nameEn: "Kruskal's Algorithm", category: 'graph', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def find(parent, x):
    if parent[x] != x:
        parent[x] = find(parent, parent[x])
    return parent[x]

def kruskal(edges, n):
    edges.sort(key=lambda x: x[2])
    parent = list(range(n))
    mst = []
    for u, v, w in edges:
        pu, pv = find(parent, u), find(parent, v)
        if pu != pv:
            parent[pu] = pv
            mst.append((u, v, w))
    return mst`,
  },
  {
    id: 'topological_sort', name: '拓扑排序', nameEn: 'Topological Sort', category: 'graph', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `from collections import deque

def topological_sort(n, edges):
    indegree = [0] * n
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        indegree[v] += 1
    q = deque([i for i in range(n) if indegree[i] == 0])
    result = []
    while q:
        u = q.popleft()
        result.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)
    return result`,
  },

  // ============ 数据结构 ============
  {
    id: 'array', name: '数组', nameEn: 'Array', category: 'data-structure', difficulty: 'easy',
    hasPreset: false, defaultLanguage: 'python', defaultCode: '# Array operations\narr = [1, 2, 3, 4, 5]\narr.append(6)\narr.insert(0, 0)\narr.pop()\narr[2] = 10',
  },
  {
    id: 'linked_list', name: '单向链表', nameEn: 'Singly Linked List', category: 'data-structure', difficulty: 'easy',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def traverse(head):
    cur = head
    while cur:
        print(cur.val)
        cur = cur.next`,
  },
  {
    id: 'doubly_linked_list', name: '双向链表', nameEn: 'Doubly Linked List', category: 'data-structure', difficulty: 'easy',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class Node:
    def __init__(self, val):
        self.val = val
        self.prev = None
        self.next = None`,
  },
  {
    id: 'stack', name: '栈', nameEn: 'Stack', category: 'data-structure', difficulty: 'easy',
    hasPreset: false, defaultLanguage: 'python', defaultCode: '# Stack operations\nstack = []\nstack.append(1)  # push\nstack.append(2)\nstack.pop()     # 2\nstack[-1]      # peek',
  },
  {
    id: 'queue', name: '队列', nameEn: 'Queue', category: 'data-structure', difficulty: 'easy',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `from collections import deque
q = deque()
q.append(1)    # enqueue
q.append(2)
q.popleft()    # dequeue -> 1`,
  },
  {
    id: 'binary_tree', name: '二叉树', nameEn: 'Binary Tree', category: 'data-structure', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class TreeNode:
    def __init__(self, val=0):
        self.val = val
        self.left = None
        self.right = None

def inorder(root):
    if not root: return
    inorder(root.left)
    print(root.val)
    inorder(root.right)`,
  },
  {
    id: 'bst', name: '二叉搜索树', nameEn: 'BST', category: 'data-structure', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class TreeNode:
    def __init__(self, val=0):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if not root: return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def search(root, val):
    if not root or root.val == val:
        return root
    if val < root.val:
        return search(root.left, val)
    return search(root.right, val)`,
  },
  {
    id: 'avl_tree', name: 'AVL 树', nameEn: 'AVL Tree', category: 'data-structure', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class TreeNode:
    def __init__(self, val=0):
        self.val = val
        self.left = None
        self.right = None
        self.height = 1

def get_height(node):
    return node.height if node else 0

def get_balance(node):
    return get_height(node.left) - get_height(node.right) if node else 0`,
  },
  {
    id: 'red_black_tree', name: '红黑树', nameEn: 'Red-Black Tree', category: 'data-structure', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python', defaultCode: '# Red-Black Tree\n# 自平衡二叉搜索树，节点分为红色和黑色\n# 插入/删除后通过旋转和变色维持平衡',
  },
  {
    id: 'heap_ds', name: '堆', nameEn: 'Heap', category: 'data-structure', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `import heapq
# 最小堆
heap = []
heapq.heappush(heap, 3)
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
print(heapq.heappop(heap))  # 1`,
  },
  {
    id: 'trie', name: 'Trie 字典树', nameEn: 'Trie', category: 'data-structure', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True
    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.is_end`,
  },
  {
    id: 'union_find', name: '并查集', nameEn: 'Union-Find', category: 'data-structure', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py: return
        if self.rank[px] < self.rank[py]:
            self.parent[px] = py
        elif self.rank[px] > self.rank[py]:
            self.parent[py] = px
        else:
            self.parent[py] = px
            self.rank[px] += 1`,
  },
  {
    id: 'hash_table', name: '哈希表', nameEn: 'Hash Table', category: 'data-structure', difficulty: 'easy',
    hasPreset: false, defaultLanguage: 'python', defaultCode: '# Python dict = Hash Table\nhash_map = {}\nhash_map["key1"] = "value1"\nprint(hash_map.get("key1"))\nprint(hash_map.get("key2", "default"))',
  },

  // ============ 动态规划 ============
  {
    id: 'knapsack_01', name: '0/1 背包', nameEn: '0/1 Knapsack', category: 'dp', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i-1][w], dp[i-1][w-weights[i-1]] + values[i-1])
            else:
                dp[i][w] = dp[i-1][w]
    return dp[n][capacity]`,
  },
  {
    id: 'unbounded_knapsack', name: '完全背包', nameEn: 'Unbounded Knapsack', category: 'dp', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def unbounded_knapsack(weights, values, capacity):
    n = len(weights)
    dp = [0] * (capacity + 1)
    for w in range(capacity + 1):
        for i in range(n):
            if weights[i] <= w:
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]`,
  },
  {
    id: 'lcs', name: '最长公共子序列', nameEn: 'LCS', category: 'dp', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def lcs(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]`,
  },
  {
    id: 'lis', name: '最长递增子序列', nameEn: 'LIS', category: 'dp', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def lis(nums):
    if not nums: return 0
    n = len(nums)
    dp = [1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`,
  },
  {
    id: 'edit_distance', name: '编辑距离', nameEn: 'Edit Distance', category: 'dp', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[m][n]`,
  },
  {
    id: 'matrix_chain', name: '矩阵链乘', nameEn: 'Matrix Chain', category: 'dp', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def matrix_chain_order(dims):
    n = len(dims) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            for k in range(i, j):
                cost = dp[i][k] + dp[k+1][j] + dims[i]*dims[k+1]*dims[j+1]
                dp[i][j] = min(dp[i][j], cost)
    return dp[0][n-1]`,
  },
  {
    id: 'interval_dp', name: '区间 DP', nameEn: 'Interval DP', category: 'dp', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `# 区间动态规划模板
# 典型问题：石子合并、戳气球等
def interval_dp(nums):
    n = len(nums)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            for k in range(i, j):
                dp[i][j] = max(dp[i][j], dp[i][k] + dp[k+1][j] + nums[i]*nums[k+1]*nums[j+1] if j+1 < n else 0)
    return dp[0][n-1]`,
  },

  // ============ 搜索与回溯 ============
  {
    id: 'binary_search', name: '二分查找', nameEn: 'Binary Search', category: 'search-backtrack', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: left = mid + 1
        else: right = mid - 1
    return -1`,
  },
  {
    id: 'backtracking', name: '回溯算法', nameEn: 'Backtracking', category: 'search-backtrack', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def backtrack(choices, path, result):
    if 满足结束条件:
        result.append(path[:])
        return
    for choice in choices:
        if 不合法: continue
        做选择
        backtrack(choices, path, result)
        撤销选择`,
  },
  {
    id: 'n_queens', name: 'N 皇后', nameEn: 'N-Queens', category: 'search-backtrack', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def solve_n_queens(n):
    board = [['.'] * n for _ in range(n)]
    result = []
    def is_safe(row, col):
        for i in range(row):
            if board[i][col] == 'Q': return False
            d = row - i
            if col - d >= 0 and board[i][col - d] == 'Q': return False
            if col + d < n and board[i][col + d] == 'Q': return False
        return True
    def solve(row):
        if row == n:
            result.append([''.join(r) for r in board]); return
        for col in range(n):
            if is_safe(row, col):
                board[row][col] = 'Q'
                solve(row + 1)
                board[row][col] = '.'
    solve(0)
    return result`,
  },
  {
    id: 'sudoku', name: '数独求解', nameEn: 'Sudoku Solver', category: 'search-backtrack', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def solve_sudoku(board):
    def is_valid(row, col, num):
        for i in range(9):
            if board[row][i] == num: return False
            if board[i][col] == num: return False
            if board[3*(row//3)+i//3][3*(col//3)+i%3] == num: return False
        return True
    for i in range(9):
        for j in range(9):
            if board[i][j] == '.':
                for num in '123456789':
                    if is_valid(i, j, num):
                        board[i][j] = num
                        if solve_sudoku(board): return True
                        board[i][j] = '.'
                return False
    return True`,
  },

  // ============ 进阶专题 ============
  {
    id: 'kmp', name: 'KMP 字符串匹配', nameEn: 'KMP', category: 'advanced', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def kmp_search(text, pattern):
    def build_lps(p):
        lps = [0] * len(p)
        length = 0; i = 1
        while i < len(p):
            if p[i] == p[length]:
                length += 1; lps[i] = length; i += 1
            elif length:
                length = lps[length - 1]
            else:
                lps[i] = 0; i += 1
        return lps
    lps = build_lps(pattern)
    i = j = 0
    while i < len(text):
        if text[i] == pattern[j]:
            i += 1; j += 1
        if j == len(pattern):
            return i - j
        elif i < len(text) and text[i] != pattern[j]:
            if j: j = lps[j - 1]
            else: i += 1
    return -1`,
  },
  {
    id: 'manacher', name: 'Manacher 回文', nameEn: "Manacher's Algorithm", category: 'advanced', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def longest_palindrome(s):
    T = '#' + '#'.join(s) + '#'
    n = len(T)
    P = [0] * n
    C = R = 0
    for i in range(n):
        mirror = 2 * C - i
        if i < R:
            P[i] = min(R - i, P[mirror])
        while i + P[i] + 1 < n and i - P[i] - 1 >= 0 and T[i+P[i]+1] == T[i-P[i]-1]:
            P[i] += 1
        if i + P[i] > R:
            C, R = i, i + P[i]
    center = P.index(max(P))
    start = (center - max(P)) // 2
    return s[start:start + max(P)]`,
  },
  {
    id: 'segment_tree', name: '线段树', nameEn: 'Segment Tree', category: 'advanced', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class SegmentTree:
    def __init__(self, arr):
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self.build(arr, 0, 0, self.n - 1)
    def build(self, arr, node, start, end):
        if start == end:
            self.tree[node] = arr[start]
        else:
            mid = (start + end) // 2
            self.build(arr, 2*node+1, start, mid)
            self.build(arr, 2*node+2, mid+1, end)
            self.tree[node] = self.tree[2*node+1] + self.tree[2*node+2]`,
  },
  {
    id: 'fenwick_tree', name: '树状数组', nameEn: 'Fenwick Tree', category: 'advanced', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)
    def update(self, i, delta):
        i += 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i
    def query(self, i):
        s = 0
        i += 1
        while i > 0:
            s += self.tree[i]
            i -= i & -i
        return s`,
  },
  {
    id: 'monotonic_stack', name: '单调栈', nameEn: 'Monotonic Stack', category: 'advanced', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def next_greater_element(nums):
    n = len(nums)
    result = [-1] * n
    stack = []
    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)
    return result`,
  },
  {
    id: 'sliding_window', name: '滑动窗口', nameEn: 'Sliding Window', category: 'advanced', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python',
    defaultCode: `def max_sum_subarray(arr, k):
    n = len(arr)
    if n < k: return -1
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, n):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum`,
  },

  // ============ 面试高频 ============
  {
    id: 'leetcode_hot100', name: 'LeetCode Hot 100', nameEn: 'LeetCode Top 100', category: 'interview', difficulty: 'medium',
    hasPreset: false, defaultLanguage: 'python', defaultCode: '# LeetCode Hot 100 精选题目\n# 覆盖数组、字符串、链表、树、DP 等核心题型\n# 请选择具体题目后在编辑器中编写代码',
  },

  // ============ 竞赛专题 ============
  {
    id: 'acm_templates', name: 'ACM 算法模板', nameEn: 'ACM Templates', category: 'contest', difficulty: 'hard',
    hasPreset: false, defaultLanguage: 'python', defaultCode: `# ACM 常用算法模板
# 快速幂、组合数、素数筛、二分答案等
MOD = 10**9 + 7

def pow_mod(a, b):
    result = 1
    while b:
        if b & 1: result = result * a % MOD
        a = a * a % MOD
        b >>= 1
    return result`,
  },
]

export interface AlgorithmState {
  selectedAlgorithm: AlgorithmType | null
  algorithms: AlgorithmType[]
  animationScript: AnimationScript | null
  searchQuery: string
  activeCategory: AlgorithmCategory | 'all'
  language: 'zh' | 'en'
}

export interface AlgorithmActions {
  setSelectedAlgorithm: (algo: AlgorithmType | null) => void
  setAnimationScript: (script: AnimationScript | null) => void
  setSearchQuery: (query: string) => void
  setActiveCategory: (cat: AlgorithmCategory | 'all') => void
  setLanguage: (lang: 'zh' | 'en') => void
}

export const createAlgorithmStore = create<AlgorithmState & AlgorithmActions>((set) => ({
  selectedAlgorithm: null,
  algorithms: DEFAULT_ALGORITHMS,
  animationScript: null,
  searchQuery: '',
  activeCategory: 'all',
  language: (localStorage.getItem('algoviz-lang') as 'zh' | 'en') || 'zh',

  setSelectedAlgorithm: (algo) => set({ selectedAlgorithm: algo }),
  setAnimationScript: (script) => set({ animationScript: script }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setLanguage: (lang) => {
    localStorage.setItem('algoviz-lang', lang)
    set({ language: lang })
  },
}))

export const useAlgorithmStore = createAlgorithmStore
