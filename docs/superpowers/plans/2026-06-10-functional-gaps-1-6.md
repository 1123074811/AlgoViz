# 功能性不足修复(1-6)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 AlgoViz 六项功能性不足——AI 动画语义一致性校验、AI 动画双语、无向图布局与层内交叉、题单类目去水分、代码编辑与动画脱钩提示、规模截断透明化与回溯搜索树。

**Architecture:** 六个相互独立的 Phase,每个 Phase 完成后项目均可独立构建、测试、交付。AI 校验(P1)在现有 useAIGenerator 修复管线后追加一道"结果一致性门";双语(P2)只改 AnimationBuilder 与提示词,不动事件协议;布局(P3)新增 forceLayout 纯函数模块并在 layoutGraph 的无向分支接入;P4 纯数据/文档修订;P5 在 Visualizer 增加脱钩横幅与行高亮抑制;P6 复用现有 tree.* 事件实现回溯搜索树语法糖,零新编译器。

**Tech Stack:** React 18 + TypeScript 6 + Vitest 4 (jsdom, globals 开启,测试中 describe/it/expect 免 import)。路径别名 `@/` → `src/`。

---

## 背景与基线

### 六项不足(来自 2026-06-10 功能分析)

1. **AI 动画正确性无语义保障**:AI 生成器是模型对用户 Python/C++/Java 代码的 JS 重写,沙箱执行产生动画;质量门([src/ai/quality/index.ts](../../../src/ai/quality/index.ts))只做结构检查,动画结果与原代码语义无任何比对;`b.line()` 行号纯靠 AI 猜,无校验。
2. **AI 动画中文单语**:[src/sandbox/builder.ts](../../../src/sandbox/builder.ts) `add()` 写 `description: { zh, en: zh }`,英文是中文的拷贝;`desc()` 只收一个中文参数;提示词强制中文。
3. **无向图布局弱**:[src/scene/layouts/graphLayout.ts](../../../src/scene/layouts/graphLayout.ts) 中**有向图已有 BFS 分层布局**,但层内排序是 `localeCompare`(不消减交叉);**无向图只有哈希环形槽位兜底**,稍密的图边交叉严重。
4. **题单类目夸大**:目录条目 `leetcode_hot100` 实际只是两数之和单例([src/presets/leetcode.ts](../../../src/presets/leetcode.ts)),`acm_templates` 是快速幂/二分答案单页演示;README 宣称"LeetCode Hot 100、ACM 模板"覆盖。
5. **代码编辑与动画静默脱钩**:内置算法动画由 `(算法id, 输入)` 驱动([src/hooks/resolveScript.ts](../../../src/hooks/resolveScript.ts)),用户改了编辑器代码后动画照旧、行高亮箭头照旧指向模板行号,无任何提示。
6. **规模截断不透明 + 回溯搜索树缺失**:leetcode 预设 `slice(0, 12)` 静默截断输入;回溯算法只有调用栈视图,搜索树形状与剪枝位置不可见。

### 关键现有接口(实现时直接对接,不要重新发明)

| 接口 | 位置 | 签名要点 |
|---|---|---|
| `parseGeneratorResponse(raw)` | `src/ai/generatorParser.ts` | 解析 ```` ```js ```` 块 + `// @algorithm/@type/@sample/@time/@space` 指令,返回 `GeneratorParseResult { success, generator?: ParsedGenerator, error? }` |
| `ParsedGenerator` | 同上 | `{ algorithm, type, body, sampleInput?, timeComplexity?, spaceComplexity? }` |
| `AnimationBuilder` | `src/sandbox/builder.ts` | `desc(zh)` 暂存 `pendingDesc`;`add(events, action)` 出步骤,`description: { zh, en: zh }`;`MAX_STEPS = 600`;`defaultDescFor(event)` 是中文默认描述 switch;`result(value)` 设 `resultValue` 并 `build()` 时写入 `script.result` |
| `AnimationScript` | `src/types/animation.ts` | `result?: number \| string \| boolean \| Array<number \| string \| boolean>`(189 行附近);`steps[].codeLine: number`(-1 = 无行高亮);`steps[].description: { zh, en }` |
| `runGeneratorSandboxed(source, input, meta, timeoutMs=5000)` | `src/sandbox/runGenerator.ts` | Worker 沙箱执行;无 Worker 环境(测试)回退 `executeGenerator` 内联执行;返回 `GeneratorResult { ok, script?, error?, kind? }` |
| `useAIGenerator.analyze()` | `src/hooks/useAIGenerator.ts` | 流程:`analyzeCodeGenerator` → 识别内置(Phase 1)/沙箱执行(Phase 2)→ 运行期失败修复一次 → 质量门失败修复一次 → 成功 `applyScript` |
| `repairGenerator({ body, sourceCode, language, category, issues, inputData, signal })` | `src/ai/repairGenerator.ts` | 带 issue 清单回发 AI 修复一次,返回 `{ body } \| null` |
| `runQualityGate(script, category, extraRules, sourceCode?)` | `src/ai/quality/index.ts` | 确定性规则,error 即不通过 |
| `CORE_PROMPT(language)` | `src/ai/prompt/core.ts` | 生成器提示词主体,含输出格式、`b.desc` 文档、质量底线、选择排序示例 |
| `layoutGraph(scene)` | `src/scene/layouts/graphLayout.ts` | 有向 → BFS rank 分层列布局(层内 `localeCompare` 排序);无向/单层 → `PRESET_ANGLES` + `hashString` 环形槽位 |
| Visualizer 代码状态 | `src/pages/Visualizer/index.tsx` ~140-155 行 | `codeScopeKey`、`defaultCode`(模板/操作代码)、`code = codeByScope[codeScopeKey] ?? defaultCode`、`setCode` |
| Visualizer AI 分析 | 同上 ~324 行 | `const handleAIAnalyze = useCallback(async () => { ... analyzeGenerator(...) ... })`;~202-207 行解构 `{ liveAlgoId, generator, analyze: analyzeGenerator, reset: resetGenerator }` |
| Monaco 行高亮 effect | 同上 ~270-323 行 | `useEffect` 依赖 `[currentStep, animationScript]`,用 `editor.deltaDecorations(decorationsRef.current, newDecorations)` |
| i18n 语言包 | `src/i18n/locales/zh.json`、`en.json` | JSON 平铺命名空间 |

### 前置条件(Task 0)

工作区当前有未提交的目录重构(`algorithmCatalog.ts` 拆分、新增 `src/data/algorithms.ts`/`algorithmMetadata.ts`、`Visualizer/index.tsx` 改动)。**开工前必须先让用户确认提交这批改动**,否则本计划的行号锚点会漂移。

- [ ] **Task 0: 确认基线干净**

Run: `git status --short`
Expected: 输出为空(无未提交改动)。若不为空,停下来请用户先处理(提交或暂存),不要替用户决定。

每个 Phase 完成后的统一验收命令:

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

---

# Phase 1: AI 动画语义一致性校验

**思路:** 三道互补的确定性防线,全部不增加常规请求次数:
1. `@expect` 指令——让模型在生成器头部自报"原代码在 @sample 输入上的返回值"。生成器执行(JS 重写的执行结果)与 `@expect`(模型对原代码的直接推理)是**两条独立路径**,二者不一致即说明移植或推理至少有一处错了。
2. JS 真值执行——当用户代码本身就是 JavaScript 时,直接在 Worker 沙箱里跑用户原函数,拿**真实返回值**比对,强于 @expect。
3. 行号消毒——`b.line()` 超出源代码行数的步骤直接清除行高亮(置 -1),杜绝箭头指向不存在的行。

校验失败 → 带具体差异回发 AI 修复一次 → 仍失败则**不回退**(动画仍然展示),但在脚本上打 `verification: { status: 'fail' }` 标记,UI 显示警示横幅"动画未通过一致性校验,结果可能与代码不符"。

### Task 1.1: 生成器解析器支持 `@expect` 指令

**Files:**
- Modify: `src/ai/generatorParser.ts`
- Test: `src/ai/__tests__/generatorParser.test.ts`(已有文件,追加用例)

- [ ] **Step 1: 写失败测试**

在 `src/ai/__tests__/generatorParser.test.ts` 末尾追加:

```ts
describe('@expect directive', () => {
  it('extracts the raw @expect payload and strips it from the body', () => {
    const raw = [
      '```js',
      '// @algorithm two_sum',
      '// @type array',
      '// @sample nums = [2,7,11,15]; target = 9',
      '// @expect [0,1]',
      'b.arrayCreate(input.nums || input)',
      '```',
    ].join('\n')
    const result = parseGeneratorResponse(raw)
    expect(result.success).toBe(true)
    expect(result.generator?.expectedResult).toBe('[0,1]')
    expect(result.generator?.body).not.toContain('@expect')
  })

  it('leaves expectedResult undefined when @expect is absent', () => {
    const raw = '```js\n// @algorithm x\n// @type array\nb.arrayCreate(input)\n```'
    const result = parseGeneratorResponse(raw)
    expect(result.success).toBe(true)
    expect(result.generator?.expectedResult).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/ai/__tests__/generatorParser.test.ts`
Expected: FAIL — `expectedResult` 属性不存在(类型错误或断言失败)。

- [ ] **Step 3: 实现**

`src/ai/generatorParser.ts` 三处修改:

(a) `ParsedGenerator` 接口追加字段:

```ts
  /** AI-declared expected return value of the ORIGINAL code on @sample input (raw text, parsed lazily by verify.ts). */
  expectedResult?: string
```

(b) `parseGeneratorResponse` 中,在 `spaceMatch` 之后追加提取:

```ts
  const expectMatch = code.match(/\/\/\s*@expect\s+(.+)/)
  const expectedResult = expectMatch ? expectMatch[1].trim() : undefined
```

(c) body 过滤正则把 `expect` 加入指令名单(原:`@(algorithm|type|sample|time|space)\b`):

```ts
    .filter(line => !/^\s*\/\/\s*@(algorithm|type|sample|time|space|expect)\b/.test(line))
```

(d) 返回对象追加 `expectedResult`:

```ts
  return { success: true, generator: { algorithm, type, body, sampleInput, timeComplexity, spaceComplexity, expectedResult } }
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/ai/__tests__/generatorParser.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/ai/generatorParser.ts src/ai/__tests__/generatorParser.test.ts
git commit -m "feat(ai): 生成器解析支持 @expect 期望结果指令"
```

### Task 1.2: 校验核心模块 verify.ts

**Files:**
- Create: `src/ai/verify.ts`
- Test: `src/ai/__tests__/verify.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/ai/__tests__/verify.test.ts`:

```ts
import { parseExpectValue, resultsMatch, verifyAgainstExpect, sanitizeLineMapping } from '../verify'
import type { AnimationScript } from '@/types/animation'

function makeScript(result?: AnimationScript['result'], codeLines: number[] = [0]): AnimationScript {
  return {
    algorithm: 'test',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [1, 2] },
    ...(result !== undefined && { result }),
    steps: codeLines.map((codeLine, i) => ({
      stepId: i + 1,
      codeLine,
      description: { zh: 's', en: 's' },
      action: { type: 'highlight', targets: [], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    })),
  }
}

describe('parseExpectValue', () => {
  it('parses JSON payloads', () => {
    expect(parseExpectValue('[0,1]')).toEqual({ ok: true, value: [0, 1] })
    expect(parseExpectValue('true')).toEqual({ ok: true, value: true })
    expect(parseExpectValue('42')).toEqual({ ok: true, value: 42 })
    expect(parseExpectValue('"abc"')).toEqual({ ok: true, value: 'abc' })
  })
  it('falls back to plain string for non-JSON payloads', () => {
    expect(parseExpectValue('abc')).toEqual({ ok: true, value: 'abc' })
  })
  it('rejects empty/undefined', () => {
    expect(parseExpectValue(undefined).ok).toBe(false)
    expect(parseExpectValue('  ').ok).toBe(false)
  })
})

describe('resultsMatch', () => {
  it('matches numbers with tolerance', () => {
    expect(resultsMatch(0.1 + 0.2, 0.3)).toBe(true)
    expect(resultsMatch(3, 4)).toBe(false)
  })
  it('matches arrays element-wise', () => {
    expect(resultsMatch([0, 1], [0, 1])).toBe(true)
    expect(resultsMatch([0, 1], [1, 0])).toBe(false)
    expect(resultsMatch([0, 1], [0, 1, 2])).toBe(false)
  })
  it('coerces string/number cross-type comparison', () => {
    expect(resultsMatch('42', 42)).toBe(true)
    expect(resultsMatch(true, 'true')).toBe(true)
  })
})

describe('verifyAgainstExpect', () => {
  it('passes when script.result equals @expect', () => {
    const outcome = verifyAgainstExpect(makeScript([0, 1]), '[0,1]')
    expect(outcome.status).toBe('pass')
    expect(outcome.source).toBe('expect')
  })
  it('fails on mismatch and carries both values', () => {
    const outcome = verifyAgainstExpect(makeScript([1, 0]), '[0,1]')
    expect(outcome.status).toBe('fail')
    expect(outcome.actual).toEqual([1, 0])
    expect(outcome.expected).toEqual([0, 1])
  })
  it('skips when the generator never called b.result', () => {
    expect(verifyAgainstExpect(makeScript(undefined), '[0,1]').status).toBe('skipped')
  })
  it('skips when @expect is missing or unparseable-empty', () => {
    expect(verifyAgainstExpect(makeScript([0, 1]), undefined).status).toBe('skipped')
  })
})

describe('sanitizeLineMapping', () => {
  it('clears codeLine beyond the source line count', () => {
    const script = makeScript([0], [0, 2, 99])
    const fixed = sanitizeLineMapping(script, 'line1\nline2\nline3')
    expect(fixed).toBe(1)
    expect(script.steps.map(s => s.codeLine)).toEqual([0, 2, -1])
  })
  it('returns 0 when all lines are valid', () => {
    const script = makeScript([0], [0, 1])
    expect(sanitizeLineMapping(script, 'a\nb\nc')).toBe(0)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/ai/__tests__/verify.test.ts`
Expected: FAIL — 模块 `../verify` 不存在。

- [ ] **Step 3: 实现**

创建 `src/ai/verify.ts`:

```ts
import type { AnimationScript } from '@/types/animation'

export type VerifyStatus = 'pass' | 'fail' | 'skipped'

export interface VerifyOutcome {
  status: VerifyStatus
  /** 校验依据:'expect' = AI 自报期望值;'js-exec' = 真实执行用户 JS 代码。 */
  source?: 'expect' | 'js-exec'
  expected?: unknown
  actual?: unknown
  /** skipped 时的原因,给 UI 与日志看。 */
  message?: string
}

/** 解析 @expect 原文:优先 JSON,否则视为裸字符串。空白视为缺失。 */
export function parseExpectValue(raw: string | undefined): { ok: boolean; value?: unknown } {
  const text = raw?.trim()
  if (!text) return { ok: false }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: true, value: text }
  }
}

/** 结果比对:数字带 1e-9 容差;数组逐元素;字符串/数字/布尔跨类型按字符串化比较。 */
export function resultsMatch(actual: unknown, expected: unknown): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 1e-9
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length && actual.every((v, i) => resultsMatch(v, expected[i]))
  }
  if (actual === expected) return true
  // 跨类型("42" vs 42、true vs "true"):按字符串化宽容比较
  if (actual != null && expected != null && !Array.isArray(actual) && !Array.isArray(expected)) {
    return String(actual) === String(expected)
  }
  return false
}

/** 用 @expect 指令校验动画输出。 */
export function verifyAgainstExpect(script: AnimationScript, expectRaw: string | undefined): VerifyOutcome {
  const parsed = parseExpectValue(expectRaw)
  if (!parsed.ok) return { status: 'skipped', message: '生成器未提供 @expect' }
  if (script.result === undefined) {
    return { status: 'skipped', source: 'expect', message: '生成器未调用 b.result,无法比对' }
  }
  const matched = resultsMatch(script.result, parsed.value)
  return {
    status: matched ? 'pass' : 'fail',
    source: 'expect',
    expected: parsed.value,
    actual: script.result,
  }
}

/** 用真值(如 JS 直接执行用户代码所得)校验动画输出。 */
export function verifyAgainstGroundTruth(script: AnimationScript, truth: unknown): VerifyOutcome {
  if (script.result === undefined) {
    return { status: 'skipped', source: 'js-exec', message: '生成器未调用 b.result,无法比对' }
  }
  const matched = resultsMatch(script.result, truth)
  return { status: matched ? 'pass' : 'fail', source: 'js-exec', expected: truth, actual: script.result }
}

/** 行号消毒:b.line() 指向超出源代码行数的步骤,清除其行高亮(置 -1)。返回修正条数。 */
export function sanitizeLineMapping(script: AnimationScript, sourceCode: string): number {
  const lineCount = sourceCode.split('\n').length
  let fixed = 0
  for (const step of script.steps) {
    if (step.codeLine >= lineCount) {
      step.codeLine = -1
      fixed++
    }
  }
  return fixed
}

/** 给 UI/修复提示用的短格式化(截断到 120 字符)。 */
export function formatVerifyValue(value: unknown): string {
  let text: string
  try {
    text = JSON.stringify(value) ?? String(value)
  } catch {
    text = String(value)
  }
  return text.length > 120 ? text.slice(0, 117) + '...' : text
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/ai/__tests__/verify.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/ai/verify.ts src/ai/__tests__/verify.test.ts
git commit -m "feat(ai): 结果一致性校验核心(@expect 比对 + 行号消毒)"
```

### Task 1.3: JS 用户代码真值执行

**Files:**
- Create: `src/sandbox/runUserCode.ts`
- Create: `src/sandbox/userCodeWorker.ts`
- Test: `src/sandbox/__tests__/runUserCode.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/sandbox/__tests__/runUserCode.test.ts`:

```ts
import { buildJsCallSource, runUserJsSandboxed } from '../runUserCode'

describe('buildJsCallSource', () => {
  it('builds a call for function declarations with named-object input', () => {
    const code = 'function twoSum(nums, target) { return [0, 1] }'
    const src = buildJsCallSource(code, { nums: [2, 7], target: 9 })
    expect(src).toContain('return twoSum([2,7], 9)')
  })
  it('passes bare array input as a single argument', () => {
    const code = 'function sortArr(nums) { return nums.slice().sort((a,b)=>a-b) }'
    const src = buildJsCallSource(code, [3, 1, 2])
    expect(src).toContain('return sortArr([3,1,2])')
  })
  it('supports arrow function assignments', () => {
    const code = 'const maxVal = (nums) => Math.max(...nums)'
    const src = buildJsCallSource(code, [1, 9, 4])
    expect(src).toContain('return maxVal([1,9,4])')
  })
  it('returns null when no callable entry is found', () => {
    expect(buildJsCallSource('const x = 1', [1])).toBeNull()
  })
})

describe('runUserJsSandboxed (inline fallback in jsdom)', () => {
  it('executes user JS and returns the real value', async () => {
    const code = 'function add(nums, target) { return nums[0] + target }'
    const result = await runUserJsSandboxed(code, { nums: [5], target: 4 })
    expect(result).toEqual({ ok: true, value: 9 })
  })
  it('reports failure when the entry cannot be built', async () => {
    const result = await runUserJsSandboxed('const a = 1', [1])
    expect(result.ok).toBe(false)
  })
  it('reports failure when user code throws', async () => {
    const result = await runUserJsSandboxed('function boom(x) { throw new Error("nope") }', [1])
    expect(result.ok).toBe(false)
    expect(result.error).toContain('nope')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/sandbox/__tests__/runUserCode.test.ts`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现 Worker**

创建 `src/sandbox/userCodeWorker.ts`:

```ts
/** 执行用户 JS 代码取真实返回值的微型 Worker。source 已由 buildJsCallSource 拼好调用。 */
export interface UserCodeRequest { source: string }
export interface UserCodeResult { ok: boolean; value?: unknown; error?: string }

self.onmessage = (ev: MessageEvent<UserCodeRequest>) => {
  const post = (r: UserCodeResult) => (self as unknown as Worker).postMessage(r)
  try {
    const fn = new Function(ev.data.source) as () => unknown
    post({ ok: true, value: fn() })
  } catch (e) {
    post({ ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
```

- [ ] **Step 4: 实现入口模块**

创建 `src/sandbox/runUserCode.ts`:

```ts
import type { UserCodeResult } from './userCodeWorker'

export type { UserCodeResult }

/**
 * 从用户 JS 代码中找到入口函数,拼出"定义 + 调用"源码。
 * 入参派发规则:input 是对象且函数形参名全部能在对象上找到 → 按形参顺序展开;
 * 否则整个 input 作为唯一实参。找不到入口返回 null(调用方按 skipped 处理)。
 */
export function buildJsCallSource(userCode: string, input: unknown): string | null {
  const fnDecl = userCode.match(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/)
  const arrowDecl = userCode.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/)
  const match = fnDecl ?? arrowDecl
  if (!match) return null
  const name = match[1]
  const params = match[2]
    .split(',')
    .map(p => p.trim().split(/[=:\s]/)[0])
    .filter(Boolean)

  let args: unknown[]
  if (
    input !== null && typeof input === 'object' && !Array.isArray(input) &&
    params.length > 0 && params.every(p => p in (input as Record<string, unknown>))
  ) {
    args = params.map(p => (input as Record<string, unknown>)[p])
  } else {
    args = [input]
  }

  let argSource: string
  try {
    argSource = args.map(a => JSON.stringify(a) ?? 'undefined').join(', ')
  } catch {
    return null
  }
  return `${userCode}\n;return ${name}(${argSource});`
}

function executeInline(source: string): UserCodeResult {
  try {
    const fn = new Function(source) as () => unknown
    return { ok: true, value: fn() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** 在 Worker 沙箱中真实执行用户 JS 函数(超时 3s);无 Worker 环境内联执行。 */
export function runUserJsSandboxed(userCode: string, input: unknown, timeoutMs = 3000): Promise<UserCodeResult> {
  const source = buildJsCallSource(userCode, input)
  if (!source) return Promise.resolve({ ok: false, error: '未找到可调用的入口函数' })

  if (typeof Worker === 'undefined') {
    return Promise.resolve(executeInline(source))
  }
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./userCodeWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(executeInline(source))
      return
    }
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({ ok: false, error: `用户代码执行超时(>${timeoutMs}ms)` })
    }, timeoutMs)
    worker.onmessage = (ev: MessageEvent<UserCodeResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(ev.data)
    }
    worker.onerror = () => {
      clearTimeout(timer)
      worker.terminate()
      resolve({ ok: false, error: '用户代码在沙箱中崩溃' })
    }
    worker.postMessage({ source })
  })
}
```

注意:jsdom 测试环境 `typeof Worker === 'undefined'` 为真,自动走内联路径,与 `runGenerator.ts` 既有模式一致。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/sandbox/__tests__/runUserCode.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/sandbox/runUserCode.ts src/sandbox/userCodeWorker.ts src/sandbox/__tests__/runUserCode.test.ts
git commit -m "feat(sandbox): JS 用户代码真值执行(Worker 沙箱 + 入口推断)"
```

### Task 1.4: AnimationScript.verification 类型 + useAIGenerator 集成

**Files:**
- Modify: `src/types/animation.ts`(`result?:` 字段之后)
- Modify: `src/hooks/useAIGenerator.ts`(质量门 block 之后、最终成功 block 之前)
- Test: `src/hooks/__tests__/useAIGenerator.verify.test.ts`

- [ ] **Step 1: 类型扩展**

`src/types/animation.ts` 在 `result?: ...` 行后追加:

```ts
  /** AI 生成动画的语义一致性校验结果(见 src/ai/verify.ts)。内置生成器无此字段。 */
  verification?: {
    status: 'pass' | 'fail' | 'skipped'
    source?: 'expect' | 'js-exec'
    expected?: string
    actual?: string
    message?: string
  }
```

- [ ] **Step 2: 写失败测试**

创建 `src/hooks/__tests__/useAIGenerator.verify.test.ts`。测试纯编排函数(下一步抽出的 `verifyAndTag`),不渲染 hook:

```ts
import { verifyAndTag } from '../useAIGenerator'
import type { AnimationScript } from '@/types/animation'

function scriptWithResult(result: AnimationScript['result']): AnimationScript {
  return {
    algorithm: 'two_sum',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
    initialState: { type: 'array', data: [2, 7] },
    result,
    steps: [{
      stepId: 1, codeLine: 0,
      description: { zh: 's', en: 's' },
      action: { type: 'highlight', targets: [], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    }],
  }
}

describe('verifyAndTag', () => {
  it('tags pass when @expect matches script.result', async () => {
    const script = scriptWithResult([0, 1])
    const outcome = await verifyAndTag(script, {
      expectRaw: '[0,1]', language: 'python', userCode: 'def f(): pass', input: [2, 7], sourceCode: 'def f(): pass',
    })
    expect(outcome.status).toBe('pass')
    expect(script.verification?.status).toBe('pass')
    expect(script.verification?.source).toBe('expect')
  })

  it('prefers JS ground-truth over @expect for javascript code', async () => {
    const script = scriptWithResult(9)
    const userCode = 'function add(nums, target) { return nums[0] + target }'
    const outcome = await verifyAndTag(script, {
      expectRaw: '999', language: 'javascript', userCode, input: { nums: [5], target: 4 }, sourceCode: userCode,
    })
    // 真值 9 与动画 9 一致 → pass,即便 @expect 是错的
    expect(outcome.status).toBe('pass')
    expect(script.verification?.source).toBe('js-exec')
  })

  it('tags fail with formatted expected/actual on mismatch', async () => {
    const script = scriptWithResult([1, 0])
    await verifyAndTag(script, {
      expectRaw: '[0,1]', language: 'python', userCode: 'x', input: [2, 7], sourceCode: 'x',
    })
    expect(script.verification?.status).toBe('fail')
    expect(script.verification?.expected).toBe('[0,1]')
    expect(script.verification?.actual).toBe('[1,0]')
  })

  it('sanitizes out-of-range codeLine values', async () => {
    const script = scriptWithResult([0, 1])
    script.steps[0].codeLine = 999
    await verifyAndTag(script, {
      expectRaw: '[0,1]', language: 'python', userCode: 'one line', input: [], sourceCode: 'one line',
    })
    expect(script.steps[0].codeLine).toBe(-1)
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run src/hooks/__tests__/useAIGenerator.verify.test.ts`
Expected: FAIL — `verifyAndTag` 未导出。

- [ ] **Step 4: 实现 verifyAndTag(useAIGenerator.ts 顶部,classifyFailure 之后)**

```ts
import { verifyAgainstExpect, verifyAgainstGroundTruth, sanitizeLineMapping, formatVerifyValue, type VerifyOutcome } from '@/ai/verify'
import { runUserJsSandboxed } from '@/sandbox/runUserCode'
```

```ts
export interface VerifyAndTagArgs {
  expectRaw?: string
  language: string
  userCode: string
  input: unknown
  /** 行号消毒的依据源码(= 用户代码)。 */
  sourceCode: string
}

/**
 * 对 AI 生成的动画做语义一致性校验并打标:
 *  1. 用户代码是 JS → 沙箱真实执行原函数,与 b.result 比对(最强)。
 *  2. 否则用 @expect(AI 对原代码的独立推理)比对。
 *  3. 顺带消毒越界的 codeLine。
 * 校验结果写入 script.verification(展示用字符串化),并返回原始 outcome 供修复决策。
 */
export async function verifyAndTag(script: AnimationScript, args: VerifyAndTagArgs): Promise<VerifyOutcome> {
  let outcome: VerifyOutcome | null = null

  if (args.language.toLowerCase() === 'javascript') {
    const truth = await runUserJsSandboxed(args.userCode, args.input)
    if (truth.ok) {
      outcome = verifyAgainstGroundTruth(script, truth.value)
    }
  }
  if (!outcome || outcome.status === 'skipped') {
    const byExpect = verifyAgainstExpect(script, args.expectRaw)
    if (!outcome || byExpect.status !== 'skipped') outcome = byExpect
  }

  script.verification = {
    status: outcome.status,
    ...(outcome.source && { source: outcome.source }),
    ...(outcome.expected !== undefined && { expected: formatVerifyValue(outcome.expected) }),
    ...(outcome.actual !== undefined && { actual: formatVerifyValue(outcome.actual) }),
    ...(outcome.message && { message: outcome.message }),
  }
  sanitizeLineMapping(script, args.sourceCode)
  return outcome
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/hooks/__tests__/useAIGenerator.verify.test.ts`
Expected: PASS

- [ ] **Step 6: 接入 analyze 流程**

`src/hooks/useAIGenerator.ts` 的 `analyze` 内,**质量门 block(`// 确定性质量门:...` 注释开头的 if)之后、`if (sandboxResult.ok && sandboxResult.script) {`(填 complexity 的最终成功 block)之前**插入:

```ts
      // 语义一致性校验:动画输出 vs 原代码预期(JS 真值执行优先,@expect 兜底)。
      // 失败 → 带具体差异回发 AI 修复一次;仍失败不回退,打 fail 标记交给 UI 警示。
      if (sandboxResult.ok && sandboxResult.script) {
        const p = parseInputRef.current(usedInput)
        const verifyArgs = {
          expectRaw: gen.expectedResult,
          language: params.language,
          userCode: params.code,
          input: p.valid ? p.value : undefined,
          sourceCode: params.code,
        }
        const outcome = await verifyAndTag(sandboxResult.script, verifyArgs)
        if (outcome.status === 'fail' && p.valid) {
          const category = classifyAlgorithm({ algorithm: gen.algorithm, type: gen.type, code: params.code })
          const repaired = await repairGenerator({
            body: activeBody, sourceCode: params.code, language: params.language, category,
            issues: [{
              code: 'result-mismatch', severity: 'error',
              message: `动画最终结果 ${formatVerifyValue(outcome.actual)} 与原代码在该输入上的预期结果 ${formatVerifyValue(outcome.expected)} 不一致`,
              hint: '逐行重读原代码,严格按原代码语义重写生成器逻辑(注意循环边界、条件分支与返回值),确保 b.result(...) 与原代码返回值一致;不要为了凑结果硬编码。',
            }],
            inputData: usedInput, signal: params.signal,
          })
          if (repaired) {
            const retry = await runGeneratorSandboxed(repaired.body, p.value, { algorithm: gen.algorithm, type: genType })
            if (retry.ok && retry.script) {
              const retryOutcome = await verifyAndTag(retry.script, verifyArgs)
              if (retryOutcome.status !== 'fail') {
                sandboxResult = retry
                activeBody = repaired.body
                setGenerator({ body: repaired.body, type: genType })
              }
            }
          }
        }
      }
```

- [ ] **Step 7: 全量回归**

Run: `npx tsc --noEmit && npx vitest run src/hooks src/ai`
Expected: 全部 PASS,无类型错误。

- [ ] **Step 8: 提交**

```bash
git add src/types/animation.ts src/hooks/useAIGenerator.ts src/hooks/__tests__/useAIGenerator.verify.test.ts
git commit -m "feat(ai): AI 动画语义一致性校验接入分析管线(失败修复一次+打标)"
```

### Task 1.5: 提示词加入 @expect 要求

**Files:**
- Modify: `src/ai/prompt/core.ts`
- Test: `src/ai/__tests__/promptAssembly.test.ts`(追加断言)

- [ ] **Step 1: 写失败测试**

在 `src/ai/__tests__/promptAssembly.test.ts` 追加:

```ts
it('CORE_PROMPT requires the @expect directive', () => {
  const prompt = CORE_PROMPT('Python')
  expect(prompt).toContain('@expect')
  expect(prompt).toMatch(/@expect[\s\S]*原代码/)
})
```

(若该文件未直接导入 `CORE_PROMPT`,在文件顶部追加 `import { CORE_PROMPT } from '../prompt/core'`。)

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/ai/__tests__/promptAssembly.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/ai/prompt/core.ts` 两处修改:

(a) 输出格式代码块中,`// @space <...>` 行后追加一行:

```
// @expect <原代码在 @sample 输入上的返回值,JSON 格式;无返回值写 null>
```

(b) `## @sample 要求(重要)` 小节之后,追加新小节:

```
## @expect 要求(重要)
- 在心里把**原代码**(不是你写的生成器)在 @sample 输入上完整执行一遍,把**真实返回值**以 JSON 写进 \`@expect\`(数组如 [0,1]、布尔 true/false、字符串带引号、无返回值写 null)
- 系统会把动画的 b.result(...) 与 @expect 比对,不一致会要求你修复——所以 @expect 必须是认真推演的结果,不是猜测
- 生成器最后的 b.result(...) 必须输出与原代码一致的返回值
```

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/ai/__tests__/promptAssembly.test.ts`
Expected: PASS

```bash
git add src/ai/prompt/core.ts src/ai/__tests__/promptAssembly.test.ts
git commit -m "feat(ai): 提示词要求 @expect 自报原代码预期结果"
```

### Task 1.6: 校验失败 UI 警示

**Files:**
- Create: `src/pages/Visualizer/VerificationNotice.tsx`
- Modify: `src/pages/Visualizer/index.tsx`(aiStatus 状态条附近,~714 行 `{aiStatus !== 'idle' && (` 之前)
- Modify: `src/i18n/locales/zh.json`、`src/i18n/locales/en.json`
- Test: `src/pages/Visualizer/__tests__/VerificationNotice.test.tsx`

- [ ] **Step 1: 写失败测试**

创建 `src/pages/Visualizer/__tests__/VerificationNotice.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { VerificationNotice } from '../VerificationNotice'
import '@/i18n'

describe('VerificationNotice', () => {
  it('renders nothing when verification passed', () => {
    const { container } = render(<VerificationNotice verification={{ status: 'pass' }} />)
    expect(container.firstChild).toBeNull()
  })
  it('renders nothing when verification is absent', () => {
    const { container } = render(<VerificationNotice verification={undefined} />)
    expect(container.firstChild).toBeNull()
  })
  it('shows a warning with expected/actual on failure', () => {
    render(
      <VerificationNotice
        verification={{ status: 'fail', source: 'expect', expected: '[0,1]', actual: '[1,0]' }}
      />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('[0,1]')
    expect(screen.getByRole('alert').textContent).toContain('[1,0]')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/pages/Visualizer/__tests__/VerificationNotice.test.tsx`
Expected: FAIL — 组件不存在。

- [ ] **Step 3: 实现组件**

创建 `src/pages/Visualizer/VerificationNotice.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import type { AnimationScript } from '@/types/animation'

interface VerificationNoticeProps {
  verification: AnimationScript['verification']
}

/** AI 动画一致性校验失败时的警示条。pass/skipped 不渲染任何内容。 */
export function VerificationNotice({ verification }: VerificationNoticeProps) {
  const { t } = useTranslation()
  if (!verification || verification.status !== 'fail') return null
  return (
    <div
      role="alert"
      className="mx-3 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed bg-amber-50 border border-amber-300 text-amber-800"
    >
      <span className="font-semibold">{t('visualizer.verification.failTitle')}</span>
      <span className="ml-1">
        {t('visualizer.verification.failDetail', {
          expected: verification.expected ?? '?',
          actual: verification.actual ?? '?',
        })}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: i18n 文案**

`src/i18n/locales/zh.json` 的 `visualizer` 命名空间内追加(若无 `visualizer` 键则按现有结构就近放置,保持两语言键路径一致):

```json
"verification": {
  "failTitle": "动画未通过一致性校验:",
  "failDetail": "原代码预期结果 {{expected}},动画输出 {{actual}}。动画过程可能与代码真实执行不符,仅供参考。"
}
```

`src/i18n/locales/en.json` 对应位置:

```json
"verification": {
  "failTitle": "Animation failed the consistency check:",
  "failDetail": "the original code is expected to return {{expected}}, but the animation produced {{actual}}. The animation may not match the real execution."
}
```

- [ ] **Step 5: 接入 Visualizer**

`src/pages/Visualizer/index.tsx`:
(a) 顶部 import:`import { VerificationNotice } from './VerificationNotice'`
(b) 在 `{aiStatus !== 'idle' && (` 状态条 JSX 之前插入:

```tsx
            <VerificationNotice verification={animationScript?.verification} />
```

- [ ] **Step 6: 运行确认通过 + 全量回归 + 提交**

Run: `npx vitest run src/pages/Visualizer/__tests__/VerificationNotice.test.tsx && npx tsc --noEmit && npm run lint`
Expected: 全部 PASS。

```bash
git add src/pages/Visualizer/VerificationNotice.tsx src/pages/Visualizer/__tests__/VerificationNotice.test.tsx src/pages/Visualizer/index.tsx src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(ui): AI 动画一致性校验失败警示条"
```

---

# Phase 2: AI 动画双语描述

**思路:** `b.desc(zh, en?)` 增加可选英文参数;builder 默认描述表补全英文版 `defaultDescEnFor`(与中文 `defaultDescFor` 同 case 覆盖);提示词要求模型双语输出。视觉内 `scene.note` 文本保持单语(改动事件协议出界),只保证**步骤说明面板**双语。

### Task 2.1: AnimationBuilder 双语支持

**Files:**
- Modify: `src/sandbox/builder.ts`
- Test: `src/sandbox/__tests__/builderBilingual.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/sandbox/__tests__/builderBilingual.test.ts`:

```ts
import { AnimationBuilder } from '../builder'

describe('bilingual descriptions', () => {
  it('uses the explicit en argument of desc()', () => {
    const b = new AnimationBuilder('t', 'array')
    b.desc('比较相邻元素', 'Compare adjacent elements').arrayCreate([1, 2])
    const script = b.build()
    expect(script.steps[0].description.zh).toBe('比较相邻元素')
    expect(script.steps[0].description.en).toBe('Compare adjacent elements')
  })

  it('derives an English default when the AI omits the en argument', () => {
    const b = new AnimationBuilder('t', 'array')
    b.arrayCreate([1, 2])
    b.compare(0, 1)
    const script = b.build()
    expect(script.steps[0].description.en).toBe('Initialize array')
    expect(script.steps[1].description.en).toBe('Compare indices 0, 1')
    // 英文不再是中文的拷贝
    expect(script.steps[1].description.en).not.toBe(script.steps[1].description.zh)
  })

  it('derives English from the event even when desc() only has Chinese', () => {
    const b = new AnimationBuilder('t', 'array')
    b.desc('只有中文').emit({ type: 'scene.wait' } as never)
    const script = b.build()
    expect(script.steps[0].description.zh).toBe('只有中文')
    expect(script.steps[0].description.en).toBe('Wait')
  })

  it('clears pending en after each step', () => {
    const b = new AnimationBuilder('t', 'array')
    b.desc('第一步', 'First step').arrayCreate([1])
    b.compare(0, 0)
    const script = b.build()
    expect(script.steps[1].description.en).toBe('Compare indices 0, 0')
  })

  it('note() accepts an optional English description', () => {
    const b = new AnimationBuilder('t', 'array')
    b.arrayCreate([1])
    b.note('剪枝:跳过重复分支', 'Prune: skip duplicate branches')
    const script = b.build()
    expect(script.steps[1].description.en).toBe('Prune: skip duplicate branches')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/sandbox/__tests__/builderBilingual.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/sandbox/builder.ts` 修改五处:

(a) 类字段 `private pendingDesc = ''` 后追加:

```ts
  private pendingDescEn = ''
```

(b) `desc()` 改为:

```ts
  desc(zh: string, en?: string): this { this.pendingDesc = zh; this.pendingDescEn = en ?? ''; return this }
```

(c) `add()` 内:
- 截断分支(`if (this.truncated)`)和 MAX_STEPS 分支里现有的 `this.pendingDesc = ''` 之后都追加 `this.pendingDescEn = ''`;
- MAX_STEPS 截断步骤的 description 改为:

```ts
        description: { zh, en: `Animation reached the ${MAX_STEPS}-step cap; further repetitive search/backtracking steps are omitted. The final result is still computed.` },
```

- 正常路径的描述计算(原 `const zh = ...` 与 `description: { zh, en: zh }`)改为:

```ts
    const zh = this.pendingDesc || defaultDescFor(events[0]) || fallback
    const en = this.pendingDescEn || defaultDescEnFor(events[0]) || zh
```

```ts
      description: { zh, en },
```

- 步骤推入后的清理 `this.pendingDesc = ''` 后追加 `this.pendingDescEn = ''`。

(d) `note()` 改为:

```ts
  note(text: string, en?: string): this {
    if (en) { this.pendingDesc = this.pendingDesc || text; this.pendingDescEn = en }
    return this.add([{ type: 'scene.note', text }], this.act('annotate', [], 'muted'))
  }
```

(e) `result()` 改为双语:

```ts
  result(value: AnimationScript['result']): this {
    this.resultValue = value
    return this.desc(`输出结果：${formatResult(value)}`, `Result: ${formatResult(value)}`)
      .note(`result = ${formatResult(value)}`)
  }
```

(f) 在 `defaultDescFor` 函数之后新增完整英文默认描述表(case 集与中文表一一对应):

```ts
/** English counterpart of defaultDescFor. Mirrors every case so AI scripts that
 *  omit the en argument still get meaningful English step descriptions. */
function defaultDescEnFor(event: AlgorithmEvent | undefined): string {
  if (!event) return ''
  const e = event as Record<string, unknown>
  const idx = (k = 'indices') => (e[k] as number[] | undefined)?.join(', ')
  switch (event.type) {
    // array
    case 'array.create': return 'Initialize array'
    case 'array.compare': return `Compare indices ${idx()}`
    case 'array.swap': return `Swap indices ${idx()}`
    case 'array.move': return `Move ${e.from} → ${e.to}`
    case 'array.set_value': return `Set index ${e.index} to ${e.value}`
    case 'array.mark_sorted': return `Mark indices ${idx()} as settled`
    case 'array.partition': return `Partition around pivot index ${e.pivotIndex}`
    // graph
    case 'graph.create': return 'Build graph'
    case 'graph.visit_node': return `Visit node ${e.nodeId}`
    case 'graph.visit_edge': return `Inspect edge ${e.source}→${e.target}`
    case 'graph.relax_edge': return `Relax edge ${e.source}→${e.target}`
    case 'graph.enqueue': return `Enqueue node ${e.nodeId}`
    case 'graph.dequeue': return `Dequeue node ${e.nodeId}`
    // tree
    case 'tree.create': return 'Build tree'
    case 'tree.visit': return `Visit node ${e.nodeId}`
    case 'tree.insert': return `Insert node ${(e.node as { value?: unknown })?.value ?? ''}`
    case 'tree.compare': return `Compare with node ${e.nodeId}`
    case 'tree.rotate': return `Rotate (${e.rotation})`
    // linked_list
    case 'linked_list.create': return 'Build linked list'
    case 'linked_list.visit': return `Visit node ${e.nodeId}`
    case 'linked_list.insert_after': return `Insert after ${e.targetNodeId}`
    case 'linked_list.delete': return `Delete node ${e.nodeId}`
    case 'linked_list.move_pointer': return `Move pointer ${e.pointerId}`
    // pointer
    case 'pointer.create': return `Create pointer ${e.pointerId}`
    case 'pointer.move': return `Move pointer ${e.pointerId}`
    case 'pointer.clear': return `Clear pointer ${e.pointerId}`
    case 'pointer.highlight': return `Highlight pointer ${e.pointerId}`
    // stack
    case 'stack.create': return 'Initialize stack'
    case 'stack.push': return `Push ${e.value}`
    case 'stack.pop': return 'Pop the top'
    case 'stack.peek': return 'Peek the top'
    // queue
    case 'queue.create': return 'Initialize queue'
    case 'queue.enqueue': return `Enqueue ${e.value}`
    case 'queue.dequeue': return 'Dequeue the front'
    case 'queue.peek_front': return 'Peek the front'
    // deque
    case 'deque.create': return 'Initialize deque'
    case 'deque.push_front': return `Push ${e.value} to the front`
    case 'deque.push_back': return `Push ${e.value} to the back`
    case 'deque.pop_front': return 'Pop the front'
    case 'deque.pop_back': return 'Pop the back'
    // heap
    case 'heap.create': return 'Build heap'
    case 'heap.push': return `Push ${e.value} into the heap`
    case 'heap.pop': return 'Pop the heap top'
    case 'heap.sift': return `Sift: index ${e.from} ↔ ${e.to}`
    case 'heap.peek': return 'Peek the heap top'
    // hashtable
    case 'hashtable.create': return 'Initialize hash table'
    case 'hashtable.put': return `Put ${e.key} → bucket ${e.bucket}`
    case 'hashtable.get': return `Look up ${e.key}`
    case 'hashtable.remove': return `Remove ${e.key}`
    // set
    case 'set.create': return 'Initialize set'
    case 'set.add': return `Add ${e.value}`
    case 'set.remove': return `Remove ${e.value}`
    case 'set.contains': return `Check membership of ${e.value}`
    // string
    case 'string.create': case 'string.create_double': return 'Initialize string'
    case 'string.compare': return `Compare characters ${idx()}`
    case 'string.match': return `Character match at ${e.index}`
    case 'string.mismatch': return `Character mismatch at ${e.index}`
    case 'string.mark_range': return `Mark range ${idx()}`
    // matrix
    case 'matrix.create': return 'Initialize matrix'
    case 'matrix.visit_cell': return `Visit cell (${e.row},${e.col})`
    case 'matrix.update_cell': return `Update cell (${e.row},${e.col}) = ${e.value}`
    case 'matrix.mark_path': return 'Mark path'
    case 'matrix.transition': return 'State transition'
    // math / bitset
    case 'math.init': return 'Initialize variables'
    case 'math.set': return `${e.name} = ${e.value}`
    case 'math.highlight': return `Focus on variable ${e.name}`
    case 'bitset.create': return 'Initialize bitset'
    case 'bitset.set': return `Set bit ${e.index} to ${e.value}`
    case 'bitset.highlight': return `Focus on bit ${e.index}`
    // scene
    case 'scene.note': return String(e.text ?? '')
    case 'scene.link': return `Link ${e.from} → ${e.to}`
    case 'scene.highlight': return `Highlight ${e.entityId}`
    case 'scene.clear_highlight': return 'Clear highlights'
    case 'scene.wait': return 'Wait'
    // call stack / grid / DP overlays
    case 'callstack.create': return 'Initialize call stack'
    case 'callstack.push': {
      const fn = (e.frame as { functionName?: unknown })?.functionName
      return `Call ${fn ?? 'function'}`
    }
    case 'callstack.update': return `Update frame${e.frameId ? ` ${e.frameId}` : ''}`
    case 'callstack.return': return e.value === undefined ? 'Function returns' : `Function returns ${e.value}`
    case 'callstack.pop': return 'Pop the top frame'
    case 'callstack.highlight': return `Highlight frame${e.frameId ? ` ${e.frameId}` : ''}`
    case 'grid.create': return 'Initialize grid'
    case 'grid.set_cell': return e.value === undefined ? `Update cell (${e.row},${e.col})` : `Update cell (${e.row},${e.col}) = ${e.value}`
    case 'grid.visit': return `Visit cell (${e.row},${e.col})`
    case 'grid.frontier': return 'Update the frontier set'
    case 'grid.path': return 'Mark the grid path'
    case 'grid.wall': return `${e.enabled ? 'Place' : 'Remove'} wall (${e.row},${e.col})`
    case 'grid.weight': return `Set cell (${e.row},${e.col}) weight ${e.weight}`
    case 'grid.arrow': return 'Mark grid transition direction'
    case 'dp.create': return 'Initialize DP table'
    case 'dp.set': return e.value === undefined ? `Update DP state (${e.row},${e.col})` : `Update DP state (${e.row},${e.col}) = ${e.value}`
    case 'dp.highlight': return 'Highlight DP states'
    case 'dp.dependency': return 'Mark DP dependencies'
    case 'dp.formula': return 'Show DP transition formula'
    case 'dp.traceback': return 'Trace back the DP answer path'
    case 'dp.roll': return 'Roll the DP window'
    default: return ''
  }
}
```

注意:若实现时发现中文 `defaultDescFor` 含本表未列出的 case(如 prob.*、geometry.*、automaton.*、gan.* 等后续新增),必须同步补齐英文 case,**两表 case 集合保持一致**。

- [ ] **Step 4: 运行确认通过 + 全量回归**

Run: `npx vitest run src/sandbox && npx tsc --noEmit`
Expected: 全部 PASS(注意既有 builder 测试可能断言 `en === zh`,如有需同步修正断言为新行为)。

- [ ] **Step 5: 提交**

```bash
git add src/sandbox/builder.ts src/sandbox/__tests__/builderBilingual.test.ts
git commit -m "feat(builder): 步骤描述双语化(desc/note 英文参数 + 默认英文描述表)"
```

### Task 2.2: 提示词要求双语 desc

**Files:**
- Modify: `src/ai/prompt/core.ts`
- Test: `src/ai/__tests__/promptAssembly.test.ts`(追加断言)

- [ ] **Step 1: 写失败测试**

```ts
it('CORE_PROMPT requires bilingual desc', () => {
  const prompt = CORE_PROMPT('Python')
  expect(prompt).toContain("b.desc(中文描述, 'English description')")
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/ai/__tests__/promptAssembly.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/ai/prompt/core.ts` 修改:

(a) `### 通用` 小节的 desc 文档行改为:

```
- \`b.desc(中文描述, 'English description')\`：为紧接着的那个操作设置**中英双语**说明。第二个英文参数必填——界面支持中英切换，缺英文会导致英文用户看到中文。两种语言都要说清这一步在做什么、为什么
```

(b) `## 质量底线` 的 desc 条目改为:

```
- **每一个关键步骤都要有意义的中英双语 b.desc**：第一参数中文、第二参数英文，说清这一步在比较/入栈/更新什么、为什么。**严禁产出空描述、"步骤 N"占位或缺英文参数**。
```

(c) 文末选择排序示例中的三处 desc 调用改为双语(同时为 Task 1.5 的 @expect 在示例头部补一行):

```js
// @algorithm selection_sort
// @type array
// @sample nums = [5, 3, 8, 1, 9, 2]
// @expect [1, 2, 3, 5, 8, 9]
// @time O(n²)
// @space O(1)
const nums = input.nums || input
b.arrayCreate(nums)
for (let i = 0; i < nums.length; i++) {
  let min = i
  b.line(3).desc('外层 i=' + i + '，假定最小为 ' + nums[i], 'Outer i=' + i + ', assume min is ' + nums[i]).compare(i, i)
  for (let j = i + 1; j < nums.length; j++) {
    b.line(5).desc('比较 arr[' + j + '] 与当前最小 arr[' + min + ']', 'Compare arr[' + j + '] with current min arr[' + min + ']').compare(j, min)
    if (nums[j] < nums[min]) min = j
  }
  if (min !== i) {
    const t = nums[i]; nums[i] = nums[min]; nums[min] = t
    b.line(8).desc('交换 ' + i + ' 和 ' + min, 'Swap ' + i + ' and ' + min).swap(i, min)
  }
  b.line(9).desc('arr[' + i + '] 归位', 'arr[' + i + '] settled').markSorted([i])
}
b.result([...nums])
```

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/ai/__tests__/promptAssembly.test.ts && npx vitest run src/ai`
Expected: PASS

```bash
git add src/ai/prompt/core.ts src/ai/__tests__/promptAssembly.test.ts
git commit -m "feat(ai): 提示词要求双语 desc 并更新示例(含 @expect)"
```

---

# Phase 3: 无向图力导向布局 + 分层布局交叉消减

**思路:** 有向图保留现有 BFS 分层,把层内 `localeCompare` 排序升级为**重心法(barycenter)**消减边交叉;无向图在"节点多或边密"时改用**确定性 Fruchterman-Reingold 力导向布局**(固定迭代次数、按 id 排序的圆形初始化,无随机数,同输入必同输出),小而稀疏的无向图保留现有环形槽位(视觉稳定,回归面小)。

### Task 3.1: forceLayout 纯函数模块

**Files:**
- Create: `src/scene/layouts/forceLayout.ts`
- Test: `src/scene/layouts/__tests__/forceLayout.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/scene/layouts/__tests__/forceLayout.test.ts`:

```ts
import { forceLayout } from '../forceLayout'

/** 3×3 网格图:9 节点 12 边。 */
function gridGraph(): { ids: string[]; edges: Array<[string, string]> } {
  const ids: string[] = []
  const edges: Array<[string, string]> = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ids.push(`n${r}${c}`)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (c < 2) edges.push([`n${r}${c}`, `n${r}${c + 1}`])
    if (r < 2) edges.push([`n${r}${c}`, `n${r + 1}${c}`])
  }
  return { ids, edges }
}

describe('forceLayout', () => {
  it('is deterministic: same input → identical output', () => {
    const { ids, edges } = gridGraph()
    const a = forceLayout(ids, edges, { minClearance: 72 })
    const b = forceLayout(ids, edges, { minClearance: 72 })
    expect(a).toEqual(b)
  })

  it('keeps every pair of nodes at least minClearance apart', () => {
    const { ids, edges } = gridGraph()
    const pos = forceLayout(ids, edges, { minClearance: 72 })
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos[ids[i]], b = pos[ids[j]]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        expect(d).toBeGreaterThanOrEqual(72)
      }
    }
  })

  it('keeps all nodes inside the bounding box', () => {
    const { ids, edges } = gridGraph()
    const pos = forceLayout(ids, edges, { cx: 500, cy: 300, width: 760, height: 480 })
    for (const id of ids) {
      expect(pos[id].x).toBeGreaterThanOrEqual(500 - 380)
      expect(pos[id].x).toBeLessThanOrEqual(500 + 380)
      expect(pos[id].y).toBeGreaterThanOrEqual(300 - 240)
      expect(pos[id].y).toBeLessThanOrEqual(300 + 240)
    }
  })

  it('places linked nodes closer than the average unlinked pair', () => {
    const { ids, edges } = gridGraph()
    const pos = forceLayout(ids, edges, { minClearance: 72 })
    const dist = (a: string, b: string) => Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y)
    const linked = edges.map(([a, b]) => dist(a, b))
    const linkedSet = new Set(edges.map(([a, b]) => [a, b].sort().join('|')))
    const unlinked: number[] = []
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      if (!linkedSet.has([ids[i], ids[j]].sort().join('|'))) unlinked.push(dist(ids[i], ids[j]))
    }
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
    expect(avg(linked)).toBeLessThan(avg(unlinked))
  })

  it('handles empty input', () => {
    expect(forceLayout([], [])).toEqual({})
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/scene/layouts/__tests__/forceLayout.test.ts`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现**

创建 `src/scene/layouts/forceLayout.ts`:

```ts
import type { Point } from '../types'

export interface ForceLayoutOptions {
  cx?: number
  cy?: number
  width?: number
  height?: number
  iterations?: number
  minClearance?: number
}

/**
 * 确定性 Fruchterman-Reingold 力导向布局。
 * 无随机数:初始位置按 id 字典序放在圆周上,固定迭代次数 + 线性降温,
 * 同输入必产生相同输出(场景重渲染时节点不跳动)。
 * 收尾用分离迭代硬性保证任意两点间距 ≥ minClearance。
 */
export function forceLayout(
  ids: string[],
  edges: Array<[string, string]>,
  opts: ForceLayoutOptions = {},
): Record<string, Point> {
  const { cx = 500, cy = 300, width = 760, height = 480, iterations = 200, minClearance = 72 } = opts
  const n = ids.length
  if (n === 0) return {}

  const sorted = [...ids].sort()
  const pos = new Map<string, { x: number; y: number }>()
  const initR = Math.min(width, height) / 3
  sorted.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    pos.set(id, { x: cx + Math.cos(angle) * initR, y: cy + Math.sin(angle) * initR })
  })

  const idSet = new Set(ids)
  const links = edges.filter(([a, b]) => idSet.has(a) && idSet.has(b) && a !== b)
  const k = Math.max(Math.sqrt((width * height) / n), minClearance)
  let temp = Math.max(width, height) / 8
  const cool = temp / (iterations + 1)

  for (let it = 0; it < iterations; it++) {
    const disp = new Map(sorted.map(id => [id, { x: 0, y: 0 }]))

    // 斥力:所有点对
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = pos.get(sorted[i])!, b = pos.get(sorted[j])!
        let dx = a.x - b.x, dy = a.y - b.y
        let d = Math.hypot(dx, dy)
        if (d < 0.01) { dx = 0.01 * (j - i); dy = 0.01; d = Math.hypot(dx, dy) }
        const f = (k * k) / d
        const da = disp.get(sorted[i])!, db = disp.get(sorted[j])!
        da.x += (dx / d) * f; da.y += (dy / d) * f
        db.x -= (dx / d) * f; db.y -= (dy / d) * f
      }
    }

    // 引力:沿边
    for (const [a, b] of links) {
      const pa = pos.get(a)!, pb = pos.get(b)!
      const dx = pa.x - pb.x, dy = pa.y - pb.y
      const d = Math.max(Math.hypot(dx, dy), 0.01)
      const f = (d * d) / k
      const da = disp.get(a)!, db = disp.get(b)!
      da.x -= (dx / d) * f; da.y -= (dy / d) * f
      db.x += (dx / d) * f; db.y += (dy / d) * f
    }

    // 应用位移:温度限幅 + 边界夹紧
    for (const id of sorted) {
      const p = pos.get(id)!, d = disp.get(id)!
      const len = Math.max(Math.hypot(d.x, d.y), 0.01)
      p.x += (d.x / len) * Math.min(len, temp)
      p.y += (d.y / len) * Math.min(len, temp)
      p.x = Math.min(cx + width / 2, Math.max(cx - width / 2, p.x))
      p.y = Math.min(cy + height / 2, Math.max(cy - height / 2, p.y))
    }
    temp -= cool
  }

  // 分离迭代:硬性保证最小间距(力导向只能软性逼近)
  for (let pass = 0; pass < 60; pass++) {
    let moved = false
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = pos.get(sorted[i])!, b = pos.get(sorted[j])!
        let dx = b.x - a.x, dy = b.y - a.y
        let d = Math.hypot(dx, dy)
        if (d < 0.01) { dx = 0.5 * (j - i); dy = 0.5; d = Math.hypot(dx, dy) }
        if (d < minClearance) {
          const push = (minClearance - d) / 2 + 0.5
          a.x -= (dx / d) * push; a.y -= (dy / d) * push
          b.x += (dx / d) * push; b.y += (dy / d) * push
          moved = true
        }
      }
    }
    if (!moved) break
  }

  const out: Record<string, Point> = {}
  for (const id of ids) {
    const p = pos.get(id)!
    out[id] = { x: Math.round(p.x), y: Math.round(p.y) }
  }
  return out
}
```

注意:分离迭代可能把点推出边界,这是有意取舍——间距优先于边界(画布会随内容适配);若现有 SceneCanvas 有 viewBox 自适应则无影响。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/scene/layouts/__tests__/forceLayout.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/scene/layouts/forceLayout.ts src/scene/layouts/__tests__/forceLayout.test.ts
git commit -m "feat(scene): 确定性 FR 力导向布局模块"
```

### Task 3.2: layoutGraph 无向分支接入力导向

**Files:**
- Modify: `src/scene/layouts/graphLayout.ts`
- Test: `src/scene/layouts/__tests__/graphLayout.test.ts`(已有则追加,否则新建)

- [ ] **Step 1: 写失败测试**

在 graphLayout 测试文件中追加。**若该文件已有 SceneState 构造 helper,优先复用既有 helper**;否则使用下面这个自包含的 `makeGraphScene`(字段以 `src/scene/types.ts` 的 `SceneState` 为准,实现时核对 `entities`/`edges` 的真实必填字段,缺的字段补默认值):

```ts
import { layoutGraph } from '../graphLayout'
import type { SceneState } from '../../types'

/** 最小图场景:nodes → graph.vertex 实体,edges → from/to 边。 */
function makeGraphScene(nodes: string[], edges: Array<[string, string]>, directed: boolean): SceneState {
  const entities: Record<string, unknown> = {}
  for (const id of nodes) {
    entities[id] = {
      id,
      type: 'node',
      variant: 'graph.vertex',
      fields: [{ key: 'value', value: id }],
      size: { width: 48, height: 48 },
    }
  }
  const sceneEdges: Record<string, unknown> = {}
  edges.forEach(([a, b], i) => {
    sceneEdges[`e${i}`] = {
      id: `e${i}`,
      from: { entityId: a },
      to: { entityId: b },
      directed,
    }
  })
  return { entities, edges: sceneEdges, pointers: {}, labels: {}, regions: {} } as unknown as SceneState
}

/** 3×3 网格的节点与边(9 节点 12 边)。 */
function gridNodesEdges(): { nodes: string[]; edges: Array<[string, string]> } {
  const nodes: string[] = []
  const edges: Array<[string, string]> = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) nodes.push(`n${r}${c}`)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (c < 2) edges.push([`n${r}${c}`, `n${r}${c + 1}`])
    if (r < 2) edges.push([`n${r}${c}`, `n${r + 1}${c}`])
  }
  return { nodes, edges }
}

it('uses force layout for dense undirected graphs (not the circular ring)', () => {
  // 3×3 网格:9 节点 12 边,边数 > 节点数 → 应走力导向
  const { nodes, edges } = gridNodesEdges()
  const positions = layoutGraph(makeGraphScene(nodes, edges, false))
  const ids = Object.keys(positions)
  expect(ids.length).toBe(9)
  // 环形布局所有点到圆心等距;力导向网格图不可能等距 → 用半径方差区分
  const cx = ids.reduce((s, id) => s + positions[id].x, 0) / ids.length
  const cy = ids.reduce((s, id) => s + positions[id].y, 0) / ids.length
  const radii = ids.map(id => Math.hypot(positions[id].x - cx, positions[id].y - cy))
  const mean = radii.reduce((s, r) => s + r, 0) / radii.length
  const variance = radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length
  expect(variance).toBeGreaterThan(100)
})

it('keeps the circular layout for small sparse undirected graphs', () => {
  // 5 节点环(5 边,边数 ≤ 节点数且 n ≤ 8)→ 保留环形,行为不回归
  const nodes = ['A', 'B', 'C', 'D', 'E']
  const ring: Array<[string, string]> = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']]
  const positions = layoutGraph(makeGraphScene(nodes, ring, false))
  // 环形布局:所有点到圆心 (500, 300) 等距
  const rs = nodes.map(id => Math.round(Math.hypot(positions[id].x - 500, positions[id].y - 300)))
  expect(new Set(rs).size).toBe(1)
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/scene/layouts/__tests__/graphLayout.test.ts`
Expected: 新增第一条 FAIL(当前环形布局方差为 0),第二条 PASS。

- [ ] **Step 3: 实现**

`src/scene/layouts/graphLayout.ts`:

(a) 顶部 import:

```ts
import { forceLayout } from './forceLayout'
```

(b) 在 `// FALLBACK MODE: Stable Circular Layout` 注释块**之前**插入:

```ts
  // ==========================================
  // UNDIRECTED / CYCLIC: force-directed layout for larger or denser graphs.
  // Small sparse graphs (n ≤ 8 且边数 ≤ 节点数) keep the stable circular ring.
  // ==========================================
  const structuralEdges = Object.values(scene.edges)
    .map(e => [e.from.entityId, e.to.entityId] as [string, string])
    .filter(([a, b]) => a !== b)
    .filter(([a, b]) => vertices.some(v => v.id === a) && vertices.some(v => v.id === b))

  const isDense = structuralEdges.length > vertices.length
  if (vertices.length > 8 || isDense) {
    return forceLayout(vertices.map(v => v.id), structuralEdges, { cx, cy, minClearance })
  }
```

- [ ] **Step 4: 运行确认通过 + 场景回归**

Run: `npx vitest run src/scene`
Expected: 全部 PASS。若 `src/scene/__tests__/` 下既有布局快照类断言因此变化,逐一确认是预期内的布局改变后更新断言。

- [ ] **Step 5: 提交**

```bash
git add src/scene/layouts/graphLayout.ts src/scene/layouts/__tests__/graphLayout.test.ts
git commit -m "feat(scene): 无向密图改用力导向布局,小稀疏图保留环形"
```

### Task 3.3: 分层布局重心法消减交叉

**Files:**
- Modify: `src/scene/layouts/graphLayout.ts`(有向分支的层内排序)
- Test: `src/scene/layouts/__tests__/graphLayout.test.ts`(追加)

- [ ] **Step 1: 写失败测试**

复用 Task 3.2 引入的 `makeGraphScene` helper(directed 传 `true`):

```ts
it('orders nodes within a layer by predecessor barycenter to reduce crossings', () => {
  // layer0: A(上), B(下);边 A→Y、B→X。
  // localeCompare 会把 X 排在 Y 上面 → 两边交叉;
  // 重心法应把 Y(前驱 A,index 0)排在 X(前驱 B,index 1)上面 → 无交叉。
  const positions = layoutGraph(makeGraphScene(
    ['A', 'B', 'X', 'Y'],
    [['A', 'Y'], ['B', 'X']],
    true,
  ))
  expect(positions['Y'].y).toBeLessThan(positions['X'].y)
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/scene/layouts/__tests__/graphLayout.test.ts`
Expected: FAIL(当前 X 在 Y 上)。

- [ ] **Step 3: 实现**

`src/scene/layouts/graphLayout.ts` 有向分支中,替换原层内排序代码:

```ts
      // Sort nodes inside columns to keep positioning perfectly stable
      for (let r = 0; r <= maxRank; r++) {
        columns[r].sort((a, b) => a.localeCompare(b))
      }
```

为:

```ts
      // 层内排序:首列字典序保证稳定;后续列按"前驱在前一列中的平均位置"
      // (重心法 barycenter)排序以消减边交叉,重心相同回退字典序。
      columns[0].sort((a, b) => a.localeCompare(b))
      const preds = new Map<string, string[]>()
      vertices.forEach(v => preds.set(v.id, []))
      Object.values(scene.edges).forEach(e => {
        if (e.directed && preds.has(e.to.entityId)) {
          preds.get(e.to.entityId)!.push(e.from.entityId)
        }
      })
      for (let r = 1; r <= maxRank; r++) {
        const prevIndex = new Map(columns[r - 1].map((id, i) => [id, i]))
        const bary = (id: string): number => {
          const ps = (preds.get(id) ?? []).filter(p => prevIndex.has(p))
          if (ps.length === 0) return Number.MAX_SAFE_INTEGER
          return ps.reduce((s, p) => s + prevIndex.get(p)!, 0) / ps.length
        }
        columns[r].sort((a, b) => bary(a) - bary(b) || a.localeCompare(b))
      }
```

- [ ] **Step 4: 运行确认通过 + Phase 验收 + 提交**

Run: `npx vitest run src/scene && npx tsc --noEmit && npm run lint`
Expected: 全部 PASS。

```bash
git add src/scene/layouts/graphLayout.ts src/scene/layouts/__tests__/graphLayout.test.ts
git commit -m "feat(scene): 分层布局层内重心法排序,消减有向图边交叉"
```

---

# Phase 4: 题单类目去水分

**思路:** 不堆内容,先让命名诚实:目录条目和 README 按实际能力(各一个示例演示)重新措辞。扩充 Hot 100 题目集是另一个独立项目,不在本计划内。

### Task 4.1: 目录条目与 README 修订

**Files:**
- Modify: `src/data/algorithmCatalog.ts`(`leetcode_hot100` ~485 行、`acm_templates` ~503 行)
- Modify: `README.md`(「当前覆盖方向」表格)

- [ ] **Step 1: 修改目录条目**

`leetcode_hot100` 条目的 `name`/`nameEn` 改为:

```ts
    name: '两数之和（Hot 100 示例）',
    nameEn: 'Two Sum (Hot 100 Sample)',
```

`acm_templates` 条目的 `name`/`nameEn` 改为:

```ts
    name: 'ACM 模板速览（示例）',
    nameEn: 'ACM Template Sampler',
```

其余字段(id、category、difficulty、hasPreset)不动——id 不能改,生成器注册表按 id 对接。

- [ ] **Step 2: 修改 README**

「当前覆盖方向」表中的行:

```
| 题单/模板 | LeetCode Hot 100、ACM 模板 |
```

改为:

```
| 题单/模板示例 | 两数之和（Hot 100 示例）、ACM 模板速览（快速幂 / 二分答案单页演示）；完整题单尚未内置，自定义题目走 AI 分析 |
```

同时检查 README 第 9 行「算法目录覆盖排序、图算法、…、面试高频和竞赛模板」一句,把「竞赛模板」改为「竞赛模板示例」。

- [ ] **Step 3: 回归 + 提交**

Run: `npx vitest run src/store src/data 2>$null; npx tsc --noEmit && npm run lint`
Expected: PASS(若 store 测试断言了旧名称,同步更新断言)。

```bash
git add src/data/algorithmCatalog.ts README.md
git commit -m "fix(catalog): 题单/模板类目按实际能力诚实命名"
```

---

# Phase 5: 代码编辑与动画脱钩提示

**思路:** 内置算法模式下,编辑器代码偏离模板时:(1) 编辑器顶部出现琥珀色提示条「代码已修改——当前动画仍来自内置演示」,附「AI 分析我的代码」与「还原模板」按钮;(2) 同时**抑制行高亮箭头**(模板行号对编辑后的代码已无意义)。AI live 模式(`liveAlgoId`/`generator` 非空,动画已来自用户代码)不提示。

### Task 5.1: CodeDesyncNotice 组件

**Files:**
- Create: `src/pages/Visualizer/CodeDesyncNotice.tsx`
- Modify: `src/i18n/locales/zh.json`、`src/i18n/locales/en.json`
- Test: `src/pages/Visualizer/__tests__/CodeDesyncNotice.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { CodeDesyncNotice } from '../CodeDesyncNotice'
import '@/i18n'

describe('CodeDesyncNotice', () => {
  it('renders the message and both action buttons', () => {
    render(<CodeDesyncNotice analyzing={false} onAnalyze={() => {}} onRestore={() => {}} />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
  it('fires callbacks', () => {
    const onAnalyze = vi.fn()
    const onRestore = vi.fn()
    render(<CodeDesyncNotice analyzing={false} onAnalyze={onAnalyze} onRestore={onRestore} />)
    const [analyzeBtn, restoreBtn] = screen.getAllByRole('button')
    fireEvent.click(analyzeBtn)
    fireEvent.click(restoreBtn)
    expect(onAnalyze).toHaveBeenCalledTimes(1)
    expect(onRestore).toHaveBeenCalledTimes(1)
  })
  it('disables the analyze button while analyzing', () => {
    render(<CodeDesyncNotice analyzing={true} onAnalyze={() => {}} onRestore={() => {}} />)
    const [analyzeBtn] = screen.getAllByRole('button')
    expect((analyzeBtn as HTMLButtonElement).disabled).toBe(true)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/pages/Visualizer/__tests__/CodeDesyncNotice.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现组件 + 文案**

创建 `src/pages/Visualizer/CodeDesyncNotice.tsx`:

```tsx
import { useTranslation } from 'react-i18next'

interface CodeDesyncNoticeProps {
  analyzing: boolean
  onAnalyze: () => void
  onRestore: () => void
}

/** 内置算法代码被编辑后的脱钩提示:动画仍来自内置演示,与编辑后的代码无关。 */
export function CodeDesyncNotice({ analyzing, onAnalyze, onRestore }: CodeDesyncNoticeProps) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-3 py-1.5 text-[11px] bg-amber-50 border-b border-amber-200 text-amber-800"
    >
      <span className="flex-1 leading-snug">{t('visualizer.codeDesync.message')}</span>
      <button
        onClick={onAnalyze}
        disabled={analyzing}
        className="shrink-0 px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {t('visualizer.codeDesync.analyze')}
      </button>
      <button
        onClick={onRestore}
        className="shrink-0 px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-100"
      >
        {t('visualizer.codeDesync.restore')}
      </button>
    </div>
  )
}
```

`zh.json` 追加(与 Task 1.6 的 `verification` 同级,`visualizer` 命名空间下):

```json
"codeDesync": {
  "message": "代码已修改——当前动画与行高亮仍来自内置演示，与编辑后的代码无关",
  "analyze": "AI 分析我的代码",
  "restore": "还原模板"
}
```

`en.json`:

```json
"codeDesync": {
  "message": "Code modified — the animation and line highlights still come from the built-in demo, not your edited code",
  "analyze": "Analyze my code with AI",
  "restore": "Restore template"
}
```

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/pages/Visualizer/__tests__/CodeDesyncNotice.test.tsx`
Expected: PASS

```bash
git add src/pages/Visualizer/CodeDesyncNotice.tsx src/pages/Visualizer/__tests__/CodeDesyncNotice.test.tsx src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(ui): 代码编辑脱钩提示组件"
```

### Task 5.2: 接入 Visualizer + 抑制行高亮

**Files:**
- Modify: `src/pages/Visualizer/index.tsx`

- [ ] **Step 1: 计算 dirty 状态**

在 `const code = codeByScope[codeScopeKey] ?? defaultCode`(~146 行)之后追加:

```ts
  // 代码脱钩检测:用户编辑过且动画不来自 AI live 模式时,动画/行高亮与代码无关。
  const isCodeDirty = codeByScope[codeScopeKey] !== undefined && codeByScope[codeScopeKey] !== defaultCode
```

在 useAIGenerator 解构(`{ liveAlgoId, generator, ... }`,~202 行)之后追加:

```ts
  const aiLiveActive = Boolean(liveAlgoId || generator)
  const showCodeDesync = isCodeDirty && !aiLiveActive
```

- [ ] **Step 2: 渲染提示条**

顶部 import:`import { CodeDesyncNotice } from './CodeDesyncNotice'`

在 `<CodeEditorPanel`(~450 行)**之前**插入:

```tsx
            {showCodeDesync && (
              <CodeDesyncNotice
                analyzing={aiStatus === 'analyzing'}
                onAnalyze={handleAIAnalyze}
                onRestore={() => setCode(defaultCode)}
              />
            )}
```

注意:`handleAIAnalyze` 定义在 ~324 行,若其声明位置在此 JSX 之后不影响(同一组件作用域);若 `showCodeDesync` 的声明顺序早于 `handleAIAnalyze` 的 useCallback 也无碍。

- [ ] **Step 3: 抑制行高亮**

行高亮 effect(~271 行 `// Update Monaco editor decorations based on current step`)中,在 `if (!editor || !animationScript) return` 之后追加:

```ts
    // 脱钩状态下模板行号对编辑后的代码无意义:清空所有行高亮,避免箭头指错行。
    if (showCodeDesync) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      return
    }
```

并把 `showCodeDesync` 加入该 effect 的依赖数组(原 `[currentStep, animationScript]` → `[currentStep, animationScript, showCodeDesync]`)。

- [ ] **Step 4: 回归 + 提交**

Run: `npx vitest run src/pages && npx tsc --noEmit && npm run lint`
Expected: 全部 PASS。

```bash
git add src/pages/Visualizer/index.tsx
git commit -m "feat(ui): 内置算法代码编辑后显示脱钩提示并抑制行高亮"
```

---

# Phase 6: 规模截断透明化 + 回溯搜索树

### Task 6.1: 输入截断显式提示(leetcode 预设)

**Files:**
- Modify: `src/presets/utils.ts`
- Modify: `src/presets/leetcode.ts`
- Test: `src/presets/__tests__/clampForDemo.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/presets/__tests__/clampForDemo.test.ts`:

```ts
import { clampForDemo } from '../utils'
import { generateLeetCode } from '../leetcode'

describe('clampForDemo', () => {
  it('passes small arrays through untouched', () => {
    expect(clampForDemo([1, 2, 3], 12)).toEqual({ data: [1, 2, 3], truncated: false, original: 3 })
  })
  it('truncates and reports the original length', () => {
    const result = clampForDemo(Array.from({ length: 20 }, (_, i) => i), 12)
    expect(result.data).toHaveLength(12)
    expect(result.truncated).toBe(true)
    expect(result.original).toBe(20)
  })
})

describe('generateLeetCode input truncation notice', () => {
  it('prepends a visible truncation notice when input exceeds the demo cap', () => {
    const nums = Array.from({ length: 20 }, (_, i) => i + 1)
    const script = generateLeetCode({ nums, target: 3 })
    const first = script.steps[0]
    expect(first.description.zh).toContain('20')
    expect(first.description.zh).toContain('12')
    expect(first.description.en).toContain('20')
  })
  it('emits no notice for small inputs', () => {
    const script = generateLeetCode({ nums: [2, 7, 11, 15], target: 9 })
    expect(script.steps[0].description.zh).not.toContain('截断')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/presets/__tests__/clampForDemo.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 clampForDemo**

`src/presets/utils.ts` 追加:

```ts
export interface DemoClampResult<T> {
  data: T[]
  truncated: boolean
  original: number
}

/** 演示用输入截断:超过 max 时截断并报告原始长度,调用方负责把截断信息显式画进动画。 */
export function clampForDemo<T>(values: T[], max: number): DemoClampResult<T> {
  if (values.length <= max) return { data: values, truncated: false, original: values.length }
  return { data: values.slice(0, max), truncated: true, original: values.length }
}
```

- [ ] **Step 4: 改造 leetcode.ts**

(a) 顶部 import:`import { clampForDemo } from './utils'`;`parseInput` 整体替换为:

```ts
const DEMO_CAP = 12

function parseInput(input?: unknown): { nums: number[]; target: number; truncated: boolean; original: number } {
  if (Array.isArray(input)) {
    const all = input.map(Number).filter(Number.isFinite)
    const { data, truncated, original } = clampForDemo(all, DEMO_CAP)
    return data.length > 0
      ? { nums: data, target: DEFAULT_TARGET, truncated, original }
      : { nums: DEFAULT_NUMS, target: DEFAULT_TARGET, truncated: false, original: DEFAULT_NUMS.length }
  }

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>
    const rawNums = obj.nums ?? obj.data ?? obj.arr ?? obj.array
    const all = Array.isArray(rawNums) ? rawNums.map(Number).filter(Number.isFinite) : []
    const { data, truncated, original } = clampForDemo(all, DEMO_CAP)
    const target = typeof obj.target === 'number'
      ? obj.target
      : typeof obj.param === 'number'
        ? obj.param
        : DEFAULT_TARGET
    return data.length > 0
      ? { nums: data, target, truncated, original }
      : { nums: DEFAULT_NUMS, target, truncated: false, original: DEFAULT_NUMS.length }
  }

  return { nums: DEFAULT_NUMS, target: DEFAULT_TARGET, truncated: false, original: DEFAULT_NUMS.length }
}
```

(b) `generateLeetCode` 中,解构改为 `const { nums, target, truncated, original } = parseInput(input)`;当 `truncated` 为真时,在**第一个步骤推入之前**插入:

```ts
  if (truncated) {
    steps.push({
      stepId: sid++,
      codeLine: 0,
      description: {
        zh: `输入共 ${original} 个元素，超出演示上限，已截断为前 12 个`,
        en: `Input has ${original} elements, beyond the demo cap; truncated to the first 12`,
      },
      action: { type: 'highlight', targets: [], color: 'warning' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: [{ type: 'scene.note', text: `输入共 ${original} 个元素，演示仅取前 12 个` }],
    })
  }
```

(顶部 import:`import { clampForDemo } from './utils'`。)

- [ ] **Step 5: 运行确认通过 + 提交**

Run: `npx vitest run src/presets`
Expected: PASS

```bash
git add src/presets/utils.ts src/presets/leetcode.ts src/presets/__tests__/clampForDemo.test.ts
git commit -m "feat(presets): 演示输入截断显式提示,消除静默 slice"
```

### Task 6.2: 回溯搜索树 builder 语法糖

**思路:** 复用现有 `tree.*` 事件(treeCompiler 已能渲染),零新编译器:`searchRoot` 建根、`searchTry` 插入子节点(返回节点 id 供后续引用)、`searchFail`/`searchOk`/`searchBack` 用 `scene.highlight` 标记冲突/成功/回退。搜索树 + 既有调用栈视图共同呈现回溯:树展示**搜索空间形状与剪枝位置**,栈展示**当前路径**。

**Files:**
- Modify: `src/sandbox/builder.ts`
- Modify: `src/ai/prompt/categories/recursion.ts`
- Test: `src/sandbox/__tests__/builderSearchTree.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/sandbox/__tests__/builderSearchTree.test.ts`:

```ts
import { AnimationBuilder } from '../builder'

describe('search tree sugar', () => {
  it('builds a root and child nodes via tree.* events', () => {
    const b = new AnimationBuilder('n_queens', 'array')
    b.searchRoot('根')
    const c1 = b.searchTry('st_0', '皇后@(0,1)')
    const c2 = b.searchTry('st_0', '皇后@(0,3)')
    expect(c1).toBe('st_1')
    expect(c2).toBe('st_2')
    const script = b.build()
    const types = script.steps.flatMap(s => (s.events ?? []).map(e => e.type))
    expect(types).toContain('tree.create')
    expect(types.filter(t => t === 'tree.insert')).toHaveLength(2)
  })

  it('marks conflict / success / backtrack via scene.highlight', () => {
    const b = new AnimationBuilder('n_queens', 'array')
    b.searchRoot('根')
    const c1 = b.searchTry('st_0', 'x')
    b.searchFail(c1)
    b.searchBack(c1)
    const c2 = b.searchTry('st_0', 'y')
    b.searchOk(c2)
    const script = b.build()
    const highlights = script.steps
      .flatMap(s => s.events ?? [])
      .filter(e => e.type === 'scene.highlight') as Array<{ type: string; entityId: string; color?: string }>
    expect(highlights.map(h => h.color)).toEqual(['danger', 'muted', 'success'])
    expect(highlights[0].entityId).toBe('st_1')
  })

  it('derives meaningful default descriptions for search steps', () => {
    const b = new AnimationBuilder('n_queens', 'array')
    b.searchRoot('根')
    b.searchTry('st_0', '尝试')
    const script = b.build()
    expect(script.steps[1].description.zh).not.toMatch(/^步骤 \d+$/)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/sandbox/__tests__/builderSearchTree.test.ts`
Expected: FAIL — 方法不存在。

- [ ] **Step 3: 实现**

`src/sandbox/builder.ts`:

(a) 类字段区追加:

```ts
  private searchSeq = 0
```

(b) 在 `// ── note / escape ──` 区块之前追加方法组:

```ts
  // ── 回溯搜索树(复用 tree.* 事件;与调用栈视图互补:树看搜索空间形状,栈看当前路径) ──
  /** 创建搜索树根。回溯算法第一步调用,label 描述初始状态(如 '空棋盘')。根 id 固定 'st_0'。 */
  searchRoot(label: string | number): this {
    this.searchSeq = 0
    return this.treeCreate('binary', 'st_0', [{ id: 'st_0', value: label }], [])
  }
  /** 做选择:在 parentId 下挂一个新分支节点,返回其 id(后续 searchFail/searchOk/searchBack 引用)。 */
  searchTry(parentId: string, label: string | number): string {
    const id = `st_${++this.searchSeq}`
    this.treeInsert(parentId, { id, value: label })
    return id
  }
  /** 标记冲突/剪枝:该分支不可行。 */
  searchFail(id: string): this {
    return this.add(
      [{ type: 'scene.highlight', entityId: id, role: 'current', color: 'danger' }],
      this.act('highlight', [], 'danger'),
    )
  }
  /** 标记成功:该分支到达解。 */
  searchOk(id: string): this {
    return this.add(
      [{ type: 'scene.highlight', entityId: id, role: 'safe', color: 'success' }],
      this.act('highlight', [], 'success'),
    )
  }
  /** 撤销选择(回溯离开该分支)。 */
  searchBack(id: string): this {
    return this.add(
      [{ type: 'scene.highlight', entityId: id, role: 'current', color: 'muted' }],
      this.act('highlight', [], 'muted'),
    )
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/sandbox/__tests__/builderSearchTree.test.ts`
Expected: PASS

- [ ] **Step 5: 更新递归类别提示词**

`src/ai/prompt/categories/recursion.ts` 的 PROMPT 字符串末尾(步数预算段之前)追加:

```
### 搜索树(回溯算法必用,与调用栈配合)
回溯算法除调用栈外,**必须**用搜索树把"搜索空间的形状与剪枝位置"画出来:
- \`b.searchRoot(label)\` 创建搜索树根(label 如 '空棋盘'、'第 0 层')
- \`const id = b.searchTry(parentId, label)\` 做选择时挂一个分支节点并拿到其 id;label 用简短中文描述这次选择(如 '皇后@(0,2)'、'放 5')
- \`b.searchFail(id)\` 冲突/剪枝;\`b.searchBack(id)\` 撤销选择;\`b.searchOk(id)\` 该分支到达解
- 搜索树节点同样计入步数预算:只展开前 2~4 层代表性分支,其余用 b.note 概括
```

- [ ] **Step 6: 全量回归 + 提交**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: 全部 PASS(覆盖率阈值 stmts84/branch70/funcs84/lines85 不回退)。

```bash
git add src/sandbox/builder.ts src/sandbox/__tests__/builderSearchTree.test.ts src/ai/prompt/categories/recursion.ts
git commit -m "feat(builder): 回溯搜索树语法糖(searchRoot/Try/Fail/Ok/Back)+ 提示词"
```

---

## 明确不做(Out of Scope)

逐项确认过,以下内容**有意**排除,不要顺手做:

- **Hot 100 / ACM 完整题库**:P4 只修正命名;批量新增生成器是独立项目,需单独立项。
- **scene.note 视觉文本双语**:涉及事件协议与所有编译器改动,P2 只保证步骤说明面板双语。
- **callstack 帧名/varInit 变量名双语**:提示词当前要求中文短词,改动牵涉帧渲染宽度,暂不动。
- **Python/C++/Java 的真值执行**(P1 只对 JS 做真值,其余语言靠 @expect):引入 Pyodide 等运行时是大型依赖决策。
- **归并排序递归分层视图、算法对比模式、伪代码面板、断点**:教学交互增强,另行规划。
- **MAX_STEPS(600)与 AI 步数预算(~300)调整**:截断已有显式提示步,维持现值。

## 风险与回归关注点

1. **P1 增加首次分析时延**:JS 真值执行 ≤3s 超时、@expect 比对零开销;只有"校验失败"才多一次修复请求。可接受。
2. **P2 改了 builder 既有签名的行为**(`description.en` 不再恒等于 zh):`src/sandbox/__tests__/`、`src/ai/golden/__tests__/` 中可能有 `en === zh` 的断言,失败时按新行为更新断言——这是预期变化,不是回归。
3. **P3 改变无向密图与有向图的节点坐标**:`src/scene/__tests__/` 与 `src/scene/layouts/__tests__/` 的位置断言可能需要更新;逐一核对是预期布局变化后再改。
4. **P5 的 effect 依赖数组变更**:`showCodeDesync` 进依赖后,编辑代码会触发 decorations 清理,这是设计行为。
5. **覆盖率阈值**:新增模块均带测试,阈值(84/70/84/85)不应回退;若 `userCodeWorker.ts` 拉低 funcs 覆盖率,把它加入 `vitest.config.ts` coverage exclude(与 `generatorWorker.ts` 同理——确认后者是否已被排除,保持一致)。

## 任务依赖关系

```
Task 0 ─→ P1(1.1→1.2→1.3→1.4→1.5→1.6) ─┐
      ├→ P2(2.1→2.2)                    ├─ 互相独立,可并行派发
      ├→ P3(3.1→3.2→3.3)                │  (P1 与 P2 都改 core.ts 与 builder.ts,
      ├→ P4(4.1)                        │   若并行需先做 P1.5 再做 P2.2,
      ├→ P5(5.1→5.2)                    │   builder.ts 冲突由 P2 先行避免)
      └→ P6(6.1→6.2)                    ┘
```

建议串行顺序:P1 → P2 → P6(三者共享 builder.ts/core.ts/提示词,串行免冲突)→ P3 / P4 / P5(任意顺序)。
