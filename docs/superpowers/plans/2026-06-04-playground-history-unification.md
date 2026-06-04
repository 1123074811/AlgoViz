# Playground 历史统一 + max_tokens 修复

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击 AI 分析后立刻创建历史记录（含进行中/错误状态）；Playground 状态迁入 store；修复 max_tokens=4096 导致 JSON 被截断的 bug。

**Architecture:** `AIHistoryEntry` 增加 `status`/`error` 字段，`script` 改为可选，store 新增 `updateAIHistory`/`removeAIHistory`。Playground 的 `animationScript`/`aiStatus`/历史列表迁入 store，点击分析即建历史再更新结果。四个任务按依赖分两波：Wave 1（Task A store + Task B max_tokens）→ Wave 2（Task C Playground + Task D Sidebar）。

**Tech Stack:** TypeScript, React 18, Zustand (vanilla createStore), vitest

---

## Task A: Store — 扩展 AIHistoryEntry + 新 actions

**Files:**
- Modify: `src/store/algorithmStore.ts`
- Modify: `src/store/__tests__/algorithmStore.test.ts`
- Modify: `src/pages/Visualizer/index.tsx` (一行补丁)

> **前提：** 无依赖，可与 Task B 同时执行。

---

- [ ] **Step 1: 在 `algorithmStore.ts` 里添加 `AIHistoryStatus` 类型，并修改 `AIHistoryEntry`**

找到（第 4–15 行）：
```ts
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
```

替换为：
```ts
export type AIHistoryStatus = 'analyzing' | 'success' | 'error'

export interface AIHistoryEntry {
  id: string
  timestamp: number
  algorithmId: string
  algorithmName: string
  code: string
  language: string
  inputData: string
  status: AIHistoryStatus
  script?: AnimationScript
  error?: string
}
```

- [ ] **Step 2: 在 `AlgorithmActions` 接口中追加两个新 action**

找到 `AlgorithmActions` 里的 `clearAIHistory: () => void`，在其后追加：

```ts
  updateAIHistory: (id: string, patch: Partial<Omit<AIHistoryEntry, 'id'>>) => void
  removeAIHistory: (id: string) => void
```

- [ ] **Step 3: 在 `createAlgorithmStore` factory 里实现两个新 action**

找到 `clearAIHistory: () => {` 实现后面，追加：

```ts
  updateAIHistory: (id, patch) =>
    set((state) => {
      const idx = state.aiHistory.findIndex((e) => e.id === id)
      if (idx === -1) return state
      const next = [...state.aiHistory]
      next[idx] = { ...next[idx], ...patch }
      saveAIHistory(next)
      return { aiHistory: next }
    }),

  removeAIHistory: (id) =>
    set((state) => {
      const next = state.aiHistory.filter((e) => e.id !== id)
      saveAIHistory(next)
      return { aiHistory: next }
    }),
```

- [ ] **Step 4: 修复 `src/pages/Visualizer/index.tsx` 中的 `addAIHistory` 调用**

在 Visualizer/index.tsx 里找到 `addAIHistory` 调用（约第 597–607 行）：

```ts
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
```

改为（追加 `status`）：

```ts
        const entry: AIHistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          algorithmId: selectedAlgorithm?.id ?? 'unknown',
          algorithmName: selectedAlgorithm?.name ?? '未知算法',
          code,
          language: codeLanguage,
          inputData,
          status: 'success',
          script: result.script,
        }
```

- [ ] **Step 5: 更新 store 测试文件**

在 `src/store/__tests__/algorithmStore.test.ts` 里，`makeEntry` 函数的返回值需要加上 `status: 'success'`：

找到：
```ts
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
```

改为：
```ts
function makeEntry(id: string, status: AIHistoryStatus = 'success'): AIHistoryEntry {
  return {
    id,
    timestamp: Date.now(),
    algorithmId: 'bubble_sort',
    algorithmName: '冒泡排序',
    code: 'def sort(): pass',
    language: 'python',
    inputData: '[1,2,3]',
    status,
    script: status === 'success' ? minimalScript : undefined,
  }
}
```

并更新导入，在 `import { createAlgorithmStore, type AIHistoryEntry } from '../algorithmStore'` 里追加 `AIHistoryStatus`：

```ts
import { createAlgorithmStore, type AIHistoryEntry, type AIHistoryStatus } from '../algorithmStore'
```

同时在测试文件末尾追加两个新测试（覆盖 `updateAIHistory` 和 `removeAIHistory`）：

```ts
describe('algorithmStore — updateAIHistory / removeAIHistory', () => {
  let store: ReturnType<typeof createAlgorithmStore>
  beforeEach(() => {
    localStorageMock.clear()
    store = createAlgorithmStore()
  })

  it('updateAIHistory 更新指定条目的字段', () => {
    store.getState().addAIHistory(makeEntry('u1', 'analyzing'))
    store.getState().updateAIHistory('u1', { status: 'success', script: minimalScript })
    const updated = store.getState().aiHistory.find(e => e.id === 'u1')
    expect(updated?.status).toBe('success')
    expect(updated?.script).toBeDefined()
  })

  it('updateAIHistory 对不存在的 id 无副作用', () => {
    store.getState().addAIHistory(makeEntry('u2'))
    const before = store.getState().aiHistory.length
    store.getState().updateAIHistory('nonexistent', { status: 'error' })
    expect(store.getState().aiHistory.length).toBe(before)
  })

  it('removeAIHistory 删除指定条目', () => {
    store.getState().addAIHistory(makeEntry('r1'))
    store.getState().addAIHistory(makeEntry('r2'))
    store.getState().removeAIHistory('r1')
    const ids = store.getState().aiHistory.map(e => e.id)
    expect(ids).not.toContain('r1')
    expect(ids).toContain('r2')
  })
})
```

- [ ] **Step 6: 验证并提交**

```bash
npx tsc --noEmit && npm test
```

期望：0 TypeScript 错误，所有测试通过（包含 3 个新测试）。

```bash
git add src/store/ src/pages/Visualizer/index.tsx
git commit -m "feat(store): AIHistoryEntry 增加 status/error 字段，script 改为可选

支持进行中/错误状态的历史记录。新增 updateAIHistory/removeAIHistory。
Visualizer 的 addAIHistory 调用补充 status:'success'。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task B: client.ts — max_tokens 4096 → 8192

**Files:**
- Modify: `src/ai/client.ts`

> **前提：** 无依赖，可与 Task A 同时执行。

---

- [ ] **Step 1: 修改 `buildChatRequestBody` 里的默认 max_tokens**

找到（约第 84 行）：
```ts
    max_tokens: options.maxTokens ?? 4096,
```

改为：
```ts
    max_tokens: options.maxTokens ?? 8192,
```

- [ ] **Step 2: 验证并提交**

```bash
npx tsc --noEmit && npm test
```

期望：0 错误，所有测试通过。

```bash
git add src/ai/client.ts
git commit -m "fix(ai): max_tokens 从 4096 提升至 8192

Java/C++ 算法的完整 AnimationScript 含逐步 events 时轻松超过 4096 tokens，
导致 JSON 在生成中途被截断。提升上限减少截断概率。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task C: Playground — 迁入 store + 点击即建历史

**Files:**
- Modify: `src/pages/Playground/index.tsx`

> **前提：** Task A 必须先完成。

---

- [ ] **Step 1: 更新 import 区**

找到顶部 import 区，把 `@/ai` 和 store 相关 import 更新为：

```ts
import { useAlgorithmStore, type AIHistoryEntry } from '@/store/algorithmStore'
import { analyzeCode, getApiConfig, parseInputData, type AIResult, type AIErrorReport, type AIRepairAttempt } from '@/ai'
```

**删除**文件里本地定义的 `interface HistoryEntry`（第 16–23 行）、`loadHistory`/`saveHistory` 函数（第 40–46 行），以及 `const LANGUAGE_OPTIONS` 保持不动。

- [ ] **Step 2: 在组件函数外部（`export default function Playground()` 之前）声明 AbortController**

```ts
let playgroundAnalysisController: AbortController | null = null
```

- [ ] **Step 3: 在组件函数内部，替换状态声明**

**删除**这些本地 useState（共 4 行）：
```ts
  const [animationScript, setAnimationScript] = useState<AnimationScript | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [aiError, setAiError] = useState('')
  const [aiRawResponse, setAiRawResponse] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [showHistory, setShowHistory] = useState(true)
```

**替换为**（store 订阅 + 保留必要本地 state）：
```ts
  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)
  const aiStatus = useAlgorithmStore((s) => s.aiStatus)
  const aiError = useAlgorithmStore((s) => s.aiError)
  const aiRawResponse = useAlgorithmStore((s) => s.aiRawResponse)
  const setAIStatus = useAlgorithmStore((s) => s.setAIStatus)
  const aiHistory = useAlgorithmStore((s) => s.aiHistory)
  const addAIHistory = useAlgorithmStore((s) => s.addAIHistory)
  const updateAIHistory = useAlgorithmStore((s) => s.updateAIHistory)
  const removeAIHistory = useAlgorithmStore((s) => s.removeAIHistory)
  const [showHistory, setShowHistory] = useState(true)
```

**保留**这些本地 state（不需跨页）：
```ts
  const [aiErrorReport, setAiErrorReport] = useState<AIErrorReport | null>(null)
  const [aiRepairHistory, setAiRepairHistory] = useState<AIRepairAttempt[] | null>(null)
  const [showRawResponse, setShowRawResponse] = useState(false)
```

- [ ] **Step 4: 替换 `handleAnalyze` 函数**

```ts
  const handleAnalyze = async () => {
    const compResult = compileAndValidateCode(code, codeLanguage)

    if (compResult.warnings.length > 0) {
      const warnLines = compResult.warnings.map(w => `  ⚠ L${w.line}: [${w.type}] ${w.message}`)
      console.warn(`代码检查发现 ${compResult.warnings.length} 个警告:\n${warnLines.join('\n')}`)
    }

    if (!compResult.success) {
      const firstErr = compResult.errors[0]
      const allErrors = compResult.errors.map(e =>
        `[${e.type}] L${e.line}: ${e.message}${e.context ? '\n  → ' + e.context : ''}`
      ).join('\n\n')
      const warnNote = compResult.warnings.length > 0
        ? `\n\n(${compResult.warnings.length} 个警告)` : ''
      setAIStatus('error', `发现 ${compResult.errors.length} 个编译错误:\n\n${allErrors}${warnNote}`)
      setAiErrorReport({
        stage: 'compilation',
        title: `代码编译错误 (${compResult.errors.length} 个) / Compilation Errors`,
        message: firstErr.message,
        issues: compResult.errors.map(e => ({
          code: 'COMP_ERR',
          path: `line ${e.line}`,
          message: `[${e.type}] ${e.message}${e.context ? '\n上下文: ' + e.context : ''}`,
          suggestion: '请修正以上语法错误后再试。',
          severity: 'error' as const,
          recoverable: false
        })),
        suggestions: compResult.errors.map(e => `修正第 ${e.line} 行: ${e.message}`),
        canRetry: false
      })
      setAnimationScript(null)
      return
    }

    if (!hasApiConfig) { navigate('/settings'); return }

    // Cancel any previous in-flight request
    playgroundAnalysisController?.abort()
    const controller = new AbortController()
    playgroundAnalysisController = controller

    // Create history entry immediately (status: 'analyzing')
    const historyId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    addAIHistory({
      id: historyId,
      timestamp: Date.now(),
      algorithmId: 'playground',
      algorithmName: '自定义代码',
      code,
      language: codeLanguage,
      inputData,
      status: 'analyzing',
    })

    setAIStatus('analyzing')
    setAiErrorReport(null)
    setAiRepairHistory(null)
    setShowRawResponse(false)

    try {
      const result: AIResult = await analyzeCode({
        code, language: codeLanguage, inputData,
        algorithmName: '用户自定义代码',
      }, { signal: controller.signal })

      if (controller.signal.aborted) return
      playgroundAnalysisController = null

      if (result.success && result.script) {
        setAnimationScript(result.script)
        setAIStatus('success')
        if (result.repaired) setAiRepairHistory(result.repairHistory ?? null)
        updateAIHistory(historyId, { status: 'success', script: result.script })
      } else {
        setAIStatus('error', result.error || '分析失败', result.rawResponse)
        setAiErrorReport(result.errorReport ?? null)
        setAiRepairHistory(result.repairHistory ?? null)
        updateAIHistory(historyId, { status: 'error', error: result.error || '分析失败' })
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Remove the analyzing entry if aborted
        removeAIHistory(historyId)
        return
      }
      const msg = e instanceof Error ? e.message : '未知错误'
      setAIStatus('error', msg)
      updateAIHistory(historyId, { status: 'error', error: msg })
    }
  }
```

- [ ] **Step 5: 替换 `handleRestore` 函数**

```ts
  const handleRestore = (entry: AIHistoryEntry) => {
    setCode(entry.code)
    setCodeLanguage(entry.language)
    setInputData(entry.inputData)
    if (entry.status === 'success' && entry.script) {
      setAnimationScript(entry.script)
      setAIStatus('success')
    } else {
      setAnimationScript(null)
      setAIStatus('idle')
    }
    setAiErrorReport(null)
    setAiRepairHistory(null)
  }
```

- [ ] **Step 6: 替换 `handleDelete` 函数**

```ts
  const handleDelete = (id: string) => {
    removeAIHistory(id)
  }
```

- [ ] **Step 7: 更新历史面板 JSX 里的类型和显示**

在历史面板的 `history.map(entry => {...})` 区域（约第 244 行附近），改为读 `aiHistory`，并根据 `entry.status` 显示状态图标。将：

```tsx
                  {history.map(entry => {
                    const algoName = entry.script.algorithm || '自定义代码'
```

改为：

```tsx
                  {aiHistory.map(entry => {
                    const algoName = (entry.status === 'success' && entry.script?.algorithm) ? entry.script.algorithm : (entry.algorithmName || '自定义代码')
```

在条目 `<button>` 的第一行（算法名和删除按钮那行），在算法名 span 之前加状态图标：

```tsx
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {entry.status === 'analyzing' && <Icon name="loader2" size={10} className="text-violet-400 animate-spin shrink-0" />}
                            {entry.status === 'success' && <Icon name="check" size={10} className="text-green-500 shrink-0" />}
                            {entry.status === 'error' && <Icon name="alert-circle" size={10} className="text-red-400 shrink-0" />}
                            <span className="text-[10px] font-semibold text-primary truncate">{algoName}</span>
                          </div>
```

同时把 `history.length` 改为 `aiHistory.length`，把 `history.length === 0` 改为 `aiHistory.length === 0`，把清空按钮的 `setHistory([]); saveHistory([])` 改为 `clearAIHistory()`（从 store 订阅 `const clearAIHistory = useAlgorithmStore((s) => s.clearAIHistory)`）。

- [ ] **Step 8: 删除 `formatTime` 函数（已有 store 层的 `formatHistoryTime`，但 Playground 有自己的格式，可保留重命名为本地函数）**

保持 `formatTime` 函数不变即可（是本地纯函数，不需删除）。

- [ ] **Step 9: 运行 tsc**

```bash
npx tsc --noEmit
```

期望：0 错误。常见问题：忘记从 store 订阅 `clearAIHistory`；`entry.script` 未做可选守卫。

- [ ] **Step 10: 运行全套测试**

```bash
npm test
```

期望：所有测试通过。

- [ ] **Step 11: 提交**

```bash
git add src/pages/Playground/index.tsx
git commit -m "feat(playground): AI 状态迁入 store，点击分析立即创建历史记录

删除本地 animationScript/aiStatus/history 等 useState，改读 Zustand store。
handleAnalyze 点击后立即写入 analyzing 状态的历史条目，完成后更新为
success/error，中止则移除。历史面板显示进行中/成功/失败状态图标。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task D: Sidebar — 适配可选 script + 状态图标

**Files:**
- Modify: `src/components/Layout/Sidebar.tsx`

> **前提：** Task A 必须先完成（entry.script 现在是可选的）。

---

- [ ] **Step 1: 在 Sidebar 历史条目的 `onClick` 里守卫可选 script**

找到（约第 233–238 行）：
```tsx
                onClick={() => {
                  const algo = algorithms.find((a) => a.id === entry.algorithmId)
                  if (algo) setSelectedAlgorithm(algo)
                  setAnimationScript(entry.script)
                  navigate('/visualizer')
                }}
```

改为：
```tsx
                onClick={() => {
                  if (entry.status === 'success' && entry.script) {
                    const algo = algorithms.find((a) => a.id === entry.algorithmId)
                    if (algo) setSelectedAlgorithm(algo)
                    setAnimationScript(entry.script)
                    navigate('/visualizer')
                  } else {
                    navigate('/playground')
                  }
                }}
```

- [ ] **Step 2: 在历史条目的 button 里加状态图标和 import**

在条目名称 `<span>` 之前加图标：

找到：
```tsx
                <span className="text-xs text-slate-700 truncate flex-1 font-medium">
                  {entry.algorithmName}
                </span>
```

改为：
```tsx
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {entry.status === 'analyzing' && (
                    <Icon name="loader2" size={11} className="text-violet-400 animate-spin shrink-0" />
                  )}
                  {entry.status === 'error' && (
                    <Icon name="alert-circle" size={11} className="text-red-400 shrink-0" />
                  )}
                  <span className="text-xs text-slate-700 truncate font-medium">
                    {entry.algorithmName}
                  </span>
                </div>
```

- [ ] **Step 3: 也更新 import 里的 `AIHistoryEntry`（同时导入 `AIHistoryStatus` 供类型守卫，可选）**

当前 import 行：
```ts
import { useAlgorithmStore, type AlgorithmCategory, type Difficulty, type AIHistoryEntry } from '@/store/algorithmStore'
```
不需要修改——`AIHistoryStatus` 作为字符串字面量比较即可，不需要 import 类型。

- [ ] **Step 4: 验证并提交**

```bash
npx tsc --noEmit && npm test
```

期望：0 错误，所有测试通过。

```bash
git add src/components/Layout/Sidebar.tsx
git commit -m "fix(sidebar): 历史条目守卫可选 script，非成功条目跳转 Playground

entry.script 现在可选，success 条目加载动画并跳 Visualizer，
其他状态跳 Playground 供重试。历史列表显示 analyzing/error 状态图标。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 自检

1. **Spec 覆盖：**
   - ✅ 点击分析立刻建历史（Task C Step 4：addAIHistory 在 analyzeCode 之前）
   - ✅ 错误状态的历史记录（Task C：updateAIHistory status:'error'）
   - ✅ 历史记录显示状态图标（Task C Step 7 + Task D Step 2）
   - ✅ 点击历史恢复代码+输入（Task C Step 5）
   - ✅ 成功历史点击恢复动画（Task C Step 5 + Task D Step 1）
   - ✅ max_tokens 修复（Task B）
   - ✅ Playground 迁 store + 跨页持久（Task C）
   - ✅ 取消分析（AbortController，Task C Step 4）

2. **占位符扫描：** 无 TBD。所有步骤有完整代码。

3. **类型一致性：**
   - `AIHistoryStatus` 在 Task A 定义，Task C 使用字符串字面量 `'analyzing'/'success'/'error'` ✓
   - `AIHistoryEntry.script` 改为可选，Task A/C/D 所有地方做了守卫 ✓
   - `updateAIHistory(id, patch)` 签名在 Task A 定义，Task C 按此调用 ✓
   - `removeAIHistory(id)` 无参数之外只接受 id，Task C/D 正确调用 ✓
   - `setAIStatus(status, error?, rawResponse?)` 在原有 store 里定义，Task C 按此调用 ✓
