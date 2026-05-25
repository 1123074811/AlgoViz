import type { AnimationScript } from '@/types/animation'

export function generateHashTable(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const table = new Array(8).fill('')

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '哈希表 — 通过哈希函数实现 O(1) 平均查找', en: 'Hash Table — O(1) average lookup via hash function' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  const pairs: [string, string][] = [['name', 'Alice'], ['age', '25'], ['city', 'Beijing']]
  for (const [k, v] of pairs) {
    const code = k.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    const idx = code % 8
    table[idx] = `${k}:${v}`
    steps.push({ stepId: sid++, codeLine: 3, description: { zh: `put("${k}", "${v}"): hash=${code} % 8 = ${idx}`, en: `put("${k}", "${v}"): hash=${code} % 8 = ${idx}` }, action: { type: 'insert', targets: [idx], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })
  }

  const code = 'name'.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const idx = code % 8
  steps.push({ stepId: sid++, codeLine: 6, description: { zh: `get("name"): hash=${code} % 8 = ${idx} → "${table[idx]?.split(':')[1]}"`, en: `get("name"): hash=${idx} → "${table[idx]?.split(':')[1]}"` }, action: { type: 'compare', targets: [idx], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })

  steps.push({ stepId: sid++, codeLine: 7, description: { zh: '哈希表操作完成。负载因子=3/8=0.375', en: 'Hash table ops done. Load factor=3/8=0.375' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 8 } })

  const data = table.map(s => s ? s.charCodeAt(0) : 0)
  return { algorithm: 'hash_table', complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' }, initialState: { type: 'array', data }, steps: steps as AnimationScript['steps'] }
}
