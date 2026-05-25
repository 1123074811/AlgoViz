import type { AIErrorReport, AIValidationIssue } from './errors'

/** Attempt local repair on AI response. Returns repaired text + issues fixed, or null if too broken. */
export function attemptLocalRepair(raw: string, report: AIErrorReport): { repairedText: string; fixedIssues: number } | null {
  let text = raw
  let fixed = 0

  // 1. Strip markdown code blocks
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (blockMatch) {
    text = blockMatch[1].trim()
    fixed++
  }

  // 2. Extract first complete JSON object
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1)
    if (candidate !== text) {
      text = candidate
      fixed++
    }
  } else {
    return null
  }

  // 3. Fix common JSON issues
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(text)
  } catch (e) {
    const msg = (e as Error).message
    // Try fixing trailing commas
    if (msg.includes('Unexpected token') || msg.includes('Expected')) {
      const fixedText = text.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']')
      try {
        obj = JSON.parse(fixedText)
        text = fixedText
        fixed++
      } catch {
        return null
      }
    } else {
      return null
    }
  }

  // 4. Fix missing top-level fields with safe defaults
  if (!obj.complexity || typeof obj.complexity !== 'object') {
    obj.complexity = { time: { best: 'O(?)', average: 'O(?)', worst: 'O(?)' }, space: 'O(?)' }
    fixed++
  }
  if (!Array.isArray(obj.steps)) {
    // Can't fix - steps are critical
    return null
  }

  // 5. Fix steps: add missing stepId
  const steps = obj.steps as Record<string, unknown>[]
  steps.forEach((step, i) => {
    if (typeof step.stepId !== 'number') {
      step.stepId = i + 1
      fixed++
    }
    if (!step.stats || typeof step.stats !== 'object') {
      step.stats = { comparisons: 0, swaps: 0, accesses: 0 }
      fixed++
    }
    if (!step.action) {
      step.action = { type: 'highlight', targets: [], color: 'primary' }
      fixed++
    } else {
      const action = step.action as Record<string, unknown>
      if (typeof action.color !== 'string') {
        action.color = 'primary'
        fixed++
      }
    }
    if (!step.description || typeof (step.description as Record<string, unknown>)?.zh !== 'string') {
      step.description = { zh: `步骤 ${i + 1}`, en: `Step ${i + 1}` }
      fixed++
    }
  })

  text = JSON.stringify(obj)
  return { repairedText: text, fixedIssues: fixed }
}

/** Build a repair prompt for AI re-generation */
export function buildRepairPrompt(originalContent: string, report: AIErrorReport): string {
  const issueLines = report.issues.map(i => `- ${i.path}: ${i.message}${i.suggestion ? ` (建议: ${i.suggestion})` : ''}`)
  const truncatedResponse = originalContent.length > 3000 ? originalContent.slice(0, 3000) + '\n...(已截断)' : originalContent

  return `你是 AnimationScript JSON 修复器。

请根据以下错误报告修复 JSON。
要求：
1. 只输出修复后的完整 JSON。
2. 不要输出 Markdown 代码块标记。
3. 不要省略任何必要字段。
4. 保持原算法步骤语义不变。
5. 如果字段缺失，按照 AnimationScript Schema 补齐。
6. 图、树、矩阵结构必须符合指定 initialState.type。

## 错误报告
${issueLines.join('\n')}

## 原始响应
${truncatedResponse}

请立即输出修复后的完整 AnimationScript JSON：`
}

/** Check if all issues are recoverable locally (vs need AI repair) */
export function allRecoverable(issues: AIValidationIssue[]): boolean {
  return issues.length > 0 && issues.every(i => i.recoverable)
}

/** Check if any issue needs AI repair */
export function needsAIRepair(report: AIErrorReport): boolean {
  return report.canRetry && report.issues.length > 0
}
