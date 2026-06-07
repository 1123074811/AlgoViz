import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmCategory } from '../categories'

export interface QualityIssue {
  code: string
  severity: 'error' | 'warn'
  message: string // 给人看
  hint: string    // 给 AI 修复用的具体修正建议
}

export interface QualityContext {
  script: AnimationScript
  category: AlgorithmCategory
  /** Original user code, when available. Used to detect omitted core structures/output. */
  sourceCode?: string
  /** 出现过 <family>.create 的结构族集合（如 'array'|'stack'|'grid'|'callstack'）。 */
  structuresCreated: Set<string>
  /** 事件族 → 非 create 操作事件计数。 */
  opCountByFamily: Record<string, number>
  stepCount: number
  /** 带有效 codeLine(>=0) 的步骤占比 0..1。 */
  codeLineCoverage: number
  /** description.zh 为空或「步骤 N」占位的步骤数。 */
  emptyDescCount: number
}

export interface QualityRule {
  id: string
  appliesTo?: AlgorithmCategory[] // 缺省=通用
  check(ctx: QualityContext): QualityIssue[]
}

export interface QualityReport {
  passed: boolean // 无 error 即通过
  issues: QualityIssue[]
}

/** 'array.create' → family 'array'。 */
export function familyOf(eventType: string): string {
  return eventType.split('.')[0]
}

/** 是否为结构创建事件（family.create）。 */
export function isCreateEvent(eventType: string): boolean {
  return /\.create$/.test(eventType)
}

export function buildQualityContext(
  script: AnimationScript,
  category: AlgorithmCategory,
  sourceCode?: string,
): QualityContext {
  const structuresCreated = new Set<string>()
  const opCountByFamily: Record<string, number> = {}
  let withCodeLine = 0
  let emptyDescCount = 0
  const steps: AnimationStep[] = script.steps ?? []
  for (const step of steps) {
    if ((step.codeLine ?? -1) >= 0) withCodeLine++
    const zh = step.description?.zh?.trim() ?? ''
    if (zh === '' || /^步骤\s*\d+$/.test(zh)) emptyDescCount++
    for (const ev of step.events ?? []) {
      const fam = familyOf(ev.type)
      if (isCreateEvent(ev.type)) structuresCreated.add(fam)
      else opCountByFamily[fam] = (opCountByFamily[fam] ?? 0) + 1
    }
  }
  return {
    script,
    category,
    sourceCode,
    structuresCreated,
    opCountByFamily,
    stepCount: steps.length,
    codeLineCoverage: steps.length ? withCodeLine / steps.length : 0,
    emptyDescCount,
  }
}
