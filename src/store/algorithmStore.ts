import { createStore, useStore } from 'zustand'
import type { AnimationScript } from '@/types/animation'

export type AIHistoryStatus = 'analyzing' | 'success' | 'error'

export type AIStatus = 'idle' | 'analyzing' | 'success' | 'error'

export interface AIHistoryEntry {
  id: string
  timestamp: number
  algorithmId: string
  algorithmName: string
  code: string
  language: string
  inputData: string
  status: AIHistoryStatus
  script?: AnimationScript
  error?: string
  generatorBody?: string
  generatorType?: 'array' | 'graph' | 'tree' | 'linked_list' | 'union_find'
}

const AI_HISTORY_KEY = 'algoviz-ai-history'
const AI_HISTORY_MAX = 20

function loadAIHistory(): AIHistoryEntry[] {
  try {
    const raw = localStorage.getItem(AI_HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AIHistoryEntry[]
  } catch {
    return []
  }
}

function saveAIHistory(history: AIHistoryEntry[]): void {
  localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history))
}

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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    id: 'tarjan_scc', name: 'Tarjan 强连通分量', nameEn: 'Tarjan SCC', category: 'graph', difficulty: 'hard',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def tarjan_scc(graph, n):
    index = [0]
    disc = [-1] * n
    low = [0] * n
    on_stack = [False] * n
    stack = []
    comps = []

    def dfs(u):
        index[0] += 1
        disc[u] = low[u] = index[0]
        stack.append(u); on_stack[u] = True
        for v in graph[u]:
            if disc[v] == -1:
                dfs(v); low[u] = min(low[u], low[v])
            elif on_stack[v]:
                low[u] = min(low[u], disc[v])
        if low[u] == disc[u]:
            comp = []
            while True:
                w = stack.pop(); on_stack[w] = False
                comp.append(w)
                if w == u: break
            comps.append(comp)

    for u in range(n):
        if disc[u] == -1:
            dfs(u)
    return comps`,
  },
  {
    id: 'prim', name: 'Prim 最小生成树', nameEn: "Prim's Algorithm", category: 'graph', difficulty: 'hard',
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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

  // ============ 数据结构与算法操作 ============
  {
    id: 'linked_list_insert', name: '链表插入结点', nameEn: 'Singly LinkedList Insertion', category: 'data-structure', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def insert_after(prev_node, new_val):
    if prev_node is None: return
    new_node = ListNode(new_val)
    new_node.next = prev_node.next
    prev_node.next = new_node`,
  },
  {
    id: 'linked_list_delete', name: '链表删除结点', nameEn: 'Singly LinkedList Deletion', category: 'data-structure', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def delete_node(prev_node):
    if prev_node is None or prev_node.next is None:
        return
    target = prev_node.next
    prev_node.next = target.next`,
  },
  {
    id: 'linked_list_search', name: '查找链表结点', nameEn: 'Singly LinkedList Search', category: 'data-structure', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def search_list(head, target):
    cur = head
    while cur is not None:
        if cur.val == target:
            return cur  # Found
        cur = cur.next
    return None  # Not Found`,
  },
  {
    id: 'stack', name: '栈操作演示', nameEn: 'Stack Operations', category: 'data-structure', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python', defaultCode: '# Stack operations\nstack = []\nstack.append(1)  # push\nstack.append(2)\nstack.pop()     # 2\nstack[-1]      # peek',
  },
  {
    id: 'queue', name: '队列操作演示', nameEn: 'Queue Operations', category: 'data-structure', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `from collections import deque
q = deque()
q.append(1)    # enqueue
q.append(2)
q.popleft()    # dequeue -> 1`,
  },
  {
    id: 'binary_tree_traverse', name: '二叉树遍历', nameEn: 'Binary Tree Traversal', category: 'data-structure', difficulty: 'medium',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def inorder(root):
    if not root: return
    inorder(root.left)
    print(root.val)
    inorder(root.right)`,
  },
  {
    id: 'bst_insert', name: '二叉搜索树插入', nameEn: 'BST Insertion', category: 'data-structure', difficulty: 'medium',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def insert_bst(root, val):
    if root is None:
        return TreeNode(val)
    if val < root.val:
        root.left = insert_bst(root.left, val)
    else:
        root.right = insert_bst(root.right, val)
    return root`,
  },
  {
    id: 'bst_delete', name: '二叉搜索树删除', nameEn: 'BST Deletion', category: 'data-structure', difficulty: 'hard',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def delete_bst(root, key):
    if root is None: return root
    if key < root.val:
        root.left = delete_bst(root.left, key)
    elif key > root.val:
        root.right = delete_bst(root.right, key)
    else:
        if root.left is None: return root.right
        if root.right is None: return root.left
        temp = get_min(root.right)
        root.val = temp.val
        root.right = delete_bst(root.right, temp.val)
    return root`,
  },
  {
    id: 'bst_search', name: '二叉搜索树查找', nameEn: 'BST Search', category: 'data-structure', difficulty: 'medium',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def search_bst(root, val):
    if root is None or root.val == val:
        return root
    if val < root.val:
        return search_bst(root.left, val)
    return search_bst(root.right, val)`,
  },
  {
    id: 'avl_insert', name: '自平衡树平衡旋转 (AVL)', nameEn: 'AVL Tree Balancing & Rotations', category: 'data-structure', difficulty: 'hard',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def insert_avl(root, val):
    if root is None: return TreeNode(val)
    # 1. Standard BST Insert
    if val < root.val:
        root.left = insert_avl(root.left, val)
    else:
        root.right = insert_avl(root.right, val)
    # 2. Update height and rebalance
    root.height = 1 + max(get_height(root.left), get_height(root.right))
    balance = get_balance(root)
    # LL case -> Right Rotate
    if balance > 1 and val < root.left.val:
        return right_rotate(root)
    # RR case -> Left Rotate
    if balance < -1 and val > root.right.val:
        return left_rotate(root)
    return root`,
  },
  {
    id: 'heap_ds', name: '堆操作演示 (上浮与下沉)', nameEn: 'Heap Operations (Bubble-up/Sink-down)', category: 'data-structure', difficulty: 'medium',
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python', defaultCode: '# Python dict = Hash Table\nhash_map = {}\nhash_map["key1"] = "value1"\nprint(hash_map.get("key1"))\nprint(hash_map.get("key2", "default"))',
  },
  {
    id: 'btree', name: 'B树', nameEn: 'B-Tree', category: 'data-structure', difficulty: 'hard',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `class BTreeNode:
    def __init__(self, t, leaf=False):
        self.t = t          # 最小度数
        self.leaf = leaf    # 是否叶子节点
        self.keys = []      # 关键码列表
        self.children = []  # 子节点列表

def search(node, key):
    i = 0
    while i < len(node.keys) and key > node.keys[i]:
        i += 1
    if i < len(node.keys) and node.keys[i] == key:
        return (node, i)        # 在当前节点找到
    if node.leaf:
        return None              # 叶子层未找到
    return search(node.children[i], key)

def split_child(parent, i):
    t = parent.t
    y = parent.children[i]
    z = BTreeNode(t, y.leaf)
    # 将 y 的后半部分关键码移到 z
    z.keys = y.keys[t:]
    y.keys = y.keys[:t - 1]
    if not y.leaf:
        z.children = y.children[t:]
        y.children = y.children[:t]
    # 将 z 插入到 parent 中
    parent.children.insert(i + 1, z)
    parent.keys.insert(i, y.keys[t - 1])

def insert_non_full(node, key):
    i = len(node.keys) - 1
    if node.leaf:
        node.keys.append(None)
        while i >= 0 and key < node.keys[i]:
            node.keys[i + 1] = node.keys[i]
            i -= 1
        node.keys[i + 1] = key
    else:
        while i >= 0 and key < node.keys[i]:
            i -= 1
        i += 1
        if len(node.children[i].keys) == 2 * node.t - 1:
            split_child(node, i)
            if key > node.keys[i]:
                i += 1
        insert_non_full(node.children[i], key)

def insert(root, key):
    if len(root.keys) == 2 * root.t - 1:
        # 根分裂：创建新根，保持树平衡
        new_root = BTreeNode(root.t)
        new_root.children.append(root)
        split_child(new_root, 0)
        insert_non_full(new_root, key)
        return new_root
    else:
        insert_non_full(root, key)
        return root`,
  },
  {
    id: 'bplus_tree', name: 'B+树', nameEn: 'B+ Tree', category: 'data-structure', difficulty: 'hard',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `class BPlusNode:
    def __init__(self, t, leaf=False):
        self.t = t          # 最小度数
        self.leaf = leaf    # 是否叶子节点
        self.keys = []      # 关键码列表
        self.children = []  # 子节点（内部）/ 数据指针（叶子）
        self.next = None    # 叶子层链表指针

def search(root, key):
    """在 B+ 树中搜索 key，返回对应的值，未找到返回 None"""
    node = root
    while not node.leaf:
        i = 0
        while i < len(node.keys) and key >= node.keys[i]:
            i += 1
        node = node.children[i]
    # 在叶子节点中二分查找
    lo, hi = 0, len(node.keys) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if node.keys[mid] == key:
            return node.children[mid]  # 找到
        elif key < node.keys[mid]:
            hi = mid - 1
        else:
            lo = mid + 1
    return None

def range_query(root, low, high):
    """范围查询：返回 [low, high] 区间内所有 (key, value) 对"""
    node = root
    while not node.leaf:
        i = 0
        while i < len(node.keys) and low >= node.keys[i]:
            i += 1
        node = node.children[i]
    result = []
    while node is not None:
        for i in range(len(node.keys)):
            k = node.keys[i]
            if k > high:
                return result
            if k >= low:
                result.append((k, node.children[i]))
        node = node.next
    return result

def split_child(parent, i):
    """分裂 parent 的第 i 个子节点"""
    t = parent.t
    y = parent.children[i]
    z = BPlusNode(t, y.leaf)
    z.keys = y.keys[t:]
    z.children = y.children[t:]
    y.keys = y.keys[:t]
    y.children = y.children[:t]
    if y.leaf:
        z.next = y.next
        y.next = z
    parent.children.insert(i + 1, z)
    parent.keys.insert(i, z.keys[0])

def insert_non_full(node, key, value):
    i = len(node.keys) - 1
    if node.leaf:
        while i >= 0 and key < node.keys[i]:
            i -= 1
        i += 1
        node.keys.insert(i, key)
        node.children.insert(i, value)
    else:
        while i >= 0 and key < node.keys[i]:
            i -= 1
        i += 1
        if len(node.children[i].keys) == 2 * node.t:
            split_child(node, i)
            if key > node.keys[i]:
                i += 1
        insert_non_full(node.children[i], key, value)

def insert(root, key, value):
    if len(root.keys) == 2 * root.t:
        new_root = BPlusNode(root.t)
        new_root.children.append(root)
        split_child(new_root, 0)
        insert_non_full(new_root, key, value)
        return new_root
    else:
        insert_non_full(root, key, value)
        return root`,
  },

  // ============ 动态规划 ============
  {
    id: 'knapsack_01', name: '0/1 背包', nameEn: '0/1 Knapsack', category: 'dp', difficulty: 'medium',
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python',
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
    hasPreset: true, defaultLanguage: 'python', defaultCode: '# LeetCode Hot 100 精选题目\n# 覆盖数组、字符串、链表、树、DP 等核心题型\n# 请选择具体题目后在编辑器中编写代码',
  },

  // ============ 竞赛专题 ============
  {
    id: 'gcd_euclidean', name: '欧几里得算法/GCD', nameEn: 'Euclidean GCD', category: 'contest', difficulty: 'easy',
    hasPreset: true, defaultLanguage: 'python',
    defaultCode: `def gcd(a, b):
    a, b = abs(int(a)), abs(int(b))
    while b != 0:
        r = a % b
        a = b
        b = r
    return a`,
  },
  {
    id: 'acm_templates', name: 'ACM 算法模板', nameEn: 'ACM Templates', category: 'contest', difficulty: 'hard',
    hasPreset: true, defaultLanguage: 'python', defaultCode: `# ACM 常用算法模板
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
  aiStatus: AIStatus
  aiError: string
  aiRawResponse: string
  aiHistory: AIHistoryEntry[]
}

export interface AlgorithmActions {
  setSelectedAlgorithm: (algo: AlgorithmType | null) => void
  setAnimationScript: (script: AnimationScript | null) => void
  setSearchQuery: (query: string) => void
  setActiveCategory: (cat: AlgorithmCategory | 'all') => void
  setLanguage: (lang: 'zh' | 'en') => void
  setAIStatus: (status: AIStatus, error?: string, rawResponse?: string) => void
  addAIHistory: (entry: AIHistoryEntry) => void
  clearAIHistory: () => void
  updateAIHistory: (id: string, patch: Partial<Omit<AIHistoryEntry, 'id'>>) => void
  removeAIHistory: (id: string) => void
}

export const createAlgorithmStore = () => createStore<AlgorithmState & AlgorithmActions>((set) => ({
  selectedAlgorithm: null,
  algorithms: DEFAULT_ALGORITHMS,
  animationScript: null,
  searchQuery: '',
  activeCategory: 'all',
  language: (() => { try { return (localStorage.getItem('algoviz-lang') as 'zh' | 'en') || 'zh' } catch { return 'zh' } })(),
  aiStatus: 'idle' as AIStatus,
  aiError: '',
  aiRawResponse: '',
  aiHistory: loadAIHistory(),

  setSelectedAlgorithm: (algo) => set({ selectedAlgorithm: algo }),
  setAnimationScript: (script) => set({ animationScript: script }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setLanguage: (lang) => {
    localStorage.setItem('algoviz-lang', lang)
    set({ language: lang })
  },

  setAIStatus: (status, error = '', rawResponse = '') =>
    set({ aiStatus: status, aiError: error, aiRawResponse: rawResponse }),

  addAIHistory: (entry) =>
    set((state) => {
      const next = [entry, ...state.aiHistory].slice(0, AI_HISTORY_MAX)
      saveAIHistory(next)
      return { aiHistory: next }
    }),

  clearAIHistory: () => {
    saveAIHistory([])
    set({ aiHistory: [] })
  },

  updateAIHistory: (id, patch) =>
    set((state) => {
      const idx = state.aiHistory.findIndex((e) => e.id === id)
      if (idx === -1) return state
      const next = [...state.aiHistory]
      next[idx] = { ...next[idx], ...patch }
      saveAIHistory(next)
      return { aiHistory: next }
    }),

  removeAIHistory: (id) =>
    set((state) => {
      const next = state.aiHistory.filter((e) => e.id !== id)
      saveAIHistory(next)
      return { aiHistory: next }
    }),
}))

const algorithmStore = createAlgorithmStore()

export function useAlgorithmStore<T>(selector: (state: AlgorithmState & AlgorithmActions) => T): T {
  return useStore(algorithmStore, selector)
}
