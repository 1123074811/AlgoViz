import type { AnimationScript } from '@/types/animation'
import type { AIErrorReport } from './errors'
import { ERROR_TEMPLATES } from './errors'
import { validateAnimationScript, normalizeAnimationScript, validateCrossStepConsistency } from './schema'

export interface ParseResult {
  success: boolean
  script?: AnimationScript
  error?: AIErrorReport
  rawJson?: unknown
  extractedText?: string
}

/** 去除对象/数组中的尾随逗号：  ,] -> ]   ,} -> } （字符串外的常见模型笔误） */
function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1')
}

/** Legacy API: returns null on failure (kept for backward compat) */
export function parseAIResponse(raw: string): AnimationScript | null {
  const result = parseAIResponseDetailed(raw)
  return result.script ?? null
}

/** New detailed parser with error reporting */
export function parseAIResponseDetailed(raw: string): ParseResult {
  // Strategy 1: Direct JSON parse
  let json: unknown
  let extractedText = raw
  let extractMethod = ''

  try {
    json = JSON.parse(raw.trim())
    extractMethod = 'direct'
  } catch {
    // Strategy 2: Extract from markdown code block
    const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (blockMatch) {
      extractedText = blockMatch[1].trim()
      try {
        json = JSON.parse(extractedText)
        extractMethod = 'code_block'
      } catch {
        try {
          json = JSON.parse(stripTrailingCommas(extractedText))
          extractMethod = 'code_block_cleaned'
        } catch {
          // Strategy 3: Find first { and last }
          const extracted = extractBetweenBraces(raw)
          if (extracted) {
            extractedText = extracted
            try {
              json = JSON.parse(extractedText)
              extractMethod = 'brace_extract'
            } catch {
              try {
                json = JSON.parse(stripTrailingCommas(extractedText))
                extractMethod = 'brace_extract_cleaned'
              } catch {
                return buildError('json_parse', 'jsonParseFailed', raw)
              }
            }
          } else {
            return buildError('json_extract', 'jsonExtractFailed', raw)
          }
        }
      }
    } else {
      const extracted = extractBetweenBraces(raw)
      if (extracted) {
        extractedText = extracted
        try {
          json = JSON.parse(extractedText)
          extractMethod = 'brace_extract'
        } catch {
          try {
            json = JSON.parse(stripTrailingCommas(extractedText))
            extractMethod = 'brace_extract_cleaned'
          } catch {
            return buildError('json_parse', 'jsonParseFailed', raw)
          }
        }
      } else {
        return buildError('json_extract', 'jsonExtractFailed', raw)
      }
    }
  }

  // Schema validation
  const issues = validateAnimationScript(json)
  if (issues.some(i => i.severity === 'error')) {
    const report: AIErrorReport = {
      ...ERROR_TEMPLATES.schemaFailed,
      issues,
      rawResponse: raw,
    }
    return { success: false, error: report, rawJson: json, extractedText }
  }

  // Normalize (fill defaults, preserve Phase 2 fields)
  const script = normalizeAnimationScript(json)
  if (!script) {
    return {
      success: false,
      error: { ...ERROR_TEMPLATES.schemaFailed, issues: [{ path: '', code: 'normalize_failed', message: '规范化失败，脚本结构不完整', severity: 'error', recoverable: false }], rawResponse: raw },
      rawJson: json,
      extractedText,
    }
  }

  // Cross-step semantic consistency
  const crossStepIssues = validateCrossStepConsistency(
    script.steps,
    script.initialState.type
  )

  // If any cross-step issue is non-recoverable, the whole script is invalid
  const hasFatalCrossStep = crossStepIssues.some(iss => iss.severity === 'error' && !iss.recoverable)
  if (hasFatalCrossStep) {
    return {
      success: false,
      error: { ...ERROR_TEMPLATES.schemaFailed, issues: [...issues, ...crossStepIssues], rawResponse: raw },
      rawJson: json,
      extractedText,
    }
  }

  return { success: true, script, rawJson: json, extractedText }
}

function extractBetweenBraces(text: string): string | null {
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }
  return null
}

function buildError(stage: AIErrorReport['stage'], templateKey: string, rawResponse: string): ParseResult {
  const template = ERROR_TEMPLATES[templateKey]
  return {
    success: false,
    error: {
      ...template,
      stage: stage || template.stage,
      issues: [{ path: '', code: stage, message: template.message, severity: 'error', recoverable: template.canRetry }],
      rawResponse,
    },
    extractedText: rawResponse,
  }
}
