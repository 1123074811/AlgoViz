import type { AnimationScript, ActionColor, AuxiliaryArrayState } from '@/types/animation'
import { makeStep, sortTeachingWithAux } from './utils'

export function generateBucketSort(arr: number[]): AnimationScript {
  const data = arr.map(v => Math.max(0, Math.floor(v)))
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const n = data.length

  const maxVal = Math.max(...data, 1)
  const bucketCount = Math.max(Math.floor(Math.sqrt(n)), 2)
  const buckets: number[][] = Array.from({ length: bucketCount }, () => [])

  /// Return snapshot of all buckets as auxiliary array states
  function bucketState(activeBucket?: number, activeElem?: number): AuxiliaryArrayState[] {
    return buckets.map((b, idx) => ({
      id: `bucket_${idx}`,
      label: `桶[${idx}]`,
      data: [...b],
      activeIndices: idx === activeBucket && activeElem !== undefined ? [activeElem] : undefined,
      colorMap: idx === activeBucket ? Object.fromEntries(b.map((_, k) => [k, 'primary' as ActionColor])) : undefined,
    }))
  }

  // Step 1: initialize empty buckets + create array cells for scene engine
  steps.push({
    ...makeStep(sid++, 0,
      `桶排序开始。创建 ${bucketCount} 个桶（公式: ⌊√n⌋），数据范围 0-${maxVal}。桶排序假设数据均匀分布以获得最佳 O(n) 性能`,
      `Bucket sort start. Create ${bucketCount} buckets (formula: ⌊√n⌋), range 0-${maxVal}. Assumes uniform distribution for optimal O(n) performance`,
      'highlight', [], 'primary', 0, 0, n,
      sortTeachingWithAux({ bucketCount, maxVal, phase: '初始化 / Init' }, bucketState())
    ),
    events: [
      { type: 'array.create', values: [...data] },
      { type: 'math.init', vars: [{ name: '桶数', value: bucketCount }, { name: '当前值', value: data[0] ?? 0 }, { name: '桶号', value: 0 }] },
      { type: 'scene.highlight', entityId: 'arr_0', role: 'active', color: 'primary' },
    ],
  })

  // Step 2: distribute elements into buckets
  for (const num of data) {
    const bi = Math.min(Math.floor((num / Math.max(maxVal, 1)) * (bucketCount - 1)), bucketCount - 1)
    buckets[bi].push(num)

    steps.push({
      ...makeStep(sid++, 3,
        `${num} 分配到桶[${bi}]（公式: floor(${num}/${Math.max(maxVal, 1)}×${bucketCount - 1})）。分布阶段确保相近元素进入同一桶`,
        `${num} → bucket[${bi}] (formula: floor(${num}/${Math.max(maxVal, 1)}×${bucketCount - 1})). Distribution groups nearby elements into the same bucket`,
        'compare', [bi], 'warning', 0, 0, 1,
        sortTeachingWithAux({ bucketCount, value: num, targetBucket: bi, phase: 'distribute' },
          bucketState(bi, buckets[bi].length - 1))
      ),
      events: [{ type: 'scene.note', text: `${num} → 桶[${bi}]` }, { type: 'math.set', name: '当前值', value: num }, { type: 'math.set', name: '桶号', value: bi }],
    })
  }

  // Step 3: sort each bucket individually
  for (let i = 0; i < bucketCount; i++) {
    if (buckets[i].length > 0) {
      buckets[i].sort((a, b) => a - b)

      steps.push({
        ...makeStep(sid++, 5,
          `桶[${i}] 排序完成：[${buckets[i].join(', ')}]。每个桶内部独立排序，因为数据已局部有序，排序效率很高`,
          `Bucket[${i}] sorted: [${buckets[i].join(', ')}]. Each bucket sorted independently — sorting is efficient since elements are locally grouped`,
          'highlight', [i], 'success', buckets[i].length - 1, 0, buckets[i].length,
          sortTeachingWithAux({ bucketCount, currentBucket: i, phase: 'sort_buckets' },
            buckets.map((b, idx) => ({
              ...bucketState()[idx],
              colorMap: idx === i ? Object.fromEntries(b.map((_, k) => [k, 'success' as ActionColor])) : idx < i ? Object.fromEntries(b.map((_, k) => [k, 'muted' as ActionColor])) : undefined,
            })))
        ),
        events: [{ type: 'scene.note', text: `桶[${i}] 排序完成：[${buckets[i].join(', ')}]` }],
      })
    }
  }

  // Step 4: collect elements from buckets back to array
  let idx = 0
  for (let i = 0; i < bucketCount; i++) {
    for (const v of buckets[i]) {
      data[idx] = v
      // Show remaining buckets
      const remainingBuckets = buckets.map((b, bidx) =>
        bidx === i ? b.slice(buckets[i].indexOf(v) + 1) : [...b])

      const step: AnimationScript['steps'][number] = {
        ...makeStep(sid++, 7,
          `从桶[${i}] 收集 ${v} → 位置 [${idx}]。按桶序依次收集，桶内有序故收集后整体有序`,
          `Collect ${v} from bucket[${i}] → position [${idx}]. Collect in bucket order — resulting array is sorted`,
          'highlight', [idx], 'success', 0, 0, 1,
          sortTeachingWithAux({ phase: 'collect', bucketCount, fromBucket: i, value: v, toPos: idx },
            remainingBuckets.map((b, bidx) => ({
              id: `bucket_${bidx}`,
              label: bidx < i ? `桶[${bidx}] ✓` : `桶[${bidx}]`,
              data: b,
              activeIndices: bidx === i ? [0] : undefined,
              colorMap: bidx < i ? Object.fromEntries(b.map((_, k) => [k, 'muted' as ActionColor])) : undefined,
            })))
        ),
        events: [
          { type: 'array.set_value', index: idx, value: v },
          { type: 'scene.highlight', entityId: `arr_${idx}`, role: 'inserted', color: 'success'},
          { type: 'math.set', name: '当前值', value: v },
          { type: 'math.set', name: '桶号', value: i },
        ],
      }
      step.action.value = v
      step.action.to = idx
      steps.push(step)

      idx++
    }
  }

  // Final step — show all buckets now empty, data fully sorted
  const emptyBuckets = Array.from({ length: bucketCount }, () => [])
  steps.push({
    ...makeStep(sid++, 8,
      `桶排序完成！[${data.join(', ')}]。总复杂度 O(n+k)，空间 O(n+k)，在数据均匀分布时性能最佳`,
      `Bucket sort complete! [${data.join(', ')}]. O(n+k) time, O(n+k) space, best performance with uniform distribution`,
      'mark', data.map((_, k) => k), 'success', 0, 0, n,
      sortTeachingWithAux({ phase: '完成 / Complete', bucketCount },
        emptyBuckets.map((_, idx) => ({
          id: `bucket_${idx}`,
          label: `桶[${idx}] ✓`,
          data: [],
        })))
    ),
    events: [{ type: 'array.mark_sorted', indices: data.map((_, i) => i) }],
  })

  return {
    algorithm: 'bucket_sort',
    complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n²)' }, space: 'O(n+k)' },
    initialState: { type: 'array', data: arr.map(v => Math.max(0, Math.floor(v))) },
    steps,
  }
}
