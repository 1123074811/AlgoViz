import type { AnimationScript } from '@/types/animation'

/**
 * Map / HashMap preset — uses the dedicated `hashtable.*` events (separate
 * chaining) so it renders with HashTableView (bucket array + chains + load
 * factor), matching the hash table dedicated visual.
 */
export function generateMap(input: Record<string, unknown> = { name: 'Alice', age: 25, city: 'NYC', country: 'USA' }): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const SIZE = 8
  const buckets: string[][] = Array.from({ length: SIZE }, () => [])
  const hashOf = (key: string) => key.split('').reduce((s, c) => s + c.charCodeAt(0), 0)

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: '映射 (Map / HashMap) — 键值对集合，键唯一，哈希分桶+链地址法', en: 'Map / HashMap — key-value pairs, hashing + separate chaining' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'hashtable.create', capacity: SIZE }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  function put(key: string, value: string | number) {
    const bucket = hashOf(key) % SIZE
    const collision = buckets[bucket].length > 0
    buckets[bucket].push(key)
    steps.push({
      stepId: sid++, codeLine: 2,
      description: {
        zh: `put("${key}", ${typeof value === 'string' ? `"${value}"` : value}) → hash 定位桶 ${bucket}${collision ? '（冲突，链地址法追加）' : ''}`,
        en: `put("${key}", ${value}) → bucket ${bucket}${collision ? ' (collision, chain)' : ''}`,
      },
      action: { type: 'insert', targets: [bucket], color: collision ? 'warning' : 'success' },
      events: [{ type: 'hashtable.put', key, value, bucket, collision }],
      stats: { comparisons: 0, swaps: 0, accesses: 1 },
    })
  }

  function get(key: string) {
    const bucket = hashOf(key) % SIZE
    const found = buckets[bucket].includes(key)
    steps.push({
      stepId: sid++, codeLine: 3,
      description: { zh: `get("${key}") → 定位桶 ${bucket}：${found ? '命中' : '未找到'}`, en: `get("${key}") → bucket ${bucket}: ${found ? 'found' : 'not found'}` },
      action: { type: 'highlight', targets: [bucket], color: found ? 'success' : 'danger' },
      events: [{ type: 'hashtable.get', key, bucket, found }],
      stats: { comparisons: 1, swaps: 0, accesses: 1 },
    })
  }

  const entries = Object.entries(input)
  for (const [key, value] of entries) put(key, typeof value === 'number' ? value : String(value))
  if (entries[0]) get(entries[0][0])

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: 'Map 操作完成。键通过哈希函数分散到各桶，平均 O(1) 存取', en: 'Map ops done. Keys hashed into buckets, average O(1) access' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'map',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: [] },
    result: entries.map(([key, value]) => `${key}:${String(value)}`),
    steps,
  }
}
