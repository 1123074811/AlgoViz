# AI 分析历史 & 跨页导航持久化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击 AI 分析后生成历史记录存入侧边栏；分析中切换页面再回来状态保持，并可手动取消。

**Architecture:** 将 `aiStatus/aiError/aiRawResponse` 从 Visualizer 的 local useState 迁移到 Zustand store，使状态跨页面存活；`aiHistory[]` 同样存 store 并手动持久化到 localStorage；`AbortController` 以模块级变量管理，`analyzeCode` 接受 `signal` 参数透传给 fetch。四个任务按依赖分两波并行：Wave 1（Task 1 store + Task 2 client）→ Wave 2（Task 3 Visualizer + Task 4 Sidebar）。

**Tech Stack:** TypeScript, React 18, Zustand, Vite, vitest

---

## Task 1: Store 扩展 — AIHistoryEntry + AI 状态迁移

**Files:**
- Modify: `src/store/algorithmStore.ts`
- Test: `src/store/__tests__/algorithmStore.test.ts` (新建)

> **前提：** 无依赖，可与 Task 2 同时执行。

---

- [ ] **Step 1: 在 `src/store/algorithmStore.ts` 最顶部 import 后，`DEFAULT_ALGORITHMS` 之前，插入 `AIHistoryEntry` 类型和 `AI_HISTORY_KEY` 常量**

在文件第 1 行（`import { create } from 'zustand'`）之后、`export type Difficulty` 之前插入：

```ts
export type AIStatus = 'idle' | 'analyzing' | 'success' | 'error'

export interface AIHistoryEntry {
  id: string
  timestamp: number
  algorithmId: string
  algorithmName: string
  code: string
  language: string
  inputData: string
  script: AnimationScript
}

const AI_HISTORY_KEY = 'algoviz-ai-history'
const AI_HISTORY_MAX = 20

function loadAIHistory(): AIHistoryEntry[] {
  try {
    const raw = localStorage.getItem(AI_HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AIHistoryEntry[]
  } catch {
    return []
  }
}

function saveAIHistory(history: AIHistoryEntry[]): void {
  localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history))
}
```

- [ ] **Step 2: 在 `AlgorithmState` 接口里追加 AI 状态字段**

找到 `export interface AlgorithmState {`（约第 836 行），在 `language: 'zh' | 'en'` 之后追加：

```ts
  aiStatus: AIStatus
  aiError: string
  aiRawResponse: string
  aiHistory: AIHistoryEntry[]
```

- [ ] **Step 3: 在 `AlgorithmActions` 接口里追加 AI action 签名**

找到 `export interface AlgorithmActions {`（约第 845 行），在 `setLanguage` 之后追加：

```ts
  setAIStatus: (status: AIStatus, error?: string, rawResponse?: string) => void
  addAIHistory: (entry: AIHistoryEntry) => void
  clearAIHistory: () => void
```

- [ ] **Step 4: 在 `createAlgorithmStore` 的初始值里追加 AI 状态初始值**

找到 `export const createAlgorithmStore = create<...>((set) => ({`（约第 853 行），在 `language: ...` 之后追加：

```ts
  aiStatus: 'idle' as AIStatus,
  aiError: '',
  aiRawResponse: '',
  aiHistory: loadAIHistory(),
```

- [ ] **Step 5: 在 `createAlgorithmStore` 的 actions 里追加 AI actions 实现**

在 `setLanguage: (lang) => { ... },` 之后追加：

```ts
  setAIStatus: (status, error = '', rawResponse = '') =>
    set({ aiStatus: status, aiError: error, aiRawResponse: rawResponse }),

  addAIHistory: (entry) =>
    set((state) => {
      const next = [entry, ...state.aiHistory].slice(0, AI_HISTORY_MAX)
      saveAIHistory(next)
      return { aiHistory: next }
    }),

  clearAIHistory: () => {
    saveAIHistory([])
    set({ aiHistory: [] })
  },
```

- [ ] **Step 6: 创建测试文件 `src/store/__tests__/algorithmStore.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAlgorithmStore, type AIHistoryEntry } from '../algorithmStore'
import type { AnimationScript } from '@/types/animation'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const minimalScript: AnimationScript = {
  algorithm: 'bubble_sort',
  complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' },
  initialState: { type: 'array', data: [1, 2, 3] },
  steps: [],
}

function makeEntry(id: string): AIHistoryEntry {
  return {
    id,
    timestamp: Date.now(),
    algorithmId: 'bubble_sort',
    algorithmName: '冒泡排序',
    code: 'def sort(): pass',
    language: 'python',
    inputData: '[1,2,3]',
    script: minimalScript,
  }
}

describe('algorithmStore — AI 状态', () => {
  let store: ReturnType<typeof createAlgorithmStore>
  beforeEach(() => {
    localStorageMock.clear()
    store = createAlgorithmStore()
  })

  it('初始 aiStatus 为 idle', () => {
    expect(store.getState().aiStatus).toBe('idle')
  })

  it('setAIStatus 更新状态、错误和原始响应', () => {
    store.getState().setAIStatus('error', '接口超时', '{}')
    const s = store.getState()
    expect(s.aiStatus).toBe('error')
    expect(s.aiError).toBe('接口超时')
    expect(s.aiRawResponse).toBe('{}')
  })

  it('setAIStatus 不传 error/rawResponse 时清空对应字段', () => {
    store.getState().setAIStatus('error', '旧错误')
    store.getState().setAIStatus('analyzing')
    const s = store.getState()
    expect(s.aiError).toBe('')
    expect(s.aiRawResponse).toBe('')
  })
})

describe('algorithmStore — AI 历史', () => {
  let store: ReturnType<typeof createAlgorithmStore>
  beforeEach(() => {
    localStorageMock.clear()
    store = createAlgorithmStore()
  })

  it('addAIHistory 将条目置于列表头部', () => {
    store.getState().addAIHistory(makeEntry('a'))
    store.getState().addAIHistory(makeEntry('b'))
    expect(store.getState().aiHistory[0].id).toBe('b')
    expect(store.getState().aiHistory[1].id).toBe('a')
  })

  it('addAIHistory 超过 20 条时裁剪尾部', () => {
    for (let i = 0; i < 22; i++) {
      store.getState().addAIHistory(makeEntry(String(i)))
    }
    expect(store.getState().aiHistory).toHaveLength(20)
    // 最新的应在头部
    expect(store.getState().aiHistory[0].id).toBe('21')
  })

  it('addAIHistory 后写入 localStorage', () => {
    store.getState().addAIHistory(makeEntry('x'))
    const saved = JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')
    expect(saved[0].id).toBe('x')
  })

  it('clearAIHistory 清空列表并清 localStorage', () => {
    store.getState().addAIHistory(makeEntry('y'))
    store.getState().clearAIHistory()
    expect(store.getState().aiHistory).toHaveLength(0)
    expect(JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')).toHaveLength(0)
  })

  it('新建 store 时从 localStorage 恢复历史', () => {
    store.getState().addAIHistory(makeEntry('restore'))
    // 新建一个 store 实例，应读到刚写的历史
    const store2 = createAlgorithmStore()
    expect(store2.getState().aiHistory[0].id).toBe('restore')
  })
})
```

- [ ] **Step 7: 运行测试，确认全部通过**

```bash
npm test src/store/__tests__/algorithmStore.test.ts
```

期望：所有测试 PASS。若有失败，检查 localStorage mock 的 `defineProperty` 是否生效（vitest jsdom 环境应支持）。

- [ ] **Step 8: 运行全套测试和 tsc**

```bash
npx tsc --noEmit && npm test
```

期望：0 TypeScript 错误，所有已有测试仍通过。

- [ ] **Step 9: 提交**

```bash
git add src/store/
git commit -m "feat(store): 新增 AIHistoryEntry 类型、aiStatus/aiHistory store 字段与 actions

将 AI 状态（status/error/rawResponse）及历史记录迁移至 Zustand store，
支持跨页面持久。aiHistory 最多 20 条，自动同步 localStorage。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: client.ts — analyzeCode 接受 AbortSignal

**Files:**
- Modify: `src/ai/client.ts`
- Test: `src/ai/__tests__/client-abort.test.ts` (新建)

> **前提：** 无依赖，可与 Task 1 同时执行。

---

- [ ] **Step 1: 在 `AnalyzeOptions` 接口里追加 `signal` 字段**

找到 `export interface AnalyzeOptions {`（约第 112 行），追加：

```ts
export interface AnalyzeOptions {
  maxRepairAttempts?: number
  enableLocalRepair?: boolean
  enableAIRepair?: boolean
  signal?: AbortSignal
}
```

- [ ] **Step 2: 在 `analyzeCode` 里提取 signal，在调用前检查是否已中止**

找到 `export async function analyzeCode(params, options = {}):`（约第 129 行），将解构行改为：

```ts
const { maxRepairAttempts = 1, enableLocalRepair = true, enableAIRepair = true, signal } = options
```

在 `const config = getApiConfig()` 之前插入：

```ts
  if (signal?.aborted) {
    return { success: false, error: 'AbortError', rawResponse: '' }
  }
```

- [ ] **Step 3: 将 signal 透传给 `requestWithProxyFallback`**

找到 `const result = await requestWithProxyFallback(config, buildSystemPrompt(...), buildUserMessage(...), { temperature: 0.3, jsonMode: true })`（约第 159 行），改为：

```ts
    const result = await requestWithProxyFallback(
      config,
      buildSystemPrompt(params.language),
      buildUserMessage(params.code, params.language, params.inputData, parsedInput.promptContext, params.algorithmName),
      { temperature: 0.3, jsonMode: true, signal },
    )
```

同理，AI 修复的第二次请求（约第 189 行）：

```ts
        const repairResult = await requestWithProxyFallback(
          config,
          '你是 AnimationScript JSON 修复器。只输出修复后的完整 JSON。',
          repairPrompt,
          { temperature: 0, jsonMode: true, signal },
        )
```

- [ ] **Step 4: 在 `catch (e)` 里重新抛出 AbortError**

找到 `analyzeCode` 末尾的 `} catch (e) {`（约第 222 行），改为：

```ts
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
    const message = e instanceof Error ? e.message : String(e)
    const result = buildFetchErrorResult(message)
    return { success: false, error: result.error, errorReport: result.errorReport, rawResponse: result.content }
  }
```

- [ ] **Step 5: 将 `signal` 字段加入 `ChatRequestOptions`**

找到 `interface ChatRequestOptions {`（约第 24 行），追加：

```ts
interface ChatRequestOptions {
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  signal?: AbortSignal
}
```

- [ ] **Step 6: 在 `requestWithProxyFallback` 里透传 signal**

找到 `async function requestWithProxyFallback(..., options: ChatRequestOptions = {})`（约第 233 行），里面的两处调用已接受 `options`，不需单独拆开——`options` 已经包含 `signal`，直接透传给下层即可，无需修改（`requestViaProxy` 和 `requestChatCompletion` 接收 `options`）。

验证：`requestViaProxy` 和 `requestChatCompletion` 的最后一个参数都是 `options: ChatRequestOptions`。

- [ ] **Step 7: 在 `requestViaProxy` 的 fetch 里透传 signal**

找到 `requestViaProxy` 里的 `const response = await fetch('/api/chat', { method: 'POST', ... })`（约第 263 行），改为：

```ts
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Target': normalizedConfig.baseUrl,
        ...(normalizedConfig.apiKey ? { 'X-Proxy-Key': normalizedConfig.apiKey } : {}),
      },
      body: JSON.stringify(buildChatRequestBody(normalizedConfig, systemPrompt, userMessage, options)),
      signal: options.signal,
    })
```

- [ ] **Step 8: 在 `requestChatCompletion` 的 fetch 里透传 signal**

找到 `requestChatCompletion` 里的 `response = await fetch(apiUrl, { method: 'POST', ... })`（约第 313 行），改为：

```ts
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${normalizedConfig.apiKey}` },
      body: JSON.stringify(buildChatRequestBody(normalizedConfig, systemPrompt, userMessage, options)),
      signal: options.signal,
    })
```

- [ ] **Step 9: 在两个 requestViaProxy / requestChatCompletion 的 catch 里重新抛出 AbortError**

`requestViaProxy` 的 `catch (e)`（约第 283 行）改为：

```ts
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
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
```

`requestChatCompletion` 的 `catch (e)`（约第 318 行）改为：

```ts
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
    return buildFetchErrorResult(e instanceof Error ? e.message : String(e))
  }
```

- [ ] **Step 10: 创建 abort 测试文件 `src/ai/__tests__/client-abort.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeCode } from '../client'

// Mock localStorage for getApiConfig
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const validConfig = JSON.stringify({
  apiKey: 'test-key',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-pro',
})

describe('analyzeCode — AbortSignal', () => {
  beforeEach(() => {
    localStorageMock.clear()
    localStorageMock.setItem('algoviz-api-config', validConfig)
  })

  it('signal 在调用前已 abort 时立即返回，不发 fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    const controller = new AbortController()
    controller.abort()

    const result = await analyzeCode(
      { code: 'def sort(): pass', language: 'python', inputData: '[1,2,3]' },
      { signal: controller.signal },
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
    fetchSpy.mockRestore()
  })

  it('fetch 抛出 AbortError 时 analyzeCode 重新抛出', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)
    const controller = new AbortController()

    await expect(
      analyzeCode(
        { code: 'def sort(): pass', language: 'python', inputData: '[1,2,3]' },
        { signal: controller.signal },
      )
    ).rejects.toThrow('AbortError')

    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 11: 运行测试**

```bash
npm test src/ai/__tests__/client-abort.test.ts
```

期望：2 tests PASS。

- [ ] **Step 12: 运行全套测试和 tsc**

```bash
npx tsc --noEmit && npm test
```

期望：0 TypeScript 错误，所有测试通过。

- [ ] **Step 13: 提交**

```bash
git add src/ai/client.ts src/ai/__tests__/client-abort.test.ts
git commit -m "feat(ai): analyzeCode 接受 AbortSignal，支持取消正在进行的分析

AnalyzeOptions 追加 signal 字段，透传给 fetch 调用。
AbortError 在各层 catch 中重新抛出，让调用方静默处理取消。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Visualizer — 状态迁移 + AbortController + 历史写入

**Files:**
- Modify: `src/pages/Visualizer/index.tsx`

> **前提：** Task 1 和 Task 2 必须先完成（需要 store 的 setAIStatus/addAIHistory 和 client 的 signal 支持）。

---

- [ ] **Step 1: 在 Visualizer/index.tsx 顶部 import 区追加 store actions 和新类型**

找到现有的 store import：
```ts
import { useAlgorithmStore } from '@/store/algorithmStore'
```
改为：
```ts
import { useAlgorithmStore, type AIHistoryEntry } from '@/store/algorithmStore'
```

- [ ] **Step 2: 在组件函数外部（文件顶层）声明模块级 AbortController**

在 `export default function Visualizer() {` 之前插入：

```ts
let currentAnalysisController: AbortController | null = null
```

- [ ] **Step 3: 在组件内部追加 store 订阅，删除三个本地 AI useState**

找到这三行（约第 149–151 行）：
```ts
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [aiError, setAiError] = useState('')
  const [aiRawResponse, setAiRawResponse] = useState('')
```
**删除**这三行，改为在 store 订阅区（第 137–139 行附近）追加：

```ts
  const aiStatus = useAlgorithmStore((s) => s.aiStatus)
  const aiError = useAlgorithmStore((s) => s.aiError)
  const aiRawResponse = useAlgorithmStore((s) => s.aiRawResponse)
  const setAIStatus = useAlgorithmStore((s) => s.setAIStatus)
  const addAIHistory = useAlgorithmStore((s) => s.addAIHistory)
```

- [ ] **Step 4: 同步删除文件顶部的 AIStatus 类型 import（已从 store 导出）**

找到：
```ts
type AIStatus = 'idle' | 'analyzing' | 'success' | 'error'
```
**删除**这一行（它在 Visualizer 顶部本地定义，现在从 store 获得类型，不再需要本地声明）。

- [ ] **Step 5: 替换 handleAIAnalyze 函数**

找到 `const handleAIAnalyze = async () => {`（约第 562 行），将整个函数替换为：

```ts
  const handleAIAnalyze = async () => {
    // Local Code Compilation & Syntax Validation Check
    const compResult = compileAndValidateCode(code, codeLanguage)
    if (!compResult.success) {
      setAIStatus('error', `[${compResult.errors[0].type}] ${compResult.errors[0].message} (第 ${compResult.errors[0].line} 行)${compResult.errors[0].context ? `\n\n代码上下文:\n\`\`\`\n${compResult.errors[0].context}\n\`\`\`` : ''}`)
      setAnimationScript(null)
      return
    }

    if (!hasApiConfig) {
      setAIStatus('error', t('controls.aiConfigureHint'))
      return
    }

    // Cancel any in-flight request before starting a new one
    currentAnalysisController?.abort()
    const controller = new AbortController()
    currentAnalysisController = controller

    setAIStatus('analyzing')

    try {
      const result: AIResult = await analyzeCode({
        code,
        language: codeLanguage,
        inputData,
        algorithmName: selectedAlgorithm?.name,
      }, { signal: controller.signal })

      // If this specific request was cancelled, do nothing
      if (controller.signal.aborted) return
      currentAnalysisController = null

      if (result.success && result.script) {
        setAIStatus('success')
        setAnimationScript(result.script)
        loadScript(result.script)
        const entry: AIHistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          algorithmId: selectedAlgorithm?.id ?? 'unknown',
          algorithmName: selectedAlgorithm?.name ?? '未知算法',
          code,
          language: codeLanguage,
          inputData,
          script: result.script,
        }
        addAIHistory(entry)
      } else {
        setAIStatus('error', result.error || t('common.error'), result.rawResponse)
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setAIStatus('error', e instanceof Error ? e.message : t('common.error'))
    }
  }
```

- [ ] **Step 6: 在 AI Status Banner 里加取消按钮**

找到 AI Status Banner（约第 860 行）里 `analyzing` 状态的 spinner 行：

```tsx
                {aiStatus === 'analyzing' && (
                  <Icon name="loader2" size={14} className="text-warning animate-spin" />
                )}
```

改为（在 spinner 和文字所在的 `<div className="flex items-center gap-2 mb-1">` 里，文字后面加取消按钮）：

```tsx
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {aiStatus === 'analyzing' && (
                      <Icon name="loader2" size={14} className="text-warning animate-spin" />
                    )}
                    <span className={`text-xs font-semibold ${
                      aiStatus === 'analyzing' ? 'text-warning' :
                      aiStatus === 'success' ? 'text-green-600' :
                      'text-red-500'
                    }`}>
                      {aiStatus === 'analyzing' ? t('controls.aiAnalyzing') :
                       aiStatus === 'success' ? t('controls.aiSuccess') : t('controls.aiFailed')}
                    </span>
                  </div>
                  {aiStatus === 'analyzing' && (
                    <button
                      onClick={() => {
                        currentAnalysisController?.abort()
                        currentAnalysisController = null
                        setAIStatus('idle')
                      }}
                      className="text-[10px] text-warning underline cursor-pointer border-none bg-transparent"
                    >
                      取消
                    </button>
                  )}
                </div>
```

**同时删除**原来的 `<div className="flex items-center gap-2 mb-1">` 及其内部的 Icon 和 span（已被上面新结构替代）。

- [ ] **Step 7: 确认所有 `setAiStatus` 引用已全部替换为 `setAIStatus`**

运行搜索确认没有遗漏：

```bash
grep -n "setAiStatus\|aiStatus === " src/pages/Visualizer/index.tsx | head -20
```

期望：所有 `setAiStatus(` 已改为 `setAIStatus(`。`aiStatus ===` 的读取引用保持不变（它们读 store）。

- [ ] **Step 8: 运行 tsc**

```bash
npx tsc --noEmit
```

期望：0 错误。常见错误：`AIStatus` 类型未 import（从 store 重新导出类型即可）；`AIHistoryEntry` 缺 import。

- [ ] **Step 9: 运行全套测试**

```bash
npm test
```

期望：所有测试通过（Visualizer 本身无单元测试，依赖 tsc 验证）。

- [ ] **Step 10: 提交**

```bash
git add src/pages/Visualizer/index.tsx
git commit -m "feat(visualizer): AI 状态迁移至 store，支持跨页持久和手动取消

删除 aiStatus/aiError/aiRawResponse 本地 useState，改读 store。
handleAIAnalyze 使用 AbortController，切换页面返回后分析状态保持，
成功后写入 aiHistory。右侧面板 analyzing 状态新增取消按钮。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Sidebar — AI 分析历史区块

**Files:**
- Modify: `src/components/Layout/Sidebar.tsx`

> **前提：** Task 1 必须先完成（需要 store 的 aiHistory/clearAIHistory/setAnimationScript）。

---

- [ ] **Step 1: 在 Sidebar.tsx 顶部 import 中追加需要的 store 字段和 hook**

找到：
```ts
import { useAlgorithmStore, type AlgorithmCategory, type Difficulty } from '@/store/algorithmStore'
```
改为：
```ts
import { useAlgorithmStore, type AlgorithmCategory, type Difficulty, type AIHistoryEntry } from '@/store/algorithmStore'
```

- [ ] **Step 2: 在 `Sidebar` 函数内追加 store 订阅（在已有订阅下面）**

在 `const setSelectedAlgorithm = useAlgorithmStore(...)` 之后追加：

```ts
  const aiHistory = useAlgorithmStore((s) => s.aiHistory)
  const clearAIHistory = useAlgorithmStore((s) => s.clearAIHistory)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)
```

- [ ] **Step 3: 添加时间格式化辅助函数（在组件外部，文件顶层）**

在 `export default function Sidebar(...) {` 之前插入：

```ts
function formatHistoryTime(timestamp: number): string {
  const now = Date.now()
  const date = new Date(timestamp)
  const today = new Date(now)
  const yesterday = new Date(now - 86400000)

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}
```

- [ ] **Step 4: 在 Sidebar 展开态（`return (...)` 里）的算法列表 `<div className="flex-1 overflow-y-auto px-3 pb-4">` 结束标签后、底部 tagline `<div className="p-3 border-t ...">` 之前，插入 AI 历史区块**

找到（约第 195 行）：
```tsx
      </div>

      <div className="p-3 border-t border-border">
```

在这两个 `div` 之间插入：

```tsx
      {/* AI 分析历史 */}
      {aiHistory.length > 0 && (
        <div className="border-t border-border px-3 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              AI 分析历史
            </span>
            <button
              onClick={clearAIHistory}
              className="text-[10px] text-muted hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
            >
              清空
            </button>
          </div>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {aiHistory.map((entry: AIHistoryEntry) => (
              <button
                key={entry.id}
                onClick={() => {
                  const algo = algorithms.find((a) => a.id === entry.algorithmId)
                  if (algo) setSelectedAlgorithm(algo)
                  setAnimationScript(entry.script)
                  navigate('/visualizer')
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md
                           text-left hover:bg-slate-100 transition-colors cursor-pointer
                           border-none bg-transparent group"
              >
                <span className="text-xs text-slate-700 truncate flex-1 font-medium">
                  {entry.algorithmName}
                </span>
                <span className="text-[10px] text-muted ml-2 shrink-0 group-hover:text-slate-500">
                  {formatHistoryTime(entry.timestamp)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 5: 运行 tsc**

```bash
npx tsc --noEmit
```

期望：0 错误。

- [ ] **Step 6: 运行全套测试**

```bash
npm test
```

期望：所有测试通过。

- [ ] **Step 7: 提交**

```bash
git add src/components/Layout/Sidebar.tsx
git commit -m "feat(sidebar): 新增 AI 分析历史区块

读取 store.aiHistory，在算法列表下方展示最近 20 条 AI 分析记录。
点击条目直接加载历史动画脚本，跳过重新分析。支持一键清空。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 自检

**1. Spec 覆盖：**
- ✅ AI 状态迁移至 store（Task 1 + Task 3）
- ✅ 跨页导航持久（Task 1 + Task 3：store 跨卸载存活）
- ✅ 取消按钮（Task 2 AbortSignal + Task 3 cancel button）
- ✅ 历史记录保存（Task 1 存储 + Task 3 写入）
- ✅ 侧边栏展示历史（Task 4）
- ✅ 从历史恢复 script（Task 4 onClick）
- ✅ localStorage 持久化历史（Task 1 loadAIHistory/saveAIHistory）
- ✅ 20 条上限（Task 1 AI_HISTORY_MAX）

**2. 占位符扫描：** 无 TBD/TODO。所有步骤含完整代码。

**3. 类型一致性：**
- `AIHistoryEntry` 在 Task 1 定义，Task 3/4 import 使用 ✓
- `setAIStatus(status, error?, rawResponse?)` 签名在 Task 1 定义，Task 3 按此调用 ✓
- `addAIHistory(entry: AIHistoryEntry)` 在 Task 1 定义，Task 3 构造完整对象传入 ✓
- `clearAIHistory()` 无参数，Task 4 onClick 直接调用 ✓
- `AIStatus` 类型从 store 导出，Task 3 import ✓
