import type { AnimationScript } from '@/types/animation'

export function generateHeapOperations(_arr?: number[]): AnimationScript {
  const data = (_arr && _arr.length > 0) ? _arr : [3, 1, 6, 5, 2, 4]
  const steps: AnimationScript['steps'] = []
  let sid = 1

  // Step 1: Create initial empty heap
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '最小堆 (Min-Heap) 操作演示 — 将依次插入 [3, 1, 6, 5, 2, 4]', en: 'Min-Heap operations — insert [3, 1, 6, 5, 2, 4] one by one' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'scene.note', text: '最小堆：父节点 ≤ 子节点' }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Build heap by inserting elements one by one
  const heap: number[] = []
  const initialHeap = [...heap]
  for (let idx = 0; idx < data.length; idx++) {
    const v = data[idx]
    heap.push(v)
    let i = heap.length - 1

    if (heap.length === 1) {
      // First element — create root
      steps.push({
        stepId: sid++, codeLine: 3,
        description: { zh: `插入根节点 ${v}`, en: `Insert root node ${v}` },
        action: { type: 'insert', targets: [0], color: 'success' },
        events: [
          { type: 'tree.create', variant: 'binary', rootId: 'h0', nodes: [{ id: 'h0', value: v }], edges: [] },
          { type: 'tree.visit', nodeId: 'h0' },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      continue
    }

    // Create new node
    const nodeId = `h${heap.length - 1}`
    const parentIdx = Math.floor((i - 1) / 2)
    const parentId = `h${parentIdx}`
    const side = i % 2 !== 0 ? 'left' : 'right'

    steps.push({
      stepId: sid++, codeLine: 4,
      description: { zh: `插入 ${v}（作为 h${parentIdx} 的子节点）`, en: `Insert ${v} (as child of h${parentIdx})` },
      action: { type: 'insert', targets: [i], color: 'warning' },
      events: [
        { type: 'tree.insert', parentId, node: { id: nodeId, value: v }, side },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })

    // Bubble up
    while (i > 0) {
      const p = Math.floor((i - 1) / 2)
      if (heap[p] <= heap[i]) break

      steps.push({
        stepId: sid++, codeLine: 6,
        description: { zh: `上浮: h${i}=${heap[i]} < h${p}=${heap[p]}，交换位置（子节点小于父节点，违反堆性质）`, en: `Bubble up: h${i}=${heap[i]} < h${p}=${heap[p]}, swap (child < parent violates heap property)` },
        action: { type: 'swap', targets: [p, i], color: 'danger' },
        events: [
          { type: 'tree.compare', nodeId: `h${p}`, value: heap[p], result: 'greater' },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      ;[heap[p], heap[i]] = [heap[i], heap[p]]

      // Swap node identities — the values have moved
      steps.push({
        stepId: sid++, codeLine: 7,
        description: { zh: `交换后 h${p}=${heap[p]}, h${i}=${heap[i]}，堆序性质恢复`, en: `After swap h${p}=${heap[p]}, h${i}=${heap[i]}, heap property restored` },
        action: { type: 'highlight', targets: [p, i], color: 'success' },
        events: [
          { type: 'tree.update_metadata', nodeId: `h${p}`, height: 0 },
          { type: 'tree.visit', nodeId: `h${p}` },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      i = p
    }

    steps.push({
      stepId: sid++, codeLine: 9,
      description: { zh: `插入 ${v} 完成。当前堆: [${heap.join(', ')}]`, en: `Insert ${v} done. Heap: [${heap.join(', ')}]` },
      action: { type: 'mark', targets: [i], color: 'success' },
      events: [
        { type: 'tree.visit', nodeId: `h${i}` },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
  }

  // Pop min (extract root)
  if (heap.length > 0) {
    const min = heap[0]
    steps.push({
      stepId: sid++, codeLine: 12,
      description: { zh: `extractMin() — 取出堆顶最小值 ${min}，将末元素 ${heap[heap.length - 1]} 移至堆顶`, en: `extractMin() — remove root ${min}, move last ${heap[heap.length - 1]} to root` },
      action: { type: 'delete', targets: [0], color: 'danger' },
      events: [
        { type: 'tree.visit', nodeId: 'h0' },
        { type: 'scene.note', text: `移除最小值 ${min}` },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })

    heap[0] = heap.pop()!

    // Sink down
    let i = 0
    while (true) {
      let smallest = i
      const l = 2 * i + 1, r = 2 * i + 2
      if (l < heap.length && heap[l] < heap[smallest]) smallest = l
      if (r < heap.length && heap[r] < heap[smallest]) smallest = r
      if (smallest === i) break

      steps.push({
        stepId: sid++, codeLine: 15,
        description: { zh: `下沉: h${i}=${heap[i]} > h${smallest}=${heap[smallest]}，交换位置`, en: `Sink: h${i}=${heap[i]} > h${smallest}=${heap[smallest]}, swap` },
        action: { type: 'swap', targets: [i, smallest], color: 'warning' },
        events: [
          { type: 'tree.compare', nodeId: `h${smallest}`, value: heap[smallest], result: 'less' },
          { type: 'tree.visit', nodeId: `h${i}` },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })

      ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]

      steps.push({
        stepId: sid++, codeLine: 16,
        description: { zh: `交换后 h${i}=${heap[i]}，继续向下检查`, en: `After swap h${i}=${heap[i]}, continue sinking` },
        action: { type: 'highlight', targets: [i, smallest], color: 'success' },
        events: [
          { type: 'tree.visit', nodeId: `h${i}` },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      i = smallest
    }
  }

  steps.push({
    stepId: sid++, codeLine: 19,
    description: { zh: `堆操作完成。最终堆: [${heap.join(', ')}]`, en: `Heap ops done. Final: [${heap.join(', ')}]` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [
      { type: 'scene.clear_highlight' },
    ],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'heap_ds',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'binary' },
    initialState: { type: 'tree', data: initialHeap, root: 'h0', treeNodes: [] },
    steps,
  }
}
