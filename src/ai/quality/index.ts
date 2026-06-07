import type { AnimationScript } from '@/types/animation'
import type { AlgorithmCategory } from '../categories'
import { buildQualityContext, type QualityRule, type QualityReport } from './types'
import { GENERAL_RULES as GENERAL_RULES_IMPL } from './rules/general'

/** 通用质量规则（在 ./rules/general.ts 中实现并聚合）。 */
export const GENERAL_RULES: QualityRule[] = GENERAL_RULES_IMPL

/**
 * 运行确定性质量门：通用规则 + 调用方传入的类别规则。
 * 仅当存在 severity==='error' 的问题时判定为未通过。
 */
export function runQualityGate(
  script: AnimationScript,
  category: AlgorithmCategory,
  extraRules: QualityRule[] = [],
): QualityReport {
  const ctx = buildQualityContext(script, category)
  const rules = [...GENERAL_RULES, ...extraRules].filter(
    r => !r.appliesTo || r.appliesTo.includes(category),
  )
  const issues = rules.flatMap(r => r.check(ctx))
  return { passed: !issues.some(i => i.severity === 'error'), issues }
}

export * from './types'
