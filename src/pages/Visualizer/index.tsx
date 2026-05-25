import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAlgorithmStore } from '@/store/algorithmStore'
import { getPreset, generatePreset, hasGenerator } from '@/presets'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { analyzeCode, getApiConfig, type AIResult } from '@/ai'
import { ALGORITHM_DEFS, type AlgorithmDefinition } from '@/data/algorithmDefs'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'

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

const CODE_TEMPLATES: Record<string, Record<CodeLang, string>> = {
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
}

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
          <div className="border-t border-border pt-2 text-[9px] text-slate-400 italic">
            {lang === 'zh' ? '参考文献：' : 'Reference: '}{def.reference}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Visualizer() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'

  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm)
  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)

  const [code, setCode] = useState('')
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'javascript' | 'cpp' | 'java'>('python')
  const [inputData, setInputData] = useState('[5, 3, 8, 1, 9, 2]')
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [aiError, setAiError] = useState('')
  const [aiRawResponse, setAiRawResponse] = useState('')
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [showDefinition, setShowDefinition] = useState(false)

  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])

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

  // Parse input data from text
  const parsedInput = useCallback((): number[] => {
    try {
      const parsed = JSON.parse(inputData)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((v) => typeof v === 'number')) {
        return parsed
      }
    } catch { /* ignore */ }
    return [5, 3, 8, 1, 9, 2]
  }, [inputData])

  // Load preset or regenerate when algorithm or input changes
  useEffect(() => {
    if (!selectedAlgorithm) return
    const lang = selectedAlgorithm.defaultLanguage as 'python' | 'javascript' | 'cpp' | 'java'
    setCodeLanguage(lang)
    setCode(getCodeTemplate(selectedAlgorithm.id, lang))
    setAiStatus('idle')
    setAiError('')
    setAiRawResponse('')

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
        if (inputData === '[5, 3, 8, 1, 9, 2]') {
          setInputData(JSON.stringify(preset.initialState.data))
        }
        return
      }
    }
    setAnimationScript(null)
  }, [selectedAlgorithm, inputData, setAnimationScript, parsedInput])

  // Update Monaco editor decorations based on current step
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !animationScript) return

    const steps = animationScript.steps
    const currentCodeLine = steps[currentStep - 1]?.codeLine ?? -1

    const newDecorations: Parameters<typeof editor.deltaDecorations>[1] = []

    // Visited lines (before current)
    const visitedLines = new Set<number>()
    for (let i = 0; i < currentStep - 1; i++) {
      visitedLines.add(steps[i].codeLine)
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
      language: selectedAlgorithm?.defaultLanguage || 'python',
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

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const steps = animationScript?.steps ?? []
  const complexity = animationScript?.complexity

  return (
    <div className="h-full flex flex-col">
      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code Editor (35%) */}
        <div className="w-[35%] border-r border-border flex flex-col bg-white min-w-0">
          <div className="h-9 border-b border-border flex items-center justify-between px-3 bg-surface shrink-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Icon name="code2" size={14} />
              {selectedAlgorithm.name}
            </span>
            <div className="flex items-center gap-2">
              {/* Language selector */}
              <select
                value={codeLanguage}
                onChange={(e) => {
                  const lang = e.target.value as 'python' | 'javascript' | 'cpp' | 'java'
                  setCodeLanguage(lang)
                  setCode(getCodeTemplate(selectedAlgorithm.id, lang))
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
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={codeLanguage === 'cpp' ? 'cpp' : codeLanguage === 'javascript' ? 'javascript' : codeLanguage === 'java' ? 'java' : 'python'}
              value={code}
              onChange={(val) => setCode(val ?? '')}
              onMount={handleEditorMount}
              theme="light"
              options={{
                fontSize: 13,
                fontFamily: 'var(--font-code)',
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 8 },
                glyphMargin: true,
                folding: false,
                lineDecorationsWidth: 4,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'none',
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>
          <div className="h-32 border-t border-border bg-surface p-3 shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-1.5">
              {t('visualizer.inputData')}
            </div>
            <textarea
              className="w-full h-[calc(100%-1.5rem)] resize-none rounded-md border border-border
                         bg-white p-2 text-sm font-code outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary-200 transition-colors"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="[5, 3, 8, 1, 9, 2]"
              disabled={aiStatus === 'analyzing'}
            />
          </div>
        </div>

        {/* Center: Canvas (45%) */}
        <div className="w-[45%] border-r border-border min-w-0">
          <VisualizationCanvas
            script={animationScript}
            visualState={visualState}
            currentStepData={currentStepData}
          />
        </div>

        {/* Right: Info Panel (20%) */}
        <div className="w-[20%] flex flex-col bg-white min-w-0">
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
      <div className="h-14 border-t border-border bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button className="control-btn" onClick={reset} title={t('controls.reset')}>
            <Icon name="rotate-ccw" size={18} />
          </button>
          <button className="control-btn" onClick={stepBackward} title={t('controls.prevStep')}>
            <Icon name="chevron-left" size={18} />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white
                       hover:bg-primary-700 transition-colors cursor-pointer border-none"
            onClick={togglePlay}
            title={isPlaying ? t('controls.pause') : t('controls.play')}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
          </button>
          <button className="control-btn" onClick={stepForward} title={t('controls.nextStep')}>
            <Icon name="chevron-right" size={18} />
          </button>
          <button className="control-btn" onClick={goToEnd} title={t('controls.end')}>
            <Icon name="fast-forward" size={18} />
          </button>

          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* AI Analysis Button */}
          <button
            onClick={handleAIAnalyze}
            disabled={aiStatus === 'analyzing' || !hasApiConfig}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium
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
            {t('controls.aiAnalyze')}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-code w-[72px] text-right">
            {currentStep} / {totalSteps}
          </span>
          <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">
            {t('controls.speed')}
          </span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-20 h-1 accent-primary cursor-pointer"
          />
          <span className="text-xs font-code text-slate-500 w-8 text-right">
            {speed}x
          </span>
        </div>
      </div>

      <style>{`
        .control-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s;
        }
        .control-btn:hover {
          background: #F1F5F9;
          color: #1E293B;
        }
        .control-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: transparent;
        }
        .active-line {
          background: rgba(245, 158, 11, 0.15) !important;
          border-left: 3px solid #F59E0B;
        }
        .visited-line {
          background: rgba(37, 99, 235, 0.06) !important;
          border-left: 3px solid #93C5FD;
        }
        .active-glyph {
          background: #F59E0B;
          width: 4px !important;
          margin-left: 3px;
        }
        .visited-glyph {
          background: #93C5FD;
          width: 4px !important;
          margin-left: 3px;
        }
        @keyframes pulse-glow {
          from { opacity: 0.8; r: 1; }
          to { opacity: 0.1; r: 1.2; }
        }
      `}</style>
    </div>
  )
}
