import type { AnimationScript } from '@/types/animation'
import { buildSystemPrompt } from './prompts'
import { parseAIResponse } from './parser'

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

export interface AIResult {
  success: boolean
  script?: AnimationScript
  error?: string
  rawResponse?: string
}

export async function analyzeCode(params: AIRequestParams): Promise<AIResult> {
  const config = getApiConfig()
  if (!config) {
    return { success: false, error: '请先在设置页面配置 API Key、Base URL 和模型名称' }
  }

  const systemPrompt = buildSystemPrompt(params.language)
  const userMessage = buildUserMessage(params)

  // Build request URL
  let apiUrl = `${config.baseUrl}/chat/completions`
  // Ensure no double slashes
  apiUrl = apiUrl.replace(/([^:]\/)\/+/g, '$1')

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => null)
      const errMsg = errBody?.error?.message || `HTTP ${response.status} ${response.statusText}`
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: `认证失败: API Key 无效或已过期 (${errMsg})` }
      }
      if (response.status === 404) {
        return { success: false, error: `接口不存在 (404): 请检查 Base URL 是否正确` }
      }
      if (response.status === 429) {
        return { success: false, error: '请求频率超限 (429)，请稍后重试' }
      }
      return { success: false, error: `API 请求失败: ${errMsg}` }
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''

    if (!content.trim()) {
      return { success: false, error: 'AI 返回了空响应，请重试' }
    }

    const parsed = parseAIResponse(content)
    if (!parsed) {
      return {
        success: false,
        error: '无法解析 AI 返回的 AnimationScript JSON，请检查模型输出格式',
        rawResponse: content,
      }
    }

    return { success: true, script: parsed }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return {
        success: false,
        error: `网络请求被阻止 (CORS/网络错误): 浏览器安全策略可能阻止了跨域请求。请检查: 1) API 服务是否允许浏览器跨域 2) Base URL 是否正确 3) 网络连接是否正常`,
        rawResponse: message,
      }
    }
    return { success: false, error: `网络请求失败: ${message}` }
  }
}

function buildUserMessage(params: AIRequestParams): string {
  const { code, language, inputData, algorithmName } = params
  const lines: string[] = []

  if (algorithmName) {
    lines.push(`算法名称: ${algorithmName}`)
  }
  lines.push(`编程语言: ${language}`)
  lines.push('')
  lines.push('代码:')
  lines.push('```')
  lines.push(code)
  lines.push('```')

  if (inputData.trim()) {
    lines.push('')
    lines.push(`输入数据: ${inputData}`)
  }

  lines.push('')
  lines.push('请分析以上代码，生成 AnimationScript JSON。只输出 JSON，不输出任何解释文字。')

  return lines.join('\n')
}
