import type { AnimationScript, AnimationStep } from '@/types/animation'

/**
 * Hash table preset — uses the dedicated `hashtable.*` events (separate chaining)
 * so it renders with HashTableView (bucket array + collision chains + load factor),
 * not the array fallback.
 */
export function generateHashTable(_pairs?: Record<string, string>): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  const SIZE = 8
  const buckets: string[][] = Array.from({ length: SIZE }, () => [])

  const hashOf = (key: string) => key.split('').reduce((s, c) => s + c.charCodeAt(0), 0)

  // Step 0: create the bucket array
  steps.push({
    stepId: sid++, codeLine: 0,
    description: {
      zh: `哈希表初始化：${SIZE} 个桶 (index 0~${SIZE - 1})，用链地址法解决冲突`,
      en: `Hash table init: ${SIZE} buckets (0~${SIZE - 1}), separate chaining`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'hashtable.create', capacity: SIZE }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  function put(key: string, value: string) {
    const hash = hashOf(key)
    const bucket = hash % SIZE
    const collision = buckets[bucket].length > 0
    buckets[bucket].push(key)
    steps.push({
      stepId: sid++, codeLine: 3,
      description: {
        zh: collision
          ? `put("${key}","${value}")：hash=${hash}，桶 ${bucket} 已占用 → 链地址法追加`
          : `put("${key}","${value}")：hash=${hash}，桶 ${bucket} 为空 → 直接插入`,
        en: collision
          ? `put("${key}","${value}"): hash=${hash}, bucket ${bucket} occupied → chain`
          : `put("${key}","${value}"): hash=${hash}, bucket ${bucket} empty → insert`,
      },
      action: { type: 'insert', targets: [bucket], color: collision ? 'warning' : 'success' },
      events: [{ type: 'hashtable.put', key, value, bucket, collision }],
      stats: { comparisons: sid, swaps: 0, accesses: 1 },
    })
  }

  function get(key: string) {
    const hash = hashOf(key)
    const bucket = hash % SIZE
    const found = buckets[bucket].includes(key)
    steps.push({
      stepId: sid++, codeLine: 9,
      description: {
        zh: `get("${key}")：hash=${hash}，定位桶 ${bucket} → ${found ? '命中' : '未找到'}`,
        en: `get("${key}"): hash=${hash}, bucket ${bucket} → ${found ? 'found' : 'not found'}`,
      },
      action: { type: 'mark', targets: [bucket], color: found ? 'success' : 'danger' },
      events: [{ type: 'hashtable.get', key, bucket, found }],
      stats: { comparisons: sid, swaps: 0, accesses: 2 },
    })
  }

  const pairs = _pairs && Object.keys(_pairs).length > 0
    ? Object.entries(_pairs).map(([k, v]) => [k, String(v)] as [string, string])
    : ([['name', 'Alice'], ['age', '25'], ['city', 'Beijing'], ['hobby', 'chess']] as [string, string][])

  pairs.forEach(([k, v]) => put(k, v))

  if (pairs.length > 0) {
    get(pairs[Math.min(2, pairs.length - 1)][0])
  }

  const n = pairs.length
  steps.push({
    stepId: sid++, codeLine: 14,
    description: {
      zh: `哈希表操作完成！${n} 个键值对已存入，负载因子=${n}/${SIZE}=${(n / SIZE).toFixed(2)}。平均 O(1) 查找`,
      en: `Hash table done! ${n} entries, load factor=${n}/${SIZE}=${(n / SIZE).toFixed(2)}. Average O(1)`,
    },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [],
    stats: { comparisons: sid, swaps: 0, accesses: n },
  })

  return {
    algorithm: 'hash_table',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    // Empty data so the array-seeding fallback does NOT create arr_* cells —
    // the hashtable.* events drive the dedicated HashTableView instead.
    initialState: { type: 'array', data: [] },
    steps: steps as AnimationScript['steps'],
  }
}
