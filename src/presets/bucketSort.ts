import type { AnimationScript, ActionColor, AuxiliaryArrayState } from '@/types/animation'
import { makeStep, sortTeaching, sortTeachingWithAux } from './utils'

export function generateBucketSort(arr: number[]): AnimationScript {
  const data = arr.map(v => Math.max(0, Math.floor(v)))
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const n = data.length

  const maxVal = Math.max(...data, 1)
  const bucketCount = Math.max(Math.floor(Math.sqrt(n)), 2)

  // Step 1: initialize buckets
  steps.push(makeStep(sid++, 0,
    `桶排序开始。创建 ${bucketCount} 个桶，数据范围 0-${maxVal}。桶排序假设数据均匀分布以获得最佳 O(n) 性能`,
    `Bucket sort start. Create ${bucketCount} buckets, range 0-${maxVal}. Assumes uniform distribution for optimal O(n) performance`,
    'highlight', [], 'primary', 0, 0, n,
    sortTeaching({ bucketCount, maxVal, phase: '初始化 / Init' })
  ))

  // Step 2: distribute elements into buckets
  const buckets: number[][] = Array.from({ length: bucketCount }, () => [])

  for (const num of data) {
    const bi = Math.min(Math.floor((num / Math.max(maxVal, 1)) * (bucketCount - 1)), bucketCount - 1)
    buckets[bi].push(num)

    // Build auxiliary arrays for all buckets
    const bucketArrays: AuxiliaryArrayState[] = buckets.map((b, idx) => ({
      id: `bucket_${idx}`,
      label: `桶[${idx}]`,
      data: [...b],
      activeIndices: idx === bi ? [b.length - 1] : undefined,
      colorMap: idx === bi ? { [b.length - 1]: 'primary' as ActionColor } : undefined,
    }))

    steps.push(makeStep(sid++, 3,
      `${num} 分配到桶[${bi}]（公式: floor(${num}/${Math.max(maxVal, 1)}×${bucketCount - 1})）。分布阶段确保相近元素进入同一桶`,
      `${num} → bucket[${bi}] (formula: floor(${num}/${Math.max(maxVal, 1)}×${bucketCount - 1})). Distribution groups nearby elements into the same bucket`,
      'compare', [bi], 'warning', 0, 0, 1,
      sortTeachingWithAux({ bucketCount, value: num, targetBucket: bi, phase: 'distribute' }, bucketArrays)
    ))
  }

  // Step 3: sort each bucket individually (using insertion sort or built-in)
  for (let i = 0; i < bucketCount; i++) {
    if (buckets[i].length > 0) {
      buckets[i].sort((a, b) => a - b)

      const bucketArrays: AuxiliaryArrayState[] = buckets.map((b, idx) => ({
        id: `bucket_${idx}`,
        label: `桶[${idx}]`,
        data: [...b],
        colorMap: idx === i ? Object.fromEntries(b.map((_, k) => [k, 'success' as ActionColor])) : undefined,
      }))

      steps.push(makeStep(sid++, 5,
        `桶[${i}] 排序：[${buckets[i].join(', ')}]。每个桶内部独立排序，因为数据已局部有序，排序效率很高`,
        `Bucket[${i}] sorted: [${buckets[i].join(', ')}]. Each bucket sorted independently — sorting is efficient since elements are locally grouped`,
        'highlight', [i], 'success', buckets[i].length - 1, 0, buckets[i].length,
        sortTeachingWithAux({ bucketCount, currentBucket: i, phase: 'sort_buckets' }, bucketArrays)
      ))
    }
  }

  // Step 4: collect elements from buckets back to array
  let idx = 0
  for (let i = 0; i < bucketCount; i++) {
    for (const v of buckets[i]) {
      data[idx] = v

      // Show bucket being emptied and array being filled
      const remainingBucket = buckets[i].slice(buckets[i].indexOf(v) + 1)
      const bucketArrays: AuxiliaryArrayState[] = buckets.map((b, bidx) => ({
        id: `bucket_${bidx}`,
        label: `桶[${bidx}]`,
        data: bidx === i ? remainingBucket : [...b],
        activeIndices: bidx === i && remainingBucket.length > 0 ? [0] : undefined,
      }))

      steps.push(makeStep(sid++, 7,
        `从桶[${i}] 收集 ${v} → 位置 [${idx}]。收集阶段按桶的顺序合并，因为桶之间有序，合并后整体有序`,
        `Collect ${v} from bucket[${i}] → position [${idx}]. Collection merges buckets in order — since buckets are ordered, the merge produces the sorted result`,
        'highlight', [idx], 'success', 0, 0, 1,
        sortTeachingWithAux({ phase: 'collect', bucketCount, fromBucket: i, value: v, toPos: idx }, bucketArrays)
      ))
      steps[steps.length - 1].action.value = v
      steps[steps.length - 1].action.to = idx

      idx++
    }
  }

  // Final step
  steps.push(makeStep(sid++, 8,
    `桶排序完成！[${data.join(', ')}]。总复杂度 O(n+k)，空间 O(n+k)，在数据均匀分布时性能最佳`,
    `Bucket sort complete! [${data.join(', ')}]. O(n+k) time, O(n+k) space, best performance with uniform distribution`,
    'mark', data.map((_, k) => k), 'success', 0, 0, n,
    sortTeaching({ phase: '完成 / Complete', bucketCount })
  ))

  return {
    algorithm: 'bucket_sort',
    complexity: { time: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n²)' }, space: 'O(n+k)' },
    initialState: { type: 'array', data: arr.map(v => Math.max(0, Math.floor(v))) },
    steps,
  }
}
