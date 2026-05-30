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

export interface AIConnectionTestResult {
  success: boolean
  content: string
  error?: string
  errorReport?: AIErrorReport
}

type RequestResult = AIConnectionTestResult

interface ChatRequestOptions {
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`
  const normalized = withProtocol.replace(/\/chat\/completions\/?$/i, '').replace(/\/+$/, '')
  try {
    const url = new URL(normalized)
    if (url.hostname === 'api.deepseek.com' && url.pathname === '/v1') {
      url.pathname = ''
      return url.toString().replace(/\/+$/, '')
    }
  } catch {
    return normalized
  }
  return normalized
}

function buildChatCompletionUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`.replace(/([^:]\/)\/+/g, '$1')
}

function normalizeApiConfig(config: ApiConfig): ApiConfig {
  const baseUrl = normalizeBaseUrl(config.baseUrl)
  const model = config.model.trim()
  return {
    apiKey: config.apiKey.trim(),
    baseUrl,
    model: normalizeModel(baseUrl, model),
  }
}

function normalizeModel(baseUrl: string, model: string): string {
  if (!isDeepSeekBaseUrl(baseUrl)) return model
  if (model === 'deepseek-chat') return 'deepseek-v4-flash'
  if (model === 'deepseek-reasoner') return 'deepseek-v4-flash'
  return model
}

function isDeepSeekBaseUrl(baseUrl: string): boolean {
  try {
    return new URL(normalizeBaseUrl(baseUrl)).hostname === 'api.deepseek.com'
  } catch {
    return baseUrl.includes('api.deepseek.com')
  }
}

function buildChatRequestBody(config: ApiConfig, systemPrompt: string, userMessage: string, options: ChatRequestOptions) {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: false,
    max_tokens: options.maxTokens ?? 4096,
  }

  if (options.temperature !== undefined) body.temperature = options.temperature
  if (options.jsonMode) body.response_format = { type: 'json_object' }
  if (isDeepSeekBaseUrl(config.baseUrl)) body.thinking = { type: 'disabled' }

  return body
}

export function getApiConfig(): ApiConfig | null {
  try {
    const raw = localStorage.getItem('algoviz-api-config')
    if (!raw) return null
    const config = JSON.parse(raw)
    if (!config.apiKey || !config.baseUrl || !config.model) return null
    return normalizeApiConfig(config)
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
    const result = await requestWithProxyFallback(config, buildSystemPrompt(params.language), buildUserMessage(params.code, params.language, params.inputData, parsedInput.promptContext, params.algorithmName), { temperature: 0.3, jsonMode: true })

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
        const repairResult = await requestWithProxyFallback(config, '你是 AnimationScript JSON 修复器。只输出修复后的完整 JSON。', repairPrompt, { temperature: 0, jsonMode: true })

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
    const result = buildFetchErrorResult(message)
    return { success: false, error: result.error, errorReport: result.errorReport, rawResponse: result.content }
  }
}

export async function testApiConnection(config: ApiConfig): Promise<AIConnectionTestResult> {
  return requestViaProxy(normalizeApiConfig(config), '你是连接测试助手。', '请只回复 OK。', { temperature: 0, maxTokens: 64, jsonMode: false })
}

async function requestWithProxyFallback(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string,
  options: ChatRequestOptions = {},
): Promise<RequestResult> {
  const result = await requestChatCompletion(config, systemPrompt, userMessage, options)
  if (shouldRetryViaProxy(result)) {
    return requestViaProxy(config, systemPrompt, userMessage, options)
  }
  return result
}

function shouldRetryViaProxy(result: RequestResult): boolean {
  if (result.success || result.errorReport?.stage !== 'request') return false
  return result.errorReport.issues.some((issue) =>
    issue.code === 'fetch_failed' ||
    issue.code === 'connection_reset' ||
    issue.code === 'network_error'
  )
}

async function requestViaProxy(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string,
  options: ChatRequestOptions = {},
): Promise<RequestResult> {
  const normalizedConfig = normalizeApiConfig(config)
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Target': normalizedConfig.baseUrl,
        ...(normalizedConfig.apiKey ? { 'X-Proxy-Key': normalizedConfig.apiKey } : {}),
      },
      body: JSON.stringify(buildChatRequestBody(normalizedConfig, systemPrompt, userMessage, options)),
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => null)
      const errMsg = errBody?.error?.message || `代理返回 ${response.status}`
      return buildHttpErrorResult(response.status, errMsg)
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''
    if (!content.trim()) return buildEmptyResponseResult(data, '（通过代理）')
    return { success: true, content }
  } catch (e) {
    const message = `代理请求失败: ${(e as Error).message}`
    return {
      success: false,
      content: message,
      error: message,
      errorReport: {
        stage: 'request',
        title: '代理请求失败',
        message,
        issues: [{ path: 'proxy', code: 'network_error', message, severity: 'error', recoverable: true }],
        suggestions: ['确认开发环境使用 npm run dev 启动。', '生产环境请使用 npm run start 启动代理服务器。', '检查网络连接和 Base URL。'],
        canRetry: true,
        rawResponse: message,
      },
    }
  }
}

async function requestChatCompletion(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string,
  options: ChatRequestOptions = {},
): Promise<RequestResult> {
  const normalizedConfig = normalizeApiConfig(config)
  const apiUrl = buildChatCompletionUrl(normalizedConfig.baseUrl)

  let response: Response
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${normalizedConfig.apiKey}` },
      body: JSON.stringify(buildChatRequestBody(normalizedConfig, systemPrompt, userMessage, options)),
    })
  } catch (e) {
    return buildFetchErrorResult(e instanceof Error ? e.message : String(e))
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => null)
    const errMsg = errBody?.error?.message || `HTTP ${response.status}`
    return buildHttpErrorResult(response.status, errMsg)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''

  if (!content.trim()) {
    return buildEmptyResponseResult(data)
  }

  return { success: true, content }
}

function buildEmptyResponseResult(data: unknown, suffix = ''): RequestResult {
  const template = ERROR_TEMPLATES.emptyResponse
  const rawStr = JSON.stringify(data).slice(0, 1000)
  const finishReason = typeof data === 'object' && data !== null && 'choices' in data
    ? (data as { choices?: Array<{ finish_reason?: string }> }).choices?.[0]?.finish_reason
    : undefined
  return {
    success: false,
    content: rawStr,
    error: `${template.message}${suffix}`,
    errorReport: {
      ...template,
      issues: [{ path: 'choices[0].message.content', code: 'empty_response', message: template.message, severity: 'error', recoverable: true }],
      rawResponse: rawStr,
      suggestions: [
        `模型返回了空内容${finishReason ? `，finish_reason=${finishReason}` : ''}。API 原始响应前 1000 字符: ${rawStr}`,
        '确认 DeepSeek Base URL 为 https://api.deepseek.com，模型为 deepseek-v4-pro 或 deepseek-v4-flash。',
        '如果 finish_reason=length，请增大 max_tokens 或简化输入。',
      ],
    },
  }
}

function buildFetchErrorResult(message: string): RequestResult {
  if (message.includes('Connection reset') || message.includes('RESET')) {
    return {
      success: false,
      content: message,
      error: `连接被重置: ${message}`,
      errorReport: {
        stage: 'request',
        title: '网络连接被重置',
        message: '与 API 服务的连接在数据传输过程中被中断。这通常由代理/VPN/防火墙引起，而非 CORS 问题。',
        issues: [{ path: 'request', code: 'connection_reset', message, severity: 'error', recoverable: true }],
        suggestions: [
          '关闭代理/VPN 软件后重试（这是最常见的原因）。',
          '尝试用手机热点或其他网络环境测试。',
          '如使用公司/学校网络，可能被防火墙拦截，联系网络管理员。',
          '确认 Base URL 域名解析正确（ping api.deepseek.com）。',
        ],
        canRetry: true,
        rawResponse: message,
      },
    }
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    const template = ERROR_TEMPLATES.corsError
    return {
      success: false,
      content: message,
      error: template.message,
      errorReport: {
        ...template,
        issues: [{ path: 'request', code: 'fetch_failed', message, severity: 'error', recoverable: true }],
        rawResponse: message,
      },
    }
  }

  return {
    success: false,
    content: message,
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

function buildHttpErrorResult(status: number, errMsg: string): RequestResult {
  if (status === 401 || status === 403) {
    const template = ERROR_TEMPLATES.authFailed
    return {
      success: false,
      content: errMsg,
      error: `${template.message} (${errMsg})`,
      errorReport: {
        ...template,
        issues: [{ path: 'apiKey', code: `http_${status}`, message: errMsg, severity: 'error', recoverable: false }],
        rawResponse: errMsg,
      },
    }
  }

  if (status === 404) {
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
        suggestions: ['确认 Base URL 是否填写为 OpenAI 兼容服务地址。', '系统会自动去掉末尾的 /chat/completions 并重新拼接。'],
        canRetry: false,
        rawResponse: errMsg,
      },
    }
  }

  if (status === 429) {
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
      issues: [{ path: 'request', code: `http_${status}`, message: errMsg, severity: 'error', recoverable: status >= 500 }],
      suggestions: ['检查 Base URL、模型名称和服务状态。'],
      canRetry: status >= 500,
      rawResponse: errMsg,
    },
  }
}
