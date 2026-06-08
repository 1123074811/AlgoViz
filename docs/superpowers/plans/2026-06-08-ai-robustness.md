# 工作线 C：AI 生成健壮性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让自定义代码走 AI 生成动画时**永不白屏、永不卡死、永不裸报错**：增强解析容错、补全 fallback 降级场景、区分三类失败给出可读兜底态，并用稳定性测试台量化成功率。

**Architecture:** 三层防线——(1) `parser` 解析容错救回脏输出；(2) 失败时 `buildFallbackScene` 至少画出 `initialState` + 错误说明；(3) `useAIGenerator` 编排把「模型不可用 / 解析失败 / 执行超时」三类失败映射到对应兜底态。与渲染层（A/B）完全隔离——产出仍是合法 `AnimationScript`。

**Tech Stack:** TypeScript、Web Worker 沙箱、Vitest。

**独立性：** 本计划只动 `src/ai/**`、`src/sandbox/**`、`src/hooks/useAIGenerator.ts`，与 A/B 无文件交集，可全程并行、任意时刻合入。

**前置探索（执行 agent 必做）：** 开工前先读 `src/ai/errors.ts`、`src/hooks/useAIGenerator.ts`、`src/types/animation.ts`（确认 `AnimationScript` / `InitialState` 字段名）、`src/pages/Playground/index.tsx:225-240` 与 `src/pages/Visualizer/index.tsx:625-640`（确认失败态如何渲染）。下文代码中的 `AnimationScript` 字段以 `src/types/animation.ts` 实际定义为准。

---

### Task 1: 解析容错——修复尾随逗号后再解析

**Files:**
- Modify: `src/ai/parser.ts`（在 `extractBetweenBraces` 解析失败前增加一次「清洗后重试」）
- Test: `src/ai/__tests__/parser.test.ts`（追加用例）

- [ ] **Step 1: 写失败测试**

```ts
// 追加到 src/ai/__tests__/parser.test.ts
import { parseAIResponseDetailed } from '../parser'

it('容忍 JSON 对象/数组的尾随逗号', () => {
  const raw = `{
    "algorithm": "bubble_sort",
    "complexity": { "time": { "best": "O(n)", "average": "O(n^2)", "worst": "O(n^2)" }, "space": "O(1)" },
    "initialState": { "type": "array", "data": [5,3,1,] },
    "steps": [
      { "stepId": 1, "codeLine": 0, "description": { "zh": "初始化", "en": "init" },
        "events": [{ "type": "array.create", "values": [5,3,1] }],
        "stats": { "comparisons": 0, "swaps": 0, "accesses": 0 } },
    ]
  }`
  const result = parseAIResponseDetailed(raw)
  expect(result.success).toBe(true)
  expect(result.script?.algorithm).toBe('bubble_sort')
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/ai/__tests__/parser.test.ts`
Expected: FAIL（尾随逗号导致 `JSON.parse` 抛错，最终走 `jsonParseFailed`）

- [ ] **Step 3: 增加清洗重试**

在 `src/ai/parser.ts` 顶部新增辅助函数：

```ts
/** 去除对象/数组中的尾随逗号：  ,] -> ]   ,} -> } （字符串外的常见模型笔误） */
function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1')
}
```

把 `extractBetweenBraces` 解析失败的两处 `return buildError('json_parse', ...)` 改为「先 `stripTrailingCommas` 再试一次，仍失败才报错」。例如 brace_extract 分支：

```ts
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
```

（对 markdown code_block 分支同样在其内层 catch 处加一次清洗重试。）

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/ai/__tests__/parser.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/ai/parser.ts src/ai/__tests__/parser.test.ts
git commit -m "fix(ai): 解析容忍 JSON 尾随逗号,救回常见脏输出"
```

---

### Task 2: buildFallbackScene —— 失败时永不空白

**Files:**
- Create: `src/ai/fallbackScene.ts`
- Test: `src/ai/__tests__/fallbackScene.test.ts`

> 执行前确认 `src/types/animation.ts` 中 `AnimationScript`、`InitialState`、`AnimationStep`、`Complexity` 的字段；下方代码按 README 文档的协议编写，如字段名不同请对齐。

- [ ] **Step 1: 写失败测试**

```ts
// src/ai/__tests__/fallbackScene.test.ts
import { describe, it, expect } from 'vitest'
import { buildFallbackScene } from '../fallbackScene'

describe('buildFallbackScene', () => {
  it('数组输入时至少画出 initialState 并附错误说明', () => {
    const script = buildFallbackScene(
      { type: 'array', data: [5, 3, 8, 1] },
      { kind: 'runtime', message: '生成器执行超时' },
    )
    expect(script.steps.length).toBeGreaterThan(0)
    // 首步应创建数组
    const firstEvents = script.steps[0].events ?? []
    expect(firstEvents.some(e => e.type === 'array.create')).toBe(true)
    // 错误说明出现在某步描述里
    const allDesc = script.steps.map(s => s.description.zh).join(' ')
    expect(allDesc).toContain('超时')
  })

  it('无可用 initialState 时仍返回带说明的单步脚本(不为空)', () => {
    const script = buildFallbackScene(
      { type: 'array', data: [] },
      { kind: 'parse', message: '模型输出无法解析' },
    )
    expect(script.steps.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/ai/__tests__/fallbackScene.test.ts`
Expected: FAIL（无 fallbackScene 模块）

- [ ] **Step 3: 写实现**

```ts
// src/ai/fallbackScene.ts
import type { AnimationScript, InitialState } from '@/types/animation'

export type FallbackKind = 'unavailable' | 'parse' | 'runtime'
export interface FallbackInfo { kind: FallbackKind; message: string }

const KIND_TITLE: Record<FallbackKind, string> = {
  unavailable: '模型暂不可用',
  parse: '生成结果无法解析',
  runtime: '生成器执行失败',
}

/**
 * 任何 AI 生成失败路径的兜底脚本：至少画出 initialState（数组），
 * 并以步骤描述呈现失败原因。保证 SceneCanvas 永不空白。
 */
export function buildFallbackScene(initial: InitialState, info: FallbackInfo): AnimationScript {
  const data = initial.type === 'array' && Array.isArray(initial.data) ? initial.data : []
  const title = KIND_TITLE[info.kind]
  const desc = `${title}：${info.message}。已显示原始输入，可调整代码/输入后重试。`

  const steps: AnimationScript['steps'] = [
    {
      stepId: 1,
      codeLine: 0,
      description: { zh: desc, en: `${info.kind}: ${info.message}` },
      action: { type: 'highlight', targets: [], color: 'danger' },
      events: data.length > 0 ? [{ type: 'array.create', values: data } as never] : [],
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    },
  ]

  return {
    algorithm: 'fallback',
    complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' },
    initialState: initial,
    presentation: { engine: 'scene', module: 'array' },
    steps,
  }
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/ai/__tests__/fallbackScene.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/ai/fallbackScene.ts src/ai/__tests__/fallbackScene.test.ts
git commit -m "feat(ai): buildFallbackScene 兜底脚本,保证渲染永不空白"
```

---

### Task 3: 沙箱超时/崩溃返回结构化 kind

**Files:**
- Modify: `src/sandbox/runGenerator.ts`（在 `GeneratorResult` 失败上附 `kind`）
- Modify: `src/sandbox/executeGenerator.ts`（确认 `GeneratorResult` 类型含可选 `kind`）
- Test: `src/sandbox/__tests__/runGenerator.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// 追加到 src/sandbox/__tests__/runGenerator.test.ts
import { runGeneratorSandboxed } from '../runGenerator'

it('死循环生成器在超时后返回 ok=false 且 kind=runtime', async () => {
  const src = 'while(true){}' // 立即死循环
  const result = await runGeneratorSandboxed(src, [1, 2, 3], { algorithm: 'custom', type: 'array' }, 200)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.kind).toBe('runtime')
}, 2000)
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/sandbox/__tests__/runGenerator.test.ts`
Expected: FAIL（当前失败结果无 `kind` 字段）

- [ ] **Step 3: 加 kind 字段**

在 `src/sandbox/executeGenerator.ts` 的 `GeneratorResult` 失败分支类型上增加可选字段：`{ ok: false; error: string; kind?: 'runtime' }`（按现有定义对齐 union）。在 `src/sandbox/runGenerator.ts` 的三处失败 resolve 上补 `kind: 'runtime'`：超时、`onerror`、以及 `executeGenerator` 兜底（若其返回失败，由调用方归类）。例如超时分支：

```ts
resolve({ ok: false, error: `生成器执行超时（>${timeoutMs}ms），可能存在死循环`, kind: 'runtime' })
```

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/sandbox/__tests__/runGenerator.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/sandbox/runGenerator.ts src/sandbox/executeGenerator.ts src/sandbox/__tests__/runGenerator.test.ts
git commit -m "feat(sandbox): 沙箱失败结果附结构化 kind 便于兜底归类"
```

---

### Task 4: useAIGenerator 接入三类兜底

**Files:**
- Modify: `src/hooks/useAIGenerator.ts`（失败路径调用 `buildFallbackScene` 而非置空）
- Test: `src/hooks/__tests__/useAIGenerator.fallback.test.ts`（新建）

> 执行前读 `src/hooks/useAIGenerator.ts` 全文，确认 `applyScriptRef` / `setStatusRef` 与失败分支位置（约 169-275 行多处 `runGeneratorSandboxed`、273 行 `result.ok` 分支）。

- [ ] **Step 1: 写失败测试（针对编排的纯逻辑——分类函数）**

先抽出一个纯函数便于测试。新建测试：

```ts
// src/hooks/__tests__/useAIGenerator.fallback.test.ts
import { describe, it, expect } from 'vitest'
import { classifyFailure } from '../useAIGenerator'

describe('classifyFailure', () => {
  it('认证/网络错误归类 unavailable', () => {
    expect(classifyFailure({ stage: 'network' } as never)).toBe('unavailable')
  })
  it('解析/schema 错误归类 parse', () => {
    expect(classifyFailure({ stage: 'json_parse' } as never)).toBe('parse')
    expect(classifyFailure({ stage: 'schema' } as never)).toBe('parse')
  })
  it('沙箱 runtime 归类 runtime', () => {
    expect(classifyFailure({ kind: 'runtime' } as never)).toBe('runtime')
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/hooks/__tests__/useAIGenerator.fallback.test.ts`
Expected: FAIL（无 `classifyFailure` 导出）

- [ ] **Step 3: 实现 classifyFailure 并在失败分支调用兜底**

在 `src/hooks/useAIGenerator.ts` 导出：

```ts
import type { FallbackKind } from '@/ai/fallbackScene'

export function classifyFailure(err: { stage?: string; kind?: string }): FallbackKind {
  if (err.kind === 'runtime') return 'runtime'
  const s = err.stage ?? ''
  if (s.includes('network') || s.includes('auth') || s.includes('rate')) return 'unavailable'
  if (s.includes('json') || s.includes('schema') || s.includes('parse') || s.includes('extract')) return 'parse'
  return 'parse'
}
```

在所有 `runGeneratorSandboxed` 最终失败、以及解析失败的兜底分支，替换「置空 / 仅 setStatus('error')」为：

```ts
const kind = classifyFailure(failureSource)
applyScriptRef.current(buildFallbackScene(parsedInitialState, { kind, message: failureMessage }))
setStatusRef.current('error')
```

（`parsedInitialState` 取自当前输入解析结果；`failureMessage` 取错误文本。）

- [ ] **Step 4: 运行验证通过 + 全量 hooks 测试**

Run: `npx vitest run src/hooks`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/hooks/useAIGenerator.ts src/hooks/__tests__/useAIGenerator.fallback.test.ts
git commit -m "feat(ai): 生成失败统一走 buildFallbackScene,三类失败可读兜底"
```

---

### Task 5: 稳定性测试台——脏输入必产出合法脚本或合法 fallback

**Files:**
- Create: `src/ai/__tests__/stability.corpus.test.ts`
- Test: 同上

- [ ] **Step 1: 写脏输入语料测试**

```ts
// src/ai/__tests__/stability.corpus.test.ts
import { describe, it, expect } from 'vitest'
import { parseAIResponseDetailed } from '../parser'
import { buildFallbackScene } from '../fallbackScene'
import { validateAnimationScript } from '../schema'

const DIRTY_INPUTS: string[] = [
  '',                                   // 空
  'not json at all',                    // 纯文本
  '```json\n{ broken',                  // 截断 code block
  '{ "algorithm": "x" }',               // 缺字段
  '抱歉，我无法分析这段代码',              // 模型拒答
]

describe('稳定性语料：脏输入永不导致空白/崩溃', () => {
  for (const raw of DIRTY_INPUTS) {
    it(`脏输入 [${raw.slice(0, 16)}...] 要么解析成功要么有合法 fallback`, () => {
      const result = parseAIResponseDetailed(raw)
      const script = result.success && result.script
        ? result.script
        : buildFallbackScene({ type: 'array', data: [3, 1, 2] }, { kind: 'parse', message: '解析失败' })
      // 任一路径都必须产出 steps 非空的合法脚本
      expect(script.steps.length).toBeGreaterThan(0)
      const issues = validateAnimationScript(script)
      expect(issues.some(i => i.severity === 'error')).toBe(false)
    })
  }
})
```

- [ ] **Step 2: 运行验证通过（若某条失败说明仍有未兜底路径，回到对应 Task 修复）**

Run: `npx vitest run src/ai/__tests__/stability.corpus.test.ts`
Expected: PASS（全部脏输入均有合法产出）

- [ ] **Step 3: 提交**

```bash
git add src/ai/__tests__/stability.corpus.test.ts
git commit -m "test(ai): 稳定性语料台,脏输入必产出合法脚本或 fallback"
```

---

### Task 6: 全量门禁

- [ ] **Step 1: 全量测试 + lint**

Run: `npm run test && npm run lint`
Expected: 全绿、无新增 lint 错误。

- [ ] **Step 2: 通知协调者 C 线完成（可任意时刻合入）。**

## 验收对照（spec §5.4）
- [x] 三类失败 → 三种可读兜底态（Task 4）
- [x] 无 undefined/白屏/裸报错（Task 2/3/4）
- [x] 稳定性语料台全绿、可量化（Task 5）
