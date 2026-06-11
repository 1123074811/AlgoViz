import type { AnimationScript, AnimationStep, TeachingState } from '@/types/animation'
import { makeStep, rng, auxArr, sortTeaching, sortTeachingWithAux } from './utils'
import { deriveSceneState } from '@/scene/SceneEngine'
import type { AlgorithmEvent } from '@/scene'

/** Helper: create an events payload for a step */
function evt(events: AlgorithmEvent[]) {
  return { events }
}

// ============ Bubble Sort Generator ============
export function generateBubbleSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let i = 0; i < n; i++) {
    let swapped = false
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({
        ...makeStep(sid++, 3,
          `比较 arr[${j}]=${data[j]} 和 arr[${j + 1}]=${data[j + 1]}，判断是否需要交换`,
          `Compare arr[${j}]=${data[j]} and arr[${j + 1}]=${data[j + 1]} to decide swap`,
          'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2,
          sortTeaching(
            { i, j, sortedEnd: n - i },
            rng('unsorted', '未排序区间', 0, n - i, 'unsorted'),
            rng('sorted', '已排序后缀', n - i, n, 'sorted'),
          ),
        ),
        ...evt(sid === 2
          ? [{ type: 'math.init', vars: [{ name: 'i', value: 0 }, { name: 'j', value: 0 }, { name: '是否交换', value: '否' }] }, { type: 'array.create', values: [...arr] }, { type: 'math.set', name: 'i', value: i }, { type: 'math.set', name: 'j', value: j }]
          : [{ type: 'array.compare', indices: [j, j + 1] }, { type: 'math.set', name: 'i', value: i }, { type: 'math.set', name: 'j', value: j }, ...(j === 0 ? [{ type: 'math.set', name: '是否交换', value: '否' } as const] : [])]),
      })
      if (data[j] > data[j + 1]) {
        steps.push({
          ...makeStep(sid++, 4,
            `${data[j]} > ${data[j + 1]}，大元素向右冒泡，交换位置`,
            `${data[j]} > ${data[j + 1]}, larger element bubbles right, swap`,
            'swap', [j, j + 1], 'danger', comps, sw, acc,
            sortTeaching({ i, j, swapped: true }),
          ),
          ...evt([{ type: 'array.swap', indices: [j, j + 1] }, { type: 'math.set', name: '是否交换', value: '是' }]),
        })
        ;[data[j], data[j + 1]] = [data[j + 1], data[j]]; sw++; acc += 2; swapped = true
        { const noteZh = `交换后: [${data.join(', ')}]`
        steps.push({
          ...makeStep(sid++, 5, noteZh, `After swap: [${data.join(', ')}]`, 'highlight', [j, j + 1], 'success', comps, sw, acc, sortTeaching({ i, j })),
          ...evt([{ type: 'scene.note', text: noteZh }]),
        })}
      } else {
        { const noteZh = `${data[j]} ≤ ${data[j + 1]}，顺序正确，不交换`
        steps.push({
          ...makeStep(sid++, 4, noteZh, `${data[j]} ≤ ${data[j + 1]}, order correct, no swap`, 'highlight', [j, j + 1], 'muted', comps, sw, acc, sortTeaching({ i, j })),
          ...evt([{ type: 'scene.note', text: noteZh }]),
        })}
      }
    }
    steps.push({
      ...makeStep(sid++, 7,
        `第 ${i + 1} 轮结束，最大值 ${data[n - 1 - i]} 已冒泡到 arr[${n - 1 - i}] 就位`,
        `Pass ${i + 1} done, max val ${data[n - 1 - i]} bubbled to arr[${n - 1 - i}]`,
        'mark', [n - 1 - i], 'muted', comps, sw, acc += 1,
        sortTeaching(
          { i, sortedEnd: n - i },
          rng('sorted', '已排序后缀', n - i - 1, n, 'sorted'),
        ),
      ),
      ...evt([{ type: 'array.mark_sorted', indices: [n - 1 - i] }, { type: 'math.set', name: '是否交换', value: swapped ? '是' : '否' }]),
    })
    if (!swapped && i === 0) {
      steps.push({
        ...makeStep(sid++, 8,
          `本轮无交换发生，数组已经有序，提前结束`,
          `No swap in this pass, array already sorted, early termination`,
          'mark', data.map((_, k) => k), 'success', comps, sw, acc,
        ),
        ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
      })
      break
    }
  }
  steps.push({
    ...makeStep(sid++, 8,
      `排序完成！[${data.join(', ')}]`,
      `Sorted! [${data.join(', ')}]`,
      'mark', data.map((_, k) => k), 'success', comps, sw, acc,
      sortTeaching(
        { done: true },
        rng('sorted', '已排序', 0, n, 'sorted'),
      ),
    ),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })

  return { algorithm: 'bubble_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Selection Sort Generator ============
export function generateSelectionSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let i = 0; i < n; i++) {
    let minIdx = i
    { const noteZh = `第 ${i + 1} 轮：假设 arr[${i}]=${data[i]} 为最小值，扫描未排序区间找到真正的最小值`
    steps.push({
      ...makeStep(sid++, 2, noteZh,
        `Pass ${i + 1}: assume arr[${i}]=${data[i]} is min, scan unsorted part for the true minimum`,
        'highlight', [i], 'warning', comps, sw, acc += 1,
        sortTeaching(
          { i, minIdx },
          rng('sorted', '已排序', 0, i, 'sorted'),
          rng('unsorted', '未排序', i, n, 'unsorted'),
        ),
      ),
      ...evt(sid === 2
        ? [{ type: 'math.init', vars: [{ name: 'i', value: i }, { name: 'j', value: i }, { name: 'min', value: minIdx }] }, { type: 'array.create', values: [...arr] }]
        : [{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'i', value: i }, { type: 'math.set', name: 'min', value: minIdx }]),
    })}
    for (let j = i + 1; j < n; j++) {
      steps.push({
        ...makeStep(sid++, 4,
          `比较 arr[${j}]=${data[j]} < 当前最小值 arr[${minIdx}]=${data[minIdx]}？`,
          `Compare arr[${j}]=${data[j]} < current min arr[${minIdx}]=${data[minIdx]}?`,
          'compare', [minIdx, j], 'warning', ++comps, sw, acc += 2,
          sortTeaching({ i, j, minIdx }, rng('sorted', '已排序', 0, i, 'sorted')),
        ),
        ...evt([{ type: 'array.compare', indices: [minIdx, j] }, { type: 'math.set', name: 'j', value: j }]),
      })
      if (data[j] < data[minIdx]) {
        minIdx = j
        { const noteZh = `找到更小值 arr[${j}]=${data[j]}，更新 minIdx=${j}`
        steps.push({
          ...makeStep(sid++, 5, noteZh, `Found smaller value arr[${j}]=${data[j]}, update minIdx=${j}`, 'highlight', [j], 'danger', comps, sw, acc += 1, sortTeaching({ i, j, minIdx }, rng('sorted', '已排序', 0, i, 'sorted'))),
          ...evt([{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'min', value: minIdx }]),
        })}
      } else {
        { const noteZh = `arr[${j}] 不小于当前最小值，保持 minIdx`
        steps.push({
          ...makeStep(sid++, 5, noteZh, `arr[${j}] not smaller, keep current minIdx`, 'highlight', [j], 'muted', comps, sw, acc += 1),
          ...evt([{ type: 'scene.note', text: noteZh }]),
        })}
      }
    }
    if (minIdx !== i) {
      steps.push({
        ...makeStep(sid++, 6,
          `将最小值 arr[${minIdx}]=${data[minIdx]} 交换到位置 ${i}`,
          `Swap the minimum arr[${minIdx}]=${data[minIdx]} to position ${i}`,
          'swap', [i, minIdx], 'danger', comps, sw, acc,
          sortTeaching({ i, minIdx }),
        ),
        ...evt([{ type: 'array.swap', indices: [i, minIdx] }]),
      })
      ;[data[i], data[minIdx]] = [data[minIdx], data[i]]; sw++; acc += 2
    } else {
      steps.push({
        ...makeStep(sid++, 6,
          `arr[${i}] 已经是最小值，无需交换`,
          `arr[${i}] is already the minimum, no swap needed`,
          'mark', [i], 'success', comps, sw, acc,
        ),
        ...evt([{ type: 'array.mark_sorted', indices: [i] }]),
      })
    }
    steps.push({
      ...makeStep(sid++, 7,
        `索引 ${i} 已就位（值=${data[i]}），加入已排序区域`,
        `Index ${i} sorted (val=${data[i]}), added to sorted region`,
        'mark', [i], 'muted', comps, sw, acc,
        sortTeaching({ i }, rng('sorted', '已排序', 0, i + 1, 'sorted')),
      ),
      ...evt([{ type: 'array.mark_sorted', indices: [i] }]),
    })
  }
  steps.push({
    ...makeStep(sid++, 8,
      `排序完成！[${data.join(', ')}]`,
      `Sorted! [${data.join(', ')}]`,
      'mark', data.map((_, k) => k), 'success', comps, sw, acc,
      sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
    ),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })

  return { algorithm: 'selection_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Insertion Sort Generator ============
export function generateInsertionSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  steps.push({
    ...makeStep(sid++, 1,
      `第一个元素 arr[0]=${data[0]} 天然有序，作为已排序区间的起点`,
      `First element arr[0]=${data[0]} is trivially sorted`,
      'mark', [0], 'success', comps, sw, acc += 1,
      sortTeaching({ key: data[0] }, rng('sorted', '已排序', 0, 1, 'sorted')),
    ),
    ...evt(sid === 2
      ? [{ type: 'math.init', vars: [{ name: 'i', value: 0 }, { name: 'key', value: data[0] }, { name: 'j', value: -1 }] }, { type: 'array.create', values: [...arr] }]
      : [{ type: 'array.mark_sorted', indices: [0] }]),
  })
  for (let i = 1; i < n; i++) {
    const key = data[i]
    { const noteZh = `取出 key=arr[${i}]=${key}，在已排序区间 [0..${i - 1}] 中寻找插入位置`
    steps.push({
      ...makeStep(sid++, 2, noteZh, `Take key=arr[${i}]=${key}, find insertion point in sorted range [0..${i - 1}]`, 'highlight', [i], 'warning', comps, sw, acc += 1,
      sortTeaching(
        { i, key },
        rng('sorted', '已排序', 0, i, 'sorted'),
        rng('unsorted', '未排序', i, n, 'unsorted'),
      )),
      ...evt([{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'i', value: i }, { type: 'math.set', name: 'key', value: key }]),
    })}
    let j = i - 1
    while (j >= 0) {
      steps.push({
        ...makeStep(sid++, 4,
          `比较 arr[${j}]=${data[j]} > key=${key}？因为 ${data[j]} ${data[j] > key ? '>' : '≤'} ${key}，${data[j] > key ? '需要右移一位' : '已找到插入位置'}`,
          `Compare arr[${j}]=${data[j]} > key=${key}? Since ${data[j]} ${data[j] > key ? '>' : '<='} ${key}, ${data[j] > key ? 'shift right' : 'insertion point found'}`,
          'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2,
          sortTeaching({ i, j, key }),
        ),
        ...evt([{ type: 'array.compare', indices: [j, j + 1] }, { type: 'math.set', name: 'j', value: j }]),
      })
      if (data[j] > key) {
        steps.push({
          ...makeStep(sid++, 5,
            `${data[j]} > ${key}，将 ${data[j]} 右移一位到 arr[${j + 1}]。插入排序只右移大于 key 的元素，相等时不移，所以是稳定的`,
            `${data[j]} > ${key}, shift ${data[j]} right to arr[${j + 1}]. Insertion sort only shifts elements > key (not ===), making it stable`,
            'move', [j, j + 1], 'danger', comps, sw, acc,
            sortTeaching({ i, j, key }),
          ),
          ...evt([{ type: 'array.move', from: j, to: j + 1 }]),
        })
        data[j + 1] = data[j]; acc += 1
        j--
      } else {
        { const noteZh = `arr[${j}]=${data[j]} ≤ key=${key}，停止右移，找到插入位置 arr[${j + 1}]`
        steps.push({
          ...makeStep(sid++, 5, noteZh, `arr[${j}]=${data[j]} <= key=${key}, stop shifting, insertion point at arr[${j + 1}]`, 'highlight', [j], 'muted', comps, sw, acc),
          ...evt([{ type: 'scene.note', text: noteZh }]),
        })}
        break
      }
    }
    data[j + 1] = key
    steps.push({
      ...makeStep(sid++, 7,
        `将 key=${key} 插入到 arr[${j + 1}]，已排序区间扩大为 [0..${i}]`,
        `Insert key=${key} at arr[${j + 1}], sorted range extends to [0..${i}]`,
        'mark', [j + 1], 'success', comps, sw, acc += 1,
        sortTeaching({ i, key, insertPos: j + 1, done: false },
          rng('sorted', '已排序', 0, i + 1, 'sorted'),
        ),
      ),
      ...evt([{ type: 'array.set_value', index: j + 1, value: key }, { type: 'array.mark_sorted', indices: [j + 1] }]),
    })
  }
  steps.push({
    ...makeStep(sid++, 8,
      `排序完成！[${data.join(', ')}]`,
      `Sorted! [${data.join(', ')}]`,
      'mark', data.map((_, k) => k), 'success', comps, sw, acc,
      sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
    ),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })

  return { algorithm: 'insertion_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Quick Sort Generator (Lomuto partition) ============
export function generateQuickSort(arr: number[]): AnimationScript {
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1

  function quickSort(data: number[], low: number, high: number) {
    if (low >= high) return
    const pivot = data[high]
    { const noteZh = `选择 pivot=arr[${high}]=${pivot}，在当前区间 [${low}..${high}] 内进行 Lomuto 分区`
    steps.push({
      ...makeStep(sid++, 2, noteZh,
        `Select pivot=arr[${high}]=${pivot}, perform Lomuto partition in range [${low}..${high}]`,
        'highlight', [high], 'warning', comps, 0, 0,
        sortTeaching({ low, high, pivot, pivotIndex: high },
          rng('active', '当前分区区间', low, high + 1, 'current')),
      ),
      ...evt(sid === 2
        ? [{ type: 'math.init', vars: [{ name: 'pivot', value: pivot }, { name: 'i', value: low - 1 }, { name: 'j', value: low }] }, { type: 'array.create', values: [...arr] }, { type: 'math.set', name: 'pivot', value: pivot }]
        : [{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'pivot', value: pivot }, { type: 'math.set', name: 'i', value: low - 1 }]),
    })}

    let i = low - 1
    for (let j = low; j < high; j++) {
      steps.push({
        ...makeStep(sid++, 4,
          `扫描 arr[${j}]=${data[j]} ≤ pivot=${pivot}？${data[j] <= pivot ? '成立，扩展 ≤ pivot 区域' : '不成立，继续扫描'}`,
          `Scan arr[${j}]=${data[j]} <= pivot=${pivot}? ${data[j] <= pivot ? 'Yes, extend ≤pivot region' : 'No, keep scanning'}`,
          'compare', [j, high], 'warning', ++comps, 0, 0,
          sortTeaching({ low, high, i, j, pivot },
            rng('active', '当前区间', low, high + 1, 'current')),
        ),
        ...evt([{ type: 'array.compare', indices: [j, high] }, { type: 'math.set', name: 'j', value: j }, { type: 'math.set', name: 'i', value: i }]),
      })
      if (data[j] <= pivot) {
        i++
        if (i !== j) {
          steps.push({
            ...makeStep(sid++, 5,
              `交换 arr[${i}]=${data[i]} ↔ arr[${j}]=${data[j]}，将小元素移到左侧`,
              `Swap arr[${i}]=${data[i]} ↔ arr[${j}]=${data[j]}, move small element to left`,
              'swap', [i, j], 'danger', comps, 0, 0,
              sortTeaching({ low, high, i, j, pivot })),
            ...evt([{ type: 'array.swap', indices: [i, j] }, { type: 'math.set', name: 'i', value: i }]),
          })
          ;[data[i], data[j]] = [data[j], data[i]]
        }
      }
    }
    const pivotPos = i + 1
    if (pivotPos !== high) {
      steps.push({
        ...makeStep(sid++, 6,
          `分区完成，将 pivot=${pivot} 交换到正确位置 arr[${pivotPos}]`,
          `Partition done, swap pivot=${pivot} to its correct position arr[${pivotPos}]`,
          'swap', [pivotPos, high], 'danger', comps, 0, 0,
          sortTeaching({ low, high, pivot, pivotPos })),
        ...evt([{ type: 'array.swap', indices: [pivotPos, high] }]),
      })
      ;[data[pivotPos], data[high]] = [data[high], data[pivotPos]]
    }
    steps.push({
      ...makeStep(sid++, 7,
        `pivot=${pivot} 归位到索引 ${pivotPos}，递归处理左右子区间`,
        `pivot=${pivot} placed at index ${pivotPos}, recurse on left and right subranges`,
        'mark', [pivotPos], 'muted', comps, 0, 0,
        sortTeaching({ low, high, pivot, pivotPos },
          rng('left_part', '左子区间', low, pivotPos, 'unsorted'),
          rng('right_part', '右子区间', pivotPos + 1, high + 1, 'unsorted')),
      ),
      ...evt([{ type: 'array.partition', pivotIndex: pivotPos, left: low, right: high }, { type: 'array.mark_sorted', indices: [pivotPos] }]),
    })
    quickSort(data, low, pivotPos - 1)
    quickSort(data, pivotPos + 1, high)
  }

  const data = [...arr]
  quickSort(data, 0, data.length - 1)
  steps.push({
    ...makeStep(sid++, 9,
      `排序完成！[${data.join(', ')}]`,
      `Sorted! [${data.join(', ')}]`,
      'mark', data.map((_, k) => k), 'success', comps, 0, 0,
      sortTeaching({ done: true }, rng('sorted', '已排序', 0, data.length, 'sorted')),
    ),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })

  return { algorithm: 'quick_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' }, space: 'O(log n)' }, initialState: { type: 'array', data: [...arr] }, steps }
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
      steps.push({
        ...makeStep(sid++, 4,
          `比较父节点 arr[${largest}]=${data[largest]} < 左孩子 arr[${l}]=${data[l]}？`,
          `Compare parent arr[${largest}]=${data[largest]} < left child arr[${l}]=${data[l]}?`,
          'compare', [largest, l], 'warning', ++comps, 0, 0,
          sortTeaching({ heapSize: nH, parent: i, left: l, right: r },
            rng('heap', '堆范围', 0, nH, 'unsorted')),
        ),
        ...evt([{ type: 'array.compare', indices: [largest, l] }, { type: 'math.set', name: '堆大小', value: nH }, { type: 'math.set', name: '父', value: i }, { type: 'math.set', name: '子', value: l }]),
      })
      if (data[l] > data[largest]) largest = l
    }
    if (r < nH) {
      steps.push({
        ...makeStep(sid++, 4,
          `比较当前最大 arr[${largest}]=${data[largest]} < 右孩子 arr[${r}]=${data[r]}？`,
          `Compare current max arr[${largest}]=${data[largest]} < right child arr[${r}]=${data[r]}?`,
          'compare', [largest, r], 'warning', ++comps, 0, 0,
          sortTeaching({ heapSize: nH, parent: i, left: l, right: r },
            rng('heap', '堆范围', 0, nH, 'unsorted')),
        ),
        ...evt([{ type: 'array.compare', indices: [largest, r] }, { type: 'math.set', name: '堆大小', value: nH }, { type: 'math.set', name: '父', value: i }, { type: 'math.set', name: '子', value: r }]),
      })
      if (data[r] > data[largest]) largest = r
    }
    if (largest !== i) {
      steps.push({
        ...makeStep(sid++, 5,
          `最大元素在 arr[${largest}]=${data[largest]}，与父节点 arr[${i}]=${data[i]} 交换后继续向下调整`,
          `Max is arr[${largest}]=${data[largest]}, swap with parent arr[${i}]=${data[i]} and sift down`,
          'swap', [i, largest], 'danger', comps, 0, 0,
          sortTeaching({ heapSize: nH, parent: i, largest },
            rng('heap', '堆范围', 0, nH, 'unsorted')),
        ),
        ...evt([{ type: 'array.swap', indices: [i, largest] }]),
      })
      ;[data[i], data[largest]] = [data[largest], data[i]]
      heapify(nH, largest)
    }
  }

  const n = data.length
  { const noteZh = `建堆阶段：从最后一个非叶节点 arr[${Math.floor(n / 2) - 1}] 开始，自底向上构建最大堆`
  steps.push({
    ...makeStep(sid++, 1, noteZh,
      `Build heap: start from last non-leaf arr[${Math.floor(n / 2) - 1}], build max-heap bottom-up`,
      'highlight', [Math.floor(n / 2) - 1], 'primary', comps, 0, 0,
      sortTeaching({ heapSize: n }, rng('heap', '建堆范围', 0, n, 'unsorted')),
    ),
    ...evt(sid === 2
      ? [{ type: 'math.init', vars: [{ name: '堆大小', value: n }, { name: '父', value: Math.floor(n / 2) - 1 }, { name: '子', value: 2 * (Math.floor(n / 2) - 1) + 1 }] }, { type: 'array.create', values: [...arr] }]
      : [{ type: 'scene.note', text: noteZh }]),
  })}
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i)
  }
  { const noteZh = `最大堆构建完成！堆顶 arr[0]=${data[0]} 是当前最大值。现在进入排序阶段`
  steps.push({
    ...makeStep(sid++, 2, noteZh, `Max-heap built! Top arr[0]=${data[0]} is current max. Now sort phase`, 'highlight', [0], 'success', comps, 0, 0,
    sortTeaching({ heapSize: n }, rng('heap', '最大堆', 0, n, 'unsorted'))),
    ...evt([{ type: 'scene.note', text: noteZh }]),
  })}

  for (let i = n - 1; i > 0; i--) {
    steps.push({
      ...makeStep(sid++, 3,
        `将堆顶最大值 arr[0]=${data[0]} 交换到 arr[${i}]，该元素归位`,
        `Swap top max arr[0]=${data[0]} to arr[${i}], element is sorted`,
        'swap', [0, i], 'danger', comps, 0, 0,
        sortTeaching({ heapSize: i },
          rng('heap', '堆范围', 0, i, 'unsorted'),
          rng('sorted', '已排序后缀', i, n, 'sorted'),
        ),
      ),
      ...evt([{ type: 'array.swap', indices: [0, i] }, { type: 'math.set', name: '堆大小', value: i }]),
    })
    ;[data[0], data[i]] = [data[i], data[0]]
    steps.push({
      ...makeStep(sid++, 7,
        `arr[${i}]=${data[i]} 已就位，堆大小缩小为 ${i}`,
        `arr[${i}]=${data[i]} sorted, heap size shrinks to ${i}`,
        'mark', [i], 'muted', comps, 0, 0,
        sortTeaching({ heapSize: i - 1 },
          rng('heap', '堆范围', 0, i, 'unsorted'),
          rng('sorted', '已排序', i, n, 'sorted'),
        ),
      ),
      ...evt([{ type: 'array.mark_sorted', indices: [i] }]),
    })
    heapify(i, 0)
  }
  steps.push({
    ...makeStep(sid++, 8,
      `排序完成！[${data.join(', ')}]`,
      `Sorted! [${data.join(', ')}]`,
      'mark', data.map((_, k) => k), 'success', comps, 0, 0,
      sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
    ),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })

  return { algorithm: 'heap_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Shell Sort Generator (using real swaps) ============
export function generateShellSort(arr: number[]): AnimationScript {
  const data = [...arr]
  const steps: AnimationStep[] = []
  let comps = 0, sw = 0, acc = 0, sid = 1
  const n = data.length

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    { const noteZh = `gap=${gap}：将数组按间隔 ${gap} 分为 ${gap} 个子序列，分别进行插入排序。gap 较大时元素移动距离远，可以更快接近最终位置`
    steps.push({
      ...makeStep(sid++, 2, noteZh,
        `gap=${gap}: divide array into ${gap} subsequences with gap ${gap}, sort each. Large gap allows far-reaching swaps`,
        'highlight', [0, gap], 'primary', comps, sw, acc,
        sortTeaching({ gap, i: gap }, rng('active', `gap=${gap}`, 0, n, 'unsorted')),
      ),
      ...evt(sid === 2
        ? [{ type: 'math.init', vars: [{ name: 'gap', value: gap }, { name: 'i', value: gap }, { name: 'j', value: gap }] }, { type: 'array.create', values: [...arr] }, { type: 'math.set', name: 'gap', value: gap }]
        : [{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'gap', value: gap }]),
    })}
    for (let i = gap; i < n; i++) {
      for (let j = i; j >= gap; j -= gap) {
        steps.push({
          ...makeStep(sid++, 4,
            `比较同组元素 arr[${j - gap}]=${data[j - gap]} > arr[${j}]=${data[j]}？`,
            `Compare same-group elements arr[${j - gap}]=${data[j - gap]} > arr[${j}]=${data[j]}?`,
            'compare', [j - gap, j], 'warning', ++comps, sw, acc += 2,
            sortTeaching({ gap, i, j, 'j-gap': j - gap }),
          ),
          ...evt([{ type: 'array.compare', indices: [j - gap, j] }, { type: 'math.set', name: 'i', value: i }, { type: 'math.set', name: 'j', value: j }]),
        })
        if (data[j - gap] > data[j]) {
          steps.push({
            ...makeStep(sid++, 5,
              `${data[j - gap]} > ${data[j]}，交换`,
              `${data[j - gap]} > ${data[j]}, swap`,
              'swap', [j - gap, j], 'danger', comps, sw, acc,
              sortTeaching({ gap, i, j }),
            ),
            ...evt([{ type: 'array.swap', indices: [j - gap, j] }]),
          })
          ;[data[j - gap], data[j]] = [data[j], data[j - gap]]
          sw++; acc += 2
        } else {
          { const noteZh = `${data[j - gap]} ≤ ${data[j]}，同组内顺序正确，停止此子序列的扫描`
          steps.push({
            ...makeStep(sid++, 5, noteZh, `${data[j - gap]} <= ${data[j]}, order correct in this group, stop`, 'highlight', [j - gap, j], 'success', comps, sw, acc),
            ...evt([{ type: 'scene.note', text: noteZh }]),
          })}
          break
        }
      }
    }
    if (gap === 1) {
      { const noteZh = `gap=1，退化为普通插入排序。由于前面的预处理，数组已基本有序，插入排序效率很高（接近 O(n)）`
      steps.push({
        ...makeStep(sid++, 0, noteZh, `gap=1, degenerates to insertion sort. Array is nearly sorted from pre-processing, so it runs near O(n)`, 'highlight', [], 'primary', comps, sw, acc),
        ...evt([{ type: 'scene.note', text: noteZh }]),
      })}
    }
  }
  steps.push({
    ...makeStep(sid++, 8,
      `排序完成！[${data.join(', ')}]`,
      `Sorted! [${data.join(', ')}]`,
      'mark', data.map((_, k) => k), 'success', comps, sw, acc,
      sortTeaching({ done: true }, rng('sorted', '已排序', 0, n, 'sorted')),
    ),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })

  return { algorithm: 'shell_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n log n)', average: 'O(n^{1.3})', worst: 'O(n²)' }, space: 'O(1)' }, initialState: { type: 'array', data: [...arr] }, steps }
}

// ============ Counting Sort Generator ============
export function generateCountingSort(arr: number[]): AnimationScript {
  const data = arr.map(v => Math.max(0, Math.floor(v)))
  const steps: AnimationStep[] = []
  let acc = 0, sid = 1
  const n = data.length
  if (n === 0) return { algorithm: 'counting_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' }, space: 'O(k)' }, initialState: { type: 'array', data }, steps: [] }

  const maxVal = Math.max(...data)
  const count = new Array(maxVal + 1).fill(0)
  const output = new Array(n).fill(0)

  { const noteZh = `找到最大值 max=${maxVal}，创建计数数组 count[0..${maxVal}]。计数排序不比较元素，适合整数且范围不大的场景`
  steps.push({
    ...makeStep(sid++, 2, noteZh,
      `Found max=${maxVal}, create count array [0..${maxVal}]. Counting sort avoids comparisons, ideal for small-range integers`,
      'highlight', [], 'primary', 0, 0, acc,
      sortTeachingWithAux({ maxVal },
        [auxArr('count', '计数数组', count)],
      ),
    ),
    ...evt(sid === 2
      ? [{ type: 'math.init', vars: [{ name: 'max', value: maxVal }, { name: 'i', value: 0 }, { name: '当前值', value: '-' }] }, { type: 'array.create', values: [...arr.map(v => Math.max(0, Math.floor(v)))] }]
      : [{ type: 'scene.note', text: noteZh }]),
  })}
  let scanIdx = 0
  for (const num of data) {
    count[num]++
    steps.push({
      ...makeStep(sid++, 3,
        `扫描到 ${num}，count[${num}]++ → ${count[num]}`,
        `Scanned ${num}, count[${num}]++ → ${count[num]}`,
        'mark', [num], 'warning', 0, 0, acc += 1,
        sortTeachingWithAux({ num },
          [auxArr('count', '计数数组', count, [num])],
        ),
      ),
      ...evt([{ type: 'array.mark_sorted', indices: [num] }, { type: 'math.set', name: 'i', value: scanIdx }, { type: 'math.set', name: '当前值', value: num }]),
    })
    scanIdx++
  }

  // Prefix sum for stable counting sort
  { const noteZh = `计算 count 前缀和，使 count[v] 表示值 ≤ v 的元素个数。这样可保证稳定性`
  steps.push({
    ...makeStep(sid++, 4, noteZh, `Compute prefix sums of count so count[v] = number of elements <= v. This ensures stability`, 'highlight', [], 'primary', 0, 0, acc),
    ...evt([{ type: 'scene.note', text: noteZh }]),
  })}
  for (let v = 1; v <= maxVal; v++) {
    count[v] += count[v - 1]
  }
  { const noteZh = `前缀和计算完成，count 变为: [${count.join(',')}]。现在从后向前扫描原数组以保持稳定性`
  steps.push({
    ...makeStep(sid++, 4, noteZh, `Prefix sums done: [${count.join(',')}]. Now scan input backwards for stability`, 'highlight', [], 'primary', 0, 0, acc,
    sortTeachingWithAux({}, [auxArr('count', '计数前缀和', count)])),
    ...evt([{ type: 'scene.note', text: noteZh }]),
  })}

  // Stable output
  for (let i = n - 1; i >= 0; i--) {
    const val = data[i]
    const pos = count[val] - 1
    output[pos] = val
    count[val]--
    { const noteZh = `将 arr[${i}]=${val} 放入 output[${pos}]（count[${val}] 减为 ${count[val]}）`
    steps.push({
      ...makeStep(sid++, 5, noteZh,
        `Place arr[${i}]=${val} into output[${pos}] (count[${val}] decrements to ${count[val]})`,
        'highlight', [pos], 'success', 0, 0, acc += 1,
        sortTeachingWithAux({ i, val, pos },
          [auxArr('count', '计数', count, [val]), auxArr('output', '输出', output, [pos])],
        ),
      ),
      ...evt([{ type: 'scene.note', text: noteZh }]),
    })}
  }

  // Copy back
  for (let i = 0; i < n; i++) {
    data[i] = output[i]
    { const noteZh = `将 output[${i}]=${output[i]} 写回 arr[${i}]`
    steps.push({
      ...makeStep(sid++, 6, noteZh, `Write output[${i}]=${output[i]} back to arr[${i}]`, 'highlight', [i], 'success', 0, 0, acc += 1,
      sortTeachingWithAux({ i, value: output[i] }, [auxArr('output', '输出', output, [i])])),
      ...evt([{ type: 'array.set_value', index: i, value: output[i] }, { type: 'scene.note', text: noteZh }]),
    })}
    steps[steps.length - 1].action.value = output[i]
    steps[steps.length - 1].action.to = i
  }
  { const noteZh = `排序完成！[${data.join(', ')}]。计数排序是稳定的非比较排序，时间复杂度 O(n+k)`
  steps.push({
    ...makeStep(sid++, 6, noteZh, `Sorted! [${data.join(', ')}]. Counting sort is a stable non-comparison sort with O(n+k) time`, 'mark', data.map((_, k) => k), 'success', 0, 0, acc),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })}

  return { algorithm: 'counting_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' }, space: 'O(k)' }, initialState: { type: 'array', data: arr.map(v => Math.max(0, Math.floor(v))) }, steps }
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

    { const noteZh = `合并：左子数组 [${left.join(',')}] 和右子数组 [${right.join(',')}]，较小的先放入临时数组`
    steps.push({
      ...makeStep(sid++, 12, noteZh,
        `Merge: left [${left.join(',')}] and right [${right.join(',')}], smaller element goes into temp first`,
        'highlight', Array.from({ length: end - start + 1 }, (_, n) => start + n), 'primary', comps, 0, 0,
        sortTeachingWithAux(
          { start, mid, end, left_i: i, right_j: j },
          [auxArr('left', '左', left, [0]), auxArr('right', '右', right, [0]), auxArr('temp', '临时', [])],
          rng('left_part', '左子区间', start, mid + 1, 'unsorted'),
          rng('right_part', '右子区间', mid + 1, end + 1, 'unsorted'),
        ),
      ),
      ...evt([{ type: 'scene.note', text: noteZh }]),
    })}

    while (i < left.length && j < right.length) {
      steps.push({
        ...makeStep(sid++, 13,
          `比较 left[${i}]=${left[i]} ≤ right[${j}]=${right[j]}？取较小值放入临时数组`,
          `Compare left[${i}]=${left[i]} <= right[${j}]=${right[j]}? Take smaller into temp`,
          'compare', [start + i, mid + 1 + j], 'warning', ++comps, 0, 0,
          sortTeachingWithAux({ start, mid, end, left_i: i, right_j: j },
            [auxArr('left', '左', left, [i]), auxArr('right', '右', right, [j]), auxArr('temp', '临时', temp, [temp.length - 1])],
            rng('active', '合并区间', start, end + 1, 'current'),
          ),
        ),
        ...evt([{ type: 'array.compare', indices: [start + i, mid + 1 + j] }]),
      })
      if (left[i] <= right[j]) {
        temp.push(left[i])
        { const noteZh = `${left[i]} ≤ ${right[j]}，取左数组元素 ${left[i]} 放入 temp[${temp.length - 1}]（相等时优先取左边，保证稳定性）`
        steps.push({
          ...makeStep(sid++, 14, noteZh, `${left[i]} <= ${right[j]}, take left element ${left[i]} to temp[${temp.length - 1}] (take left first on equal, stable)`, 'highlight', [start + temp.length - 1], 'success', comps, 0, 0),
          ...evt([{ type: 'scene.note', text: noteZh }]),
        })}
        i++
      } else {
        temp.push(right[j])
        { const noteZh = `${right[j]} < ${left[i]}，取右数组元素 ${right[j]} 放入 temp[${temp.length - 1}]`
        steps.push({
          ...makeStep(sid++, 14, noteZh, `${right[j]} < ${left[i]}, take right element ${right[j]} to temp[${temp.length - 1}]`, 'highlight', [start + temp.length - 1], 'success', comps, 0, 0),
          ...evt([{ type: 'scene.note', text: noteZh }]),
        })}
        j++
      }
    }
    while (i < left.length) {
      temp.push(left[i])
      { const noteZh = `左子数组剩余元素 ${left[i]} 追加到 temp[${temp.length - 1}]`
      steps.push({
        ...makeStep(sid++, 16, noteZh, `Remaining left element ${left[i]} appended to temp[${temp.length - 1}]`, 'highlight', [start + temp.length - 1], 'muted', comps, 0, 0),
        ...evt([{ type: 'scene.note', text: noteZh }]),
      })}
      i++
    }
    while (j < right.length) {
      temp.push(right[j])
      { const noteZh = `右子数组剩余元素 ${right[j]} 追加到 temp[${temp.length - 1}]`
      steps.push({
        ...makeStep(sid++, 16, noteZh, `Remaining right element ${right[j]} appended to temp[${temp.length - 1}]`, 'highlight', [start + temp.length - 1], 'muted', comps, 0, 0),
        ...evt([{ type: 'scene.note', text: noteZh }]),
      })}
      j++
    }
    // Write back
    for (let k = 0; k < temp.length; k++) {
      data[start + k] = temp[k]
      { const noteZh = `将 temp[${k}]=${temp[k]} 写回原数组 arr[${start + k}]`
      steps.push({
        ...makeStep(sid++, 17, noteZh, `Write temp[${k}]=${temp[k]} back to arr[${start + k}]`, 'highlight', [start + k], 'success', comps, 0, 0,
        sortTeachingWithAux({ start, mid, end }, [auxArr('temp', '临时数组', temp, [k])])),
        ...evt([{ type: 'array.set_value', index: start + k, value: temp[k] }, { type: 'scene.note', text: noteZh }]),
      })}
      steps[steps.length - 1].action.value = temp[k]
      steps[steps.length - 1].action.to = start + k
    }
  }

  function mergeSort(data: number[], start: number, end: number) {
    if (start >= end) {
      if (start === end) {
        { const noteZh = `区间 [${start}] 只有一个元素 ${data[start]}，天然有序`
        steps.push({
          ...makeStep(sid++, 3, noteZh, `Range [${start}] has single element ${data[start]}, trivially sorted`, 'highlight', [start], 'muted', comps, 0, 0),
          ...evt([{ type: 'scene.note', text: noteZh }]),
        })}
      }
      return
    }
    const mid = Math.floor((start + end) / 2)
    { const noteZh = `分割区间 [${start}..${end}] → 左[${start}..${mid}] 右[${mid + 1}..${end}]，递归拆分直到单元素`
    steps.push({
      ...makeStep(sid++, 4, noteZh,
        `Split [${start}..${end}] → L[${start}..${mid}] R[${mid + 1}..${end}], recurse to single elements`,
        'compare', [start, end], 'primary', comps, 0, 0,
        sortTeaching(
          { start, end, mid },
          rng('active', '当前区间', start, end + 1, 'current'),
          rng('left_part', '左子区间', start, mid + 1, 'unsorted'),
          rng('right_part', '右子区间', mid + 1, end + 1, 'unsorted'),
        ),
      ),
      ...evt(sid === 2 ? [{ type: 'array.create', values: [...original] }] : [{ type: 'array.compare', indices: [start, end] }]),
    })}
    mergeSort(data, start, mid)
    mergeSort(data, mid + 1, end)
    merge(data, start, mid, end)
  }

  const data = [...arr]
  mergeSort(data, 0, data.length - 1)
  steps.push({
    ...makeStep(sid++, 18,
      `排序完成！[${data.join(', ')}]`,
      `Sorted! [${data.join(', ')}]`,
      'mark', data.map((_, k) => k), 'success', comps, 0, 0,
      sortTeaching({ done: true }, rng('sorted', '已排序', 0, data.length, 'sorted')),
    ),
    ...evt([{ type: 'array.mark_sorted', indices: data.map((_, k) => k) }]),
  })

  return { algorithm: 'merge_sort', presentation: { engine: 'scene', module: 'array' }, complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' }, initialState: { type: 'array', data: [...original] }, steps }
}

// ============ Binary Search Generator ============
export function generateBinarySearch(arr: number[], target?: number): AnimationScript {
  const sorted = [...arr].sort((a, b) => a - b)
  const t = target ?? sorted[Math.floor(sorted.length / 2)]
  const steps: AnimationStep[] = []
  let comps = 0, sid = 1, acc = 0

  { const noteZh = `有序数组 [${sorted.join(', ')}]，搜索 target=${t}`
  steps.push({
    ...makeStep(sid++, 1, noteZh, `Sorted array [${sorted.join(', ')}], search target=${t}`, 'highlight', [], 'primary', comps, 0, acc),
    ...evt([{ type: 'math.init', vars: [{ name: 'target', value: t }, { name: 'left', value: 0 }, { name: 'right', value: sorted.length - 1 }, { name: 'mid', value: 0 }] }, { type: 'array.create', values: sorted }]),
  })}

  let left = 0, right = sorted.length - 1
  while (left <= right) {
    const mid = Math.floor(left + (right - left) / 2)
    { const noteZh = `left=${left}, right=${right}，mid=${mid}，arr[${mid}]=${sorted[mid]}`
    steps.push({
      ...makeStep(sid++, 3, noteZh, `left=${left}, right=${right}, mid=${mid}, arr[${mid}]=${sorted[mid]}`, 'highlight', [mid], 'warning', comps, 0, acc += 2),
      ...evt([{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'left', value: left }, { type: 'math.set', name: 'right', value: right }, { type: 'math.set', name: 'mid', value: mid }]),
    })}
    { const noteZh = `比较 arr[${mid}]=${sorted[mid]} == target=${t}？`
    steps.push({
      ...makeStep(sid++, 4, noteZh, `Compare arr[${mid}]=${sorted[mid]} == target=${t}?`, 'compare', [mid], 'warning', ++comps, 0, acc),
      ...evt([{ type: 'array.compare', indices: [mid, mid] }]),
    })}

    if (sorted[mid] === t) {
      { const noteZh = `找到 target！arr[${mid}]=${t}`
      steps.push({
        ...makeStep(sid++, 5, noteZh, `Found target! arr[${mid}]=${t}`, 'mark', [mid], 'success', comps, 0, acc),
        ...evt([{ type: 'array.mark_sorted', indices: [mid] }]),
      })}
      return { algorithm: 'binary_search', presentation: { engine: 'scene' as const, module: 'array' as const }, complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' }, result: mid, initialState: { type: 'array', data: sorted }, steps }
    } else if (sorted[mid] < t) {
      { const noteZh = `${sorted[mid]} < ${t}，left = ${mid + 1}`
      steps.push({
        ...makeStep(sid++, 6, noteZh, `${sorted[mid]} < ${t}, left = ${mid + 1}`, 'highlight', [mid], 'muted', comps, 0, acc),
        ...evt([{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'left', value: mid + 1 }]),
      })}
      left = mid + 1
    } else {
      { const noteZh = `${sorted[mid]} > ${t}，right = ${mid - 1}`
      steps.push({
        ...makeStep(sid++, 6, noteZh, `${sorted[mid]} > ${t}, right = ${mid - 1}`, 'highlight', [mid], 'muted', comps, 0, acc),
        ...evt([{ type: 'scene.note', text: noteZh }, { type: 'math.set', name: 'right', value: mid - 1 }]),
      })}
      right = mid - 1
    }
  }
  { const noteZh = `未找到 target=${t}，返回 -1`
  steps.push({
    ...makeStep(sid++, 7, noteZh, `Target=${t} not found, return -1`, 'mark', [], 'danger', comps, 0, acc),
    ...evt([{ type: 'scene.note', text: noteZh }]),
  })}

  return { algorithm: 'binary_search', presentation: { engine: 'scene' as const, module: 'array' as const }, complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' }, result: -1, initialState: { type: 'array', data: sorted }, steps }
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
import { generateKmpAutomaton } from './kmpAutomaton'
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
import { generateBinaryTree } from './binaryTree'
import { generateAVLTree } from './avlTree'
import { generateTrie } from './trie'
import { generateBellmanFord } from './bellmanFord'
import { generateHashTable } from './hashTable'
import { generateBacktracking } from './backtracking'
import { generateLeetCode } from './leetcode'
import { generateACM } from './acm'
import { generateGCD } from './gcd'
import { generateBFS } from './bfsGraph'
import { generateDFS } from './dfsGraph'
import { generateDijkstra } from './dijkstra'
import { generatePrim } from './prim'
import { generateKruskal } from './kruskal'
import { generateTopologicalSort } from './topologicalSort'
import { generateFloyd } from './floyd'
import { generateAStar } from './aStar'
import { generateBTree } from './bTree'
import { generateBPlusTree } from './bPlusTree'
import { generateConvexHull } from './convexHull'
import { generateTarjanScc } from './tarjanScc'
export { generateBFS, generateDFS, generateDijkstra, generatePrim, generateKruskal, generateTopologicalSort, generateFloyd, generateAStar }
import { generateRadixSort } from './radixSort'
import { generateBucketSort } from './bucketSort'
import { generateReservoir } from './reservoir'
import type { GraphInput } from './bfsGraph'
import { generateDynamicLinkedListOp, generateDynamicBSTOp, generateDynamicBTreeOp, generateDynamicBPlusTreeOp } from './dynamicOperations'

// ─── Input parsing helpers for natural types ───

/** Wrap a (number[]) => AnimationScript fn to accept (unknown) => AnimationScript */
function numGen(fn: (arr: number[]) => AnimationScript): (input: unknown) => AnimationScript {
  return (input: unknown) => fn(parseArr(input))
}

function parseArr(input: unknown): number[] {
  if (Array.isArray(input) && input.every(v => typeof v === 'number')) return input
  if (Array.isArray(input)) return input.map(Number).filter(v => !isNaN(v))
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>
    for (const key of ['nums', 'arr', 'array', 'values', 'data', 'root', 'source']) {
      if (Array.isArray(obj[key])) return obj[key].map(Number).filter(v => !isNaN(v))
    }
  }
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

type TreeNodeInput = { id: string; value: number | string }
type TreeEdgeInput = { parentId: string; childId: string }
type NormalizedBinaryTreeInput = {
  rootId: string | null
  nodes: TreeNodeInput[]
  edges: TreeEdgeInput[]
  children: Record<string, string[]>
  targetSum: number
}

function normalizePathSumTreeInput(input: unknown): NormalizedBinaryTreeInput {
  const fallback = [10, 5, -3, 3, 2, null, 11, 3, -2, null, 1]
  const obj = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : undefined
  const targetSum = Number(obj?.targetSum ?? obj?.target ?? 8)

  if (obj && Array.isArray(obj.treeNodes) && obj.children && typeof obj.children === 'object') {
    const nodes = (obj.treeNodes as Array<{ id?: unknown; value?: unknown }>)
      .filter(node => node.id !== undefined)
      .map(node => ({
        id: String(node.id),
        value: typeof node.value === 'number' || typeof node.value === 'string' ? node.value : String(node.value ?? ''),
      }))
    const nodeIds = new Set(nodes.map(node => node.id))
    const children: Record<string, string[]> = {}
    for (const node of nodes) children[node.id] = []
    for (const [parent, rawChildren] of Object.entries(obj.children as Record<string, unknown>)) {
      if (!nodeIds.has(String(parent)) || !Array.isArray(rawChildren)) continue
      children[String(parent)] = rawChildren.map(String).filter(child => nodeIds.has(child))
    }
    const edges = Object.entries(children).flatMap(([parentId, childIds]) => childIds.map(childId => ({ parentId, childId })))
    return { rootId: obj.root === null || obj.root === undefined ? null : String(obj.root), nodes, edges, children, targetSum }
  }

  const source = Array.isArray(obj?.source)
    ? obj!.source as unknown[]
    : Array.isArray(obj?.root)
      ? obj!.root as unknown[]
      : Array.isArray(input)
        ? input as unknown[]
        : fallback

  return levelOrderToBinaryTreeInput(source, targetSum)
}

function levelOrderToBinaryTreeInput(values: unknown[], targetSum: number): NormalizedBinaryTreeInput {
  const present = values.map(value => value !== null && value !== undefined && value !== 'null')
  const nodes: TreeNodeInput[] = []
  const children: Record<string, string[]> = {}

  values.forEach((value, index) => {
    if (!present[index]) return
    const id = String(index)
    const numeric = Number(value)
    nodes.push({ id, value: Number.isFinite(numeric) ? numeric : String(value) })
    children[id] = []
  })

  for (let index = 0; index < values.length; index++) {
    if (!present[index]) continue
    const parentId = String(index)
    const left = index * 2 + 1
    const right = index * 2 + 2
    if (present[left]) children[parentId].push(String(left))
    if (present[right]) children[parentId].push(String(right))
  }

  const edges = Object.entries(children).flatMap(([parentId, childIds]) => childIds.map(childId => ({ parentId, childId })))
  return { rootId: present[0] ? '0' : null, nodes, edges, children, targetSum }
}

export function generatePathSumIII(input: unknown): AnimationScript {
  const tree = normalizePathSumTreeInput(input)
  let stepId = 1
  let accesses = 0
  let count = 0
  const steps: AnimationStep[] = []
  const values = new Map(tree.nodes.map(node => [node.id, Number(node.value)]))
  const nodeLabel = (id: string | null | undefined) => id == null ? 'null' : String(values.get(id) ?? id)
  const variables = (extra: Record<string, string | number> = {}): TeachingState => ({
    variables: {
      targetSum: tree.targetSum,
      count,
      ...extra,
    },
  })
  const push = (
    codeLine: number,
    zh: string,
    events: AnimationStep['events'],
    teachingState?: TeachingState,
    color: AnimationStep['action']['color'] = 'primary',
  ) => {
    steps.push({
      ...makeStep(stepId++, codeLine, zh, zh, 'highlight', [], color, 0, 0, accesses, teachingState),
      events,
    })
  }

  push(
    1,
    `按 LeetCode 层序输入构建二叉树，targetSum=${tree.targetSum}`,
    [
      { type: 'tree.create', variant: 'binary', rootId: tree.rootId ?? '', nodes: tree.nodes, edges: tree.edges },
      { type: 'math.init', vars: [
        { name: 'targetSum', value: tree.targetSum },
        { name: 'startNode', value: '-' },
        { name: 'currentNode', value: '-' },
        { name: 'remaining', value: tree.targetSum },
        { name: 'count', value: 0 },
      ] },
      { type: 'stack.create', values: [], label: '递归栈' },
    ],
    variables({ startNode: '-', currentNode: '-', remaining: tree.targetSum }),
  )

  if (!tree.rootId || tree.nodes.length === 0) {
    push(2, '空树没有路径，返回 0', [
      { type: 'math.highlight', name: 'count' },
      { type: 'scene.note', text: 'result = 0' },
    ], variables(), 'success')
    return {
      algorithm: 'path_sum_iii',
      complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(h)' },
      presentation: { engine: 'scene', module: 'tree', layout: 'composite' },
      initialState: { type: 'tree', data: [], root: tree.rootId ?? '', children: tree.children, treeNodes: tree.nodes },
      result: 0,
      steps,
    }
  }

  const explore = (startId: string, nodeId: string, remaining: number, path: string[], depth: number): number => {
    if (steps.length > 280) return 0
    const value = values.get(nodeId) ?? 0
    const nextRemaining = remaining - value
    const frame = `rootSum(${nodeLabel(nodeId)}, ${remaining})`
    accesses += 1
    push(
      4,
      `从起点 ${nodeLabel(startId)} 向下访问 ${nodeLabel(nodeId)}：remaining ${remaining} - ${value} = ${nextRemaining}`,
      [
        { type: 'tree.visit', nodeId },
        { type: 'math.set', name: 'currentNode', value: nodeLabel(nodeId), delta: `->${nodeLabel(nodeId)}` },
        { type: 'math.set', name: 'remaining', value: nextRemaining },
        { type: 'stack.push', value: frame, label: '递归栈' },
      ],
      variables({ startNode: nodeLabel(startId), currentNode: nodeLabel(nodeId), remaining: nextRemaining }),
      'warning',
    )

    let localCount = 0
    if (nextRemaining === 0) {
      count += 1
      localCount += 1
      push(
        5,
        `路径 ${[...path, nodeLabel(nodeId)].join(' -> ')} 的和等于 targetSum，count 加 1`,
        [
          { type: 'math.set', name: 'count', value: count, delta: '+1' },
          { type: 'stack.peek', index: path.length },
        ],
        variables({ startNode: nodeLabel(startId), currentNode: nodeLabel(nodeId), remaining: nextRemaining }),
        'success',
      )
    }

    const childIds = tree.children[nodeId] ?? []
    for (const childId of childIds) {
      localCount += explore(startId, childId, nextRemaining, [...path, nodeLabel(nodeId)], depth + 1)
    }

    push(
      7,
      `rootSum(${nodeLabel(nodeId)}, ${remaining}) 返回 ${localCount}`,
      [
        { type: 'stack.pop' },
        { type: 'math.set', name: 'remaining', value: remaining, delta: `->${remaining}` },
      ],
      variables({ startNode: nodeLabel(startId), currentNode: nodeLabel(nodeId), remaining }),
      depth === 0 ? 'primary' : 'muted',
    )
    return localCount
  }

  for (const node of tree.nodes) {
    if (steps.length > 280) break
    push(
      3,
      `枚举路径起点 ${node.value}，计算所有从该节点向下的路径`,
      [
        { type: 'tree.visit', nodeId: node.id },
        { type: 'math.set', name: 'startNode', value: nodeLabel(node.id), delta: `->${nodeLabel(node.id)}` },
        { type: 'math.set', name: 'remaining', value: tree.targetSum, delta: `->${tree.targetSum}` },
      ],
      variables({ startNode: nodeLabel(node.id), currentNode: '-', remaining: tree.targetSum }),
    )
    explore(node.id, node.id, tree.targetSum, [], 0)
  }

  push(
    9,
    `所有起点枚举完成，最终返回 count=${count}`,
    [
      { type: 'math.highlight', name: 'count' },
      { type: 'scene.note', text: `result = ${count}` },
    ],
    variables(),
    'success',
  )

  return {
    algorithm: 'path_sum_iii',
    complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(h)' },
    presentation: { engine: 'scene', module: 'tree', layout: 'composite' },
    initialState: { type: 'tree', data: [], root: tree.rootId, children: tree.children, treeNodes: tree.nodes },
    result: count,
    steps,
  }
}

// ─── Wrappers with natural input types ───

const binarySearchWrapper = (input: unknown) => {
  // parseArrayTargetCodeVars returns { nums, target, data, param } when a target is present
  const obj = (input && typeof input === 'object' && !Array.isArray(input)) ? input as Record<string, unknown> : undefined
  const arr = Array.isArray(obj?.data) ? obj!.data as number[]
    : Array.isArray(obj?.nums) ? obj!.nums as number[]
    : parseArr(input)
  const target = typeof obj?.target === 'number' ? obj.target as number
    : typeof obj?.param === 'number' ? obj.param as number
    : undefined
  return generateBinarySearch(arr, target)
}
const slidingWindowWrapper = (input: unknown) => generateSlidingWindow(parseArr(input), Math.min(3, parseArr(input).length))
const monotonicStackWrapper = (input: unknown) => generateMonotonicStack(parseArr(input))
const asKnapsackObj = (input: unknown) => {
  const o = (input && typeof input === 'object' && !Array.isArray(input)) ? input as Record<string, unknown> : null
  if (o && Array.isArray(o.weights) && Array.isArray(o.values)) {
    return {
      weights: (o.weights as unknown[]).map(Number).filter(v => !Number.isNaN(v)),
      values: (o.values as unknown[]).map(Number).filter(v => !Number.isNaN(v)),
      capacity: typeof o.capacity === 'number' ? o.capacity : undefined,
    }
  }
  return null
}
const knapsackWrapper = (input: unknown) => {
  const o = asKnapsackObj(input)
  if (o && o.weights.length > 0) {
    const w = o.weights.slice(0, 5), v = o.values.slice(0, 5)
    return generateKnapsack(w, v, o.capacity ?? Math.max(...w) + 3)
  }
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
const kmpAutomatonWrapper = (input: unknown) => {
  const [text, pattern] = parseStrs(input, 'ababaab', 'aba')
  return generateKmpAutomaton(pattern, text)
}
const fenwickWrapper = (input: unknown) => generateFenwick(parseArr(input).slice(0, 8))
const unboundedKnapsackWrapper = (input: unknown) => {
  const o = asKnapsackObj(input)
  if (o && o.weights.length > 0) {
    const w = o.weights.slice(0, 4), v = o.values.slice(0, 4)
    return generateUnboundedKnapsack(w, v, o.capacity ?? Math.max(...w) + 2)
  }
  const arr = parseArr(input)
  return generateUnboundedKnapsack(arr.slice(0, 3), arr.slice(0, 3).map(v => v * 2), Math.max(...arr.slice(0, 3)) + 2)
}
const matrixChainWrapper = (input: unknown) => generateMatrixChain(parseArr(input).slice(0, 5).map(n => Math.max(5, n)))
const sudokuWrapper = (input: unknown) => generateSudoku(input)
const manacherWrapper = (input: unknown) => generateManacher(parseStr(input, 'babad'))
const segmentTreeWrapper = (input: unknown) => generateSegmentTree(parseArr(input).slice(0, 6))
const intervalDPWrapper = (input: unknown) => generateIntervalDP(parseArr(input).slice(0, 5))
const stackWrapper = (input: unknown) => generateStack(parseArr(input))

const queueWrapper = (input: unknown) => generateQueue(parseArr(input))
const heapWrapper = (input: unknown) => generateHeapOperations(parseArr(input).slice(0, 6))
const reservoirWrapper = (input: unknown) => generateReservoir(parseArr(input))
const unionFindWrapper = (input: unknown) => {
  // 边列表数组形式
  if (Array.isArray(input) && input.length > 0 && Array.isArray(input[0])) return generateUnionFind(input as number[][])
  // 图对象形式 {nodes, edges}(来自 parseGraphInput/parseGraphCodeVars)
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const o = input as { nodes?: unknown[]; edges?: Array<{ source: string | number; target: string | number }> }
    if (Array.isArray(o.edges)) {
      const edges = o.edges
        .map(e => [Number(e.source), Number(e.target)])
        .filter(p => p.every(x => !Number.isNaN(x)))
      const nodeCount = Array.isArray(o.nodes) ? o.nodes.length : undefined
      if (edges.length > 0) return generateUnionFind(edges, nodeCount)
    }
  }
  return generateUnionFind()
}
const binaryTreeWrapper = (input: unknown) => generateBinaryTree(parseArr(input))
const pathSumIIIWrapper = (input: unknown) => generatePathSumIII(input)
const avlTreeWrapper = (input: unknown) => generateAVLTree(parseArr(input))
const trieWrapper = (input: unknown) => {
  if (Array.isArray(input) && input.every(v => typeof v === 'string')) return generateTrie(input as string[])
  return generateTrie()
}
const btreeWrapper = (input: unknown) => generateBTree(input)
const bplusTreeWrapper = (input: unknown) => generateBPlusTree(input)

const hashTableWrapper = (input: unknown) => {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const o = input as Record<string, unknown>
    // 输入解析为 { pairs: {...} } 时取出 pairs；否则把对象本身当键值表。
    const pairs = (o.pairs && typeof o.pairs === 'object' && !Array.isArray(o.pairs)) ? o.pairs as Record<string, string> : o as Record<string, string>
    return generateHashTable(pairs)
  }
  return generateHashTable()
}
const backtrackingWrapper = (input: unknown) => generateBacktracking(parseArr(input))
const leetcodeWrapper = (input: unknown) => generateLeetCode(input)
const gcdWrapper = (input: unknown) => generateGCD(input)
const acmWrapper = (input: unknown) => generateACM(input)
function parseGraphInput(input: unknown): GraphInput {
  // ── 1. Handle string input (raw code / LeetCode format) ──────────────
  if (typeof input === 'string' && input.trim().length > 0) {
    const s = input.trim()
    // Try JSON parse first
    try {
      const parsed = JSON.parse(s)
      if (parsed && typeof parsed === 'object') return parseGraphInput(parsed)
    } catch { /* not JSON, parse as code */ }
    return parseCodeGraphString(s)
  }

  // ── 2. Handle object input (JSON) ───────────────────────────────────
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>

    // 2a. Full format: { nodes: [...], edges: [...] }
    if (Array.isArray(obj.nodes) && Array.isArray(obj.edges)) {
      const nodes = obj.nodes as Array<{ id?: string; label?: string }>
      const edges = obj.edges as Array<{ source?: string; target?: string; weight?: number }>
      return {
        nodes: nodes.map((n, i) => ({ id: n.id ?? String(i), label: n.label ?? n.id ?? String(i) })),
        edges: edges.map(e => ({ source: e.source ?? '0', target: e.target ?? '0', weight: e.weight })),
      }
    }

    // 2b. Edge-list format: [[u,v], [v,w], ...] or [[u,v,w], ...]
    if (Array.isArray(obj) && obj.length > 0 && Array.isArray(obj[0])) {
      const edgePairs = obj as unknown[][]
      const nodeSet = new Set<string>()
      const edges: GraphInput['edges'] = []
      for (const pair of edgePairs) {
        if (Array.isArray(pair) && pair.length >= 2) {
          const s = String(pair[0]), t = String(pair[1])
          nodeSet.add(s); nodeSet.add(t)
          edges.push({ source: s, target: t, weight: pair.length >= 3 ? Number(pair[2]) : undefined })
        }
      }
      return { nodes: Array.from(nodeSet).map(id => ({ id, label: id })), edges }
    }

    // 2c. { n: 5, edges: [[0,1],[1,2]] }
    if (Array.isArray(obj.edges)) {
      const edgePairs = obj.edges as unknown[][]
      let n: number | undefined = typeof obj.n === 'number' ? obj.n : undefined
      const edges: GraphInput['edges'] = []
      let maxId = -1
      for (const pair of edgePairs) {
        if (Array.isArray(pair) && pair.length >= 2) {
          const s = String(pair[0]), t = String(pair[1])
          const si = parseInt(s), ti = parseInt(t)
          if (!isNaN(si)) maxId = Math.max(maxId, si)
          if (!isNaN(ti)) maxId = Math.max(maxId, ti)
          edges.push({ source: s, target: t, weight: pair.length >= 3 ? Number(pair[2]) : undefined })
        }
      }
      if (n === undefined) n = maxId + 1
      const nodeCount = Math.max(n, edges.length > 0 ? maxId + 1 : 5)
      return {
        nodes: Array.from({ length: nodeCount }, (_, i) => ({ id: String(i), label: String(i) })),
        edges,
      }
    }
  }

  // ── 3. Default fallback graph ───────────────────────────────────────
  return {
    nodes: [
      { id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' },
      { id: '3', label: 'D' }, { id: '4', label: 'E' }, { id: '5', label: 'F' },
    ],
    edges: [
      { source: '0', target: '1' }, { source: '0', target: '2' },
      { source: '1', target: '3' }, { source: '1', target: '4' }, { source: '2', target: '5' },
    ],
  }
}

/** Parse a natural code-format graph description string into GraphInput */
function parseCodeGraphString(s: string): GraphInput {
  // Strip comments and normalize
  s = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  s = s.replace(/const\s+|let\s+|var\s+|int\s+|vector.*?>\s*/g, '')
  s = s.replace(/;\s*$/gm, '')

  let n: number | undefined
  let edges: unknown[][] | undefined

  // ── Extract n = <number> ────────────────────────────────────────────
  const nMatch = s.match(/\bn\s*[:=]\s*(\d+)/)
  if (nMatch) n = parseInt(nMatch[1])

  // ── Extract edges = [[...], [...], ...] ──────────────────────────────
  const edgesBlock = extractArrayBlock(s, 'edges')
  if (edgesBlock) {
    try { edges = JSON.parse(edgesBlock) } catch { /* ignore */ }
  }

  // ── If no 'edges=' found, try the last big array in the string ──────
  if (!edges) {
    const allArrays = [...s.matchAll(/\[[\s\S]*?\]/g)]
    for (let i = allArrays.length - 1; i >= 0; i--) {
      const match = allArrays[i][0]
      try {
        const parsed = JSON.parse(match)
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
          edges = parsed
          break
        }
      } catch { continue }
    }
  }

  // ── Build GraphInput ────────────────────────────────────────────────
  if (edges && edges.length > 0) {
    const nodeSet = new Set<string>()
    const graphEdges: GraphInput['edges'] = []
    let maxId = -1
    for (const pair of edges) {
      if (Array.isArray(pair) && pair.length >= 2) {
        const s = String(pair[0]), t = String(pair[1])
        const si = parseInt(s), ti = parseInt(t)
        if (!isNaN(si)) maxId = Math.max(maxId, si)
        if (!isNaN(ti)) maxId = Math.max(maxId, ti)
        nodeSet.add(s); nodeSet.add(t)
        graphEdges.push({ source: s, target: t, weight: pair.length >= 3 ? Number(pair[2]) : undefined })
      }
    }

    if (n === undefined) n = Math.max(maxId + 1, nodeSet.size)
    const nodeCount = Math.max(n, maxId + 1)

    // Use the full range 0..n-1 even if some nodes aren't in edges
    return {
      nodes: Array.from({ length: nodeCount }, (_, i) => ({ id: String(i), label: String(i) })),
      edges: graphEdges,
    }
  }

  // ── Fallback ─────────────────────────────────────────────────────────
  return {
    nodes: [{ id: '0', label: 'A' }, { id: '1', label: 'B' }, { id: '2', label: 'C' }, { id: '3', label: 'D' }, { id: '4', label: 'E' }, { id: '5', label: 'F' }],
    edges: [{ source: '0', target: '1' }, { source: '0', target: '2' }, { source: '1', target: '3' }, { source: '1', target: '4' }, { source: '2', target: '5' }],
  }
}

/** Extract a JSON array value following a variable assignment like `varname = [...]` */
function extractArrayBlock(text: string, varName: string): string | null {
  const re = new RegExp(`\\b${varName}\\s*[:=]\\s*(\\[[\\s\\S]*?\\])\\s*(?:[,;]|$)`, 'm')
  const m = text.match(re)
  if (m && m[1]) {
    // Find the matching closing bracket
    let depth = 0, end = 0
    for (let i = 0; i < m[1].length; i++) {
      if (m[1][i] === '[') depth++
      else if (m[1][i] === ']') { depth--; if (depth === 0) { end = i + 1; break } }
    }
    return m[1].slice(0, end)
  }
  return null
}

const bfsWrapper = (input: unknown) => generateBFS(parseGraphInput(input))
const dfsWrapper = (input: unknown) => generateDFS(parseGraphInput(input))
const dijkstraWrapper = (input: unknown) => generateDijkstra(parseGraphInput(input))
const primWrapper = (input: unknown) => generatePrim(parseGraphInput(input))
const kruskalWrapper = (input: unknown) => generateKruskal(parseGraphInput(input))
const topoWrapper = (input: unknown) => generateTopologicalSort(parseGraphInput(input))
const floydWrapper = (input: unknown) => {
  if (Array.isArray(input) && input.length > 0 && Array.isArray(input[0])) return generateFloyd(input as number[][])
  if (typeof input === 'object' && input !== null && Array.isArray((input as Record<string, unknown>).matrix)) return generateFloyd((input as Record<string, unknown>).matrix as number[][])
  return generateFloyd()
}
const tarjanSccWrapper = (input: unknown) => generateTarjanScc(parseGraphInput(input))
const aStarWrapper = (input: unknown) => {
  const graph = parseGraphInput(input)
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>
    return generateAStar({
      ...graph,
      start: typeof obj.start === 'string' ? obj.start : undefined,
      goal: typeof obj.goal === 'string' ? obj.goal : undefined,
      heuristics: typeof obj.heuristics === 'object' ? obj.heuristics as Record<string, number> : undefined,
    })
  }
  return generateAStar(graph)
}
const bellmanFordWrapper = (input: unknown) => generateBellmanFord(input)

const linkedListInsertWrapper = (input: unknown) => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 5
  return generateDynamicLinkedListOp('insert', arr, param)
}
const linkedListDeleteWrapper = (input: unknown) => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 3
  return generateDynamicLinkedListOp('delete', arr, param)
}
const linkedListSearchWrapper = (input: unknown) => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 3
  return generateDynamicLinkedListOp('search', arr, param)
}

const bstInsertWrapper = (input: unknown) => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 5
  return generateDynamicBSTOp('insert', arr, param)
}
const bstDeleteWrapper = (input: unknown) => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 14
  return generateDynamicBSTOp('delete', arr, param)
}
const bstSearchWrapper = (input: unknown) => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 10
  return generateDynamicBSTOp('search', arr, param)
}

const btreeSearchWrapper = (input: unknown): AnimationScript => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 17
  return generateDynamicBTreeOp('search', arr, param)!
}
const btreeInsertWrapper = (input: unknown): AnimationScript => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 15
  return generateDynamicBTreeOp('insert', arr, param)!
}
const bplusSearchWrapper = (input: unknown): AnimationScript => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'number' ? obj.param : 45
  return generateDynamicBPlusTreeOp('search', arr, param)!
}
const bplusRangeWrapper = (input: unknown): AnimationScript => {
  const obj = input as Record<string, unknown> | null | undefined
  const arr = Array.isArray(obj?.data) ? obj.data : parseArr(input)
  const param = typeof obj?.param === 'string' ? obj.param : '30, 60'
  return generateDynamicBPlusTreeOp('range_query', arr, param)!
}

/** Parse an array of [x, y] point pairs from natural input; ignore malformed input. */
function parsePoints(input: unknown): Array<[number, number]> | undefined {
  const raw = Array.isArray(input)
    ? input
    : (input && typeof input === 'object'
        ? (Array.isArray((input as Record<string, unknown>).points)
            ? (input as Record<string, unknown>).points as unknown[]
            : Array.isArray((input as Record<string, unknown>).data)
              ? (input as Record<string, unknown>).data as unknown[]
              : undefined)
        : undefined)
  if (!raw) return undefined
  const pts = raw
    .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number')
    .map(p => [p[0], p[1]] as [number, number])
  return pts.length >= 3 ? pts : undefined
}
const convexHullWrapper = (input: unknown) => generateConvexHull(parsePoints(input))

const GENERATORS: Record<string, (input: unknown) => AnimationScript> = {
  bubble_sort: numGen(generateBubbleSort), selection_sort: numGen(generateSelectionSort),
  insertion_sort: numGen(generateInsertionSort), merge_sort: numGen(generateMergeSort),
  quick_sort: numGen(generateQuickSort), heap_sort: numGen(generateHeapSort),
  shell_sort: numGen(generateShellSort), counting_sort: numGen(generateCountingSort),
  binary_search: binarySearchWrapper, sliding_window: slidingWindowWrapper,
  monotonic_stack: monotonicStackWrapper, knapsack_01: knapsackWrapper,
  lcs: lcsWrapper, n_queens: nQueensWrapper, lis: lisWrapper,
  edit_distance: editDistanceWrapper, kmp: kmpWrapper,
  kmp_automaton: kmpAutomatonWrapper,
  fenwick_tree: fenwickWrapper, unbounded_knapsack: unboundedKnapsackWrapper,
  matrix_chain: matrixChainWrapper, sudoku: sudokuWrapper,
  manacher: manacherWrapper, segment_tree: segmentTreeWrapper,
  interval_dp: intervalDPWrapper, stack: stackWrapper,
  bfs_graph: bfsWrapper, dfs_graph: dfsWrapper,
  dijkstra: dijkstraWrapper, prim: primWrapper, kruskal: kruskalWrapper,
  topological_sort: topoWrapper, floyd: floydWrapper, a_star: aStarWrapper,
  tarjan_scc: tarjanSccWrapper,
  queue: queueWrapper, heap_ds: heapWrapper, union_find: unionFindWrapper,
  bellman_ford: bellmanFordWrapper,
  linked_list_insert: linkedListInsertWrapper,
  linked_list_delete: linkedListDeleteWrapper,
  linked_list_search: linkedListSearchWrapper,
  binary_tree_traverse: binaryTreeWrapper,
  path_sum_iii: pathSumIIIWrapper,
  bst_insert: bstInsertWrapper,
  bst_delete: bstDeleteWrapper,
  bst_search: bstSearchWrapper,
  avl_insert: avlTreeWrapper,
  trie: trieWrapper, btree: btreeWrapper, bplus_tree: bplusTreeWrapper,
  btree_search: btreeSearchWrapper, btree_insert: btreeInsertWrapper,
  bplus_tree_search: bplusSearchWrapper, bplus_tree_range_query: bplusRangeWrapper,
  hash_table: hashTableWrapper,
  backtracking: backtrackingWrapper,
  radix_sort: numGen(generateRadixSort), bucket_sort: numGen(generateBucketSort),
  leetcode_hot100: leetcodeWrapper, gcd_euclidean: gcdWrapper, acm_templates: acmWrapper,
  convex_hull: convexHullWrapper,
  reservoir_sampling: reservoirWrapper,
}

/** 所有内置预设算法 id（供输出完整性回归测试枚举）。 */
export const PRESET_IDS = Object.keys(GENERATORS)

export function generatePreset(algoId: string, inputData: unknown): AnimationScript | undefined {
  const gen = GENERATORS[algoId]
  if (gen) return withInferredResult(algoId, inputData, gen(inputData))
  return undefined
}

function withInferredResult(algoId: string, inputData: unknown, script: AnimationScript): AnimationScript {
  if (script.result !== undefined) return script
  const result = inferPresetResult(algoId, inputData, script)
  return result === undefined ? script : { ...script, result }
}

function inferPresetResult(algoId: string, inputData: unknown, script: AnimationScript): AnimationScript['result'] | undefined {
  switch (algoId) {
    case 'binary_search': {
      const obj = (inputData && typeof inputData === 'object' && !Array.isArray(inputData)) ? inputData as Record<string, unknown> : undefined
      const arr = (Array.isArray(obj?.data) ? obj!.data as number[] : Array.isArray(obj?.nums) ? obj!.nums as number[] : parseArr(inputData))
        .map(Number)
        .filter(v => !Number.isNaN(v))
        .sort((a, b) => a - b)
      const target = typeof obj?.target === 'number' ? obj.target as number
        : typeof obj?.param === 'number' ? obj.param as number
        : arr[Math.floor(arr.length / 2)]
      return arr.indexOf(target)
    }
    case 'gcd_euclidean': {
      const arr = parseArr(inputData)
      const a = Math.abs(arr[0] ?? 48)
      const b = Math.abs(arr[1] ?? 18)
      return gcd(a, b)
    }
    case 'lis': {
      const arr = parseArr(inputData)
      return lisLength(arr)
    }
    case 'lcs': {
      const [a, b] = parseStrs(inputData, 'ABCBDAB', 'BDCABA')
      return lcsLength(a, b)
    }
    case 'edit_distance': {
      const [a, b] = parseStrs(inputData, 'horse', 'ros')
      return editDistance(a, b)
    }
    case 'kmp': {
      const [text, pattern] = parseStrs(inputData, 'ABABABCABABABCABAB', 'ABABC')
      return text.indexOf(pattern)
    }
    case 'manacher': {
      return longestPalindrome(parseStr(inputData, 'babad'))
    }
    case 'knapsack_01': {
      const arr = parseArr(inputData).slice(0, 4)
      return knapsack01(arr, arr.map((_, i) => (arr[i] || 1) * 2), Math.max(...arr) + 3)
    }
    case 'unbounded_knapsack': {
      const arr = parseArr(inputData).slice(0, 3)
      return unboundedKnapsack(arr, arr.map(v => v * 2), Math.max(...arr) + 2)
    }
    case 'matrix_chain': {
      return matrixChainCost(parseArr(inputData).slice(0, 5).map(n => Math.max(5, n)))
    }
    case 'n_queens': {
      return nQueensCount(Math.max(4, Math.min(8, parseNum(inputData, 4))))
    }
    case 'bfs_graph':
    case 'dfs_graph':
    case 'topological_sort':
      return scriptTraversalResult(script)
    case 'convex_hull': {
      // 凸包：从最终场景的多边形/线段还原顶点；退化时返回点数说明。
      const pts = parsePointsForResult(inputData)
      const hull = andrewHull(pts)
      return hull.length > 0 ? hull.map(([x, y]) => `(${x},${y})`) : undefined
    }
    case 'kmp_automaton': {
      const [pattern, text] = parseStrs(inputData, 'aba', 'ababaab')
      return kmpMatchIndices(pattern, text)
    }
    default:
      // 通用兜底链：访问顺序(图/树/链表 visit) → 最终矩阵 → 最终场景结构值。
      return scriptVisitOrder(script) ?? finalMatrixFromScript(script) ?? genericResultFromScene(script)
  }
}

/** Andrew 单调链凸包(下+上链)，用于输出顶点。 */
function andrewHull(input: Array<[number, number]>): Array<[number, number]> {
  const pts = [...new Set(input.map(p => `${p[0]},${p[1]}`))].map(s => s.split(',').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length <= 2) return pts
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Array<[number, number]> = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Array<[number, number]> = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

function parsePointsForResult(input: unknown): Array<[number, number]> {
  if (Array.isArray(input)) {
    const pts = input.filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number')
      .map(p => [p[0], p[1]] as [number, number])
    if (pts.length >= 3) return pts
  }
  return [[0, 0], [5, 0], [5, 5], [0, 5], [2, 2], [3, 1]]
}

/** KMP 返回所有匹配起始下标。 */
function kmpMatchIndices(pattern: string, text: string): number[] {
  const m = pattern.length
  if (m === 0) return []
  const fail = new Array(m).fill(0)
  for (let i = 1, k = 0; i < m; i++) {
    while (k > 0 && pattern[i] !== pattern[k]) k = fail[k - 1]
    if (pattern[i] === pattern[k]) k++
    fail[i] = k
  }
  const res: number[] = []
  for (let i = 0, state = 0; i < text.length; i++) {
    while (state > 0 && text[i] !== pattern[state]) state = fail[state - 1]
    if (text[i] === pattern[state]) state++
    if (state === m) { res.push(i - m + 1); state = fail[state - 1] }
  }
  return res
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

function lisLength(arr: number[]): number {
  const tails: number[] = []
  for (const value of arr) {
    let left = 0, right = tails.length
    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      if (tails[mid] < value) left = mid + 1
      else right = mid
    }
    tails[left] = value
  }
  return tails.length
}

function lcsLength(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_v, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1
    }
  }
  return dp[a.length][b.length]
}

function longestPalindrome(text: string): string {
  let bestStart = 0, bestLen = 0
  const expand = (leftStart: number, rightStart: number) => {
    let left = leftStart, right = rightStart
    while (left >= 0 && right < text.length && text[left] === text[right]) {
      left--
      right++
    }
    const len = right - left - 1
    if (len > bestLen) {
      bestStart = left + 1
      bestLen = len
    }
  }
  for (let i = 0; i < text.length; i++) {
    expand(i, i)
    expand(i, i + 1)
  }
  return text.slice(bestStart, bestStart + bestLen)
}

function knapsack01(weights: number[], values: number[], capacity: number): number {
  const dp = Array(capacity + 1).fill(0)
  for (let i = 0; i < weights.length; i++) {
    for (let c = capacity; c >= weights[i]; c--) {
      dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i])
    }
  }
  return dp[capacity]
}

function unboundedKnapsack(weights: number[], values: number[], capacity: number): number {
  const dp = Array(capacity + 1).fill(0)
  for (let i = 0; i < weights.length; i++) {
    for (let c = weights[i]; c <= capacity; c++) {
      dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i])
    }
  }
  return dp[capacity]
}

function matrixChainCost(dims: number[]): number {
  if (dims.length < 2) return 0
  const n = dims.length - 1
  const dp = Array.from({ length: n }, () => Array(n).fill(0))
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1
      dp[i][j] = Infinity
      for (let k = i; k < j; k++) {
        dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1])
      }
    }
  }
  return dp[0][n - 1]
}

function nQueensCount(n: number): number {
  let count = 0
  const cols = new Set<number>()
  const diag1 = new Set<number>()
  const diag2 = new Set<number>()
  const place = (row: number) => {
    if (row === n) {
      count++
      return
    }
    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue
      cols.add(col); diag1.add(row - col); diag2.add(row + col)
      place(row + 1)
      cols.delete(col); diag1.delete(row - col); diag2.delete(row + col)
    }
  }
  place(0)
  return count
}

function scriptTraversalResult(script: AnimationScript): Array<number | string | boolean> | undefined {
  // 仅图遍历(visit_node)——供 bfs/dfs/topo 精确使用。
  const output = script.steps
    .flatMap(step => step.events ?? [])
    .filter(event => event.type === 'graph.visit_node')
    .map(event => (event as { nodeId: string }).nodeId)
  return output.length > 0 ? output : undefined
}

/** 访问顺序兜底：图/树/链表的 visit 事件序列(去重保序)。 */
function scriptVisitOrder(script: AnimationScript): Array<number | string> | undefined {
  const ids: Array<string> = []
  for (const step of script.steps) {
    for (const ev of step.events ?? []) {
      if (ev.type === 'graph.visit_node' || ev.type === 'tree.visit' || ev.type === 'linked_list.visit') {
        ids.push((ev as { nodeId: string }).nodeId)
      }
    }
  }
  return ids.length > 0 ? ids : undefined
}

/** 矩阵类(floyd/interval_dp/sudoku 等)：用 initialState.matrix 应用所有 update_cell 得最终矩阵。 */
function finalMatrixFromScript(script: AnimationScript): AnimationScript['result'] | undefined {
  const base = script.initialState.matrix
  if (!base || base.length === 0) return undefined
  const m: Array<Array<number | string>> = base.map(row => [...row])
  for (const step of script.steps) {
    for (const ev of step.events ?? []) {
      if (ev.type === 'matrix.update_cell') {
        const e = ev as { row: number; col: number; value: number | string }
        if (m[e.row] && e.col < m[e.row].length) m[e.row][e.col] = e.value
      }
    }
  }
  // result 不支持二维数组 → 转成可读的逐行字符串。
  return m.map(row => `[${row.join(', ')}]`).join('  ')
}

/**
 * 通用输出兜底：把脚本回放到最终场景，按结构前缀(数组/堆/栈/队列/集合/水塘等)
 * 取出最终结构的值序列作为「输出结果」。覆盖大多数数据结构类算法,无需逐个写死。
 */
function genericResultFromScene(script: AnimationScript): AnimationScript['result'] | undefined {
  const norm = (v: unknown) =>
    typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' ? v : String(v ?? '')
  try {
    const scene = deriveSceneState(script, script.steps.length)
    const ents = Object.values(scene.entities)

    // 1. 有序结构单元(数组/堆/栈/队列/集合/水塘/位集),按下标排序取值。
    const prefixes = ['arr_', 'heap_', 'stack_', 'queue_', 'deque_', 'set_', 'prob_res_', 'bit_']
    for (const prefix of prefixes) {
      const re = new RegExp(`^${prefix}(\\d+)$`)
      const cells = ents
        .filter(e => e.type === 'cell' && re.test(e.id))
        .sort((a, b) => Number(a.id.match(re)![1]) - Number(b.id.match(re)![1]))
      if (cells.length > 0) return cells.map(c => norm((c as { value?: unknown }).value))
    }

    // 2. 结点型结构(树/链表/并查集/图)：取结点 value 字段。
    const nodeVals = ents
      .filter((e): e is typeof e & { fields?: Array<{ id: string; role?: string; value?: unknown }> } => e.type === 'node')
      .map(n => {
        const f = (n.fields ?? []).find(ff => ff.id === 'value' || ff.role === 'value') ?? (n.fields ?? [])[0]
        return f?.value
      })
      .filter(v => v !== undefined && v !== null && v !== '')
    if (nodeVals.length > 0) return nodeVals.map(norm)

    // 3. 兜底：任何带值的结构性单元(排除变量面板/几何/自动机/概率柱/表头/占位)。
    const skip = ['mathvar_', 'geo_', 'auto_', 'prob_bin_', 'gan_']
    const cells = ents.filter(e =>
      e.type === 'cell' &&
      (e as { value?: unknown }).value != null && (e as { value?: unknown }).value !== '' &&
      !skip.some(s => e.id.startsWith(s)) &&
      e.state?.role !== 'header' && e.state?.role !== 'empty_placeholder',
    )
    if (cells.length > 0) return cells.map(c => norm((c as { value?: unknown }).value))
  } catch {
    /* 回放失败则放弃通用兜底 */
  }
  return undefined
}

export function hasGenerator(algoId: string): boolean {
  return algoId in GENERATORS
}
