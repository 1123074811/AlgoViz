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
  {
    id: 'bubble_sort',
    name: '冒泡排序',
    nameEn: 'Bubble Sort',
    category: 'sorting',
    difficulty: 'easy',
    hasPreset: true,
    defaultLanguage: 'python',
    defaultCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
  },
  {
    id: 'selection_sort',
    name: '选择排序',
    nameEn: 'Selection Sort',
    category: 'sorting',
    difficulty: 'easy',
    hasPreset: true,
    defaultLanguage: 'python',
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
    id: 'insertion_sort',
    name: '插入排序',
    nameEn: 'Insertion Sort',
    category: 'sorting',
    difficulty: 'easy',
    hasPreset: true,
    defaultLanguage: 'python',
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
    id: 'merge_sort',
    name: '归并排序',
    nameEn: 'Merge Sort',
    category: 'sorting',
    difficulty: 'medium',
    hasPreset: true,
    defaultLanguage: 'python',
    defaultCode: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result`,
  },
  {
    id: 'quick_sort',
    name: '快速排序',
    nameEn: 'Quick Sort',
    category: 'sorting',
    difficulty: 'medium',
    hasPreset: true,
    defaultLanguage: 'python',
    defaultCode: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    left = [x for x in arr[1:] if x <= pivot]
    right = [x for x in arr[1:] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)`,
  },
  {
    id: 'binary_search',
    name: '二分查找',
    nameEn: 'Binary Search',
    category: 'search-backtrack',
    difficulty: 'easy',
    hasPreset: true,
    defaultLanguage: 'python',
    defaultCode: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
  },
  {
    id: 'bfs_graph',
    name: '广度优先搜索',
    nameEn: 'BFS (Graph)',
    category: 'graph',
    difficulty: 'medium',
    hasPreset: true,
    defaultLanguage: 'python',
    defaultCode: `def bfs(graph, start):
    visited = set()
    queue = [start]
    visited.add(start)
    while queue:
        node = queue.pop(0)
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return visited`,
  },
  {
    id: 'dfs_graph',
    name: '深度优先搜索',
    nameEn: 'DFS (Graph)',
    category: 'graph',
    difficulty: 'medium',
    hasPreset: true,
    defaultLanguage: 'python',
    defaultCode: `def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    return visited`,
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
