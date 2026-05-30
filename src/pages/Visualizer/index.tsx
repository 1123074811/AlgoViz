import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAlgorithmStore } from '@/store/algorithmStore'
import { getPreset, generatePreset, hasGenerator } from '@/presets'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { analyzeCode, getApiConfig, parseInputData, type AIResult } from '@/ai'
import { ALGORITHM_DEFS, type AlgorithmDefinition } from '@/data/algorithmDefs'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'
import PlaybackControls from '@/components/Controls/PlaybackControls'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import InputDataPanel from '@/components/Editor/InputDataPanel'
import { getSceneDiagnosticSummary, getSceneEventStats, usesSceneEngine } from '@/scene'
import { getOperationsForAlgo, type OperationDef } from '@/presets/operationPresets'

type AIStatus = 'idle' | 'analyzing' | 'success' | 'error'

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
}

function getAlgorithmDesc(id: string): string {
  return ALGO_DESC_ZH[id] || ''
}

function getAlgorithmDescEn(id: string): string {
  return ALGO_DESC_EN[id] || ''
}

type CodeLang = 'python' | 'javascript' | 'cpp' | 'java'

const CODE_TEMPLATES: Record<string, Partial<Record<CodeLang, string>>> = {
  bubble_sort: {
    python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
    javascript: `function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
    return arr;
}`,
    java: `public class BubbleSort {
    public static int[] bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        return arr;
    }
}`,
  },
  selection_sort: {
    python: `def selection_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`,
    javascript: `function selectionSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        let minIdx = i;
        for (let j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
    return arr;
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> selectionSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        swap(arr[i], arr[minIdx]);
    }
    return arr;
}`,
    java: `public class SelectionSort {
    public static int[] selectionSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            int minIdx = i;
            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }
            int temp = arr[i];
            arr[i] = arr[minIdx];
            arr[minIdx] = temp;
        }
        return arr;
    }
}`,
  },
  binary_search: {
    python: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: left = mid + 1
        else: right = mid - 1
    return -1`,
    javascript: `function binarySearch(arr, target) {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    cpp: `#include <vector>
using namespace std;

int binarySearch(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    java: `public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`,
  },
  insertion_sort: {
    python: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
    javascript: `function insertionSort(arr) {
    for (let i = 1; i < arr.length; i++) {
        const key = arr[i];
        let j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    return arr;
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> insertionSort(vector<int>& arr) {
    for (int i = 1; i < arr.size(); i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    return arr;
}`,
    java: `public class InsertionSort {
    public static int[] insertionSort(int[] arr) {
        for (int i = 1; i < arr.length; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
        return arr;
    }
}`,
  },
  merge_sort: {
    python: `def merge_sort(arr):
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
    javascript: `function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    return merge(left, right);
}
function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) result.push(left[i++]);
        else result.push(right[j++]);
    }
    return [...result, ...left.slice(i), ...right.slice(j)];
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> merge(vector<int>& left, vector<int>& right) {
    vector<int> result;
    int i = 0, j = 0;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) result.push_back(left[i++]);
        else result.push_back(right[j++]);
    }
    while (i < left.size()) result.push_back(left[i++]);
    while (j < right.size()) result.push_back(right[j++]);
    return result;
}
vector<int> mergeSort(vector<int>& arr) {
    if (arr.size() <= 1) return arr;
    int mid = arr.size() / 2;
    vector<int> left(arr.begin(), arr.begin() + mid);
    vector<int> right(arr.begin() + mid, arr.end());
    left = mergeSort(left);
    right = mergeSort(right);
    return merge(left, right);
}`,
    java: `public class MergeSort {
    public static int[] mergeSort(int[] arr) {
        if (arr.length <= 1) return arr;
        int mid = arr.length / 2;
        int[] left = java.util.Arrays.copyOfRange(arr, 0, mid);
        int[] right = java.util.Arrays.copyOfRange(arr, mid, arr.length);
        return merge(mergeSort(left), mergeSort(right));
    }
    private static int[] merge(int[] left, int[] right) {
        int[] result = new int[left.length + right.length];
        int i = 0, j = 0, k = 0;
        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) result[k++] = left[i++];
            else result[k++] = right[j++];
        }
        while (i < left.length) result[k++] = left[i++];
        while (j < right.length) result[k++] = right[j++];
        return result;
    }
}`,
  },
  quick_sort: {
    python: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    left = [x for x in arr[1:] if x <= pivot]
    right = [x for x in arr[1:] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)`,
    javascript: `function quickSort(arr) {
    if (arr.length <= 1) return arr;
    const pivot = arr[0];
    const left = arr.slice(1).filter(x => x <= pivot);
    const right = arr.slice(1).filter(x => x > pivot);
    return [...quickSort(left), pivot, ...quickSort(right)];
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> quickSort(vector<int>& arr) {
    if (arr.size() <= 1) return arr;
    int pivot = arr[0];
    vector<int> left, right;
    for (int i = 1; i < arr.size(); i++) {
        if (arr[i] <= pivot) left.push_back(arr[i]);
        else right.push_back(arr[i]);
    }
    left = quickSort(left);
    right = quickSort(right);
    left.push_back(pivot);
    left.insert(left.end(), right.begin(), right.end());
    return left;
}`,
    java: `public class QuickSort {
    public static java.util.List<Integer> quickSort(java.util.List<Integer> arr) {
        if (arr.size() <= 1) return arr;
        int pivot = arr.get(0);
        java.util.List<Integer> left = new java.util.ArrayList<>();
        java.util.List<Integer> right = new java.util.ArrayList<>();
        for (int i = 1; i < arr.size(); i++) {
            if (arr.get(i) <= pivot) left.add(arr.get(i));
            else right.add(arr.get(i));
        }
        left = quickSort(left);
        right = quickSort(right);
        java.util.List<Integer> result = new java.util.ArrayList<>(left);
        result.add(pivot);
        result.addAll(right);
        return result;
    }
}`,
  },
  bfs_graph: {
    python: `from collections import deque

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
    javascript: `function bfs(graph, start) {
    const visited = new Set();
    const queue = [start];
    visited.add(start);
    while (queue.length) {
        const node = queue.shift();
        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return visited;
}`,
    cpp: `#include <queue>
#include <unordered_set>
using namespace std;

void bfs(vector<vector<int>>& graph, int start) {
    unordered_set<int> visited;
    queue<int> q;
    q.push(start);
    visited.insert(start);
    while (!q.empty()) {
        int node = q.front(); q.pop();
        for (int neighbor : graph[node]) {
            if (!visited.count(neighbor)) {
                visited.insert(neighbor);
                q.push(neighbor);
            }
        }
    }
}`,
    java: `public static void bfs(List<List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>();
    Queue<Integer> queue = new LinkedList<>();
    queue.add(start);
    visited.add(start);
    while (!queue.isEmpty()) {
        int node = queue.poll();
        for (int neighbor : graph.get(node)) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.add(neighbor);
            }
        }
    }
}`,
  },
  dfs_graph: {
    python: `def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    return visited`,
    javascript: `function dfs(graph, node, visited = new Set()) {
    visited.add(node);
    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
    return visited;
}`,
    cpp: `#include <vector>
#include <unordered_set>
using namespace std;

void dfs(vector<vector<int>>& graph, int node, unordered_set<int>& visited) {
    visited.insert(node);
    for (int neighbor : graph[node]) {
        if (!visited.count(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}`,
    java: `public static void dfs(List<List<Integer>> graph, int node, Set<Integer> visited) {
    visited.add(node);
    for (int neighbor : graph.get(node)) {
        if (!visited.contains(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}`,
  },
  shell_sort: {
    python: `def shell_sort(arr):
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
    javascript: `function shellSort(arr) {
    const n = arr.length;
    for (let gap = Math.floor(n/2); gap > 0; gap = Math.floor(gap/2)) {
        for (let i = gap; i < n; i++) {
            const temp = arr[i]; let j = i;
            while (j >= gap && arr[j-gap] > temp) { arr[j] = arr[j-gap]; j -= gap; }
            arr[j] = temp;
        }
    }
    return arr;
}`,
    cpp: `vector<int> shellSort(vector<int> arr) {
    int n = arr.size();
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int temp = arr[i], j = i;
            while (j >= gap && arr[j-gap] > temp) { arr[j] = arr[j-gap]; j -= gap; }
            arr[j] = temp;
        }
    return arr;
}`,
    java: `public static int[] shellSort(int[] arr) {
    int n = arr.length;
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int temp = arr[i], j = i;
            while (j >= gap && arr[j-gap] > temp) { arr[j] = arr[j-gap]; j -= gap; }
            arr[j] = temp;
        }
    return arr;
}`,
  },
  heap_sort: {
    python: `def heapify(arr, n, i):
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
    javascript: `function heapify(arr, n, i) { let largest = i, l = 2*i+1, r = 2*i+2; if (l < n && arr[l] > arr[largest]) largest = l; if (r < n && arr[r] > arr[largest]) largest = r; if (largest !== i) { [arr[i], arr[largest]] = [arr[largest], arr[i]]; heapify(arr, n, largest); } }
function heapSort(arr) { const n = arr.length; for (let i = Math.floor(n/2)-1; i >= 0; i--) heapify(arr, n, i); for (let i = n-1; i > 0; i--) { [arr[0], arr[i]] = [arr[i], arr[0]]; heapify(arr, i, 0); } return arr; }`,
    cpp: `void heapify(vector<int>& arr, int n, int i) { int largest = i, l = 2*i+1, r = 2*i+2; if (l < n && arr[l] > arr[largest]) largest = l; if (r < n && arr[r] > arr[largest]) largest = r; if (largest != i) { swap(arr[i], arr[largest]); heapify(arr, n, largest); } }
vector<int> heapSort(vector<int> arr) { int n = arr.size(); for (int i = n/2-1; i >= 0; i--) heapify(arr, n, i); for (int i = n-1; i > 0; i--) { swap(arr[0], arr[i]); heapify(arr, i, 0); } return arr; }`,
    java: `static void heapify(int[] arr, int n, int i) { int largest = i, l = 2*i+1, r = 2*i+2; if (l < n && arr[l] > arr[largest]) largest = l; if (r < n && arr[r] > arr[largest]) largest = r; if (largest != i) { int t = arr[i]; arr[i] = arr[largest]; arr[largest] = t; heapify(arr, n, largest); } }
static int[] heapSort(int[] arr) { int n = arr.length; for (int i = n/2-1; i >= 0; i--) heapify(arr, n, i); for (int i = n-1; i > 0; i--) { int t = arr[0]; arr[0] = arr[i]; arr[i] = t; heapify(arr, i, 0); } return arr; }`,
  },
  counting_sort: {
    python: `def counting_sort(arr):
    if not arr: return arr
    max_val = max(arr)
    count = [0] * (max_val + 1)
    for num in arr: count[num] += 1
    result = []
    for i, c in enumerate(count):
        result.extend([i] * c)
    return result`,
    javascript: `function countingSort(arr) { if (!arr.length) return arr; const max = Math.max(...arr); const count = new Array(max+1).fill(0); for (const n of arr) count[n]++; const res = []; for (let i = 0; i <= max; i++) while (count[i]-- > 0) res.push(i); return res; }`,
    cpp: `vector<int> countingSort(vector<int>& arr) { if (arr.empty()) return arr; int mx = *max_element(arr.begin(), arr.end()); vector<int> count(mx+1), res; for (int x : arr) count[x]++; for (int i = 0; i <= mx; i++) while (count[i]--) res.push_back(i); return res; }`,
    java: `static int[] countingSort(int[] arr) { if (arr.length == 0) return arr; int max = Arrays.stream(arr).max().getAsInt(); int[] count = new int[max+1]; for (int x : arr) count[x]++; int[] res = new int[arr.length]; int idx = 0; for (int i = 0; i <= max; i++) while (count[i]-- > 0) res[idx++] = i; return res; }`,
  },
  radix_sort: {
    python: `def counting_sort_for_radix(arr, exp):
    n = len(arr); output = [0] * n; count = [0] * 10
    for i in range(n): count[(arr[i] // exp) % 10] += 1
    for i in range(1, 10): count[i] += count[i - 1]
    for i in range(n - 1, -1, -1):
        digit = (arr[i] // exp) % 10
        output[count[digit] - 1] = arr[i]; count[digit] -= 1
    return output

def radix_sort(arr):
    if not arr: return arr
    max_val = max(arr); exp = 1
    while max_val // exp > 0:
        arr = counting_sort_for_radix(arr, exp); exp *= 10
    return arr`,
    javascript: `function radixSort(arr) { const max = Math.max(...arr); for (let exp = 1; Math.floor(max/exp) > 0; exp *= 10) { const out = new Array(arr.length); const cnt = new Array(10).fill(0); for (let i = 0; i < arr.length; i++) cnt[Math.floor(arr[i]/exp)%10]++; for (let i = 1; i < 10; i++) cnt[i] += cnt[i-1]; for (let i = arr.length-1; i >= 0; i--) { const d = Math.floor(arr[i]/exp)%10; out[--cnt[d]] = arr[i]; } arr = [...out]; } return arr; }`,
    cpp: `vector<int> radixSort(vector<int> arr) { int mx = *max_element(arr.begin(), arr.end()); for (int exp = 1; mx/exp > 0; exp *= 10) { vector<int> out(arr.size()); int cnt[10] = {0}; for (int x : arr) cnt[(x/exp)%10]++; for (int i = 1; i < 10; i++) cnt[i] += cnt[i-1]; for (int i = arr.size()-1; i >= 0; i--) out[--cnt[(arr[i]/exp)%10]] = arr[i]; arr = out; } return arr; }`,
    java: `static int[] radixSort(int[] arr) { int max = Arrays.stream(arr).max().getAsInt(); for (int exp = 1; max/exp > 0; exp *= 10) { int[] out = new int[arr.length]; int[] cnt = new int[10]; for (int x : arr) cnt[(x/exp)%10]++; for (int i = 1; i < 10; i++) cnt[i] += cnt[i-1]; for (int i = arr.length-1; i >= 0; i--) out[--cnt[(arr[i]/exp)%10]] = arr[i]; arr = out; } return arr; }`,
  },
  bucket_sort: {
    python: `def bucket_sort(arr):
    if not arr: return arr
    n = len(arr); buckets = [[] for _ in range(n)]
    for num in arr:
        idx = min(int(n * num / (max(arr) + 1)), n - 1)
        buckets[idx].append(num)
    for b in buckets: b.sort()
    return [x for b in buckets for x in b]`,
    javascript: `function bucketSort(arr) { if (!arr.length) return arr; const n = arr.length, max = Math.max(...arr); const buckets = Array.from({length:n}, () => []); for (const num of arr) { const idx = Math.min(Math.floor(n*num/(max+1)), n-1); buckets[idx].push(num); } for (const b of buckets) b.sort((a,b) => a-b); return buckets.flat(); }`,
    cpp: `vector<int> bucketSort(vector<int> arr) { if (arr.empty()) return arr; int n = arr.size(), mx = *max_element(arr.begin(), arr.end()); vector<vector<int>> buckets(n); for (int x : arr) buckets[min((int)(n*1.0*x/(mx+1)), n-1)].push_back(x); vector<int> res; for (auto& b : buckets) { sort(b.begin(), b.end()); res.insert(res.end(), b.begin(), b.end()); } return res; }`,
    java: `static int[] bucketSort(int[] arr) { if (arr.length == 0) return arr; int n = arr.length, max = Arrays.stream(arr).max().getAsInt(); List<Integer>[] buckets = new List[n]; for (int i = 0; i < n; i++) buckets[i] = new ArrayList<>(); for (int x : arr) buckets[Math.min((int)(n*1.0*x/(max+1)), n-1)].add(x); List<Integer> res = new ArrayList<>(); for (List<Integer> b : buckets) { Collections.sort(b); res.addAll(b); } return res.stream().mapToInt(i->i).toArray(); }`,
  },
  dijkstra: {
    python: `import heapq
def dijkstra(graph, start):
    dist = {node: float('inf') for node in graph}
    dist[start] = 0; pq = [(0, start)]
    while pq:
        d, node = heapq.heappop(pq)
        if d > dist[node]: continue
        for neighbor, weight in graph[node]:
            nd = d + weight
            if nd < dist[neighbor]:
                dist[neighbor] = nd
                heapq.heappush(pq, (nd, neighbor))
    return dist`,
    javascript: `function dijkstra(graph, start) { const dist = {}; for (const n in graph) dist[n] = Infinity; dist[start] = 0; const pq = [[0,start]]; while (pq.length) { pq.sort((a,b)=>a[0]-b[0]); const [d,node] = pq.shift(); if (d > dist[node]) continue; for (const [nbr,w] of graph[node]) { const nd = d + w; if (nd < dist[nbr]) { dist[nbr] = nd; pq.push([nd,nbr]); } } } return dist; }`,
    cpp: `// Dijkstra with adjacency list + min-heap (priority_queue)`,
    java: `// Dijkstra with PriorityQueue<Pair>`,
  },
  bellman_ford: {
    python: `def bellman_ford(edges, n, start):
    dist = [float('inf')] * n; dist[start] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            return None  # negative cycle detected
    return dist`,
    javascript: `function bellmanFord(edges, n, start) { const dist = new Array(n).fill(Infinity); dist[start] = 0; for (let i = 0; i < n-1; i++) for (const [u,v,w] of edges) if (dist[u] !== Infinity && dist[u]+w < dist[v]) dist[v] = dist[u]+w; return dist; }`,
    cpp: `vector<int> bellmanFord(vector<tuple<int,int,int>>& edges, int n, int s) { vector<int> dist(n, INT_MAX); dist[s]=0; for (int i=0;i<n-1;i++) for (auto& [u,v,w] : edges) if (dist[u]!=INT_MAX && dist[u]+w<dist[v]) dist[v]=dist[u]+w; return dist; }`,
    java: `static int[] bellmanFord(List<int[]> edges, int n, int s) { int[] dist = new int[n]; Arrays.fill(dist, Integer.MAX_VALUE); dist[s]=0; for(int i=0;i<n-1;i++) for(int[] e:edges) if(dist[e[0]]!=Integer.MAX_VALUE && dist[e[0]]+e[2]<dist[e[1]]) dist[e[1]]=dist[e[0]]+e[2]; return dist; }`,
  },
  a_star: {
    python: `import heapq
def heuristic(a, b): return abs(a[0]-b[0]) + abs(a[1]-b[1])
def a_star(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    open_set = [(0, start)]; g_score = {start: 0}
    while open_set:
        _, cur = heapq.heappop(open_set)
        if cur == goal: return g_score[cur]
        for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
            nb = (cur[0]+dx, cur[1]+dy)
            if 0<=nb[0]<rows and 0<=nb[1]<cols:
                tg = g_score[cur] + 1
                if nb not in g_score or tg < g_score[nb]:
                    g_score[nb] = tg
                    heapq.heappush(open_set, (tg + heuristic(nb, goal), nb))
    return -1`,
    javascript: `function aStar(grid, start, goal) { const h=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]); const R=grid.length,C=grid[0].length; const open=[[0,start[0],start[1]]]; const g={}; g[start]=0; while(open.length){open.sort((a,b)=>a[0]-b[0]);const[,r,c]=open.shift();if(r===goal[0]&&c===goal[1])return g[[r,c]];for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<R&&nc>=0&&nc<C){const tg=(g[[r,c]]||0)+1,k=[nr,nc];if(tg<(g[k]??Infinity)){g[k]=tg;open.push([tg+h([nr,nc],goal),nr,nc]);}}}}return -1;}`,
    cpp: `# A* with Manhattan heuristic on grid`,
    java: `// A* pathfinding with priority queue`,
  },
  floyd: {
    python: `def floyd_warshall(graph):
    n = len(graph)
    dist = [row[:] for row in graph]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist`,
    javascript: `function floydWarshall(graph) { const n = graph.length; const dist = graph.map(r => [...r]); for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j]; return dist; }`,
    cpp: `vector<vector<int>> floydWarshall(vector<vector<int>> g) { int n=g.size(); for(int k=0;k<n;k++) for(int i=0;i<n;i++) for(int j=0;j<n;j++) if(g[i][k]+g[k][j]<g[i][j]) g[i][j]=g[i][k]+g[k][j]; return g; }`,
    java: `static int[][] floydWarshall(int[][] g) { int n=g.length; int[][] d=new int[n][n]; for(int i=0;i<n;i++)d[i]=g[i].clone(); for(int k=0;k<n;k++) for(int i=0;i<n;i++) for(int j=0;j<n;j++) if(d[i][k]+d[k][j]<d[i][j]) d[i][j]=d[i][k]+d[k][j]; return d; }`,
  },
  prim: {
    python: `import heapq
def prim(graph, n):
    visited = [False] * n; pq = [(0, 0, -1)]; mst = []
    while pq and len(mst) < n - 1:
        w, u, prev = heapq.heappop(pq)
        if visited[u]: continue
        visited[u] = True
        if prev != -1: mst.append((prev, u, w))
        for v, weight in graph[u]:
            if not visited[v]: heapq.heappush(pq, (weight, v, u))
    return mst`,
    javascript: `function prim(graph, n) { const vis=new Array(n).fill(false), pq=[[0,0,-1]], mst=[]; while(pq.length&&mst.length<n-1){pq.sort((a,b)=>a[0]-b[0]);const[w,u,p]=pq.shift();if(vis[u])continue;vis[u]=true;if(p!==-1)mst.push([p,u,w]);for(const[v,wt]of graph[u])if(!vis[v])pq.push([wt,v,u]);}return mst;}`,
    cpp: `# Prim with adjacency list + min-heap`,
    java: `// Prim with PriorityQueue`,
  },
  kruskal: {
    python: `def find(parent, x):
    if parent[x] != x: parent[x] = find(parent, parent[x])
    return parent[x]

def kruskal(edges, n):
    edges.sort(key=lambda x: x[2])
    parent = list(range(n)); mst = []
    for u, v, w in edges:
        pu, pv = find(parent, u), find(parent, v)
        if pu != pv: parent[pu] = pv; mst.append((u, v, w))
    return mst`,
    javascript: `function kruskal(edges, n) { edges.sort((a,b)=>a[2]-b[2]); const p=Array.from({length:n},(_,i)=>i); const find=x=>p[x]===x?x:p[x]=find(p[x]); const mst=[]; for(const[u,v,w]of edges){const pu=find(u),pv=find(v);if(pu!==pv){p[pu]=pv;mst.push([u,v,w]);}}return mst;}`,
    cpp: `# Kruskal with DSU`,
    java: `// Kruskal with Union-Find`,
  },
  topological_sort: {
    python: `from collections import deque
def topological_sort(n, edges):
    indegree = [0] * n; graph = [[] for _ in range(n)]
    for u, v in edges: graph[u].append(v); indegree[v] += 1
    q = deque([i for i in range(n) if indegree[i] == 0])
    result = []
    while q:
        u = q.popleft(); result.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0: q.append(v)
    return result`,
    javascript: `function topologicalSort(n, edges) { const indeg=new Array(n).fill(0), g=Array.from({length:n},()=>[]); for(const[u,v]of edges){g[u].push(v);indeg[v]++;} const q=[],res=[]; for(let i=0;i<n;i++)if(indeg[i]===0)q.push(i); while(q.length){const u=q.shift();res.push(u);for(const v of g[u])if(--indeg[v]===0)q.push(v);}return res;}`,
    cpp: `# Topological sort (Kahn)`,
    java: `// Kahn: indegree + BFS`,
  },
  array: {
    python: `# Array operations
arr = [1, 2, 3, 4, 5]
arr.append(6)          # O(1) amortized
arr.insert(0, 0)       # O(n) - shift elements
arr.pop()              # O(1)
arr[2] = 10            # O(1) random access`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  linked_list: {
    python: `class Node:
    def __init__(self, val):
        self.val = val; self.next = None

def traverse(head):
    cur = head
    while cur:
        print(cur.val, end=' -> ')
        cur = cur.next
    print('null')

def insert_head(head, val):
    node = Node(val); node.next = head
    return node`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  doubly_linked_list: {
    python: `class Node:
    def __init__(self, val):
        self.val = val; self.prev = None; self.next = None

def insert_after(node, val):
    new_node = Node(val)
    new_node.prev = node; new_node.next = node.next
    if node.next: node.next.prev = new_node
    node.next = new_node`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  stack: {
    python: `class Stack:
    def __init__(self):
        self.items = []
        
    def push(self, item):
        self.items.append(item)
        
    def pop(self):
        if not self.is_empty():
            return self.items.pop()
        return None
        
    def peek(self):
        if not self.is_empty():
            return self.items[-1]
        return None
        
    def is_empty(self):
        return len(self.items) == 0`,
    javascript: `class Stack {
    constructor() {
        this.items = [];
    }
    
    push(item) {
        this.items.push(item);
    }
    
    pop() {
        if (!this.isEmpty()) {
            return this.items.pop();
        }
        return null;
    }
    
    peek() {
        if (!this.isEmpty()) {
            return this.items[this.items.length - 1];
        }
        return null;
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
}`,
    cpp: `#include <vector>
#include <stdexcept>
using namespace std;

class Stack {
private:
    vector<int> items;
public:
    void push(int item) {
        items.push_back(item);
    }
    
    int pop() {
        if (!isEmpty()) {
            int val = items.back();
            items.pop_back();
            return val;
        }
        throw runtime_error("Stack is empty");
    }
    
    int peek() {
        if (!isEmpty()) {
            return items.back();
        }
        throw runtime_error("Stack is empty");
    }
    
    bool isEmpty() {
        return items.empty();
    }
};`,
    java: `import java.util.ArrayList;

public class Stack {
    private ArrayList<Integer> items = new ArrayList<>();
    
    public void push(int item) {
        items.add(item);
    }
    
    public int pop() {
        if (!isEmpty()) {
            return items.remove(items.size() - 1);
        }
        throw new IllegalStateException("Stack is empty");
    }
    
    public int peek() {
        if (!isEmpty()) {
            return items.get(items.size() - 1);
        }
        throw new IllegalStateException("Stack is empty");
    }
    
    public boolean isEmpty() {
        return items.isEmpty();
    }
}`,
  },
  queue: {
    python: `from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()
        
    def enqueue(self, item):
        self.items.append(item)
        
    def dequeue(self):
        if not self.is_empty():
            return self.items.popleft()
        return None
        
    def peek_front(self):
        if not self.is_empty():
            return self.items[0]
        return None
        
    def is_empty(self):
        return len(self.items) == 0`,
    javascript: `class Queue {
    constructor() {
        this.items = [];
    }
    
    enqueue(item) {
        this.items.push(item);
    }
    
    dequeue() {
        if (!this.isEmpty()) {
            return this.items.shift();
        }
        return null;
    }
    
    peekFront() {
        if (!this.isEmpty()) {
            return this.items[0];
        }
        return null;
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
}`,
    cpp: `#include <queue>
#include <stdexcept>
using namespace std;

class Queue {
private:
    queue<int> items;
public:
    void enqueue(int item) {
        items.push(item);
    }
    
    int dequeue() {
        if (!isEmpty()) {
            int val = items.front();
            items.pop();
            return val;
        }
        throw runtime_error("Queue is empty");
    }
    
    int peekFront() {
        if (!isEmpty()) {
            return items.front();
        }
        throw runtime_error("Queue is empty");
    }
    
    bool isEmpty() {
        return items.empty();
    }
};`,
    java: `import java.util.LinkedList;

public class QueueDemo {
    private java.util.Queue<Integer> items = new LinkedList<>();
    
    public void enqueue(int item) {
        items.offer(item);
    }
    
    public int dequeue() {
        if (!isEmpty()) {
            return items.poll();
        }
        throw new IllegalStateException("Queue is empty");
    }
    
    public int peekFront() {
        if (!isEmpty()) {
            return items.peek();
        }
        throw new IllegalStateException("Queue is empty");
    }
    
    public boolean isEmpty() {
        return items.isEmpty();
    }
}`,
  },
  binary_tree: {
    python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def inorder(root):
    if not root: return
    inorder(root.left); print(root.val, end=' '); inorder(root.right)

def preorder(root):
    if not root: return
    print(root.val, end=' '); preorder(root.left); preorder(root.right)

def postorder(root):
    if not root: return
    postorder(root.left); postorder(root.right); print(root.val, end=' ')`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  bst: {
    python: `class TreeNode:
    def __init__(self, val=0):
        self.val = val; self.left = None; self.right = None

def insert(root, val):
    if not root: return TreeNode(val)
    if val < root.val: root.left = insert(root.left, val)
    else: root.right = insert(root.right, val)
    return root

def search(root, val):
    if not root or root.val == val: return root
    return search(root.left, val) if val < root.val else search(root.right, val)`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  avl_tree: {
    python: `class Node:
    def __init__(self, val):
        self.val = val; self.left = None; self.right = None; self.height = 1

def height(n): return n.height if n else 0
def balance(n): return height(n.left) - height(n.right) if n else 0

def right_rotate(y):
    x = y.left; T2 = x.right
    x.right = y; y.left = T2
    y.height = 1 + max(height(y.left), height(y.right))
    x.height = 1 + max(height(x.left), height(x.right))
    return x

def left_rotate(x):
    y = x.right; T2 = y.left
    y.left = x; x.right = T2
    x.height = 1 + max(height(x.left), height(x.right))
    y.height = 1 + max(height(y.left), height(y.right))
    return y`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  red_black_tree: {
    python: `# Red-Black Tree - 5 invariants:
# 1) Nodes are RED or BLACK
# 2) Root is BLACK
# 3) Leaves (NIL) are BLACK
# 4) RED node's children must be BLACK
# 5) Every path from node to descendant leaves has same number of BLACK nodes
# Java: java.util.TreeMap is a Red-Black Tree`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  heap_ds: {
    python: `import heapq
# Min-Heap
heap = []
heapq.heappush(heap, 3)  # insert
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
print(heapq.heappop(heap))  # 1 (pop min)
print(heap[0])              # 2 (peek)

# Max-Heap (negate values)
max_heap = []
heapq.heappush(max_heap, -3)
print(-heapq.heappop(max_heap))  # 3`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  trie: {
    python: `class TrieNode:
    def __init__(self):
        self.children = {}; self.is_end = False

class Trie:
    def __init__(self): self.root = TrieNode()
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
            if ch not in node.children: return False
            node = node.children[ch]
        return node.is_end
    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children: return False
            node = node.children[ch]
        return True`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  union_find: {
    python: `class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n)); self.rank = [0] * n
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py: return
        if self.rank[px] < self.rank[py]: self.parent[px] = py
        elif self.rank[px] > self.rank[py]: self.parent[py] = px
        else: self.parent[py] = px; self.rank[px] += 1`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  hash_table: {
    python: `# Python dict = Hash Table
hash_map = {}
hash_map["key"] = "value"
print(hash_map.get("key"))          # "value"
print(hash_map.get("miss", "def"))  # "def"
# Custom: hash(key) % size`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  knapsack_01: {
    python: `def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i-1][w], dp[i-1][w-weights[i-1]] + values[i-1])
            else: dp[i][w] = dp[i-1][w]
    return dp[n][capacity]`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  unbounded_knapsack: {
    python: `def unbounded_knapsack(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for w in range(capacity + 1):
        for i in range(len(weights)):
            if weights[i] <= w:
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  lcs: {
    python: `def lcs(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  lis: {
    python: `def lis(nums):
    if not nums: return 0
    n = len(nums); dp = [1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  edit_distance: {
    python: `def edit_distance(word1, word2):
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
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  matrix_chain: {
    python: `def matrix_chain_order(dims):
    n = len(dims) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1; dp[i][j] = float('inf')
            for k in range(i, j):
                cost = dp[i][k] + dp[k+1][j] + dims[i]*dims[k+1]*dims[j+1]
                dp[i][j] = min(dp[i][j], cost)
    return dp[0][n-1]`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  interval_dp: {
    python: `def stone_merge(stones):
    n = len(stones)
    prefix = [0]
    for s in stones: prefix.append(prefix[-1] + s)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1; dp[i][j] = float('inf')
            total = prefix[j+1] - prefix[i]
            for k in range(i, j):
                dp[i][j] = min(dp[i][j], dp[i][k] + dp[k+1][j] + total)
    return dp[0][n-1]`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  backtracking: {
    python: `def backtrack(choices, path, result):
    if satisfied:          # terminal condition
        result.append(path[:]); return
    for choice in choices:
        if not valid(choice): continue
        path.append(choice)  # make choice
        backtrack(choices, path, result)
        path.pop()           # undo choice`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  n_queens: {
    python: `def solve_n_queens(n):
    board = [['.'] * n for _ in range(n)]; result = []
    def is_safe(row, col):
        for i in range(row):
            if board[i][col] == 'Q': return False
            d = row - i
            if col-d>=0 and board[i][col-d]=='Q': return False
            if col+d<n and board[i][col+d]=='Q': return False
        return True
    def solve(row):
        if row == n: result.append([''.join(r) for r in board]); return
        for col in range(n):
            if is_safe(row, col):
                board[row][col] = 'Q'; solve(row + 1); board[row][col] = '.'
    solve(0); return result`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  sudoku: {
    python: `def solve_sudoku(board):
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
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  kmp: {
    python: `def kmp_search(text, pattern):
    def build_lps(p):
        lps = [0] * len(p); length = 0; i = 1
        while i < len(p):
            if p[i] == p[length]: length += 1; lps[i] = length; i += 1
            elif length: length = lps[length - 1]
            else: lps[i] = 0; i += 1
        return lps
    lps = build_lps(pattern); i = j = 0
    while i < len(text):
        if text[i] == pattern[j]: i += 1; j += 1
        if j == len(pattern): return i - j
        elif i < len(text) and text[i] != pattern[j]:
            if j: j = lps[j - 1]
            else: i += 1
    return -1`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  manacher: {
    python: `def longest_palindrome(s):
    T = '#' + '#'.join(s) + '#'
    n = len(T); P = [0] * n; C = R = 0
    for i in range(n):
        mirror = 2 * C - i
        if i < R: P[i] = min(R - i, P[mirror])
        while i+P[i]+1<n and i-P[i]-1>=0 and T[i+P[i]+1]==T[i-P[i]-1]:
            P[i] += 1
        if i + P[i] > R: C, R = i, i + P[i]
    center = P.index(max(P))
    start = (center - max(P)) // 2
    return s[start:start + max(P)]`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  segment_tree: {
    python: `class SegmentTree:
    def __init__(self, arr):
        self.n = len(arr); self.tree = [0] * (4 * self.n)
        self.build(arr, 0, 0, self.n - 1)
    def build(self, arr, node, start, end):
        if start == end: self.tree[node] = arr[start]
        else:
            mid = (start + end) // 2
            self.build(arr, 2*node+1, start, mid)
            self.build(arr, 2*node+2, mid+1, end)
            self.tree[node] = self.tree[2*node+1] + self.tree[2*node+2]`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  fenwick_tree: {
    python: `class FenwickTree:
    def __init__(self, n):
        self.n = n; self.tree = [0] * (n + 1)
    def update(self, i, delta):
        i += 1
        while i <= self.n: self.tree[i] += delta; i += i & -i
    def query(self, i):
        s = 0; i += 1
        while i > 0: s += self.tree[i]; i -= i & -i
        return s
    def range_sum(self, l, r):
        return self.query(r) - self.query(l - 1)`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  monotonic_stack: {
    python: `def next_greater_element(nums):
    n = len(nums); result = [-1] * n; stack = []
    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            result[stack.pop()] = nums[i]
        stack.append(i)
    return result`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  sliding_window: {
    python: `def max_sum_subarray(arr, k):
    n = len(arr)
    if n < k: return -1
    window_sum = sum(arr[:k]); max_sum = window_sum
    for i in range(k, n):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  leetcode_hot100: {
    python: `# LeetCode Hot 100 - Two Sum
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen: return [seen[complement], i]
        seen[num] = i
    return []`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  acm_templates: {
    python: `# ACM Common Templates
MOD = 10**9 + 7

def pow_mod(a, b, mod=MOD):
    result = 1
    while b:
        if b & 1: result = result * a % mod
        a = a * a % mod; b >>= 1
    return result

def sieve(n):
    is_prime = [True] * (n + 1); primes = []
    for i in range(2, n + 1):
        if is_prime[i]:
            primes.append(i)
            for j in range(i * i, n + 1, i): is_prime[j] = False
    return primes`,
    javascript: `// JavaScript version: see Python implementation above`,
    cpp: `// C++ version: see Python implementation above`,
    java: `// Java version: see Python implementation above`,
  },
  linked_list_insert: {
    python: `def insert_after(prev_node, new_val):
    if prev_node is None: return
    new_node = ListNode(new_val)
    new_node.next = prev_node.next
    prev_node.next = new_node`,
    javascript: `function insertAfter(prevNode, newVal) {
    if (!prevNode) return;
    const newNode = new ListNode(newVal);
    newNode.next = prevNode.next;
    prevNode.next = newNode;
}`,
    cpp: `void insertAfter(ListNode* prevNode, int newVal) {
    if (!prevNode) return;
    ListNode* newNode = new ListNode(newVal);
    newNode->next = prevNode->next;
    prevNode->next = newNode;
}`,
    java: `public void insertAfter(ListNode prevNode, int newVal) {
    if (prevNode == null) return;
    ListNode newNode = new ListNode(newVal);
    newNode.next = prevNode.next;
    prevNode.next = newNode;
}`,
  },
  linked_list_delete: {
    python: `def delete_node(prev_node):
    if prev_node is None or prev_node.next is None: return
    target = prev_node.next
    prev_node.next = target.next`,
    javascript: `function deleteNode(prevNode) {
    if (!prevNode || !prevNode.next) return;
    const target = prevNode.next;
    prevNode.next = target.next;
}`,
    cpp: `void deleteNode(ListNode* prevNode) {
    if (!prevNode || !prevNode->next) return;
    ListNode* target = prevNode->next;
    prevNode->next = target->next;
    delete target;
}`,
    java: `public void deleteNode(ListNode prevNode) {
    if (prevNode == null || prevNode.next == null) return;
    ListNode target = prevNode.next;
    prevNode.next = target.next;
}`,
  },
  linked_list_search: {
    python: `def search_list(head, target):
    cur = head
    while cur is not None:
        if cur.value == target: return cur
        cur = cur.next
    return None`,
    javascript: `function searchList(head, target) {
    let cur = head;
    while (cur !== null) {
        if (cur.value === target) return cur;
        cur = cur.next;
    }
    return null;
}`,
    cpp: `ListNode* searchList(ListNode* head, int target) {
    ListNode* cur = head;
    while (cur != nullptr) {
        if (cur->value == target) return cur;
        cur = cur->next;
    }
    return nullptr;
}`,
    java: `public ListNode searchList(ListNode head, int target) {
    ListNode cur = head;
    while (cur != null) {
        if (cur.value == target) return cur;
        cur = cur.next;
    }
    return null;
}`,
  },
  bst_insert: {
    python: `def insert(root, val):
    if root is None:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root`,
    javascript: `function insert(root, val) {
    if (root === null) return new TreeNode(val);
    if (val < root.val) {
        root.left = insert(root.left, val);
    } else {
        root.right = insert(root.right, val);
    }
    return root;
}`,
    cpp: `TreeNode* insert(TreeNode* root, int val) {
    if (root == nullptr) return new TreeNode(val);
    if (val < root->val) root->left = insert(root->left, val);
    else root->right = insert(root->right, val);
    return root;
}`,
    java: `public TreeNode insert(TreeNode root, int val) {
    if (root == null) return new TreeNode(val);
    if (val < root.val) root.left = insert(root.left, val);
    else root.right = insert(root.right, val);
    return root;
}`,
  },
  bst_delete: {
    python: `def delete_node(root, key):
    if root is None: return root
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        if root.left is None: return root.right
        if root.right is None: return root.left
        temp = min_value_node(root.right)
        root.val = temp.val
        root.right = delete_node(root.right, temp.val)
    return root`,
    javascript: `function deleteNode(root, key) {
    if (root === null) return null;
    if (key < root.val) root.left = deleteNode(root.left, key);
    else if (key > root.val) root.right = deleteNode(root.right, key);
    else {
        if (root.left === null) return root.right;
        if (root.right === null) return root.left;
        let temp = minValueNode(root.right);
        root.val = temp.val;
        root.right = deleteNode(root.right, temp.val);
    }
    return root;
}`,
    cpp: `TreeNode* deleteNode(TreeNode* root, int key) {
    if (root == nullptr) return root;
    if (key < root->val) root->left = deleteNode(root->left, key);
    else if (key > root->val) root->right = deleteNode(root->right, key);
    else {
        if (root->left == nullptr) return root->right;
        if (root->right == nullptr) return root->left;
        TreeNode* temp = minValueNode(root->right);
        root->val = temp->val;
        root->right = deleteNode(root->right, temp->val);
    }
    return root;
}`,
    java: `public TreeNode deleteNode(TreeNode root, int key) {
    if (root == null) return null;
    if (key < root.val) root.left = deleteNode(root.left, key);
    else if (key > root.val) root.right = deleteNode(root.right, key);
    else {
        if (root.left == null) return root.right;
        if (root.right == null) return root.left;
        TreeNode temp = minValueNode(root.right);
        root.val = temp.val;
        root.right = deleteNode(root.right, temp.val);
    }
    return root;
}`,
  },
  bst_search: {
    python: `def search(root, key):
    if root is None or root.val == key: return root
    if key < root.val: return search(root.left, key)
    return search(root.right, key)`,
    javascript: `function search(root, key) {
    if (root === null || root.val === key) return root;
    if (key < root.val) return search(root.left, key);
    return search(root.right, key);
}`,
    cpp: `TreeNode* search(TreeNode* root, int key) {
    if (root == nullptr || root->val == key) return root;
    if (key < root->val) return search(root->left, key);
    return search(root->right, key);
}`,
    java: `public TreeNode search(TreeNode root, int key) {
    if (root == null || root.val == key) return root;
    if (key < root.val) root.left = search(root.left, key);
    else root.right = search(root.right, key);
    return root;
}`,
  },
  avl_insert: {
    python: `def insert(root, key):
    if not root: return TreeNode(key)
    if key < root.val: root.left = insert(root.left, key)
    else: root.right = insert(root.right, key)
    return balance(root)`,
    javascript: `function insert(root, key) {
    if (!root) return new TreeNode(key);
    if (key < root.val) root.left = insert(root.left, key);
    else root.right = insert(root.right, key);
    return balance(root);
}`,
    cpp: `TreeNode* insert(TreeNode* root, int key) {
    if (!root) return new TreeNode(key);
    if (key < root->val) root->left = insert(root->left, key);
    else root->right = insert(root->right, key);
    return balance(root);
}`,
    java: `public TreeNode insert(TreeNode root, int key) {
    if (root == null) return new TreeNode(key);
    if (key < root.val) root.left = insert(root.left, key);
    else root.right = insert(root.right, key);
    return balance(root);
}`,
  },
  binary_tree_traverse: {
    python: `def traverse(root):
    if root is None: return
    print(root.val)
    traverse(root.left)
    traverse(root.right)`,
    javascript: `function traverse(root) {
    if (root === null) return;
    console.log(root.val);
    traverse(root.left);
    traverse(root.right);
}`,
    cpp: `void traverse(TreeNode* root) {
    if (root == nullptr) return;
    cout << root->val << endl;
    traverse(root->left);
    traverse(root->right);
}`,
    java: `public void traverse(TreeNode root) {
    if (root == null) return;
    System.out.println(root.val);
    traverse(root.left);
    traverse(root.right);
}`,
  },
};

function getCodeTemplate(algoId: string, lang: CodeLang): string {
  const templates = CODE_TEMPLATES[algoId]
  if (templates && templates[lang]) return templates[lang]
  // Fallback: return Python code
  return templates?.python || `# ${lang} code template not available\n# Please write your own implementation`
}

function DefinitionCard({ def, lang, expanded, onToggle }: { def: AlgorithmDefinition; lang: 'zh' | 'en'; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-surface">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer border-none bg-transparent p-0"
      >
        <span>{lang === 'zh' ? '详细定义' : 'Definition'}</span>
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 text-[10px] text-slate-600 leading-relaxed">
          <p>{lang === 'zh' ? def.definition : def.definitionEn}</p>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '提出者：' : 'Inventor: '}</span>
            {def.inventor} ({def.year})
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '过程：' : 'Procedure:'}</span>
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              {(lang === 'zh' ? def.procedure : def.procedureEn).map((step, i) => (
                <li key={i} className="text-[10px]">{step}</li>
              ))}
            </ol>
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '复杂度详解' : 'Complexity Details'}</span>
            <p className="mt-0.5"><strong>{lang === 'zh' ? '时间：' : 'Time: '}</strong>{lang === 'zh' ? def.timeComplexity.explanation : def.timeComplexity.explanationEn}</p>
            <p className="mt-0.5"><strong>{lang === 'zh' ? '空间：' : 'Space: '}</strong>{lang === 'zh' ? def.spaceComplexity.explanation : def.spaceComplexity.explanationEn}</p>
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '特性：' : 'Properties: '}</span>
            <span>{lang === 'zh' ? `稳定=${def.properties.stable ? '是' : '否'} 原地=${def.properties.inPlace ? '是' : '否'} 自适应=${def.properties.adaptive ? '是' : '否'}` : `Stable=${def.properties.stable} In-place=${def.properties.inPlace} Adaptive=${def.properties.adaptive}`}</span>
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '适用场景：' : 'Use Cases: '}</span>
            {lang === 'zh' ? def.useCases : def.useCasesEn}
          </div>
        </div>
      )}
    </div>
  )
}

function getConcreteAlgoId(algoId: string, opId: string): string {
  if (algoId.startsWith('linked_list_') || algoId === 'doubly_linked_list' || algoId === 'linked_list') {
    return `linked_list_${opId}`
  }
  if (algoId.startsWith('bst_') || algoId === 'avl_tree' || algoId === 'red_black_tree' || algoId === 'bst' || algoId === 'avl_insert') {
    return `bst_${opId}`
  }
  return algoId
}

export default function Visualizer() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'

  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm)
  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)

  const [code, setCode] = useState('')
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'javascript' | 'cpp' | 'java'>(() => {
    return (localStorage.getItem('algoviz-editor-code-lang') as any) || 'python'
  })
  const [inputData, setInputData] = useState('[5, 3, 8, 1, 9, 2]')
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [aiError, setAiError] = useState('')
  const [aiRawResponse, setAiRawResponse] = useState('')
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [showDefinition, setShowDefinition] = useState(false)
  const [currentOperationId, setCurrentOperationId] = useState<string>('')
  const [operationParam, setOperationParam] = useState<string>('5')

  const operations = selectedAlgorithm ? getOperationsForAlgo(selectedAlgorithm.id) : undefined
  const hasOperations = operations && operations.length > 0

  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])
  const internalInputUpdate = useRef(false)
  const prevAlgoId = useRef<string | null>(null)

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
  const DEFAULT_INPUTS: Record<string, { value: string; hint: string }> = {
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
  }

  // Parse input data from text — returns the natural type for the algorithm
  const parsedInput = useCallback((): unknown => {
    try {
      const parsed = JSON.parse(inputData)
      // String type: KMP, Manacher, etc.
      if (typeof parsed === 'string' && selectedAlgorithm?.id) {
        return parsed
      }
      // Array of strings: LCS, edit_distance, KMP
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed
      }
      // Number: n-queens
      if (typeof parsed === 'number') {
        return parsed
      }
      // Object: graph, tree, etc.
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed
      }
      // Number array (default)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((v) => typeof v === 'number')) {
        return parsed
      }
    } catch { /* ignore */ }
    // Fallback to default for this algorithm
    const def = selectedAlgorithm?.id ? DEFAULT_INPUTS[selectedAlgorithm.id] : null
    if (def) {
      try { return JSON.parse(def.value) } catch { /* ignore */ }
    }
    return [5, 3, 8, 1, 9, 2]
  }, [inputData, selectedAlgorithm?.id])

  // Load preset or regenerate when algorithm or input changes
  useEffect(() => {
    // Skip regeneration when we're just syncing inputData back to textarea.
    if (internalInputUpdate.current) {
      internalInputUpdate.current = false
      return
    }

    if (!selectedAlgorithm) return
    setAiStatus('idle')
    setAiError('')
    setAiRawResponse('')

    // Set default input when switching to a different algorithm
    const algoChanged = prevAlgoId.current !== selectedAlgorithm.id
    if (algoChanged) {
      prevAlgoId.current = selectedAlgorithm.id
      
      // Determine initial sub-operation based on concrete algorithm operation
      let initialOp = ''
      if (selectedAlgorithm.id.endsWith('_insert') || selectedAlgorithm.id === 'avl_insert') {
        initialOp = 'insert'
      } else if (selectedAlgorithm.id.endsWith('_delete')) {
        initialOp = 'delete'
      } else if (selectedAlgorithm.id.endsWith('_search')) {
        initialOp = 'search'
      } else if (selectedAlgorithm.id === 'bfs_graph' || selectedAlgorithm.id === 'dfs_graph') {
        initialOp = 'search'
      }
      
      setCurrentOperationId(initialOp)
      const defInput = DEFAULT_INPUTS[selectedAlgorithm.id]
      if (defInput) {
        setInputData(defInput.value)
      }
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
          const op = operations?.find(o => o.id === currentOperationId)
          if (op) {
            setCode(op.code[codeLanguage] || op.code.python || '')
          }
          return
        }
      }

      // Fallback to static op script if no dynamic generator
      const op = operations?.find(o => o.id === currentOperationId)
      if (op) {
        setAnimationScript(op.script)
        setCode(op.code[codeLanguage] || op.code.python || '')
        return
      }
    }

    setCode(getCodeTemplate(selectedAlgorithm.id, codeLanguage))

    if (selectedAlgorithm.hasPreset) {
      // Try generator first (dynamic, responds to input changes)
      if (hasGenerator(selectedAlgorithm.id)) {
        // Use default input directly when algorithm just changed (before inputData state updates)
        const data = algoChanged && DEFAULT_INPUTS[selectedAlgorithm.id]
          ? JSON.parse(DEFAULT_INPUTS[selectedAlgorithm.id].value)
          : parsedInput()
        const script = generatePreset(selectedAlgorithm.id, data)
        if (script) {
          setAnimationScript(script)
          // Sync input textarea: only for number arrays (sorting etc.), not for string/graph/tree inputs
          if (Array.isArray(data) && data.every(v => typeof v === 'number') && script.initialState.data.length > 0) {
            const newVal = JSON.stringify(script.initialState.data)
            if (newVal !== inputData) {
              internalInputUpdate.current = true
              setInputData(newVal)
            }
          } else if (script.initialState.nodes && !Array.isArray(data)) {
            const newVal = JSON.stringify({ nodes: script.initialState.nodes.length, edges: script.initialState.edges?.length })
            if (newVal !== inputData) {
              internalInputUpdate.current = true
              setInputData(newVal)
            }
          }
          return
        }
      }
      // Fallback to static preset
      const preset = getPreset(selectedAlgorithm.id)
      if (preset) {
        setAnimationScript(preset)
        // Sync input display
        if (preset.initialState.data.length > 0) {
          const newVal = JSON.stringify(preset.initialState.data)
          if (newVal !== inputData) {
            internalInputUpdate.current = true
            setInputData(newVal)
          }
        } else if (preset.initialState.nodes) {
          const newVal = JSON.stringify({ nodes: preset.initialState.nodes.length, edges: preset.initialState.edges?.length })
          if (newVal !== inputData) {
            internalInputUpdate.current = true
            setInputData(newVal)
          }
        }
        return
      }
    }
    setAnimationScript(null)
  }, [selectedAlgorithm, inputData, operationParam, setAnimationScript, parsedInput, codeLanguage, currentOperationId, operations])

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

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const handleAIAnalyze = async () => {
    if (!hasApiConfig) {
      setAiError(t('controls.aiConfigureHint'))
      setAiStatus('error')
      return
    }

    setAiStatus('analyzing')
    setAiError('')
    setAiRawResponse('')

    const result: AIResult = await analyzeCode({
      code,
      language: codeLanguage,
      inputData,
      algorithmName: selectedAlgorithm?.name,
    })

    if (result.success && result.script) {
      setAiStatus('success')
      setAnimationScript(result.script)
      loadScript(result.script)
    } else {
      setAiStatus('error')
      setAiError(result.error || t('common.error'))
      setAiRawResponse(result.rawResponse || '')
    }
  }

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

  const steps = animationScript?.steps ?? []
  const complexity = animationScript?.complexity
  const isSceneEngineActive = usesSceneEngine(animationScript)
  const sceneEventStats = getSceneEventStats(animationScript)
  const sceneDiagnosticSummary = getSceneDiagnosticSummary(animationScript)

  return (
    <div className="h-full flex flex-col">
      {/* Three-column layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Left: Code Editor (35%) */}
        <div className="xl:w-[35%] h-[42%] xl:h-auto border-b xl:border-b-0 xl:border-r border-border flex flex-col bg-white min-w-0 min-h-0">
          <CodeEditorPanel
            value={code}
            language={codeLanguage}
            onChange={setCode}
            onMount={handleEditorMount}
            disabled={aiStatus === 'analyzing'}
            title={selectedAlgorithm.name}
            className="flex-1"
            rightSlot={
              <>
              {/* Language selector */}
              <select
                value={codeLanguage}
                onChange={(e) => {
                  const lang = e.target.value as 'python' | 'javascript' | 'cpp' | 'java'
                  setCodeLanguage(lang)
                  localStorage.setItem('algoviz-editor-code-lang', lang)
                  if (currentOperationId) {
                    const op = operations?.find((o) => o.id === currentOperationId)
                    if (op) {
                      setCode(op.code[lang] || op.code.python || '')
                    }
                  } else {
                    setCode(getCodeTemplate(selectedAlgorithm.id, lang))
                  }
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
          {hasOperations ? (
            <div className="flex flex-col gap-2 shrink-0">
              <InputDataPanel
                value={inputData}
                onChange={setInputData}
                title={lang === 'zh' ? '原始数据 (初始结构)' : 'Original Data (Initial Structure)'}
                helperText={lang === 'zh' ? '用于构建初始数据结构的数组' : 'Initial elements for building the data structure'}
                placeholder="[8, 3, 10, 1, 6, 14]"
                disabled={aiStatus === 'analyzing'}
                className="h-24 xl:h-28"
              />
              <InputDataPanel
                value={operationParam}
                onChange={setOperationParam}
                title={(() => {
                  if (currentOperationId === 'insert') return lang === 'zh' ? '操作输入 (插入节点的值)' : 'Operation Parameter (Value to Insert)'
                  if (currentOperationId === 'delete') return lang === 'zh' ? '操作输入 (删除节点的值)' : 'Operation Parameter (Value to Delete)'
                  return lang === 'zh' ? '操作输入 (查找节点的值)' : 'Operation Parameter (Value to Search)'
                })()}
                helperText={lang === 'zh' ? '输入一个具体的数值' : 'Enter a specific numeric value'}
                placeholder="5"
                disabled={aiStatus === 'analyzing'}
                className="h-20 xl:h-24"
              />
            </div>
          ) : (
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
                const def = selectedAlgorithm?.id ? DEFAULT_INPUTS[selectedAlgorithm.id] : null
                return def?.value ?? '[5, 3, 8, 1, 9, 2]'
              })()}
              disabled={aiStatus === 'analyzing'}
              className="h-28 xl:h-32"
            />
          )}
          {/* Output result */}
          {currentStep >= totalSteps && totalSteps > 0 && visualState.arrayData.length > 0 && (
            <div className="h-20 border-t border-border bg-green-50 p-2.5 shrink-0">
              <div className="text-xs font-semibold text-green-700 mb-1">
                {lang === 'zh' ? '输出结果' : 'Output'}
              </div>
              <div className="text-xs font-code text-green-600 leading-relaxed break-all overflow-auto max-h-12">
                [{visualState.arrayData.join(', ')}]
              </div>
            </div>
          )}
        </div>

        {/* Center: Canvas (45%) */}
        <div className="flex-1 xl:w-[45%] xl:flex-none border-b xl:border-b-0 xl:border-r border-border min-w-0 min-h-0 flex flex-col">
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
            />
          </div>
        </div>

        {/* Right: Info Panel (20%) */}
        <div className="xl:w-[20%] h-44 xl:h-auto flex flex-col bg-white min-w-0 shrink-0">
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
                <div className="flex items-center gap-2 mb-1">
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
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Render Engine</h4>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSceneEngineActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {isSceneEngineActive ? 'Scene Engine' : 'Classic Renderer'}
                </span>
                {animationScript?.presentation?.module && (
                  <span className="text-[10px] font-code text-slate-400">{animationScript.presentation.module}</span>
                )}
              </div>
              {isSceneEngineActive && (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-slate-400">event steps</div>
                      <div className="font-code font-semibold text-slate-700">{sceneEventStats.eventSteps}</div>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-slate-400">events</div>
                      <div className="font-code font-semibold text-slate-700">{sceneEventStats.totalEvents}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <span className={`rounded-full px-2 py-0.5 ${sceneDiagnosticSummary.errors > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      errors {sceneDiagnosticSummary.errors}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 ${sceneDiagnosticSummary.warnings > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                      warnings {sceneDiagnosticSummary.warnings}
                    </span>
                  </div>
                  {sceneDiagnosticSummary.diagnostics.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {sceneDiagnosticSummary.diagnostics.slice(0, 2).map((diagnostic) => (
                        <div key={`${diagnostic.stepId}-${diagnostic.eventIndex}-${diagnostic.message}`} className="rounded-lg bg-red-50 px-2 py-1 text-[10px] text-red-600">
                          Step {diagnostic.stepId}: {diagnostic.message}
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
