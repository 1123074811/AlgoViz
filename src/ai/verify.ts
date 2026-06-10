import type { AnimationScript } from '@/types/animation'

export type VerifyStatus = 'pass' | 'fail' | 'skipped'

export interface VerifyOutcome {
  status: VerifyStatus
  /** 校验依据:'expect' = AI 自报期望值;'js-exec' = 真实执行用户 JS 代码。 */
  source?: 'expect' | 'js-exec'
  expected?: unknown
  actual?: unknown
  /** skipped 时的原因,给 UI 与日志看。 */
  message?: string
}

/** 解析 @expect 原文:优先 JSON,否则视为裸字符串。空白视为缺失。 */
export function parseExpectValue(raw: string | undefined): { ok: boolean; value?: unknown } {
  const text = raw?.trim()
  if (!text) return { ok: false }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: true, value: text }
  }
}

const FLOAT_TOLERANCE = 1e-9

/** 结果比对:数字带 1e-9 容差;数组逐元素;字符串/数字/布尔跨类型按字符串化比较。
 *  NaN 与 NaN 视为相等(浮点运算可能产生 NaN);不支持 plain object。 */
export function resultsMatch(actual: unknown, expected: unknown): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Number.isNaN(actual) && Number.isNaN(expected)) return true
    return Math.abs(actual - expected) < FLOAT_TOLERANCE
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length && actual.every((v, i) => resultsMatch(v, expected[i]))
  }
  if (actual === expected) return true
  // 跨类型("42" vs 42、true vs "true"):按字符串化宽容比较
  if (actual != null && expected != null && !Array.isArray(actual) && !Array.isArray(expected)) {
    return String(actual) === String(expected)
  }
  return false
}

/** 用 @expect 指令校验动画输出。 */
export function verifyAgainstExpect(script: AnimationScript, expectRaw: string | undefined): VerifyOutcome {
  const parsed = parseExpectValue(expectRaw)
  if (!parsed.ok) return { status: 'skipped', message: '生成器未提供 @expect' }
  if (script.result === undefined) {
    return { status: 'skipped', source: 'expect', message: '生成器未调用 b.result,无法比对' }
  }
  const matched = resultsMatch(script.result, parsed.value)
  return {
    status: matched ? 'pass' : 'fail',
    source: 'expect',
    expected: parsed.value,
    actual: script.result,
  }
}

/** 用真值(如 JS 直接执行用户代码所得)校验动画输出。 */
export function verifyAgainstGroundTruth(script: AnimationScript, truth: unknown): VerifyOutcome {
  if (script.result === undefined) {
    return { status: 'skipped', source: 'js-exec', message: '生成器未调用 b.result,无法比对' }
  }
  const matched = resultsMatch(script.result, truth)
  return { status: matched ? 'pass' : 'fail', source: 'js-exec', expected: truth, actual: script.result }
}

/** 行号消毒:原地修改 script.steps[].codeLine,将越界行号置 -1。返回修正条数。 */
export function sanitizeLineMapping(script: AnimationScript, sourceCode: string): number {
  const lineCount = sourceCode.split('\n').length
  let fixed = 0
  for (const step of script.steps) {
    if (step.codeLine >= lineCount) {
      step.codeLine = -1
      fixed++
    }
  }
  return fixed
}

/** 给 UI/修复提示用的短格式化(截断到 120 字符)。 */
export function formatVerifyValue(value: unknown): string {
  let text: string
  try {
    // JSON.stringify 对 undefined/function/symbol 返回 undefined(不抛错),需回退 String()
    text = JSON.stringify(value) ?? String(value)
  } catch {
    text = String(value)
  }
  return text.length > 120 ? text.slice(0, 117) + '...' : text
}
