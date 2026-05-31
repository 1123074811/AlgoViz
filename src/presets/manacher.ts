import type { AnimationScript } from '@/types/animation'

export function generateManacher(s?: string): AnimationScript {
  const str = s ?? 'babad'
  const T = '#' + str.split('').join('#') + '#'
  const n = T.length
  const P: number[] = new Array(n).fill(0)
  const initialP = [...P]
  const steps: AnimationScript['steps'] = []
  let sid = 1, C = 0, R = 0

  // Step 1: Show transformed string as character cells
  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `字符串: "${str}"，预处理: "${T}"`, en: `String: "${str}", transformed: "${T}"` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'string.create', text: T, row: 0 }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 0; i < n; i++) {
    const mirror = 2 * C - i
    if (i < R) P[i] = Math.min(R - i, P[mirror])

    let expanded = false
    while (i + P[i] + 1 < n && i - P[i] - 1 >= 0 && T[i + P[i] + 1] === T[i - P[i] - 1]) {
      P[i]++
      expanded = true
    }

    steps.push({
      stepId: sid++, codeLine: 5,
      description: { zh: `i=${i}('${T[i]}'), C=${C}('${T[C]}'), R=${R}, 回文半径=${P[i]}${expanded ? ' (扩展)' : ''}`, en: `i=${i}('${T[i]}'), C=${C}, R=${R}, radius=${P[i]}${expanded ? ' (expanded)' : ''}` },
      action: { type: 'compare', targets: [i], color: 'warning' },
      events: [{ type: 'string.compare', row: 0, indices: [i, i] }],
      stats: { comparisons: sid, swaps: 0, accesses: 0 },
    })

    if (i + P[i] > R) { C = i; R = i + P[i] }
  }

  const maxIdx = P.indexOf(Math.max(...P))
  const start = Math.floor((maxIdx - P[maxIdx]) / 2)
  const result = str.slice(start, start + P[maxIdx])

  // Highlight the palindrome range
  const palStart = maxIdx - P[maxIdx]
  const palEnd = maxIdx + P[maxIdx]

  steps.push({
    stepId: sid++, codeLine: 10,
    description: { zh: `最长回文子串: "${result}" (长度=${P[maxIdx]})，区间 T[${palStart}..${palEnd}]`, en: `Longest palindrome: "${result}" (len=${P[maxIdx]}), range T[${palStart}..${palEnd}]` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'string.mark_range', row: 0, indices: Array.from({ length: palEnd - palStart + 1 }, (_, j) => palStart + j) }],
    stats: { comparisons: sid, swaps: 0, accesses: 0 },
  })

  return {
    algorithm: 'manacher',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'string' },
    initialState: { type: 'array', data: initialP },
    steps,
  }
}
