import type { AnimationScript, AnimationStep } from '@/types/animation'

function normalizeInteger(value: unknown, fallback: number): number {
  const n = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : NaN

  return Number.isFinite(n) ? Math.floor(Math.abs(n)) : fallback
}

function parseInput(input?: unknown): [number, number] {
  if (Array.isArray(input)) {
    const a = normalizeInteger(input[0], 48)
    const b = normalizeInteger(input[1], 18)
    return [a, b]
  }

  if (typeof input === 'object' && input !== null) {
    const obj = input as { a?: unknown; b?: unknown }
    return [normalizeInteger(obj.a, 48), normalizeInteger(obj.b, 18)]
  }

  if (typeof input === 'number' || typeof input === 'string') {
    return [normalizeInteger(input, 48), 18]
  }

  return [48, 18]
}

function makeStep(
  stepId: number,
  codeLine: number,
  zh: string,
  en: string,
  events: AnimationStep['events'],
  variables: Record<string, string | number>,
): AnimationStep {
  return {
    stepId,
    codeLine,
    description: { zh, en },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events,
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    teachingState: { variables },
  }
}

export function generateGCD(input?: unknown): AnimationScript {
  const [initialA, initialB] = parseInput(input)
  let a = initialA
  let b = initialB
  let stepId = 1
  const steps: AnimationStep[] = []

  steps.push(makeStep(
    stepId++,
    2,
    `初始化变量：a=${a}, b=${b}`,
    `Initialize variables: a=${a}, b=${b}`,
    [
      { type: 'math.init', vars: [{ name: 'a', value: a }, { name: 'b', value: b }] },
      { type: 'scene.note', text: `欧几里得算法从 a=${a}, b=${b} 开始` },
    ],
    { a, b },
  ))

  const maxIterations = 128
  let iterations = 0
  while (b !== 0 && iterations < maxIterations) {
    steps.push(makeStep(
      stepId++,
      3,
      `b=${b} 不为 0，继续计算 a % b`,
      `b=${b} is not 0, continue with a % b`,
      [
        { type: 'math.highlight', name: 'b' },
        { type: 'scene.note', text: `检查循环条件：b=${b}，继续` },
      ],
      { a, b },
    ))

    const r = a % b
    steps.push(makeStep(
      stepId++,
      4,
      `计算余数：r = ${a} % ${b} = ${r}`,
      `Compute remainder: r = ${a} % ${b} = ${r}`,
      [
        { type: 'math.highlight', name: 'a' },
        { type: 'math.highlight', name: 'b' },
        { type: 'math.set', name: 'r', value: r },
        { type: 'scene.note', text: `${a} % ${b} = ${r}` },
      ],
      { a, b, r },
    ))

    steps.push(makeStep(
      stepId++,
      5,
      `更新 a：a = b = ${b}`,
      `Update a: a = b = ${b}`,
      [
        { type: 'math.set', name: 'a', value: b },
        { type: 'scene.note', text: `a = b，因此 a 更新为 ${b}` },
      ],
      { a: b, b, r },
    ))

    a = b
    steps.push(makeStep(
      stepId++,
      6,
      `更新 b：b = r = ${r}`,
      `Update b: b = r = ${r}`,
      [
        { type: 'math.set', name: 'b', value: r },
        { type: 'scene.note', text: `b = r，因此 b 更新为 ${r}` },
      ],
      { a, b: r, r },
    ))

    b = r
    iterations += 1
  }

  steps.push(makeStep(
    stepId++,
    7,
    `b=0，算法结束，gcd=${a}`,
    `b=0, the algorithm stops, gcd=${a}`,
    [
      { type: 'math.highlight', name: 'a' },
      { type: 'math.set', name: 'gcd', value: a },
      { type: 'scene.note', text: `最终 gcd = a = ${a}` },
    ],
    { a, b, gcd: a },
  ))

  return {
    algorithm: 'gcd_euclidean',
    complexity: {
      time: { best: 'O(1)', average: 'O(log min(a,b))', worst: 'O(log min(a,b))' },
      space: 'O(1)',
    },
    presentation: { engine: 'scene', module: 'variables', variant: 'gcd' },
    initialState: { type: 'array', data: [initialA, initialB] },
    steps,
  }
}
