import type { AnimationScript } from '@/types/animation'

export function generateHeapOperations(arr: number[]): AnimationScript {
  const data = [3, 1, 6, 5, 2, 4]  // fixed demo data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '最小堆 (Min-Heap) 操作演示', en: 'Min-Heap operations demo' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  // Build heap by inserting
  const heap: number[] = []
  for (const v of data) {
    heap.push(v)
    let i = heap.length - 1
    while (i > 0) {
      const p = Math.floor((i - 1) / 2)
      if (heap[p] <= heap[i]) break
      steps.push({ stepId: sid++, codeLine: 4, description: { zh: `上浮: ${heap[i]} < ${heap[p]}，交换`, en: `Bubble up: ${heap[i]} < ${heap[p]}, swap` }, action: { type: 'swap', targets: [p, i], color: 'danger' }, stats: { comparisons: sid, swaps: 0, accesses: 0 } })
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
    steps.push({ stepId: sid++, codeLine: 5, description: { zh: `插入 ${v} 完成。堆: [${heap.join(', ')}]`, en: `Insert ${v} done. Heap: [${heap.join(', ')}]` }, action: { type: 'mark', targets: [heap.length - 1], color: 'success' }, stats: { comparisons: sid, swaps: 0, accesses: 0 } })
  }

  // Pop min
  const min = heap[0]
  heap[0] = heap.pop()!
  steps.push({ stepId: sid++, codeLine: 8, description: { zh: `pop 最小值 ${min}。将末元素 ${heap[0]} 移至堆顶`, en: `Pop min ${min}. Move last ${heap[0]} to top` }, action: { type: 'swap', targets: [0], color: 'danger' }, stats: { comparisons: sid, swaps: 0, accesses: 0 } })

  // Sink down
  let i = 0
  while (true) {
    let smallest = i
    const l = 2 * i + 1, r = 2 * i + 2
    if (l < heap.length && heap[l] < heap[smallest]) smallest = l
    if (r < heap.length && heap[r] < heap[smallest]) smallest = r
    if (smallest === i) break
    steps.push({ stepId: sid++, codeLine: 12, description: { zh: `下沉: ${heap[i]} > ${heap[smallest]}，交换`, en: `Sink: ${heap[i]} > ${heap[smallest]}, swap` }, action: { type: 'swap', targets: [i, smallest], color: 'warning' }, stats: { comparisons: sid, swaps: 0, accesses: 0 } })
    ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
    i = smallest
  }

  steps.push({ stepId: sid++, codeLine: 14, description: { zh: `堆操作完成。最终堆: [${heap.join(', ')}]`, en: `Heap ops done. Final: [${heap.join(', ')}]` }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: sid, swaps: 0, accesses: 0 } })

  return { algorithm: 'heap_ds', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' }, initialState: { type: 'array', data: heap }, steps: steps as AnimationScript['steps'] }
}
