import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { analyzeCode, getApiConfig, testApiConnection, analyzeCodeGenerator } from '../client'

// ─── localStorage mock ─────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })

const validConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-pro',
}

// ─── Valid AnimationScript the parser accepts ──────────────────────────────

const validScript = {
  algorithm: 'bubble_sort',
  complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' },
  initialState: { type: 'array', data: [3, 1, 2] },
  steps: [
    {
      stepId: 1,
      codeLine: 0,
      description: { zh: '比较', en: 'compare' },
      action: { type: 'compare', targets: [0, 1], color: 'primary' },
      stats: { comparisons: 1, swaps: 0, accesses: 2 },
    },
  ],
}

/** Build a fetch Response whose JSON body wraps `content` as a chat completion. */
function chatResponse(content: unknown, init: ResponseInit = {}) {
  const body = JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' }, ...init })
}

function errorResponse(status: number, message = 'boom') {
  return new Response(JSON.stringify({ error: { message } }), { status, headers: { 'Content-Type': 'application/json' } })
}

const params = { code: 'def f(): pass', language: 'python', inputData: '[1,2,3]' }

let fetchSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  localStorageMock.clear()
  localStorageMock.setItem('algoviz-api-config', JSON.stringify(validConfig))
  fetchSpy = vi.spyOn(globalThis, 'fetch')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorageMock.clear()
})

// ═══════════════════════════════════════════════════════════════════════════
// getApiConfig
// ═══════════════════════════════════════════════════════════════════════════

describe('getApiConfig', () => {
  it('无配置时返回 null', () => {
    localStorageMock.clear()
    expect(getApiConfig()).toBeNull()
  })

  it('缺少 apiKey 时返回 null', () => {
    localStorageMock.setItem('algoviz-api-config', JSON.stringify({ baseUrl: 'https://x.com', model: 'm' }))
    expect(getApiConfig()).toBeNull()
  })

  it('缺少 baseUrl 时返回 null', () => {
    localStorageMock.setItem('algoviz-api-config', JSON.stringify({ apiKey: 'k', model: 'm' }))
    expect(getApiConfig()).toBeNull()
  })

  it('缺少 model 时返回 null', () => {
    localStorageMock.setItem('algoviz-api-config', JSON.stringify({ apiKey: 'k', baseUrl: 'https://x.com' }))
    expect(getApiConfig()).toBeNull()
  })

  it('非法 JSON 时返回 null', () => {
    localStorageMock.setItem('algoviz-api-config', '{not json')
    expect(getApiConfig()).toBeNull()
  })

  it('合法配置：归一化 deepseek base URL 与模型别名', () => {
    localStorageMock.setItem('algoviz-api-config', JSON.stringify({
      apiKey: '  k  ',
      baseUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
    }))
    const config = getApiConfig()
    expect(config).not.toBeNull()
    expect(config!.apiKey).toBe('k')
    // /v1 与 /chat/completions 后缀被去除
    expect(config!.baseUrl).toBe('https://api.deepseek.com')
    // deepseek-chat → deepseek-v4-flash 别名
    expect(config!.model).toBe('deepseek-v4-flash')
  })

  it('无协议的 baseUrl 自动补 https', () => {
    localStorageMock.setItem('algoviz-api-config', JSON.stringify({ apiKey: 'k', baseUrl: 'example.com/v1', model: 'm' }))
    expect(getApiConfig()!.baseUrl).toBe('https://example.com/v1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCode — config / input guards
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCode guards', () => {
  it('缺少配置时返回 missingConfig，不发请求', async () => {
    localStorageMock.clear()
    const result = await analyzeCode(params)
    expect(result.success).toBe(false)
    expect(result.errorReport?.stage).toBe('config')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('输入数据非法时返回输入格式错误，不发请求', async () => {
    const result = await analyzeCode({ ...params, inputData: 'not valid {{{' })
    expect(result.success).toBe(false)
    expect(result.errorReport?.title).toContain('输入数据')
    expect(result.errorReport?.canRetry).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCode — proxy success path
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCode proxy success', () => {
  it('代理返回合法脚本 → success，并带正确的代理请求头', async () => {
    fetchSpy.mockResolvedValue(chatResponse(validScript))
    const result = await analyzeCode(params)
    expect(result.success).toBe(true)
    expect(result.script?.algorithm).toBe('bubble_sort')

    // 验证走代理端点 /api/chat 及代理头
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/chat')
    const headers = init.headers as Record<string, string>
    expect(headers['X-Proxy-Target']).toBe('https://api.deepseek.com')
    expect(headers['X-Proxy-Key']).toBe('test-key')
    // body 含归一化后的模型与 thinking disabled（deepseek）
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('deepseek-v4-pro')
    expect(body.thinking).toEqual({ type: 'disabled' })
    expect(body.response_format).toEqual({ type: 'json_object' })
  })

  it('代理返回空内容 → emptyResponse 错误', async () => {
    fetchSpy.mockResolvedValue(chatResponse(''))
    const result = await analyzeCode(params)
    expect(result.success).toBe(false)
    expect(result.errorReport?.stage).toBe('response')
    expect(result.error).toContain('（通过代理）')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCode — HTTP error handling (no fallback for auth/429)
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCode HTTP errors', () => {
  it('401 → authFailed，不可重试，不回退直连', async () => {
    fetchSpy.mockResolvedValue(errorResponse(401, 'bad key'))
    const result = await analyzeCode(params)
    expect(result.success).toBe(false)
    expect(result.errorReport?.title).toBe('认证失败')
    expect(result.errorReport?.issues[0].code).toBe('http_401')
    expect(result.errorReport?.issues[0].recoverable).toBe(false)
    // auth 错误两端一致，不应回退直连 → 只调用一次
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('429 → 频率超限，可重试', async () => {
    fetchSpy.mockResolvedValue(errorResponse(429))
    const result = await analyzeCode(params)
    expect(result.errorReport?.issues[0].code).toBe('http_429')
    expect(result.errorReport?.canRetry).toBe(true)
  })

  it('500 → API 请求失败，stage=request，可重试', async () => {
    fetchSpy.mockResolvedValue(errorResponse(500))
    const result = await analyzeCode(params)
    expect(result.errorReport?.stage).toBe('request')
    expect(result.errorReport?.issues[0].code).toBe('http_500')
    expect(result.errorReport?.canRetry).toBe(true)
  })

  it('404 经代理 → 触发回退直连（第二次 fetch 命中真实地址）', async () => {
    // 第一次（代理）返回 404 → shouldFallbackToDirect=true；第二次（直连）成功
    fetchSpy
      .mockResolvedValueOnce(errorResponse(404, 'no proxy backend'))
      .mockResolvedValueOnce(chatResponse(validScript))
    const result = await analyzeCode(params)
    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // 第二次为直连，带 Authorization 头，url 为拼接后的 chat/completions
    const [url, init] = fetchSpy.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-key')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCode — network errors / fallback
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCode network errors', () => {
  it('代理 fetch 抛网络错误 → 回退直连；直连也失败 → 网络请求失败', async () => {
    fetchSpy
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new Error('boom direct'))
    const result = await analyzeCode(params)
    expect(result.success).toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result.errorReport?.stage).toBe('request')
  })

  it('直连连接重置 → connection_reset 报告', async () => {
    // 代理网络错误触发回退，直连抛 Connection reset
    fetchSpy
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Connection reset by peer'))
    const result = await analyzeCode(params)
    expect(result.errorReport?.issues[0].code).toBe('connection_reset')
    expect(result.errorReport?.title).toBe('网络连接被重置')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCode — local repair path
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCode local repair', () => {
  it('代理返回 markdown 包裹的脚本 → 解析成功（无需修复阶段）', async () => {
    const wrapped = '```json\n' + JSON.stringify(validScript) + '\n```'
    fetchSpy.mockResolvedValue(chatResponse(wrapped))
    const result = await analyzeCode(params)
    expect(result.success).toBe(true)
  })

  it('脚本缺 complexity → 本地修复救回并标记 repaired', async () => {
    const broken = { ...validScript } as Record<string, unknown>
    delete broken.complexity
    // 直接返回会触发 schema error（complexity required），本地修复补齐
    fetchSpy.mockResolvedValue(chatResponse(broken))
    const result = await analyzeCode(params, { enableAIRepair: false })
    expect(result.success).toBe(true)
    expect(result.repaired).toBe(true)
    expect(result.repairHistory?.[0].type).toBe('local')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCode — AI repair path
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCode AI repair', () => {
  it('截断 JSON（json_parse）→ 触发 AI 二次修复，第二次返回合法脚本', async () => {
    // 首次返回截断 JSON：本地修复无法救回（lastBrace 缺失）→ needsAIRepair（json_parse 阶段）
    fetchSpy
      .mockResolvedValueOnce(chatResponse('{ "algorithm": "x", "steps": [ '))
      .mockResolvedValueOnce(chatResponse(validScript))
    const result = await analyzeCode(params, { maxRepairAttempts: 1 })
    expect(result.success).toBe(true)
    expect(result.repaired).toBe(true)
    expect(result.retryCount).toBe(1)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('AI 修复仍失败 → 返回失败并记录 repairHistory', async () => {
    fetchSpy
      .mockResolvedValueOnce(chatResponse('{ "algorithm": "x", "steps": [ '))
      .mockResolvedValueOnce(chatResponse('依然不是 JSON'))
    const result = await analyzeCode(params, { maxRepairAttempts: 1 })
    expect(result.success).toBe(false)
    expect(result.retryCount).toBe(1)
    expect(result.repairHistory?.some(h => h.type === 'ai' && !h.success)).toBe(true)
  })

  it('禁用 AI 修复时截断 JSON → 直接失败', async () => {
    fetchSpy.mockResolvedValue(chatResponse('{ "algorithm": "x", "steps": [ '))
    const result = await analyzeCode(params, { enableAIRepair: false })
    expect(result.success).toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCode — abort
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCode abort', () => {
  it('预先 abort → 立即返回 AbortError，不发请求', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await analyzeCode(params, { signal: controller.signal })
    expect(result.success).toBe(false)
    expect(result.error).toBe('AbortError')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// testApiConnection
// ═══════════════════════════════════════════════════════════════════════════

describe('testApiConnection', () => {
  it('代理返回 OK → success，content 为 OK', async () => {
    fetchSpy.mockResolvedValue(chatResponse('OK'))
    const result = await testApiConnection(validConfig)
    expect(result.success).toBe(true)
    expect(result.content).toBe('OK')
    // jsonMode=false → 无 response_format
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string).response_format).toBeUndefined()
  })

  it('代理返回 403 → 认证失败', async () => {
    fetchSpy.mockResolvedValue(errorResponse(403))
    const result = await testApiConnection(validConfig)
    expect(result.success).toBe(false)
    expect(result.errorReport?.title).toBe('认证失败')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeCodeGenerator
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCodeGenerator', () => {
  it('预先 abort → AbortError', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await analyzeCodeGenerator(params, { signal: controller.signal })
    expect(result.success).toBe(false)
    expect(result.error).toBe('AbortError')
  })

  it('缺配置 → missingConfig', async () => {
    localStorageMock.clear()
    const result = await analyzeCodeGenerator(params)
    expect(result.success).toBe(false)
    expect(result.errorReport?.stage).toBe('config')
  })

  it('输入非法 → 输入格式错误', async () => {
    const result = await analyzeCodeGenerator({ ...params, inputData: 'bad {{{' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('代理返回非生成器内容 → 解析失败', async () => {
    fetchSpy.mockResolvedValue(chatResponse('这不是一个 generator 函数定义'))
    const result = await analyzeCodeGenerator(params)
    expect(result.success).toBe(false)
    expect(result.rawResponse).toBeDefined()
  })

  it('代理 HTTP 错误 → 透传 errorReport', async () => {
    fetchSpy.mockResolvedValue(errorResponse(401))
    const result = await analyzeCodeGenerator(params)
    expect(result.success).toBe(false)
    expect(result.errorReport?.title).toBe('认证失败')
  })
})
