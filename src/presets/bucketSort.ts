import type { AnimationScript } from '@/types/animation'

export function generateBucketSort(arr: number[]): AnimationScript {
  const data = [...arr]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const n = data.length

  const maxVal = Math.max(...data, 1)
  const bucketCount = Math.max(Math.floor(Math.sqrt(n)), 2)
  steps.push({ stepId: sid++, codeLine: 0, description: { zh: `创建 ${bucketCount} 个桶，数据范围 0-${maxVal}`, en: `Create ${bucketCount} buckets, range 0-${maxVal}` }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: n } })

  const buckets: number[][] = Array.from({ length: bucketCount }, () => [])
  for (const num of data) {
    const bi = Math.min(Math.floor((num / maxVal) * (bucketCount - 1)), bucketCount - 1)
    buckets[bi].push(num)
    steps.push({ stepId: sid++, codeLine: 3, description: { zh: `${num} → 桶[${bi}]`, en: `${num} → bucket[${bi}]` }, action: { type: 'compare', targets: [bi], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })
  }

  for (let i = 0; i < bucketCount; i++) {
    if (buckets[i].length > 0) {
      buckets[i].sort((a, b) => a - b)
      steps.push({ stepId: sid++, codeLine: 5, description: { zh: `桶[${i}] 排序: [${buckets[i].join(', ')}]`, en: `Bucket[${i}] sorted: [${buckets[i].join(', ')}]` }, action: { type: 'highlight', targets: [i], color: 'success' }, stats: { comparisons: buckets[i].length - 1, swaps: 0, accesses: buckets[i].length } })
    }
  }

  let idx = 0
  for (let i = 0; i < bucketCount; i++) {
    for (const v of buckets[i]) {
      data[idx++] = v
      steps.push({ stepId: sid++, codeLine: 7, description: { zh: `桶[${i}] 输出 ${v} → 位置 ${idx - 1}`, en: `Bucket[${i}] output ${v} → pos ${idx - 1}` }, action: { type: 'insert', targets: [idx - 1], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })
    }
  }

  steps.push({ stepId: sid++, codeLine: 8, description: { zh: `排序完成！[${data.join(', ')}]`, en: `Sorted! [${data.join(', ')}]` }, action: { type: 'mark', targets: data.map((_, k) => k), color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: n } })

  return { algorithm: 'bucket_sort', complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n²)' }, space: 'O(n+k)' }, initialState: { type: 'array', data: [...arr] }, steps: steps as AnimationScript['steps'] }
}
