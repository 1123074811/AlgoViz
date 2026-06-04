import type { AnimationScript, AnimationStep } from '@/types/animation'

export function generateHashTable(_pairs?: Record<string, string>): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  const SIZE = 8
  const table: string[] = new Array(SIZE).fill('')
  const initialTable = [...table]

  // Step 0: Initialize empty hash table
  steps.push({
    stepId: sid++, codeLine: 0,
    description: {
      zh: `哈希表初始化：${SIZE} 个槽位 (index 0~${SIZE - 1})，全部为空`,
      en: `Hash table init: ${SIZE} slots (index 0~${SIZE - 1}), all empty`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: new Array(SIZE).fill('') }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // ─── Insertion helpers ──────────────────────────────────────────────
  function put(key: string, value: string) {
    const hash = key.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    let idx = hash % SIZE
    const originalIdx = idx

    steps.push({
      stepId: sid++, codeLine: 3,
      description: {
        zh: `put("${key}", "${value}"): 计算 hash("${key}") = ${hash}，取模 → index=${idx}`,
        en: `put("${key}", "${value}"): hash("${key}") = ${hash}, modulo → index=${idx}`,
      },
      action: { type: 'compare', targets: [idx], color: 'warning' },
      events: [{ type: 'array.compare', indices: [idx, idx] }],
      stats: { comparisons: sid, swaps: 0, accesses: 1 },
    })

    // Linear probing
    let probeCount = 0
    while (table[idx] !== '' && probeCount < SIZE) {
      probeCount++
      const prevIdx = idx
      idx = (idx + 1) % SIZE
      steps.push({
        stepId: sid++, codeLine: 5,
        description: {
          zh: `槽位[${prevIdx}] 已被 "${table[prevIdx]}" 占用 → 线性探测到 index=${idx}`,
          en: `Slot[${prevIdx}] occupied by "${table[prevIdx]}" → linear probe to index=${idx}`,
        },
        action: { type: 'compare', targets: [prevIdx, idx], color: 'danger' },
        events: [
          { type: 'array.compare', indices: [prevIdx, idx] },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: probeCount + 1 },
      })
    }

    table[idx] = `${key}:${value}`
    steps.push({
      stepId: sid++, codeLine: probeCount > 0 ? 6 : 4,
      description: {
        zh: probeCount > 0
          ? `经 ${probeCount} 次探测后，将 "${key}:${value}" 存入槽位[${idx}]`
          : `槽位[${idx}] 为空，直接将 "${key}:${value}" 存入`,
        en: probeCount > 0
          ? `After ${probeCount} probe(s), store "${key}:${value}" at slot[${idx}]`
          : `Slot[${idx}] empty, store "${key}:${value}" directly`,
      },
      action: { type: 'insert', targets: [idx], color: 'success' },
      events: [
        { type: 'array.set_value', index: idx, value: `${key}:${value}` },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: probeCount + 2 },
    })

    return idx
  }

  function get(key: string, expectedIdx: number) {
    const hash = key.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    let idx = hash % SIZE

    steps.push({
      stepId: sid++, codeLine: 9,
      description: {
        zh: `get("${key}"): 计算 hash("${key}") = ${hash}，取模 → index=${idx}`,
        en: `get("${key}"): hash("${key}") = ${hash}, modulo → index=${idx}`,
      },
      action: { type: 'compare', targets: [idx], color: 'warning' },
      events: [{ type: 'array.compare', indices: [idx, idx] }],
      stats: { comparisons: sid, swaps: 0, accesses: 1 },
    })

    // Probe until found or empty slot
    let probeCount = 0
    while (table[idx] !== '' && probeCount < SIZE) {
      const entry = table[idx]
      const storedKey = entry?.split(':')[0]
      if (storedKey === key) {
        steps.push({
          stepId: sid++, codeLine: 11,
          description: {
            zh: `找到！槽位[${idx}] = "${entry}"，取出 value="${entry.split(':')[1]}"`,
            en: `Found! Slot[${idx}] = "${entry}", value="${entry.split(':')[1]}"`,
          },
          action: { type: 'mark', targets: [idx], color: 'success' },
          events: [{ type: 'array.mark_sorted', indices: [idx] }],
          stats: { comparisons: sid, swaps: 0, accesses: probeCount + 2 },
        })
        return
      }
      probeCount++
      idx = (idx + 1) % SIZE
      steps.push({
        stepId: sid++, codeLine: 10,
        description: {
          zh: `槽位[${idx === 0 ? SIZE - 1 : idx - 1}] 的 key 不匹配 → 继续探测 index=${idx}`,
          en: `Key mismatch at slot[${idx === 0 ? SIZE - 1 : idx - 1}] → probe to index=${idx}`,
        },
        action: { type: 'compare', targets: [idx], color: 'warning' },
        events: [{ type: 'array.compare', indices: [idx, idx] }],
        stats: { comparisons: sid, swaps: 0, accesses: probeCount + 2 },
      })
    }

    steps.push({
      stepId: sid++, codeLine: 11,
      description: {
        zh: `未找到 key="${key}"（遇到空槽，线性探测终止）`,
        en: `Key "${key}" not found (empty slot reached, linear probing ends)`,
      },
      action: { type: 'mark', targets: [], color: 'danger' },
      stats: { comparisons: sid, swaps: 0, accesses: probeCount + 2 },
    })
  }

  // ─── Demo: Insert key-value pairs ────────────────────────────────────
  const pairs = _pairs && Object.keys(_pairs).length > 0
    ? Object.entries(_pairs)
    : [['name', 'Alice'], ['age', '25'], ['city', 'Beijing'], ['email', 'alice@algo']]

  const lastIdx = pairs.map(([k, v]) => put(k, v)).pop() ?? 0

  // ─── Lookup demo ────────────────────────────────────────────────────
  if (pairs.length > 0) {
    get(pairs[Math.min(2, pairs.length - 1)][0], lastIdx)
  }

  // ─── Final state ────────────────────────────────────────────────────

  steps.push({
    stepId: sid++, codeLine: 14,
    description: {
      zh: `哈希表操作完成！4 个键值对已存入，负载因子=${4}/${SIZE}=0.5。平均 O(1) 查找`,
      en: `Hash table done! 4 entries stored, load factor=${4}/${SIZE}=0.5. Average O(1) lookup`,
    },
    action: { type: 'mark', targets: [0, 1, 2, 3, 4, 5, 6, 7], color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: [0, 1, 2, 5] }],
    stats: { comparisons: sid, swaps: 0, accesses: 8 },
  })

  return {
    algorithm: 'hash_table',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: initialTable.map(() => 0) },
    steps: steps as AnimationScript['steps'],
  }
}
