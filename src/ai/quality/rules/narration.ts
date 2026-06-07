import type { AnimationStep } from '@/types/animation'
import type { QualityContext, QualityIssue, QualityRule } from '../types'

/** 连续相同 description.zh 的最大允许步数；超过即视为叙事重复。 */
const MAX_REPEAT_RUN = 3

/** 关键操作步中允许缺失 codeLine 的最大占比；超过即告警。 */
const MAX_KEYOP_NO_CODELINE_RATIO = 0.5

function stepZh(step: AnimationStep): string {
  return step.description?.zh?.trim() ?? ''
}

/**
 * 判断一个事件是否为「关键操作事件」：
 * 既不是场景级别事件(scene.*)，也不是结构创建事件(*.create)。
 * 这类事件代表算法的实质推进（push/pop/visit/set/compare/...），
 * 理应对应到源码某一行。
 */
function isKeyOperationEvent(eventType: string): boolean {
  if (/^scene\./.test(eventType)) return false
  if (/\.create$/.test(eventType)) return false
  return true
}

/** 步骤是否包含至少一个关键操作事件。 */
function hasKeyOperation(step: AnimationStep): boolean {
  return (step.events ?? []).some(ev => isKeyOperationEvent(ev.type))
}

/**
 * repetitive-desc(warn)：连续相同 description.zh 超过 MAX_REPEAT_RUN 步。
 * 空描述不参与判定（空描述由 empty-desc 规则负责）。
 */
export const repetitiveDescRule: QualityRule = {
  id: 'repetitive-desc',
  check(ctx: QualityContext): QualityIssue[] {
    const steps = ctx.script.steps ?? []
    let runValue: string | null = null
    let runLen = 0
    let maxRun = 0
    let worstValue = ''
    for (const step of steps) {
      const zh = stepZh(step)
      if (zh !== '' && zh === runValue) {
        runLen++
      } else {
        runValue = zh === '' ? null : zh
        runLen = zh === '' ? 0 : 1
      }
      if (runLen > maxRun) {
        maxRun = runLen
        worstValue = runValue ?? ''
      }
    }
    if (maxRun > MAX_REPEAT_RUN) {
      return [{
        code: 'repetitive-desc',
        severity: 'warn',
        message: `存在连续 ${maxRun} 步描述完全相同（“${worstValue}”），叙事缺乏推进。`,
        hint: '为每一步写出当前发生的具体动作（如比较哪两个元素、访问哪个格子），避免连续多步使用同一句描述。',
      }]
    }
    return []
  },
}

/**
 * keyop-no-codeline(warn)：在带「关键操作事件」（非 scene.* / 非 *.create）的步骤中，
 * 无有效 codeLine(codeLine < 0) 的占比 > MAX_KEYOP_NO_CODELINE_RATIO。
 * 与通用 low-codeline 不同：本规则只统计关键操作步，聚焦“算法在动、代码行却不动”。
 */
export const keyOpNoCodeLineRule: QualityRule = {
  id: 'keyop-no-codeline',
  check(ctx: QualityContext): QualityIssue[] {
    const steps = ctx.script.steps ?? []
    let keyOpSteps = 0
    let missing = 0
    for (const step of steps) {
      if (!hasKeyOperation(step)) continue
      keyOpSteps++
      if ((step.codeLine ?? -1) < 0) missing++
    }
    if (keyOpSteps === 0) return []
    const ratio = missing / keyOpSteps
    if (ratio > MAX_KEYOP_NO_CODELINE_RATIO) {
      return [{
        code: 'keyop-no-codeline',
        severity: 'warn',
        message: `关键操作步骤中有 ${missing}/${keyOpSteps}（${Math.round(ratio * 100)}%）没有关联源码行，代码高亮无法跟随算法推进。`,
        hint: '在发出关键操作事件（如 compare/swap/visit/set/push/pop）前调用 b.line(n) 标记当前源码行，使代码行与动画同步。',
      }]
    }
    return []
  },
}

/** 叙事相关质量规则集合，由 lead 后续接线至质量门。 */
export const NARRATION_RULES: QualityRule[] = [
  repetitiveDescRule,
  keyOpNoCodeLineRule,
]
