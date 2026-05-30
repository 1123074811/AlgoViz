import type { AnimationScript } from '@/types/animation'

export function generateKMP(text?: string, pattern?: string): AnimationScript {
  const T = text ?? 'ABABABCABABABCABAB'
  const P = pattern ?? 'ABABC'
  const n = T.length, m = P.length
  const steps: AnimationScript['steps'] = []
  let sid = 1

  // Step 1: Show text and pattern strings
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `文本: "${T}" (${n}), 模式: "${P}" (${m})`, en: `Text: "${T}" (${n}), Pattern: "${P}" (${m})` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'string.create_double', text: T, pattern: P }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Build LPS
  const lps: number[] = new Array(m).fill(0)
  let len = 0, i = 1
  while (i < m) {
    steps.push({
      stepId: sid++, codeLine: 5,
      description: { zh: `比较 P[${i}]='${P[i]}' 和 P[${len}]='${P[len]}'，构建 LPS 数组`, en: `Compare P[${i}]='${P[i]}' vs P[${len}]='${P[len]}', build LPS` },
      action: { type: 'compare', targets: [i, len], color: 'warning' },
      events: [{ type: 'string.compare', row: 1, indices: [i, len] }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
    if (P[i] === P[len]) {
      lps[i] = ++len
      steps.push({
        stepId: sid++, codeLine: 6,
        description: { zh: `匹配！P[${i}]='${P[i]}' = P[${len - 1}]='${P[len - 1]}'，lps[${i}]=${lps[i]}`, en: `Match! lps[${i}]=${lps[i]}` },
        action: { type: 'mark', targets: [i], color: 'success' },
        events: [{ type: 'string.match', row: 1, index: i }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      i++
    } else if (len > 0) {
      len = lps[len - 1]
      steps.push({
        stepId: sid++, codeLine: 8,
        description: { zh: `失配！P[${i}]='${P[i]}' ≠ P[${len}]，回退 len=${len}`, en: `Mismatch! len falls back to ${len}` },
        action: { type: 'highlight', targets: [i], color: 'danger' },
        events: [{ type: 'string.mismatch', row: 1, index: i }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
    } else {
      lps[i] = 0
      steps.push({
        stepId: sid++, codeLine: 10,
        description: { zh: `P[${i}] 无前缀匹配，lps[${i}]=0`, en: `No prefix match, lps[${i}]=0` },
        action: { type: 'mark', targets: [i], color: 'muted' },
        events: [{ type: 'string.mark_range', row: 1, indices: [i] }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      i++
    }
  }

  steps.push({
    stepId: sid++, codeLine: 12,
    description: { zh: `LPS 数组构建完成: [${lps.join(', ')}]。开始搜索...`, en: `LPS done: [${lps.join(', ')}]. Start search...` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'string.mark_range', row: 1, indices: lps.map((_, j) => j) }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  // Search phase
  let ti = 0, pi = 0
  while (ti < n) {
    steps.push({
      stepId: sid++, codeLine: 15,
      description: { zh: `比较 T[${ti}]='${T[ti]}' 和 P[${pi}]='${P[pi]}'`, en: `Compare T[${ti}]='${T[ti]}' vs P[${pi}]='${P[pi]}'` },
      action: { type: 'compare', targets: [ti, pi], color: 'warning' },
      events: [
        { type: 'string.compare', row: 0, indices: [ti, ti] },
        { type: 'string.compare', row: 1, indices: [pi, pi] },
      ],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
    if (T[ti] === P[pi]) {
      steps.push({
        stepId: sid++, codeLine: 16,
        description: { zh: `匹配！T[${ti}]='${T[ti]}' = P[${pi}]='${P[pi]}'`, en: `Match! T[${ti}]='${T[ti]}' = P[${pi}]='${P[pi]}'` },
        action: { type: 'mark', targets: [ti], color: 'success' },
        events: [
          { type: 'string.match', row: 0, index: ti },
          { type: 'string.match', row: 1, index: pi },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      ti++; pi++
    } else if (pi > 0) {
      pi = lps[pi - 1]
      steps.push({
        stepId: sid++, codeLine: 18,
        description: { zh: `失配！利用 LPS 跳过，pi 回退到 ${pi}（跳过了 ${lps[pi]} 个已匹配字符）`, en: `Mismatch! Skip via LPS, pi → ${pi}` },
        action: { type: 'highlight', targets: [ti], color: 'warning' },
        events: [
          { type: 'string.compare', row: 0, indices: [ti, ti] },
          { type: 'string.compare', row: 1, indices: [pi, pi] },
        ],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
    } else {
      steps.push({
        stepId: sid++, codeLine: 20,
        description: { zh: `T[${ti}] 不匹配模式首字符，ti++`, en: `T[${ti}] ≠ pattern start, ti++` },
        action: { type: 'highlight', targets: [ti], color: 'muted' },
        events: [{ type: 'string.mismatch', row: 0, index: ti }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      ti++
    }
    if (pi === m) {
      const foundAt = ti - m
      steps.push({
        stepId: sid++, codeLine: 22,
        description: { zh: `找到匹配！位置 T[${foundAt}..${ti - 1}] = "${P}"`, en: `Found at T[${foundAt}..${ti - 1}] = "${P}"` },
        action: { type: 'mark', targets: [], color: 'success' },
        events: [{ type: 'string.mark_range', row: 0, indices: Array.from({ length: m }, (_, j) => foundAt + j) }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      break
    }
  }

  return {
    algorithm: 'kmp',
    complexity: { time: { best: 'O(n+m)', average: 'O(n+m)', worst: 'O(n+m)' }, space: 'O(m)' },
    presentation: { engine: 'scene', module: 'string' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
