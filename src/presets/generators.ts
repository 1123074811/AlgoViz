import type { AnimationScript, AnimationStep, TeachingState, RangeState, AuxiliaryArrayState } from '@/types/animation'
import { makeStep, rng, auxArr, sortTeaching, sortTeachingWithAux } from './utils'

// ============ Bubble Sort Generator ============
export function generateBubbleSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let i = 0; i < n; i++) {
    let swapped = false
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push(makeStep(sid++, 3,
        `比较 arr[${j}]=${data[j]} 和 arr[${j + 1}]=${data[j + 1]}，判断是否需要交换`,
        `Compare arr[${j}]=${data[j]} and arr[${j + 1}]=${data[j + 1]} to decide swap`,
        'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2,
        sortTeaching(
          { i, j, sortedEnd: n - i },
          rng('unsorted', '未排序区间', 0, n - i, 'unsorted'),
          rng('sorted', '已排序后缀', n - i, n, 'sorted'),
        ),
      ))
      if (data[j] > data[j + 1]) {
        steps.push(makeStep(sid++, 4,
          `${data[j]} > ${data[j + 1]}，大元素向右冒泡，交换位置`,
          `${data[j]} > ${data[j + 1]}, larger element bubbles right, swap`,
          'swap', [j, j + 1], 'danger', comps, sw, acc,
          sortTeaching({ i, j, swapped: true }),
        ))
        ;[data[j], data[j + 1]] = [data[j + 1], data[j]]; sw++; acc += 2; swapped = true
        steps.push(makeStep(sid++, 5,
          `交换后: [${data.join(', ')}]`,
          `After swap: [${data.join(', ')}]`,
          'highlight', [j, j + 1], 'success', comps, sw, acc,
          sortTeaching({ i, j }),
        ))
      } else {
        steps.push(makeStep(sid++, 4,
          `${data[j]} ≤ ${data[j + 1]}，顺序正确，不交换`,
          `${data[j]} ≤ ${data[j + 1]}, order correct, no swap`,
          'highlight', [j, j + 1], 'muted', comps, sw, acc,
          sortTeaching({ i, j }),
        ))
      }
    }
    steps.push(makeStep(sid++, 7,
      `第 ${i + 1} 轮结束，最大值 ${data[n - 1 - i]} 已冒泡到 arr[${n - 1 - i}] 就位`,
      `Pass ${i + 1} done, max val ${data[n - 1 - i]} bubbled to arr[${n - 1 - i}]`,
      'mark', [n - 1 - i], 'muted', comps, sw, acc += 1,
      sortTeaching(
        { i, sortedEnd: n - i },
        rng('sorted', '已排序后缀', n - i - 1, n, 'sorted'),
      ),
    ))
    if (!swapped && i === 0) {
      steps.push(makeStep(sid++, 8,
        `本轮无交换发生，数组已经有序，提前结束`,
        `No swap in this pass, array already sorted, early termination`,
        'mark', data.map((_, k) => k), 'success', comps, sw, acc,
      ))
      break
    }
  }
  steps.push(makeStep(sid++, 8,
    `排序完成！[${data.join(', ')}]`,
    `Sorted! [${data.join(', ')}]`,
    'mark', data.map((_, k) => k), 'success', comps, sw, acc,
    sortTeaching(
      { done: true },
      rng('sorted', '已排序', 0, n, 'sorted'),
    ),
  ))

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
    steps.push(makeStep(sid++, 2,
      `第 ${i + 1} 轮：假设 arr[${i}]=${data[i]} 为最小值，扫描未排序区间找到真正的最小值`,
      `Pass ${i + 1}: assume arr[${i}]=${data[i]} is min, scan unsorted part for the true minimum`,
      'highlight', [i], 'warning', comps, sw, acc += 1,
      sortTeaching(
        { i, minIdx },
        rng('sorted', '已排序', 0, i, 'sorted'),
        rng('unsorted', '未排序', i, n, 'unsorted'),
      ),
    ))
    for (let j = i + 1; j < n; j++) {
      steps.push(makeStep(sid++, 4,
        `比较 arr[${j}]=${data[j]} < 当前最小值 arr[${minIdx}]=${data[minIdx]}？`,
        `Compare arr[${j}]=${data[j]} < current min arr[${minIdx}]=${data[minIdx]}?`,
        'compare', [minIdx, j], 'warning', ++comps, sw, acc += 2,
        sortTeaching({ i, j, minIdx }, rng('sorted', '已排序', 0, i, 'sorted')),
      ))
      if (data[j] < data[minIdx]) {
        minIdx = j
        steps.push(makeStep(sid++, 5,
          `找到更小值 arr[${j}]=${data[j]}，更新 minIdx=${j}`,
          `Found smaller value arr[${j}]=${data[j]}, update minIdx=${j}`,
          'highlight', [j], 'danger', comps, sw, acc += 1,
          sortTeaching({ i, j, minIdx }, rng('sorted', '已排序', 0, i, 'sorted')),
        ))
      } else {
        steps.push(makeStep(sid++, 5,
          `arr[${j}] 不小于当前最小值，保持 minIdx`,
          `arr[${j}] not smaller, keep current minIdx`,
          'highlight', [j], 'muted', comps, sw, acc += 1,
        ))
      }
    }
    if (minIdx !== i) {
      steps.push(makeStep(sid++, 6,
        `将最小值 arr[${minIdx}]=${data[minIdx]} 交换到位置 ${i}`,
        `Swap the minimum arr[${minIdx}]=${data[minIdx]} to position ${i}`,
        'swap', [i, minIdx], 'danger', comps, sw, acc,
        sortTeaching({ i, minIdx }),
      ))
      ;[data[i], data[minIdx]] = [data[minIdx], data[i]]; sw++; acc += 2
    } else {
      steps.push(makeStep(sid++, 6,
        `arr[${i}] 已经是最小值，无需交换`,
        `arr[${i}] is already the minimum, no swap needed`,
        'mark', [i], 'success', comps, sw, acc,
      ))
    }
    steps.push(makeStep(sid++, 7,
      `索引 ${i} 已就位（值=${data[i]}），加入已排序区域`,
      `Index ${i} sorted (val=${data[i]}), added to sorted region`,
      'mark', [i], 'muted', comps, sw, acc,
      sortTeaching({ i }, rng('sorted', '已排序', 0, i + 1, 'sorted')),
    ))
  }
  steps.push(makeStep(sid++, 8,
    `排序完成！[${data.join(', ')}]`,
    `Sorted! [${data.join(', ')}]`,
    'mark', data.map((_, k) => k), 'success', comps, sw, acc,
    sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
  ))

  return { algorithm: 'selection_sort', complexity: { time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Insertion Sort Generator ============
export function generateInsertionSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  steps.push(makeStep(sid++, 1,
    `第一个元素 arr[0]=${data[0]} 天然有序，作为已排序区间的起点`,
    `First element arr[0]=${data[0]} is trivially sorted`,
    'mark', [0], 'success', comps, sw, acc += 1,
    sortTeaching({ key: data[0] }, rng('sorted', '已排序', 0, 1, 'sorted')),
  ))
  for (let i = 1; i < n; i++) {
    const key = data[i]
    steps.push(makeStep(sid++, 2,
      `取出 key=arr[${i}]=${key}，在已排序区间 [0..${i - 1}] 中寻找插入位置`,
      `Take key=arr[${i}]=${key}, find insertion point in sorted range [0..${i - 1}]`,
      'highlight', [i], 'warning', comps, sw, acc += 1,
      sortTeaching(
        { i, key },
        rng('sorted', '已排序', 0, i, 'sorted'),
        rng('unsorted', '未排序', i, n, 'unsorted'),
      ),
    ))
    let j = i - 1
    while (j >= 0) {
      steps.push(makeStep(sid++, 4,
        `比较 arr[${j}]=${data[j]} > key=${key}？因为 ${data[j]} ${data[j] > key ? '>' : '≤'} ${key}，${data[j] > key ? '需要右移一位' : '已找到插入位置'}`,
        `Compare arr[${j}]=${data[j]} > key=${key}? Since ${data[j]} ${data[j] > key ? '>' : '<='} ${key}, ${data[j] > key ? 'shift right' : 'insertion point found'}`,
        'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2,
        sortTeaching({ i, j, key }),
      ))
      if (data[j] > key) {
        steps.push(makeStep(sid++, 5,
          `${data[j]} > ${key}，将 ${data[j]} 右移一位到 arr[${j + 1}]。插入排序只右移大于 key 的元素，相等时不移，所以是稳定的`,
          `${data[j]} > ${key}, shift ${data[j]} right to arr[${j + 1}]. Insertion sort only shifts elements > key (not ===), making it stable`,
          'move', [j, j + 1], 'danger', comps, sw, acc,
          sortTeaching({ i, j, key }),
        ))
        data[j + 1] = data[j]; acc += 1
        j--
      } else {
        steps.push(makeStep(sid++, 5,
          `arr[${j}]=${data[j]} ≤ key=${key}，停止右移，找到插入位置 arr[${j + 1}]`,
          `arr[${j}]=${data[j]} <= key=${key}, stop shifting, insertion point at arr[${j + 1}]`,
          'highlight', [j], 'muted', comps, sw, acc,
        ))
        break
      }
    }
    data[j + 1] = key
    steps.push(makeStep(sid++, 7,
      `将 key=${key} 插入到 arr[${j + 1}]，已排序区间扩大为 [0..${i}]`,
      `Insert key=${key} at arr[${j + 1}], sorted range extends to [0..${i}]`,
      'mark', [j + 1], 'success', comps, sw, acc += 1,
      sortTeaching({ i, key, insertPos: j + 1, done: false },
        rng('sorted', '已排序', 0, i + 1, 'sorted'),
      ),
    ))
    steps[steps.length - 1].action.value = key
    steps[steps.length - 1].action.to = j + 1
  }
  steps.push(makeStep(sid++, 8,
    `排序完成！[${data.join(', ')}]`,
    `Sorted! [${data.join(', ')}]`,
    'mark', data.map((_, k) => k), 'success', comps, sw, acc,
    sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
  ))

  return { algorithm: 'insertion_sort', complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Quick Sort Generator (Lomuto partition) ============
export function generateQuickSort(arr: number[]): AnimationScript {
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1

  function quickSort(data: number[], low: number, high: number) {
    if (low >= high) return
    const pivot = data[high]
    steps.push(makeStep(sid++, 2,
      `选择 pivot=arr[${high}]=${pivot}，在当前区间 [${low}..${high}] 内进行 Lomuto 分区`,
      `Select pivot=arr[${high}]=${pivot}, perform Lomuto partition in range [${low}..${high}]`,
      'highlight', [high], 'warning', comps, 0, 0,
      sortTeaching({ low, high, pivot, pivotIndex: high },
        rng('active', '当前分区区间', low, high + 1, 'current')),
    ))

    let i = low - 1
    for (let j = low; j < high; j++) {
      steps.push(makeStep(sid++, 4,
        `扫描 arr[${j}]=${data[j]} ≤ pivot=${pivot}？${data[j] <= pivot ? '成立，扩展 ≤ pivot 区域' : '不成立，继续扫描'}`,
        `Scan arr[${j}]=${data[j]} <= pivot=${pivot}? ${data[j] <= pivot ? 'Yes, extend ≤pivot region' : 'No, keep scanning'}`,
        'compare', [j, high], 'warning', ++comps, 0, 0,
        sortTeaching({ low, high, i, j, pivot },
          rng('active', '当前区间', low, high + 1, 'current')),
      ))
      if (data[j] <= pivot) {
        i++
        if (i !== j) {
          steps.push(makeStep(sid++, 5,
            `交换 arr[${i}]=${data[i]} ↔ arr[${j}]=${data[j]}，将小元素移到左侧`,
            `Swap arr[${i}]=${data[i]} ↔ arr[${j}]=${data[j]}, move small element to left`,
            'swap', [i, j], 'danger', comps, 0, 0,
            sortTeaching({ low, high, i, j, pivot })),
          )
          ;[data[i], data[j]] = [data[j], data[i]]
        }
      }
    }
    const pivotPos = i + 1
    if (pivotPos !== high) {
      steps.push(makeStep(sid++, 6,
        `分区完成，将 pivot=${pivot} 交换到正确位置 arr[${pivotPos}]`,
        `Partition done, swap pivot=${pivot} to its correct position arr[${pivotPos}]`,
        'swap', [pivotPos, high], 'danger', comps, 0, 0,
        sortTeaching({ low, high, pivot, pivotPos })),
      )
      ;[data[pivotPos], data[high]] = [data[high], data[pivotPos]]
    }
    steps.push(makeStep(sid++, 7,
      `pivot=${pivot} 归位到索引 ${pivotPos}，递归处理左右子区间`,
      `pivot=${pivot} placed at index ${pivotPos}, recurse on left and right subranges`,
      'mark', [pivotPos], 'muted', comps, 0, 0,
      sortTeaching({ low, high, pivot, pivotPos },
        rng('left_part', '左子区间', low, pivotPos, 'unsorted'),
        rng('right_part', '右子区间', pivotPos + 1, high + 1, 'unsorted')),
    ))
    quickSort(data, low, pivotPos - 1)
    quickSort(data, pivotPos + 1, high)
  }

  const data = [...arr]
  quickSort(data, 0, data.length - 1)
  steps.push(makeStep(sid++, 9,
    `排序完成！[${data.join(', ')}]`,
    `Sorted! [${data.join(', ')}]`,
    'mark', data.map((_, k) => k), 'success', comps, 0, 0,
    sortTeaching({ done: true }, rng('sorted', '已排序', 0, data.length, 'sorted')),
  ))

  return { algorithm: 'quick_sort', complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' }, space: 'O(log n)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Heap Sort Generator ============
export function generateHeapSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1

  function heapify(nH: number, i: number) {
    let largest = i
    const l = 2 * i + 1, r = 2 * i + 2
    if (l < nH) {
      steps.push(makeStep(sid++, 4,
        `比较父节点 arr[${largest}]=${data[largest]} < 左孩子 arr[${l}]=${data[l]}？`,
        `Compare parent arr[${largest}]=${data[largest]} < left child arr[${l}]=${data[l]}?`,
        'compare', [largest, l], 'warning', ++comps, 0, 0,
        sortTeaching({ heapSize: nH, parent: i, left: l, right: r },
          rng('heap', '堆范围', 0, nH, 'unsorted')),
      ))
      if (data[l] > data[largest]) largest = l
    }
    if (r < nH) {
      steps.push(makeStep(sid++, 4,
        `比较当前最大 arr[${largest}]=${data[largest]} < 右孩子 arr[${r}]=${data[r]}？`,
        `Compare current max arr[${largest}]=${data[largest]} < right child arr[${r}]=${data[r]}?`,
        'compare', [largest, r], 'warning', ++comps, 0, 0,
        sortTeaching({ heapSize: nH, parent: i, left: l, right: r },
          rng('heap', '堆范围', 0, nH, 'unsorted')),
      ))
      if (data[r] > data[largest]) largest = r
    }
    if (largest !== i) {
      steps.push(makeStep(sid++, 5,
        `最大元素在 arr[${largest}]=${data[largest]}，与父节点 arr[${i}]=${data[i]} 交换后继续向下调整`,
        `Max is arr[${largest}]=${data[largest]}, swap with parent arr[${i}]=${data[i]} and sift down`,
        'swap', [i, largest], 'danger', comps, 0, 0,
        sortTeaching({ heapSize: nH, parent: i, largest },
          rng('heap', '堆范围', 0, nH, 'unsorted')),
      ))
      ;[data[i], data[largest]] = [data[largest], data[i]]
      heapify(nH, largest)
    }
  }

  const n = data.length
  steps.push(makeStep(sid++, 1,
    `建堆阶段：从最后一个非叶节点 arr[${Math.floor(n / 2) - 1}] 开始，自底向上构建最大堆`,
    `Build heap: start from last non-leaf arr[${Math.floor(n / 2) - 1}], build max-heap bottom-up`,
    'highlight', [Math.floor(n / 2) - 1], 'primary', comps, 0, 0,
    sortTeaching({ heapSize: n }, rng('heap', '建堆范围', 0, n, 'unsorted')),
  ))
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i)
  }
  steps.push(makeStep(sid++, 2,
    `最大堆构建完成！堆顶 arr[0]=${data[0]} 是当前最大值。现在进入排序阶段`,
    `Max-heap built! Top arr[0]=${data[0]} is current max. Now sort phase`,
    'highlight', [0], 'success', comps, 0, 0,
    sortTeaching({ heapSize: n },
      rng('heap', '最大堆', 0, n, 'unsorted')),
  ))

  for (let i = n - 1; i > 0; i--) {
    steps.push(makeStep(sid++, 3,
      `将堆顶最大值 arr[0]=${data[0]} 交换到 arr[${i}]，该元素归位`,
      `Swap top max arr[0]=${data[0]} to arr[${i}], element is sorted`,
      'swap', [0, i], 'danger', comps, 0, 0,
      sortTeaching({ heapSize: i },
        rng('heap', '堆范围', 0, i, 'unsorted'),
        rng('sorted', '已排序后缀', i, n, 'sorted'),
      ),
    ))
    ;[data[0], data[i]] = [data[i], data[0]]
    steps.push(makeStep(sid++, 7,
      `arr[${i}]=${data[i]} 已就位，堆大小缩小为 ${i}`,
      `arr[${i}]=${data[i]} sorted, heap size shrinks to ${i}`,
      'mark', [i], 'muted', comps, 0, 0,
      sortTeaching({ heapSize: i - 1 },
        rng('heap', '堆范围', 0, i, 'unsorted'),
        rng('sorted', '已排序', i, n, 'sorted'),
      ),
    ))
    heapify(i, 0)
  }
  steps.push(makeStep(sid++, 8,
    `排序完成！[${data.join(', ')}]`,
    `Sorted! [${data.join(', ')}]`,
    'mark', data.map((_, k) => k), 'success', comps, 0, 0,
    sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
  ))

  return { algorithm: 'heap_sort', complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Shell Sort Generator (using real swaps) ============
export function generateShellSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    steps.push(makeStep(sid++, 2,
      `gap=${gap}：将数组按间隔 ${gap} 分为 ${gap} 个子序列，分别进行插入排序。gap 较大时元素移动距离远，可以更快接近最终位置`,
      `gap=${gap}: divide array into ${gap} subsequences with gap ${gap}, sort each. Large gap allows far-reaching swaps`,
      'highlight', [0, gap], 'primary', comps, sw, acc,
      sortTeaching({ gap, i: gap }, rng('active', `gap=${gap}`, 0, n, 'unsorted')),
    ))
    for (let i = gap; i < n; i++) {
      for (let j = i; j >= gap; j -= gap) {
        steps.push(makeStep(sid++, 4,
          `比较同组元素 arr[${j - gap}]=${data[j - gap]} > arr[${j}]=${data[j]}？`,
          `Compare same-group elements arr[${j - gap}]=${data[j - gap]} > arr[${j}]=${data[j]}?`,
          'compare', [j - gap, j], 'warning', ++comps, sw, acc += 2,
          sortTeaching({ gap, i, j, 'j-gap': j - gap }),
        ))
        if (data[j - gap] > data[j]) {
          steps.push(makeStep(sid++, 5,
            `${data[j - gap]} > ${data[j]}，交换`,
            `${data[j - gap]} > ${data[j]}, swap`,
            'swap', [j - gap, j], 'danger', comps, sw, acc,
            sortTeaching({ gap, i, j }),
          ))
          ;[data[j - gap], data[j]] = [data[j], data[j - gap]]
          sw++; acc += 2
        } else {
          steps.push(makeStep(sid++, 5,
            `${data[j - gap]} ≤ ${data[j]}，同组内顺序正确，停止此子序列的扫描`,
            `${data[j - gap]} <= ${data[j]}, order correct in this group, stop`,
            'highlight', [j - gap, j], 'success', comps, sw, acc,
          ))
          break
        }
      }
    }
    if (gap === 1) {
      steps.push(makeStep(sid++, 0,
        `gap=1，退化为普通插入排序。由于前面的预处理，数组已基本有序，插入排序效率很高（接近 O(n)）`,
        `gap=1, degenerates to insertion sort. Array is nearly sorted from pre-processing, so it runs near O(n)`,
        'highlight', [], 'primary', comps, sw, acc,
      ))
    }
  }
  steps.push(makeStep(sid++, 8,
    `排序完成！[${data.join(', ')}]`,
    `Sorted! [${data.join(', ')}]`,
    'mark', data.map((_, k) => k), 'success', comps, sw, acc,
    sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
  ))

  return { algorithm: 'shell_sort', complexity: { time: { best: 'O(n log n)', average: 'O(n^{1.3})', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Counting Sort Generator ============
export function generateCountingSort(arr: number[]): AnimationScript {
  const data = arr.map(v => Math.max(0, Math.floor(v)))
  const steps: AnimationStep[] = []
  let acc = 0, sid = 1
  const n = data.length
  if (n === 0) return { algorithm: 'counting_sort', complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' }, space: 'O(k)' }, initialState: { type: 'array', data }, steps: [] }

  const maxVal = Math.max(...data)
  const count = new Array(maxVal + 1).fill(0)
  const output = new Array(n).fill(0)

  steps.push(makeStep(sid++, 2,
    `找到最大值 max=${maxVal}，创建计数数组 count[0..${maxVal}]。计数排序不比较元素，适合整数且范围不大的场景`,
    `Found max=${maxVal}, create count array [0..${maxVal}]. Counting sort avoids comparisons, ideal for small-range integers`,
    'highlight', [], 'primary', 0, 0, acc,
    sortTeachingWithAux({ maxVal },
      [auxArr('count', '计数数组', count)],
    ),
  ))
  for (const num of data) {
    count[num]++
    steps.push(makeStep(sid++, 3,
      `扫描到 ${num}，count[${num}]++ → ${count[num]}`,
      `Scanned ${num}, count[${num}]++ → ${count[num]}`,
      'mark', [num], 'warning', 0, 0, acc += 1,
      sortTeachingWithAux({ num },
        [auxArr('count', '计数数组', count, [num])],
      ),
    ))
  }

  // Prefix sum for stable counting sort
  steps.push(makeStep(sid++, 4,
    `计算 count 前缀和，使 count[v] 表示值 ≤ v 的元素个数。这样可保证稳定性`,
    `Compute prefix sums of count so count[v] = number of elements <= v. This ensures stability`,
    'highlight', [], 'primary', 0, 0, acc,
  ))
  for (let v = 1; v <= maxVal; v++) {
    count[v] += count[v - 1]
  }
  steps.push(makeStep(sid++, 4,
    `前缀和计算完成，count 变为: [${count.join(',')}]。现在从后向前扫描原数组以保持稳定性`,
    `Prefix sums done: [${count.join(',')}]. Now scan input backwards for stability`,
    'highlight', [], 'primary', 0, 0, acc,
    sortTeachingWithAux({},
      [auxArr('count', '计数前缀和', count)],
    ),
  ))

  // Stable output
  for (let i = n - 1; i >= 0; i--) {
    const val = data[i]
    const pos = count[val] - 1
    output[pos] = val
    count[val]--
    steps.push(makeStep(sid++, 5,
      `将 arr[${i}]=${val} 放入 output[${pos}]（count[${val}] 减为 ${count[val]}）`,
      `Place arr[${i}]=${val} into output[${pos}] (count[${val}] decrements to ${count[val]})`,
      'highlight', [pos], 'success', 0, 0, acc += 1,
      sortTeachingWithAux({ i, val, pos },
        [auxArr('count', '计数', count, [val]), auxArr('output', '输出', output, [pos])],
      ),
    ))
  }

  // Copy back
  for (let i = 0; i < n; i++) {
    data[i] = output[i]
    steps.push(makeStep(sid++, 6,
      `将 output[${i}]=${output[i]} 写回 arr[${i}]`,
      `Write output[${i}]=${output[i]} back to arr[${i}]`,
      'highlight', [i], 'success', 0, 0, acc += 1,
      sortTeachingWithAux({ i, value: output[i] },
        [auxArr('output', '输出', output, [i])],
      ),
    ))
    steps[steps.length - 1].action.value = output[i]
    steps[steps.length - 1].action.to = i
  }
  steps.push(makeStep(sid++, 6,
    `排序完成！[${data.join(', ')}]。计数排序是稳定的非比较排序，时间复杂度 O(n+k)`,
    `Sorted! [${data.join(', ')}]. Counting sort is a stable non-comparison sort with O(n+k) time`,
    'mark', data.map((_, k) => k), 'success', 0, 0, acc,
  ))

  return { algorithm: 'counting_sort', complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' }, space: 'O(k)' }, initialState: { type: 'array', data: arr.map(v => Math.max(0, Math.floor(v))) }, steps }
}

// ============ Merge Sort Generator ============
export function generateMergeSort(arr: number[]): AnimationScript {
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1
  const original = [...arr]

  function merge(data: number[], start: number, mid: number, end: number) {
    const left = data.slice(start, mid + 1)
    const right = data.slice(mid + 1, end + 1)
    const temp: number[] = []
    let i = 0, j = 0

    steps.push(makeStep(sid++, 12,
      `合并：左子数组 [${left.join(',')}] 和右子数组 [${right.join(',')}]，较小的先放入临时数组`,
      `Merge: left [${left.join(',')}] and right [${right.join(',')}], smaller element goes into temp first`,
      'highlight', Array.from({ length: end - start + 1 }, (_, n) => start + n), 'primary', comps, 0, 0,
      sortTeachingWithAux(
        { start, mid, end, left_i: i, right_j: j },
        [auxArr('left', '左', left, [0]), auxArr('right', '右', right, [0]), auxArr('temp', '临时', [])],
        rng('left_part', '左子区间', start, mid + 1, 'unsorted'),
        rng('right_part', '右子区间', mid + 1, end + 1, 'unsorted'),
      ),
    ))

    while (i < left.length && j < right.length) {
      steps.push(makeStep(sid++, 13,
        `比较 left[${i}]=${left[i]} ≤ right[${j}]=${right[j]}？取较小值放入临时数组`,
        `Compare left[${i}]=${left[i]} <= right[${j}]=${right[j]}? Take smaller into temp`,
        'compare', [start + i, mid + 1 + j], 'warning', ++comps, 0, 0,
        sortTeachingWithAux({ start, mid, end, left_i: i, right_j: j },
          [auxArr('left', '左', left, [i]), auxArr('right', '右', right, [j]), auxArr('temp', '临时', temp, [temp.length - 1])],
          rng('active', '合并区间', start, end + 1, 'current'),
        ),
      ))
      if (left[i] <= right[j]) {
        temp.push(left[i])
        steps.push(makeStep(sid++, 14,
          `${left[i]} ≤ ${right[j]}，取左数组元素 ${left[i]} 放入 temp[${temp.length - 1}]（相等时优先取左边，保证稳定性）`,
          `${left[i]} <= ${right[j]}, take left element ${left[i]} to temp[${temp.length - 1}] (take left first on equal, stable)`,
          'highlight', [start + temp.length - 1], 'success', comps, 0, 0,
        ))
        i++
      } else {
        temp.push(right[j])
        steps.push(makeStep(sid++, 14,
          `${right[j]} < ${left[i]}，取右数组元素 ${right[j]} 放入 temp[${temp.length - 1}]`,
          `${right[j]} < ${left[i]}, take right element ${right[j]} to temp[${temp.length - 1}]`,
          'highlight', [start + temp.length - 1], 'success', comps, 0, 0,
        ))
        j++
      }
    }
    while (i < left.length) {
      temp.push(left[i])
      steps.push(makeStep(sid++, 16,
        `左子数组剩余元素 ${left[i]} 追加到 temp[${temp.length - 1}]`,
        `Remaining left element ${left[i]} appended to temp[${temp.length - 1}]`,
        'highlight', [start + temp.length - 1], 'muted', comps, 0, 0,
      ))
      i++
    }
    while (j < right.length) {
      temp.push(right[j])
      steps.push(makeStep(sid++, 16,
        `右子数组剩余元素 ${right[j]} 追加到 temp[${temp.length - 1}]`,
        `Remaining right element ${right[j]} appended to temp[${temp.length - 1}]`,
        'highlight', [start + temp.length - 1], 'muted', comps, 0, 0,
      ))
      j++
    }
    // Write back
    for (let k = 0; k < temp.length; k++) {
      data[start + k] = temp[k]
      steps.push(makeStep(sid++, 17,
        `将 temp[${k}]=${temp[k]} 写回原数组 arr[${start + k}]`,
        `Write temp[${k}]=${temp[k]} back to arr[${start + k}]`,
        'highlight', [start + k], 'success', comps, 0, 0,
        sortTeachingWithAux({ start, mid, end },
          [auxArr('temp', '临时数组', temp, [k])],
        ),
      ))
      steps[steps.length - 1].action.value = temp[k]
      steps[steps.length - 1].action.to = start + k
    }
  }

  function mergeSort(data: number[], start: number, end: number) {
    if (start >= end) {
      if (start === end) {
        steps.push(makeStep(sid++, 3,
          `区间 [${start}] 只有一个元素 ${data[start]}，天然有序`,
          `Range [${start}] has single element ${data[start]}, trivially sorted`,
          'highlight', [start], 'muted', comps, 0, 0,
        ))
      }
      return
    }
    const mid = Math.floor((start + end) / 2)
    steps.push(makeStep(sid++, 4,
      `分割区间 [${start}..${end}] → 左[${start}..${mid}] 右[${mid + 1}..${end}]，递归拆分直到单元素`,
      `Split [${start}..${end}] → L[${start}..${mid}] R[${mid + 1}..${end}], recurse to single elements`,
      'compare', [start, end], 'primary', comps, 0, 0,
      sortTeaching(
        { start, end, mid },
        rng('active', '当前区间', start, end + 1, 'current'),
        rng('left_part', '左子区间', start, mid + 1, 'unsorted'),
        rng('right_part', '右子区间', mid + 1, end + 1, 'unsorted'),
      ),
    ))
    mergeSort(data, start, mid)
    mergeSort(data, mid + 1, end)
    merge(data, start, mid, end)
  }

  const data = [...arr]
  mergeSort(data, 0, data.length - 1)
  steps.push(makeStep(sid++, 18,
    `排序完成！[${data.join(', ')}]`,
    `Sorted! [${data.join(', ')}]`,
    'mark', data.map((_, k) => k), 'success', comps, 0, 0,
    sortTeaching({ done: true }, rng('sorted', '已排序', 0, data.length, 'sorted')),
  ))

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
import { generateLIS } from './lis'
import { generateEditDistance } from './editDistance'
import { generateKMP } from './kmp'
import { generateFenwick } from './fenwick'
import { generateUnboundedKnapsack } from './unboundedKnapsack'
import { generateMatrixChain } from './matrixChain'
import { generateSudoku } from './sudoku'
import { generateManacher } from './manacher'
import { generateSegmentTree } from './segmentTree'
import { generateIntervalDP } from './intervalDP'
import { generateStack } from './stack'
import { generateQueue } from './queue'
import { generateHeapOperations } from './heap'
import { generateUnionFind } from './unionFind'
import { generateLinkedList } from './linkedList'
import { generateDoublyLinkedList } from './doublyLinkedList'
import { generateBinaryTree } from './binaryTree'
import { generateBST } from './bst'
import { generateAVLTree } from './avlTree'
import { generateRedBlackTree } from './redBlackTree'
import { generateTrie } from './trie'
import { generateHashTable } from './hashTable'
import { generateBacktracking } from './backtracking'
import { generateArray } from './arrayDS'
import { generateLeetCode } from './leetcode'
import { generateACM } from './acm'
import { generateRadixSort } from './radixSort'
import { generateBucketSort } from './bucketSort'

// ─── Input parsing helpers for natural types ───

/** Wrap a (number[]) => AnimationScript fn to accept (unknown) => AnimationScript */
function numGen(fn: (arr: number[]) => AnimationScript): (input: unknown) => AnimationScript {
  return (input: unknown) => fn(parseArr(input))
}

function parseArr(input: unknown): number[] {
  if (Array.isArray(input) && input.every(v => typeof v === 'number')) return input
  if (Array.isArray(input)) return input.map(Number).filter(v => !isNaN(v))
  if (typeof input === 'number') return [input]
  return [5, 3, 8, 1, 9, 2]
}

function parseNum(input: unknown, fallback: number): number {
  if (typeof input === 'number' && input > 0) return Math.floor(input)
  if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'number') return Math.floor(input[0])
  return fallback
}

function parseStr(input: unknown, fallback: string): string {
  if (typeof input === 'string' && input.length > 0) return input
  if (typeof input === 'object' && input !== null) {
    const o = input as Record<string, unknown>
    if (typeof o.text === 'string') return o.text
    if (typeof o.s === 'string') return o.s
    if (typeof o.str === 'string') return o.str
  }
  return fallback
}

function parseStrs(input: unknown, d1: string, d2?: string): [string, string] {
  if (Array.isArray(input) && input.length >= 2 && typeof input[0] === 'string' && typeof input[1] === 'string') return [input[0], input[1]]
  if (typeof input === 'object' && input !== null) {
    const o = input as Record<string, unknown>
    const s1 = typeof o.text1 === 'string' ? o.text1 : typeof o.s1 === 'string' ? o.s1 : (typeof o.text === 'string' ? o.text : null)
    const s2 = typeof o.text2 === 'string' ? o.text2 : typeof o.s2 === 'string' ? o.s2 : (typeof o.pattern === 'string' ? o.pattern : null)
    if (s1) return [s1, s2 ?? d2 ?? d1]
  }
  return [parseStr(input, d1), d2 ?? d1]
}

// ─── Wrappers with natural input types ───

const slidingWindowWrapper = (input: unknown) => generateSlidingWindow(parseArr(input), Math.min(3, parseArr(input).length))
const monotonicStackWrapper = (input: unknown) => generateMonotonicStack(parseArr(input))
const knapsackWrapper = (input: unknown) => {
  const arr = parseArr(input)
  return generateKnapsack(arr.slice(0, 4), arr.slice(0, 4).map((_, i) => (arr[i] || 1) * 2), Math.max(...arr.slice(0, 4)) + 3)
}
const lcsWrapper = (input: unknown) => {
  const [s1, s2] = parseStrs(input, 'ABCBDAB', 'BDCABA')
  return generateLCS(s1, s2)
}
const nQueensWrapper = (input: unknown) => generateNQueens(Math.max(4, Math.min(8, parseNum(input, 4))))
const lisWrapper = (input: unknown) => generateLIS(parseArr(input))
const editDistanceWrapper = (input: unknown) => {
  const [s1, s2] = parseStrs(input, 'horse', 'ros')
  return generateEditDistance(s1, s2)
}
const kmpWrapper = (input: unknown) => {
  const [text, pattern] = parseStrs(input, 'ABABABCABABABCABAB', 'ABABC')
  return generateKMP(text, pattern)
}
const fenwickWrapper = (input: unknown) => generateFenwick(parseArr(input).slice(0, 8))
const unboundedKnapsackWrapper = (input: unknown) => {
  const arr = parseArr(input)
  return generateUnboundedKnapsack(arr.slice(0, 3), arr.slice(0, 3).map(v => v * 2), Math.max(...arr.slice(0, 3)) + 2)
}
const matrixChainWrapper = (input: unknown) => generateMatrixChain(parseArr(input).slice(0, 5).map(n => Math.max(5, n)))
const sudokuWrapper = (_input: unknown) => generateSudoku()
const manacherWrapper = (input: unknown) => generateManacher(parseStr(input, 'babad'))
const segmentTreeWrapper = (input: unknown) => generateSegmentTree(parseArr(input).slice(0, 6))
const intervalDPWrapper = (input: unknown) => generateIntervalDP(parseArr(input).slice(0, 5))
const stackWrapper = (_input: unknown) => generateStack()
const queueWrapper = (_input: unknown) => generateQueue()
const heapWrapper = (input: unknown) => generateHeapOperations(parseArr(input).slice(0, 6))
const unionFindWrapper = (_input: unknown) => generateUnionFind()
const linkedListWrapper = (_input: unknown) => generateLinkedList()
const doublyLinkedListWrapper = (_input: unknown) => generateDoublyLinkedList()
const binaryTreeWrapper = (_input: unknown) => generateBinaryTree()
const bstWrapper = (_input: unknown) => generateBST()
const avlTreeWrapper = (_input: unknown) => generateAVLTree()
const redBlackTreeWrapper = (_input: unknown) => generateRedBlackTree()
const trieWrapper = (_input: unknown) => generateTrie()
const hashTableWrapper = (_input: unknown) => generateHashTable()
const backtrackingWrapper = (_input: unknown) => generateBacktracking()
const arrayDSWrapper = (_input: unknown) => generateArray()
const leetcodeWrapper = (_input: unknown) => generateLeetCode()
const acmWrapper = (_input: unknown) => generateACM()

const GENERATORS: Record<string, (input: unknown) => AnimationScript> = {
  bubble_sort: numGen(generateBubbleSort), selection_sort: numGen(generateSelectionSort),
  insertion_sort: numGen(generateInsertionSort), merge_sort: numGen(generateMergeSort),
  quick_sort: numGen(generateQuickSort), heap_sort: numGen(generateHeapSort),
  shell_sort: numGen(generateShellSort), counting_sort: numGen(generateCountingSort),
  binary_search: numGen(generateBinarySearch), sliding_window: slidingWindowWrapper,
  monotonic_stack: monotonicStackWrapper, knapsack_01: knapsackWrapper,
  lcs: lcsWrapper, n_queens: nQueensWrapper, lis: lisWrapper,
  edit_distance: editDistanceWrapper, kmp: kmpWrapper,
  fenwick_tree: fenwickWrapper, unbounded_knapsack: unboundedKnapsackWrapper,
  matrix_chain: matrixChainWrapper, sudoku: sudokuWrapper,
  manacher: manacherWrapper, segment_tree: segmentTreeWrapper,
  interval_dp: intervalDPWrapper, stack: stackWrapper,
  queue: queueWrapper, heap_ds: heapWrapper, union_find: unionFindWrapper,
  linked_list: linkedListWrapper, doubly_linked_list: doublyLinkedListWrapper,
  binary_tree: binaryTreeWrapper, bst: bstWrapper,
  avl_tree: avlTreeWrapper, red_black_tree: redBlackTreeWrapper,
  trie: trieWrapper, hash_table: hashTableWrapper,
  array: arrayDSWrapper, backtracking: backtrackingWrapper,
  radix_sort: numGen(generateRadixSort), bucket_sort: numGen(generateBucketSort),
  leetcode_hot100: leetcodeWrapper, acm_templates: acmWrapper,
}

export function generatePreset(algoId: string, inputData: unknown): AnimationScript | undefined {
  const gen = GENERATORS[algoId]
  if (gen) return gen(inputData)
  return undefined
}

export function hasGenerator(algoId: string): boolean {
  return algoId in GENERATORS
}
