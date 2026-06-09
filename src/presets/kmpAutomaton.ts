import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene/eventTypes'

export function generateKmpAutomaton(patternIn?: string, textIn?: string): AnimationScript {
  const pattern = (patternIn && patternIn.length > 0 ? patternIn : 'aba')
  const text = (textIn && textIn.length > 0 ? textIn : 'ababaab')
  const m = pattern.length
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (zh: string, en: string, events: AlgorithmEvent[]) =>
    steps.push({ stepId: sid++, codeLine: 0, description: { zh, en }, action: { type: 'highlight', targets: [], color: 'primary' }, events, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  // 状态 0..m, m 为接受态
  const states = Array.from({ length: m + 1 }, (_, i) => ({ id: `q${i}`, label: String(i), start: i === 0, accepting: i === m }))
  push(`构建模式 "${pattern}" 的匹配自动机`, `Build automaton for "${pattern}"`, [
    { type: 'automaton.create', states },
    ...Array.from({ length: m }, (_, i): AlgorithmEvent => ({ type: 'automaton.transition', id: `t${i}`, from: `q${i}`, to: `q${i + 1}`, label: pattern[i] })),
    { type: 'automaton.activate', stateId: 'q0' },
  ])

  // 失败函数
  const fail = new Array(m).fill(0)
  for (let i = 1, k = 0; i < m; i++) {
    while (k > 0 && pattern[i] !== pattern[k]) k = fail[k - 1]
    if (pattern[i] === pattern[k]) k++
    fail[i] = k
  }

  // 在 text 上跑
  let state = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    while (state > 0 && ch !== pattern[state]) state = fail[state - 1]
    if (ch === pattern[state]) state++
    push(`读入 '${ch}' → 状态 ${state}${state === m ? '（匹配成功!）' : ''}`, `read '${ch}' → state ${state}`, [
      { type: 'automaton.consume', symbol: ch, index: i },
      { type: 'automaton.activate', stateId: `q${state}` },
    ])
    if (state === m) state = fail[state - 1]
  }

  return {
    algorithm: 'kmp_automaton',
    complexity: { time: { best: 'O(n+m)', average: 'O(n+m)', worst: 'O(n+m)' }, space: 'O(m)' },
    presentation: { engine: 'scene', module: 'automaton' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
