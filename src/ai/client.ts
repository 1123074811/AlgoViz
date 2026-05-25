import type { AnimationScript } from '@/types/animation'
import type { AIErrorReport, AIRepairAttempt } from './errors'
import { ERROR_TEMPLATES } from './errors'
import { buildSystemPrompt, buildUserMessage } from './prompts'
import { parseAIResponseDetailed } from './parser'
import { parseInputData } from './input'
import { attemptLocalRepair, buildRepairPrompt, needsAIRepair } from './repair'

export interface ApiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export function getApiConfig(): ApiConfig | null {
  try {
    const raw = localStorage.getItem('algoviz-api-config')
    if (!raw) return null
    const config = JSON.parse(raw)
    if (!config.apiKey || !config.baseUrl || !config.model) return null
    return config
  } catch {
    return null
  }
}

export interface AIRequestParams {
  code: string
  language: string
  inputData: string
  algorithmName?: string
}

export interface AnalyzeOptions {
  maxRepairAttempts?: number
  enableLocalRepair?: boolean
  enableAIRepair?: boolean
}

export interface AIResult {
  success: boolean
  script?: AnimationScript
  error?: string
  errorReport?: AIErrorReport
  rawResponse?: string
  repaired?: boolean
  retryCount?: number
  repairHistory?: AIRepairAttempt[]
}

export async function analyzeCode(params: AIRequestParams, options: AnalyzeOptions = {}): Promise<AIResult> {
  const { maxRepairAttempts = 1, enableLocalRepair = true, enableAIRepair = true } = options

  const config = getApiConfig()
  if (!config) {
    const template = ERROR_TEMPLATES.missingConfig
    return { success: false, error: template.message, errorReport: { ...template, issues: [], rawResponse: '' } }
  }

  // Parse input data for type context
  const parsedInput = parseInputData(params.inputData)
  if (!parsedInput.valid) {
    const message = parsedInput.message || '输入数据不是合法 JSON'
    return {
      success: false,
      error: message,
      errorReport: {
        stage: 'response',
        title: '输入数据格式错误',
        message,
        issues: [{ path: 'inputData', code: 'invalid_json', message, severity: 'error', recoverable: true }],
        suggestions: ['请检查输入数据是否为合法 JSON。', '可以使用示例数据下拉菜单插入数组、图、树或矩阵示例。'],
        canRetry: false,
        rawResponse: params.inputData,
      },
      rawResponse: params.inputData,
    }
  }

  try {
    // Phase 1: Original analysis request
    const result = await requestChatCompletion(config, buildSystemPrompt(params.language), buildUserMessage(params.code, params.language, params.inputData, parsedInput.promptContext, params.algorithmName), 0.3)

    if (!result.success) {
      return { success: false, error: result.error, errorReport: result.errorReport, rawResponse: result.content }
    }

    // Phase 2: Parse and validate
    let parseResult = parseAIResponseDetailed(result.content)
    const repairHistory: AIRepairAttempt[] = []

    if (!parseResult.success && parseResult.error) {
      // Phase 3: Local repair
      if (enableLocalRepair) {
        const localResult = attemptLocalRepair(result.content, parseResult.error)
        if (localResult) {
          const reparseResult = parseAIResponseDetailed(localResult.repairedText)
          if (reparseResult.success) {
            return {
              success: true, script: reparseResult.script, repaired: true, retryCount: 0,
              repairHistory: [{ type: 'local', success: true, issuesBefore: parseResult.error.issues.length, issuesAfter: 0 }],
            }
          }
          repairHistory.push({ type: 'local', success: false, issuesBefore: parseResult.error.issues.length, issuesAfter: reparseResult.error?.issues.length })
          parseResult = reparseResult
        }
      }

      // Phase 4: AI repair request
      if (enableAIRepair && maxRepairAttempts > 0 && parseResult.error && needsAIRepair(parseResult.error)) {
        const repairPrompt = buildRepairPrompt(result.content, parseResult.error)
        const repairResult = await requestChatCompletion(config, '你是 AnimationScript JSON 修复器。只输出修复后的完整 JSON。', repairPrompt, 0)

        if (repairResult.success) {
          const repairedParse = parseAIResponseDetailed(repairResult.content)
          if (repairedParse.success) {
            return {
              success: true, script: repairedParse.script,
              repaired: true, retryCount: 1,
              repairHistory: [...repairHistory, { type: 'ai', success: true, issuesBefore: parseResult.error.issues.length, issuesAfter: 0 }],
              rawResponse: result.content,
            }
          }
          repairHistory.push({ type: 'ai', success: false, issuesBefore: parseResult.error.issues.length, issuesAfter: repairedParse.error?.issues.length })
        } else {
          repairHistory.push({ type: 'ai', success: false, issuesBefore: parseResult.error.issues.length })
        }

        return {
          success: false, error: parseResult.error.message,
          errorReport: parseResult.error, rawResponse: result.content,
          repaired: false, retryCount: 1, repairHistory,
        }
      }
    }

    if (!parseResult.success) {
      return {
        success: false, error: parseResult.error?.message || '解析失败',
        errorReport: parseResult.error, rawResponse: result.content, repaired: false,
      }
    }

    return { success: true, script: parseResult.script }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      const template = ERROR_TEMPLATES.corsError
      return { success: false, error: template.message, errorReport: { ...template, issues: [], rawResponse: message } }
    }
    return {
      success: false,
      error: `网络请求失败: ${message}`,
      errorReport: {
        stage: 'request',
        title: '网络请求失败',
        message: `网络请求失败: ${message}`,
        issues: [{ path: 'request', code: 'network_error', message, severity: 'error', recoverable: true }],
        suggestions: ['检查网络连接。', '确认 Base URL 和模型服务当前可用。'],
        canRetry: true,
        rawResponse: message,
      },
    }
  }
}

interface RequestResult {
  success: boolean
  content: string
  error?: string
  errorReport?: AIErrorReport
}

async function requestChatCompletion(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string,
  temperature: number = 0.3,
): Promise<RequestResult> {
  let apiUrl = `${config.baseUrl}/chat/completions`
  apiUrl = apiUrl.replace(/([^:]\/)\/+/g, '$1')

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => null)
    const errMsg = errBody?.error?.message || `HTTP ${response.status}`
    if (response.status === 401 || response.status === 403) {
      const template = ERROR_TEMPLATES.authFailed
      return {
        success: false,
        content: errMsg,
        error: `${template.message} (${errMsg})`,
        errorReport: {
          ...template,
          issues: [{ path: 'apiKey', code: `http_${response.status}`, message: errMsg, severity: 'error', recoverable: false }],
          rawResponse: errMsg,
        },
      }
    }
    if (response.status === 404) {
      const message = '接口不存在 (404): 请检查 Base URL 是否正确'
      return {
        success: false,
        content: errMsg,
        error: message,
        errorReport: {
          stage: 'request',
          title: '接口不存在',
          message,
          issues: [{ path: 'baseUrl', code: 'http_404', message: errMsg, severity: 'error', recoverable: false }],
          suggestions: ['确认 Base URL 是否填写为 OpenAI 兼容服务地址。', '不要重复填写 /chat/completions，系统会自动拼接。'],
          canRetry: false,
          rawResponse: errMsg,
        },
      }
    }
    if (response.status === 429) {
      const message = '请求频率超限 (429)，请稍后重试'
      return {
        success: false,
        content: errMsg,
        error: message,
        errorReport: {
          stage: 'request',
          title: '请求频率超限',
          message,
          issues: [{ path: 'request', code: 'http_429', message: errMsg, severity: 'error', recoverable: true }],
          suggestions: ['稍后再试。', '降低请求频率或减少输入代码规模。'],
          canRetry: true,
          rawResponse: errMsg,
        },
      }
    }
    return {
      success: false,
      content: errMsg,
      error: `API 错误: ${errMsg}`,
      errorReport: {
        stage: 'request',
        title: 'API 请求失败',
        message: `API 请求失败: ${errMsg}`,
        issues: [{ path: 'request', code: `http_${response.status}`, message: errMsg, severity: 'error', recoverable: response.status >= 500 }],
        suggestions: ['检查 Base URL、模型名称和服务状态。'],
        canRetry: response.status >= 500,
        rawResponse: errMsg,
      },
    }
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''

  if (!content.trim()) {
    const template = ERROR_TEMPLATES.emptyResponse
    return {
      success: false,
      content: '',
      error: template.message,
      errorReport: {
        ...template,
        issues: [{ path: 'choices[0].message.content', code: 'empty_response', message: template.message, severity: 'error', recoverable: true }],
        rawResponse: '',
      },
    }
  }

  return { success: true, content }
}
