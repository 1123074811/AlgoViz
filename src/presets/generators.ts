import type { AnimationScript, AnimationStep } from '@/types/animation'

function makeStep(
  id: number, codeLine: number, zh: string, en: string,
  type: AnimationStep['action']['type'], targets: number[],
  color: AnimationStep['action']['color'], comps: number, swaps: number, accs: number,
): AnimationStep {
  return { stepId: id, codeLine, description: { zh, en }, action: { type, targets, color }, stats: { comparisons: comps, swaps, accesses: accs } }
}

// ============ Bubble Sort Generator ============
export function generateBubbleSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push(makeStep(sid++, 3, `比较 arr[${j}]=${data[j]} 和 arr[${j + 1}]=${data[j + 1]}`, `Compare arr[${j}]=${data[j]} and arr[${j + 1}]=${data[j + 1]}`, 'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2))
      if (data[j] > data[j + 1]) {
        steps.push(makeStep(sid++, 4, `${data[j]} > ${data[j + 1]}，交换`, `${data[j]} > ${data[j + 1]}, swap`, 'swap', [j, j + 1], 'danger', comps, sw, acc))
        ;[data[j], data[j + 1]] = [data[j + 1], data[j]]; sw++; acc += 2
        steps.push(makeStep(sid++, 5, `交换后: [${data.join(', ')}]`, `After swap: [${data.join(', ')}]`, 'highlight', [j, j + 1], 'success', comps, sw, acc))
      } else {
        steps.push(makeStep(sid++, 4, `${data[j]} ≤ ${data[j + 1]}，不交换`, `${data[j]} ≤ ${data[j + 1]}, no swap`, 'highlight', [j, j + 1], 'muted', comps, sw, acc))
      }
    }
    steps.push(makeStep(sid++, 7, `第 ${i + 1} 轮结束，arr[${n - 1 - i}]=${data[n - 1 - i]} 已就位`, `Pass ${i + 1} done, arr[${n - 1 - i}]=${data[n - 1 - i]} sorted`, 'mark', [n - 1 - i], 'muted', comps, sw, acc += 1))
  }
  steps.push(makeStep(sid++, 8, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', comps, sw, acc))

  return { algorithm: 'bubble_sort', complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Selection Sort Generator ============
export function generateSelectionSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let i = 0; i < n; i++) {
    let minIdx = i
    steps.push(makeStep(sid++, 2, `第 ${i + 1} 轮：假设 arr[${i}]=${data[i]} 为最小值`, `Pass ${i + 1}: assume arr[${i}]=${data[i]} is min`, 'highlight', [i], 'warning', comps, sw, acc += 1))
    for (let j = i + 1; j < n; j++) {
      steps.push(makeStep(sid++, 4, `比较 arr[${j}]=${data[j]} < min=${data[minIdx]}？`, `Compare arr[${j}]=${data[j]} < min=${data[minIdx]}?`, 'compare', [minIdx, j], 'warning', ++comps, sw, acc += 2))
      if (data[j] < data[minIdx]) {
        minIdx = j
        steps.push(makeStep(sid++, 5, `更新最小值：arr[${j}]=${data[j]}`, `New min: arr[${j}]=${data[j]}`, 'highlight', [j], 'danger', comps, sw, acc += 1))
      }
    }
    if (minIdx !== i) {
      steps.push(makeStep(sid++, 6, `交换 arr[${i}]=${data[i]} ↔ arr[${minIdx}]=${data[minIdx]}`, `Swap arr[${i}]=${data[i]} ↔ arr[${minIdx}]=${data[minIdx]}`, 'swap', [i, minIdx], 'danger', comps, sw, acc))
      ;[data[i], data[minIdx]] = [data[minIdx], data[i]]; sw++; acc += 2
    }
    steps.push(makeStep(sid++, 7, `索引 ${i} 已就位（值=${data[i]}）`, `Index ${i} sorted (val=${data[i]})`, 'mark', [i], 'muted', comps, sw, acc))
  }
  steps.push(makeStep(sid++, 8, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', comps, sw, acc))

  return { algorithm: 'selection_sort', complexity: { time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Insertion Sort Generator ============
export function generateInsertionSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  steps.push(makeStep(sid++, 1, `已排序: arr[0]=${data[0]}`, `Sorted: arr[0]=${data[0]}`, 'mark', [0], 'success', comps, sw, acc += 1))
  for (let i = 1; i < n; i++) {
    const key = data[i]
    steps.push(makeStep(sid++, 2, `取出 key=arr[${i}]=${key}`, `Take key=arr[${i}]=${key}`, 'highlight', [i], 'warning', comps, sw, acc += 1))
    let j = i - 1
    while (j >= 0) {
      steps.push(makeStep(sid++, 4, `比较 key=${key} < arr[${j}]=${data[j]}？`, `Compare key=${key} < arr[${j}]=${data[j]}?`, 'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2))
      if (data[j] > key) {
        steps.push(makeStep(sid++, 5, `${data[j]} > ${key}，将 ${data[j]} 右移一位`, `${data[j]} > ${key}, shift ${data[j]} right`, 'swap', [j, j + 1], 'danger', comps, sw, acc))
        data[j + 1] = data[j]; sw++; acc += 1
        j--
      } else {
        break
      }
    }
    data[j + 1] = key
    steps.push(makeStep(sid++, 7, `插入 ${key} 到索引 ${j + 1}`, `Insert ${key} at index ${j + 1}`, 'mark', [j + 1], 'success', comps, sw, acc += 1))
    // Mark sorted range
    const sortedRange = Array.from({ length: i + 1 }, (_, k) => k)
    steps.push(makeStep(sid++, 7, `已排序区域: [${sortedRange.map(k => data[k]).join(', ')}]`, `Sorted range: [${sortedRange.map(k => data[k]).join(', ')}]`, 'highlight', sortedRange, 'success', comps, sw, acc))
  }
  steps.push(makeStep(sid++, 8, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', comps, sw, acc))

  return { algorithm: 'insertion_sort', complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Quick Sort Generator ============
export function generateQuickSort(arr: number[]): AnimationScript {
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1

  function quickSort(data: number[], start: number, end: number) {
    if (start >= end || data.length <= 1) return
    const pivot = data[start]
    steps.push(makeStep(sid++, 2, `选取 pivot=arr[${start}]=${pivot}`, `Select pivot=arr[${start}]=${pivot}`, 'highlight', [start], 'warning', comps, 0, 0))

    const left: number[] = [], right: number[] = []
    for (let i = start + 1; i <= end; i++) {
      steps.push(makeStep(sid++, 3, `扫描 arr[${i}]=${data[i]} ${data[i] <= pivot ? '≤' : '>'} pivot=${pivot}`, `Scan arr[${i}]=${data[i]} ${data[i] <= pivot ? '<=' : '>'} pivot=${pivot}`, 'compare', [start, i], data[i] <= pivot ? 'success' : 'muted', ++comps, 0, 0))
      if (data[i] <= pivot) left.push(data[i])
      else right.push(data[i])
    }

    const merged = [...left, pivot, ...right]
    steps.push(makeStep(sid++, 4, `分区: 左边[${left.join(',')}] pivot=${pivot} 右边[${right.join(',')}]`, `Partition: left[${left.join(',')}] pivot=${pivot} right[${right.join(',')}]`, 'highlight', [start, ...Array.from({ length: end - start + 1 }, (_, k) => start + k)], 'primary', comps, 0, 0))
    for (let k = start; k <= end; k++) data[k] = merged[k - start]

    const pivotPos = start + left.length
    steps.push(makeStep(sid++, 5, `pivot=${pivot} 归位到索引 ${pivotPos}`, `pivot=${pivot} placed at index ${pivotPos}`, 'mark', [pivotPos], 'muted', comps, 0, 0))
    quickSort(data, start, pivotPos - 1)
    quickSort(data, pivotPos + 1, end)
  }

  const data = [...arr]
  quickSort(data, 0, data.length - 1)
  steps.push(makeStep(sid++, 6, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', comps, 0, 0))

  return { algorithm: 'quick_sort', complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' }, space: 'O(log n)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Heap Sort Generator ============
export function generateHeapSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1

  function heapify(n: number, i: number) {
    let largest = i
    const l = 2 * i + 1, r = 2 * i + 2
    if (l < n) {
      steps.push(makeStep(sid++, 4, `比较 arr[${largest}]=${data[largest]} < arr[${l}]=${data[l]}？`, `Compare arr[${largest}]=${data[largest]} < arr[${l}]=${data[l]}?`, 'compare', [largest, l], 'warning', ++comps, 0, 0))
      if (data[l] > data[largest]) largest = l
    }
    if (r < n) {
      steps.push(makeStep(sid++, 4, `比较 arr[${largest}]=${data[largest]} < arr[${r}]=${data[r]}？`, `Compare arr[${largest}]=${data[largest]} < arr[${r}]=${data[r]}?`, 'compare', [largest, r], 'warning', ++comps, 0, 0))
      if (data[r] > data[largest]) largest = r
    }
    if (largest !== i) {
      steps.push(makeStep(sid++, 5, `交换 arr[${i}]=${data[i]} ↔ arr[${largest}]=${data[largest]}`, `Swap arr[${i}]=${data[i]} ↔ arr[${largest}]=${data[largest]}`, 'swap', [i, largest], 'danger', comps, 0, 0))
      ;[data[i], data[largest]] = [data[largest], data[i]]
      heapify(n, largest)
    }
  }

  const n = data.length
  steps.push(makeStep(sid++, 1, `建堆：从最后一个非叶节点开始`, `Build heap from last non-leaf`, 'highlight', [n - 1], 'primary', comps, 0, 0))
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i)
  }
  steps.push(makeStep(sid++, 2, `最大堆构建完成，堆顶=${data[0]}`, `Max-heap built, top=${data[0]}`, 'highlight', [0], 'success', comps, 0, 0))

  for (let i = n - 1; i > 0; i--) {
    steps.push(makeStep(sid++, 3, `交换堆顶 arr[0]=${data[0]} ↔ arr[${i}]=${data[i]}`, `Swap top arr[0]=${data[0]} ↔ arr[${i}]=${data[i]}`, 'swap', [0, i], 'danger', comps, 0, 0))
    ;[data[0], data[i]] = [data[i], data[0]]
    steps.push(makeStep(sid++, 7, `arr[${i}]=${data[i]} 已就位`, `arr[${i}]=${data[i]} sorted`, 'mark', [i], 'muted', comps, 0, 0))
    heapify(i, 0)
  }
  steps.push(makeStep(sid++, 8, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', comps, 0, 0))

  return { algorithm: 'heap_sort', complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Shell Sort Generator (using real swaps) ============
export function generateShellSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    steps.push(makeStep(sid++, 2, `gap=${gap}：按间隔 ${gap} 进行排序`, `gap=${gap}: sort with gap ${gap}`, 'highlight', [0, gap], 'primary', comps, sw, acc))
    for (let i = gap; i < n; i++) {
      for (let j = i; j >= gap; j -= gap) {
        steps.push(makeStep(sid++, 4, `比较 arr[${j - gap}]=${data[j - gap]} > arr[${j}]=${data[j]}？`, `Compare arr[${j - gap}]=${data[j - gap]} > arr[${j}]=${data[j]}?`, 'compare', [j - gap, j], 'warning', ++comps, sw, acc += 2))
        if (data[j - gap] > data[j]) {
          steps.push(makeStep(sid++, 5, `${data[j - gap]} > ${data[j]}，交换`, `${data[j - gap]} > ${data[j]}, swap`, 'swap', [j - gap, j], 'danger', comps, sw, acc))
          ;[data[j - gap], data[j]] = [data[j], data[j - gap]]
          sw++; acc += 2
        } else {
          steps.push(makeStep(sid++, 5, `${data[j - gap]} ≤ ${data[j]}，不交换`, `${data[j - gap]} ≤ ${data[j]}, no swap`, 'highlight', [j - gap, j], 'success', comps, sw, acc))
          break
        }
      }
    }
  }
  steps.push(makeStep(sid++, 8, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', comps, sw, acc))

  return { algorithm: 'shell_sort', complexity: { time: { best: 'O(n log n)', average: 'O(n^{1.3})', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Counting Sort Generator ============
export function generateCountingSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let acc = 0, sid = 1
  const n = data.length
  if (n === 0) return { algorithm: 'counting_sort', complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' }, space: 'O(k)' }, initialState: { type: 'array', data: [...arr] }, steps: [] }

  const maxVal = Math.max(...data)
  const count = new Array(maxVal + 1).fill(0)

  steps.push(makeStep(sid++, 2, `max=${maxVal}，创建计数数组 count[0..${maxVal}]`, `max=${maxVal}, create count array [0..${maxVal}]`, 'highlight', [], 'primary', 0, 0, acc))
  for (const num of data) {
    count[num]++
    steps.push(makeStep(sid++, 3, `count[${num}]++ → ${count[num]}`, `count[${num}]++ → ${count[num]}`, 'mark', [num], 'warning', 0, 0, acc += 1))
  }

  let idx = 0
  for (let v = 0; v <= maxVal; v++) {
    while (count[v]-- > 0) {
      data[idx] = v
      steps.push(makeStep(sid++, 5, `输出 ${v} 到位置 ${idx}`, `Output ${v} to position ${idx}`, 'highlight', [idx], 'success', 0, 0, acc += 1))
      idx++
    }
  }
  steps.push(makeStep(sid++, 6, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', 0, 0, acc))

  return { algorithm: 'counting_sort', complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' }, space: 'O(k)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Merge Sort Generator ============
export function generateMergeSort(arr: number[]): AnimationScript {
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1
  const original = [...arr]

  function merge(data: number[], start: number, mid: number, end: number) {
    const left = data.slice(start, mid + 1)
    const right = data.slice(mid + 1, end + 1)
    let i = 0, j = 0, k = start

    steps.push(makeStep(sid++, 12, `合并 [${left.join(',')}] 和 [${right.join(',')}]`, `Merge [${left.join(',')}] and [${right.join(',')}]`, 'highlight', Array.from({ length: end - start + 1 }, (_, n) => start + n), 'primary', comps, 0, 0))

    while (i < left.length && j < right.length) {
      steps.push(makeStep(sid++, 13, `比较 left[${i}]=${left[i]} ≤ right[${j}]=${right[j]}？`, `Compare left[${i}]=${left[i]} <= right[${j}]=${right[j]}?`, 'compare', [start + i, mid + 1 + j], 'warning', ++comps, 0, 0))
      if (left[i] <= right[j]) {
        data[k] = left[i]
        steps.push(makeStep(sid++, 14, `放入 ${left[i]} 到位置 ${k}`, `Place ${left[i]} at position ${k}`, 'highlight', [k], 'success', comps, 0, 0))
        i++
      } else {
        data[k] = right[j]
        steps.push(makeStep(sid++, 14, `放入 ${right[j]} 到位置 ${k}`, `Place ${right[j]} at position ${k}`, 'highlight', [k], 'success', comps, 0, 0))
        j++
      }
      k++
    }
    while (i < left.length) {
      data[k] = left[i]
      steps.push(makeStep(sid++, 16, `剩余 ${left[i]} 放入位置 ${k}`, `Remaining ${left[i]} to position ${k}`, 'highlight', [k], 'muted', comps, 0, 0))
      i++; k++
    }
    while (j < right.length) {
      data[k] = right[j]
      steps.push(makeStep(sid++, 16, `剩余 ${right[j]} 放入位置 ${k}`, `Remaining ${right[j]} to position ${k}`, 'highlight', [k], 'muted', comps, 0, 0))
      j++; k++
    }
  }

  function mergeSort(data: number[], start: number, end: number) {
    if (start >= end) return
    const mid = Math.floor((start + end) / 2)
    steps.push(makeStep(sid++, 3, `分割 [${data.slice(start, end + 1).join(',')}] → 左[${data.slice(start, mid + 1).join(',')}] 右[${data.slice(mid + 1, end + 1).join(',')}]`, `Split [${data.slice(start, end + 1).join(',')}] → L[${data.slice(start, mid + 1).join(',')}] R[${data.slice(mid + 1, end + 1).join(',')}]`, 'compare', [start, end], 'primary', comps, 0, 0))
    mergeSort(data, start, mid)
    mergeSort(data, mid + 1, end)
    merge(data, start, mid, end)
  }

  const data = [...arr]
  mergeSort(data, 0, data.length - 1)
  steps.push(makeStep(sid++, 18, `排序完成！[${data.join(', ')}]`, `Sorted! [${data.join(', ')}]`, 'mark', data.map((_, k) => k), 'success', comps, 0, 0))

  return { algorithm: 'merge_sort', complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' }, initialState: { type: 'array', data: [...original] }, steps }
}

// ============ Binary Search Generator ============
export function generateBinarySearch(arr: number[], target?: number): AnimationScript {
  const sorted = [...arr].sort((a, b) => a - b)
  const t = target ?? sorted[Math.floor(sorted.length / 2)]
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1, acc = 0

  steps.push(makeStep(sid++, 1, `有序数组 [${sorted.join(', ')}]，搜索 target=${t}`, `Sorted array [${sorted.join(', ')}], search target=${t}`, 'highlight', [], 'primary', comps, 0, acc))

  let left = 0, right = sorted.length - 1
  while (left <= right) {
    const mid = Math.floor(left + (right - left) / 2)
    steps.push(makeStep(sid++, 3, `left=${left}, right=${right}，mid=${mid}，arr[${mid}]=${sorted[mid]}`, `left=${left}, right=${right}, mid=${mid}, arr[${mid}]=${sorted[mid]}`, 'highlight', [mid], 'warning', comps, 0, acc += 2))
    steps.push(makeStep(sid++, 4, `比较 arr[${mid}]=${sorted[mid]} == target=${t}？`, `Compare arr[${mid}]=${sorted[mid]} == target=${t}?`, 'compare', [mid], 'warning', ++comps, 0, acc))

    if (sorted[mid] === t) {
      steps.push(makeStep(sid++, 5, `找到 target！arr[${mid}]=${t}`, `Found target! arr[${mid}]=${t}`, 'mark', [mid], 'success', comps, 0, acc))
      return { algorithm: 'binary_search', complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' }, initialState: { type: 'array', data: sorted }, steps }
    } else if (sorted[mid] < t) {
      steps.push(makeStep(sid++, 6, `${sorted[mid]} < ${t}，left = ${mid + 1}`, `${sorted[mid]} < ${t}, left = ${mid + 1}`, 'highlight', [mid], 'muted', comps, 0, acc))
      left = mid + 1
    } else {
      steps.push(makeStep(sid++, 6, `${sorted[mid]} > ${t}，right = ${mid - 1}`, `${sorted[mid]} > ${t}, right = ${mid - 1}`, 'highlight', [mid], 'muted', comps, 0, acc))
      right = mid - 1
    }
  }
  steps.push(makeStep(sid++, 7, `未找到 target=${t}，返回 -1`, `Target=${t} not found, return -1`, 'mark', [], 'danger', comps, 0, acc))

  return { algorithm: 'binary_search', complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' }, initialState: { type: 'array', data: sorted }, steps }
}

// ============ Generator registry ============
// Wrappers for generators with extra params
import { generateSlidingWindow } from './slidingWindow'
import { generateMonotonicStack } from './monotonicStack'
import { generateKnapsack } from './knapsack'
import { generateLCS } from './lcs'
import { generateNQueens } from './nQueens'
const slidingWindowWrapper = (arr: number[]) => generateSlidingWindow(arr, 3)
const monotonicStackWrapper = (arr: number[]) => generateMonotonicStack(arr)
const knapsackWrapper = (arr: number[]) => generateKnapsack(undefined, undefined, undefined)
const lcsWrapper = (arr: number[]) => generateLCS(undefined, undefined)
const nQueensWrapper = (_arr: number[]) => generateNQueens(4)

const GENERATORS: Record<string, (arr: number[]) => AnimationScript> = {
  bubble_sort: generateBubbleSort,
  selection_sort: generateSelectionSort,
  insertion_sort: generateInsertionSort,
  merge_sort: generateMergeSort,
  quick_sort: generateQuickSort,
  heap_sort: generateHeapSort,
  shell_sort: generateShellSort,
  counting_sort: generateCountingSort,
  binary_search: generateBinarySearch,
  sliding_window: slidingWindowWrapper,
  monotonic_stack: monotonicStackWrapper,
  knapsack_01: knapsackWrapper,
  lcs: lcsWrapper,
  n_queens: nQueensWrapper,
}

export function generatePreset(algoId: string, inputData: number[]): AnimationScript | undefined {
  const gen = GENERATORS[algoId]
  if (gen) return gen(inputData)
  return undefined
}

export function hasGenerator(algoId: string): boolean {
  return algoId in GENERATORS
}
