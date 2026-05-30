import type { AnimationScript } from '@/types/animation'

export function generateKMP(text?: string, pattern?: string): AnimationScript {
  const T = text ?? 'ABABABCABABABCABAB'
  const P = pattern ?? 'ABABC'
  const n = T.length, m = P.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `文本: "${T}" (${n}), 模式: "${P}" (${m})`, en: `Text: "${T}" (${n}), Pattern: "${P}" (${m})` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: T.split('').map(c => c.charCodeAt(0) - 64) }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Build LPS array
  const lps: number[] = new Array(m).fill(0)
  steps.push({
    stepId: sid++, codeLine: 2,
    description: { zh: '构建 LPS (最长前缀后缀) 数组', en: 'Build LPS (Longest Prefix Suffix) array' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: new Array(m).fill(0) }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  let len = 0, i = 1
  while (i < m) {
    steps.push({
      stepId: sid++, codeLine: 5,
      description: { zh: `比较 P[${i}]=${P[i]} 和 P[${len}]=${P[len]}`, en: `Compare P[${i}]=${P[i]} and P[${len}]=${P[len]}` },
      action: { type: 'compare', targets: [i, len], color: 'warning' },
      events: [{ type: 'array.compare', indices: [i, len] }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
    if (P[i] === P[len]) {
      lps[i] = ++len
      steps.push({
        stepId: sid++, codeLine: 6,
        description: { zh: `匹配！lps[${i}]=${lps[i]}`, en: `Match! lps[${i}]=${lps[i]}` },
        action: { type: 'mark', targets: [i], color: 'success' },
        events: [{ type: 'array.mark_sorted', indices: [i] }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      i++
    } else if (len > 0) {
      len = lps[len - 1]
      steps.push({
        stepId: sid++, codeLine: 8,
        description: { zh: `不匹配，len 回退到 lps[${len}]=${len}`, en: `Mismatch, len falls back to ${len}` },
        action: { type: 'highlight', targets: [len], color: 'warning' },
        events: [{ type: 'array.compare', indices: [i, len] }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
    } else {
      lps[i] = 0
      steps.push({
        stepId: sid++, codeLine: 10,
        description: { zh: `lps[${i}]=0`, en: `lps[${i}]=0` },
        action: { type: 'highlight', targets: [i], color: 'muted' },
        events: [{ type: 'array.mark_sorted', indices: [i] }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
      i++
    }
  }

  steps.push({
    stepId: sid++, codeLine: 11,
    description: { zh: `LPS 完成: [${lps.join(', ')}]`, en: `LPS done: [${lps.join(', ')}]` },
    action: { type: 'mark', targets: lps.map((_, k) => k), color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: lps.map((_, k) => k) }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  // KMP search
  i = 0; let j = 0
  while (i < n) {
    steps.push({
      stepId: sid++, codeLine: 14,
      description: { zh: `比较 T[${i}]=${T[i]} 和 P[${j}]=${P[j]}`, en: `Compare T[${i}]=${T[i]} and P[${j}]=${P[j]}` },
      action: { type: 'compare', targets: [i, j], color: 'warning' },
      events: [{ type: 'array.compare', indices: [i, j] }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })
    if (T[i] === P[j]) {
      i++; j++
      if (j === m) {
        steps.push({
          stepId: sid++, codeLine: 16,
          description: { zh: `找到匹配！位置 T[${i - m}..${i - 1}]`, en: `Match found at T[${i - m}..${i - 1}]` },
          action: { type: 'mark', targets: Array.from({ length: m }, (_, k) => i - m + k), color: 'success' },
          events: [{ type: 'array.mark_sorted', indices: Array.from({ length: m }, (_, k) => i - m + k) }],
          stats: { comparisons: sid, swaps: 0, accesses: 0 },
        })
        j = lps[j - 1]
      }
    } else if (j > 0) {
      j = lps[j - 1]
      steps.push({
        stepId: sid++, codeLine: 19,
        description: { zh: `不匹配，j 回退到 ${j}`, en: `Mismatch, j falls back to ${j}` },
        action: { type: 'highlight', targets: [j], color: 'warning' },
        events: [{ type: 'array.compare', indices: [i, j] }],
        stats: { comparisons: sid, swaps: 0, accesses: 0 },
      })
    } else {
      i++
    }
  }

  steps.push({
    stepId: sid++, codeLine: 22,
    description: { zh: 'KMP 搜索完成', en: 'KMP search done' },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: [] }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'kmp',
    complexity: { time: { best: 'O(n+m)', average: 'O(n+m)', worst: 'O(n+m)' }, space: 'O(m)' },
    presentation: { engine: 'scene', module: 'array', variant: 'string' },
    initialState: {
      type: 'array',
      data: T.split('').map(c => c.charCodeAt(0) - 64), // A=1, B=2, ...
      labels: T.split(''), // Show characters as labels
    },
    steps: steps as AnimationScript['steps'],
  }
}
