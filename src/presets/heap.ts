import type { AnimationScript } from '@/types/animation'

/**
 * 最小堆操作演示（上浮 / 下沉）。
 *
 * 使用专用的 heap.* 事件族（heapCompiler + HeapView），把堆渲染为完全二叉树的
 * heap_<i> 结点 —— 不再借用 tree.* 模块。每次 push 后逐步上浮、pop 后逐步下沉，
 * 每一步交换都用 heap.sift（固定位置交换数值）。由于 heap 结点是 cell，补间层的
 * 「值互换检测」会自动把 sift 渲染成两结点沿直线交叉的动画。
 */
export function generateHeapOperations(_arr?: number[]): AnimationScript {
  const data = (_arr && _arr.length > 0) ? _arr : [4, 10, 3, 5, 1, 2]
  const steps: AnimationScript['steps'] = []
  let sid = 1
  let swaps = 0

  const push = (
    codeLine: number,
    description: { zh: string; en: string },
    events: AnimationScript['steps'][number]['events'],
    action: AnimationScript['steps'][number]['action'],
    comparisons: number,
  ) => {
    steps.push({ stepId: sid++, codeLine, description, action, events, stats: { comparisons, swaps, accesses: 0 } })
  }

  // 本地堆，镜像场景中的 heap_<i> 取值，用于计算上浮/下沉的目标下标。
  const heap: number[] = [data[0]]

  // Step 1: 用首元素建堆（避免空白首帧），并标明这是最小堆。
  push(
    3,
    { zh: `创建最小堆，插入根 ${data[0]}（父节点 ≤ 子节点）`, en: `Create min-heap, insert root ${data[0]} (parent ≤ children)` },
    [{ type: 'heap.create', values: [data[0]], variant: 'min' }],
    { type: 'insert', targets: [0], color: 'success' },
    0,
  )

  // 依次插入其余元素，每次 push 后上浮。
  for (let idx = 1; idx < data.length; idx++) {
    const v = data[idx]
    heap.push(v)
    let i = heap.length - 1
    const parentIdx = (i - 1) >> 1

    push(
      4,
      { zh: `push(${v})：追加到末尾 index ${i}（h${parentIdx} 的子节点），准备上浮`, en: `push(${v}): append at index ${i} (child of h${parentIdx}), then bubble up` },
      [{ type: 'heap.push', value: v }],
      { type: 'insert', targets: [i], color: 'warning' },
      sid,
    )

    // 上浮：子 < 父则交换（最小堆）。
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p] <= heap[i]) break
      swaps++
      push(
        6,
        { zh: `上浮：h${i}=${heap[i]} < h${p}=${heap[p]}，交换（子 < 父，违反堆序）`, en: `Bubble up: h${i}=${heap[i]} < h${p}=${heap[p]}, swap (child < parent)` },
        [{ type: 'heap.sift', from: i, to: p }],
        { type: 'swap', targets: [p, i], color: 'warning' },
        sid,
      )
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
  }

  push(
    9,
    { zh: `插入完成，当前堆: [${heap.join(', ')}]`, en: `Inserts done, heap: [${heap.join(', ')}]` },
    [{ type: 'scene.clear_highlight' }],
    { type: 'mark', targets: [], color: 'success' },
    sid,
  )

  // extractMin：弹出堆顶，末元素补位到根，随后下沉。
  if (heap.length > 0) {
    const top = heap[0]
    const last = heap[heap.length - 1]
    push(
      12,
      { zh: `extractMin()：弹出堆顶最小值 ${top}，末元素 ${last} 补位到根，随后下沉`, en: `extractMin(): pop min ${top}, move last ${last} to root, then sink` },
      [{ type: 'heap.pop' }],
      { type: 'delete', targets: [0], color: 'danger' },
      sid,
    )
    heap.pop()
    if (heap.length > 0) heap[0] = last

    // 下沉：与较小的子节点交换，直到满足堆序。
    let i = 0
    while (true) {
      const l = 2 * i + 1
      const r = 2 * i + 2
      let smallest = i
      if (l < heap.length && heap[l] < heap[smallest]) smallest = l
      if (r < heap.length && heap[r] < heap[smallest]) smallest = r
      if (smallest === i) break
      swaps++
      push(
        15,
        { zh: `下沉：h${i}=${heap[i]} > h${smallest}=${heap[smallest]}，与较小子节点交换`, en: `Sink: h${i}=${heap[i]} > h${smallest}=${heap[smallest]}, swap with smaller child` },
        [{ type: 'heap.sift', from: i, to: smallest }],
        { type: 'swap', targets: [i, smallest], color: 'warning' },
        sid,
      )
      ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
      i = smallest
    }
  }

  push(
    19,
    { zh: `堆操作完成。最终堆: [${heap.join(', ')}]`, en: `Heap ops done. Final heap: [${heap.join(', ')}]` },
    [{ type: 'scene.clear_highlight' }],
    { type: 'mark', targets: [], color: 'success' },
    sid,
  )

  return {
    algorithm: 'heap_ds',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'heap' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
