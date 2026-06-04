# AI 分析历史 & 跨页导航状态持久

**日期：** 2026-06-04  
**目标：** 点击 AI 分析后生成历史记录；切换页面再回来不中断当前分析，并可手动取消。

---

## 1. Store 扩展（`src/store/algorithmStore.ts`）

### 新增类型

```ts
export interface AIHistoryEntry {
  id: string             // Date.now().toString()，唯一即可
  timestamp: number
  algorithmId: string
  algorithmName: string
  code: string
  language: string
  inputData: string
  script: AnimationScript
}
```

### 新增状态字段

```ts
// AlgorithmState 追加：
aiStatus: 'idle' | 'analyzing' | 'success' | 'error'
aiError: string
aiRawResponse: string
aiHistory: AIHistoryEntry[]
```

### 新增 Action

```ts
// AlgorithmActions 追加：
setAIStatus: (
  status: 'idle' | 'analyzing' | 'success' | 'error',
  error?: string,
  rawResponse?: string
) => void
addAIHistory: (entry: AIHistoryEntry) => void
clearAIHistory: () => void
```

### 初始值 & 持久化

- `aiStatus / aiError / aiRawResponse`：初始值为 `'idle' / '' / ''`，**不持久化**（刷新后重置）
- `aiHistory`：启动时从 `localStorage('algoviz-ai-history')` 加载；每次 `addAIHistory` 后同步写入；上限 **20 条**（新在前），超出裁剪尾部

---

## 2. Visualizer 改造（`src/pages/Visualizer/index.tsx`）

### 2a. 状态迁移

将以下本地 `useState` 删除，改为从 store 读取：

| 旧本地 state | store 字段 |
|---|---|
| `aiStatus` | `useAlgorithmStore(s => s.aiStatus)` |
| `aiError` | `useAlgorithmStore(s => s.aiError)` |
| `aiRawResponse` | `useAlgorithmStore(s => s.aiRawResponse)` |

### 2b. AbortController（模块级）

```ts
// Visualizer/index.tsx 顶层（组件外部）
let currentAnalysisController: AbortController | null = null
```

不放入 store（AbortController 不可序列化）。

### 2c. handleAIAnalyze 改造

```ts
const handleAIAnalyze = async () => {
  // 语法校验、hasApiConfig 检查不变

  // 中止上一次（如有）
  currentAnalysisController?.abort()
  const controller = new AbortController()
  currentAnalysisController = controller

  setAIStatus('analyzing')

  const result = await analyzeCode(
    { code, language: codeLanguage, inputData, algorithmName: selectedAlgorithm?.name },
    { signal: controller.signal }
  )

  // 已被取消，不做任何 UI 更新
  if (controller.signal.aborted) return
  currentAnalysisController = null

  if (result.success && result.script) {
    setAIStatus('success')
    setAnimationScript(result.script)
    loadScript(result.script)
    addAIHistory({
      id: Date.now().toString(),
      timestamp: Date.now(),
      algorithmId: selectedAlgorithm?.id ?? 'unknown',
      algorithmName: selectedAlgorithm?.name ?? '未知算法',
      code,
      language: codeLanguage,
      inputData,
      script: result.script,
    })
  } else {
    setAIStatus('error', result.error, result.rawResponse)
  }
}
```

### 2d. 取消按钮

在"正在分析"状态的 UI 里（当前已有 spinner 区域）旁边加一个"取消"按钮：

```tsx
{aiStatus === 'analyzing' && (
  <button onClick={() => {
    currentAnalysisController?.abort()
    currentAnalysisController = null
    setAIStatus('idle')
  }}>
    取消
  </button>
)}
```

### 2e. analyzeCode 接受 AbortSignal

在 `src/ai/client.ts` 的 `AnalyzeOptions` 接口追加 `signal?: AbortSignal`，并透传给两个 `fetch` 调用：

```ts
response = await fetch(apiUrl, { ..., signal: options.signal })
```

`fetch` 的 AbortError 在外层 `catch` 里判断并重新抛出，让调用方处理：

```ts
} catch (e) {
  if (e instanceof Error && e.name === 'AbortError') throw e
  // 原有错误处理
}
```

`handleAIAnalyze` 在 `await analyzeCode(...)` 外再包一层：

```ts
try {
  const result = await analyzeCode(...)
  // ...
} catch (e) {
  if (e instanceof Error && e.name === 'AbortError') return // 静默取消
  // 其他异常照常显示错误
}
```

---

## 3. 侧边栏历史区（`src/components/Layout/Sidebar.tsx`）

### 位置

在算法列表 `<div>` 的**下方**，固定高度滚动区之外，作为独立区块。

### UI 结构

```
┌─────────────────────────────┐
│ ⏱ AI 分析历史              [清空] │  ← 标题行，右侧清空按钮
├─────────────────────────────┤
│ 冒泡排序    今天 14:23        │  ← 条目：算法名 + 相对时间
│ 快速排序    昨天              │
│ ...（最多 20 条，新在前）    │
└─────────────────────────────┘
```

- 无历史时：显示灰色提示文字「暂无历史记录」
- 时间格式：今天显示 `HH:mm`，昨天显示「昨天」，更早显示 `MM/DD`

### 点击行为

```ts
onClick={() => {
  setSelectedAlgorithm(
    algorithms.find(a => a.id === entry.algorithmId) ?? null
  )
  setAnimationScript(entry.script)
  navigate('/visualizer')
}}
```

直接跳转 `/visualizer`，无需重新分析。

---

## 4. 数据流总结

```
用户点击「AI 分析」
  → store.aiStatus = 'analyzing'
  → analyzeCode(params, { signal })  [跨页面的 Promise 继续运行]

用户切换到其他页面
  → Visualizer 卸载，但 Promise 和 store 未受影响

用户切回 Visualizer
  → 重载，读 store.aiStatus === 'analyzing'，按钮显示加载中

Promise 完成
  → store.aiStatus = 'success'
  → store.animationScript 更新
  → store.aiHistory 追加新条目，写 localStorage
  → UI 刷新
```

---

## 5. 文件改动清单

| 文件 | 改动类型 |
|---|---|
| `src/store/algorithmStore.ts` | 新增 `AIHistoryEntry`、新增 state/actions、localStorage 同步 |
| `src/ai/client.ts` | `AnalyzeOptions` 加 `signal`，fetch 透传，AbortError 重抛 |
| `src/pages/Visualizer/index.tsx` | 移除 3 个 local state，改读 store；`handleAIAnalyze` 加 AbortController 和历史写入；加取消按钮 |
| `src/components/Layout/Sidebar.tsx` | 新增 AI 历史区块（读 `aiHistory`，点击加载历史） |

---

## 6. 测试覆盖

- `algorithmStore`：`addAIHistory` 超 20 条裁剪、localStorage 读写
- `client.ts`：`analyzeCode` signal 中止后不触发错误路径（用 `vi.fn()` mock fetch abort）
- `Sidebar`：`aiHistory` 为空/非空的渲染快照

---

## 约束

- 不引入新依赖
- 不修改 `AnimationScript` 类型定义
- `aiStatus` 的语义与原 `AIStatus` 类型完全一致（直接 rename 导入）
