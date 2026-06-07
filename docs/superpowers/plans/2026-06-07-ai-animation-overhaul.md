# AI 动画生成类别驱动管线大优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本计划按 git worktree 并行执行：基础层(Task 0)由 lead 先行并冻结接口，WS1-WS6 各由一个 agent 在独立 worktree 内 TDD 执行。

**Goal:** 把 AI 生成可视化动画改造为「分类 → 生成 → 确定性质量门 → 按需一次修复 → 渲染」的类别驱动管线，确保动画正确、清晰、有叙事、覆盖广。

**Architecture:** 方案 A。先落地共享接口(类别 / 质量门 / 提示词装配 / 修复函数)，再并行实现质量门核心、类别与提示词模块化、布局清晰度、叙事同步、各类别覆盖包、金样例回归测试台。质量门完全从 `AnimationScript.steps[].events` 派生，不改 Scene 协议。

**Tech Stack:** TypeScript、React、Vitest、Zustand、现有 Scene Engine / sandbox builder。

参考规格：`docs/superpowers/specs/2026-06-07-ai-animation-overhaul-design.md`

通用验证命令（每个 WS 收尾必跑）：
- `npx tsc --noEmit` → 无输出
- `npx vitest run <本 WS 测试路径>` → 全绿
- 合并阶段 lead 跑：`npx vitest run` + `npm run build`

---

## Task 0（lead，主 worktree 先行）：基础接口层

冻结所有 WS 依赖的共享契约。**必须先完成并提交，再派生 worktree。**

**Files:**
- Create: `src/ai/categories.ts`
- Create: `src/ai/quality/types.ts`
- Create: `src/ai/quality/index.ts`
- Create: `src/ai/prompt/index.ts`
- Create: `src/ai/prompt/core.ts`
- Create: `src/ai/repairGenerator.ts`
- Modify: `src/ai/generatorPrompt.ts`（转调新装配，保持向后兼容导出）
- Test: `src/ai/__tests__/categories.test.ts`

- [ ] **Step 1: 写 `categories.ts`（接口 + 分类器骨架）**

```ts
import type { QualityRule } from './quality/types'

export type AlgorithmCategory =
  | 'linear' | 'recursion' | 'grid' | 'graph' | 'tree' | 'dp' | 'structure'

export const ALL_CATEGORIES: AlgorithmCategory[] =
  ['linear', 'recursion', 'grid', 'graph', 'tree', 'dp', 'structure']

export interface CategoryProfile {
  id: AlgorithmCategory
  /** 提示词中该类别专属章节（WS2 填充实际内容）。 */
  promptModule: string
  /** 该类别专属质量规则（WS5 填充实际规则）。 */
  rules: QualityRule[]
}

const GRID_ALGOS = /islands?|flood|maze|grid|matrix.?path|num_islands/i
const RECURSION_ALGOS = /dfs|backtrack|permut|combin|subset|divide|recursion|n_queens|sudoku/i
const GRAPH_ALGOS = /bfs|dfs_graph|dijkstra|prim|kruskal|topolog|bellman|floyd|a_?star|union_find/i
const TREE_ALGOS = /tree|bst|avl|trie|heap|btree|b_?plus/i
const DP_ALGOS = /dp|knapsack|lcs|lis|edit_distance|matrix_chain|interval_dp/i
const STRUCT_ALGOS = /stack|queue|deque|hash|set|bitset|priority/i

/** 确定性分类器：优先 declaredCategory(@category)，否则按 algorithm/type/code 推断。 */
export function classifyAlgorithm(input: {
  algorithm?: string
  type?: string
  declaredCategory?: string
  code?: string
}): AlgorithmCategory {
  const d = input.declaredCategory?.toLowerCase()
  if (d && (ALL_CATEGORIES as string[]).includes(d)) return d as AlgorithmCategory
  const hay = `${input.algorithm ?? ''} ${input.code ?? ''}`
  if (input.type === 'graph' || GRAPH_ALGOS.test(hay)) return 'graph'
  if (input.type === 'tree' || TREE_ALGOS.test(hay)) return 'tree'
  if (GRID_ALGOS.test(hay)) return 'grid'
  if (DP_ALGOS.test(hay)) return 'dp'
  if (RECURSION_ALGOS.test(hay)) return 'recursion'
  if (STRUCT_ALGOS.test(hay)) return 'structure'
  return 'linear'
}

/** 各类别 profile。promptModule/rules 由 WS2/WS5 填充；Task 0 先给空骨架。 */
export const CATEGORY_PROFILES: Record<AlgorithmCategory, CategoryProfile> =
  Object.fromEntries(
    ALL_CATEGORIES.map(id => [id, { id, promptModule: '', rules: [] }]),
  ) as Record<AlgorithmCategory, CategoryProfile>
```

- [ ] **Step 2: 写 `quality/types.ts`（质量门契约 + context 构建）**

```ts
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmCategory } from '../categories'

export interface QualityIssue {
  code: string
  severity: 'error' | 'warn'
  message: string   // 给人看
  hint: string      // 给 AI 修复用的具体修正建议
}

export interface QualityContext {
  script: AnimationScript
  category: AlgorithmCategory
  structuresCreated: Set<string>          // 'array'|'stack'|'grid'|'callstack'|...
  opCountByFamily: Record<string, number> // 事件族 → 出现次数
  stepCount: number
  codeLineCoverage: number                // 带有效 codeLine(>=0) 的步骤占比 0..1
  emptyDescCount: number
}

export interface QualityRule {
  id: string
  appliesTo?: AlgorithmCategory[]         // 缺省=通用
  check(ctx: QualityContext): QualityIssue[]
}

export interface QualityReport {
  passed: boolean                         // 无 error 即通过
  issues: QualityIssue[]
}

/** 事件 type 形如 'array.create' → family 'array'，'create' 动作 → op。 */
function familyOf(eventType: string): string { return eventType.split('.')[0] }
function isCreate(eventType: string): boolean { return /\.(create)$/.test(eventType) }

export function buildQualityContext(
  script: AnimationScript,
  category: AlgorithmCategory,
): QualityContext {
  const structuresCreated = new Set<string>()
  const opCountByFamily: Record<string, number> = {}
  let withCodeLine = 0
  let emptyDescCount = 0
  const steps: AnimationStep[] = script.steps ?? []
  for (const step of steps) {
    if ((step.codeLine ?? -1) >= 0) withCodeLine++
    const zh = step.description?.zh?.trim() ?? ''
    if (zh === '' || /^步骤\s*\d+$/.test(zh)) emptyDescCount++
    for (const ev of step.events ?? []) {
      const fam = familyOf(ev.type)
      if (isCreate(ev.type)) structuresCreated.add(fam)
      else opCountByFamily[fam] = (opCountByFamily[fam] ?? 0) + 1
    }
  }
  return {
    script, category, structuresCreated, opCountByFamily,
    stepCount: steps.length,
    codeLineCoverage: steps.length ? withCodeLine / steps.length : 0,
    emptyDescCount,
  }
}
```

> 注：若 `StepDescription` 字段名不是 `zh`，按实际类型调整（Task 0 实现时打开 `src/types/animation.ts` 确认；当前代码库为 `{ zh, en }` 形态，已在 builder 使用）。

- [ ] **Step 3: 写 `quality/index.ts`（runQualityGate + 规则注册入口，规则由 WS1/WS5 填充）**

```ts
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmCategory } from '../categories'
import { buildQualityContext, type QualityRule, type QualityReport } from './types'

/** WS1 填充通用规则数组；保持导出名稳定。 */
export const GENERAL_RULES: QualityRule[] = []

export function runQualityGate(
  script: AnimationScript,
  category: AlgorithmCategory,
  extraRules: QualityRule[] = [],
): QualityReport {
  const ctx = buildQualityContext(script, category)
  const rules = [...GENERAL_RULES, ...extraRules].filter(
    r => !r.appliesTo || r.appliesTo.includes(category),
  )
  const issues = rules.flatMap(r => r.check(ctx))
  return { passed: !issues.some(i => i.severity === 'error'), issues }
}

export * from './types'
```

- [ ] **Step 4: 写 `prompt/core.ts` 与 `prompt/index.ts`（装配骨架）**

`prompt/core.ts`：把现有 `generatorPrompt.ts` 的「输出格式 / @sample / 可用变量 / 通用图元 / 质量底线 / 硬性要求 / 示例」原样迁入，导出 `CORE_PROMPT(language: string): string`。各类别专属章节（数组/区间/网格/递归/DP/图/树/结构…）先留在 core 中，WS2 再外移到 `categories/<id>.ts`。

`prompt/index.ts`：

```ts
import type { AlgorithmCategory } from '../categories'
import { CORE_PROMPT } from './core'
// WS2 将补：import { CATEGORY_PROMPTS } from './categories'

export function buildGeneratorSystemPrompt(language: string, category?: AlgorithmCategory): string {
  // Task 0：仅返回 core；WS2 改为 core + 对应类别模块。
  void category
  return CORE_PROMPT(language)
}
```

- [ ] **Step 5: 改 `generatorPrompt.ts` 转调，保持向后兼容**

```ts
export { buildGeneratorSystemPrompt } from './prompt'
```

（保证 `src/ai/__tests__/generatorPrompt.test.ts` 现有断言仍通过。）

- [ ] **Step 6: 写 `repairGenerator.ts`（签名 + 实现）**

```ts
import { getApiConfig, analyzeCodeGenerator } from './client'
import type { AlgorithmCategory } from './categories'
import type { QualityIssue } from './quality/types'

export async function repairGenerator(args: {
  body: string
  language: string
  category: AlgorithmCategory
  issues: QualityIssue[]
  signal?: AbortSignal
}): Promise<{ body: string } | null> {
  const config = getApiConfig()
  if (!config) return null
  const issueList = args.issues.map(i => `- [${i.code}] ${i.message} → ${i.hint}`).join('\n')
  // 复用 analyzeCodeGenerator 的请求通道：把"已有生成器 + 问题清单"作为代码再分析。
  // Task 0 给出最小可用实现；WS1 可据质量门反馈细化提示。
  const res = await analyzeCodeGenerator(
    {
      code: `/* 修复以下生成器，保持算法逻辑不变，仅按问题清单修正：\n${issueList}\n*/\n${args.body}`,
      language: args.language,
      inputData: '',
      algorithmName: 'repair',
    },
    { signal: args.signal },
  )
  if (res.success && res.generator) return { body: res.generator.body }
  return null
}
```

> 若 `analyzeCodeGenerator` 不便直接复用（如它走 parseGeneratorResponse），WS1 可在合并阶段改为直连 `requestWithProxyFallback` + 专用 repair system prompt。Task 0 先保证可编译、签名稳定。

- [ ] **Step 7: 写 `categories.test.ts`（分类器表驱动测试）**

```ts
import { describe, it, expect } from 'vitest'
import { classifyAlgorithm } from '../categories'

describe('classifyAlgorithm', () => {
  it.each([
    [{ algorithm: 'num_islands_dfs', type: 'matrix' }, 'grid'],
    [{ algorithm: 'quick_sort', type: 'array' }, 'linear'],
    [{ algorithm: 'dijkstra', type: 'graph' }, 'graph'],
    [{ algorithm: 'lcs', type: 'array' }, 'dp'],
    [{ algorithm: 'bst_insert', type: 'tree' }, 'tree'],
    [{ algorithm: 'n_queens', type: 'array' }, 'recursion'],
    [{ algorithm: 'monotonic_stack', type: 'array' }, 'structure'],
    [{ declaredCategory: 'recursion', algorithm: 'x' }, 'recursion'],
  ])('%o → %s', (input, expected) => {
    expect(classifyAlgorithm(input)).toBe(expected)
  })
})
```

- [ ] **Step 8: 验证 + 提交**

Run: `npx tsc --noEmit`（无输出）；`npx vitest run src/ai`（全绿，含既有 generatorPrompt 测试）
Commit:
```bash
git add src/ai/categories.ts src/ai/quality src/ai/prompt src/ai/repairGenerator.ts src/ai/generatorPrompt.ts src/ai/__tests__/categories.test.ts
git commit -m "feat(ai): 基础接口层 — 类别/质量门/提示词装配/修复函数契约"
```

---

## WS1（agent，worktree `ws1-quality`）：质量门通用规则

**Files:**
- Modify: `src/ai/quality/index.ts`（填充 `GENERAL_RULES`）
- Create: `src/ai/quality/rules/general.ts`
- Test: `src/ai/quality/__tests__/general.test.ts`

实现以下通用 `QualityRule` 并加入 `GENERAL_RULES`（阈值见括号，可在 WS6 校准）：

1. `empty-structure`(error)：某 family 在 `structuresCreated` 但 `opCountByFamily[family]` 为 0
   （例外：`scene`/`pointer` 不算结构）。hint：「结构 X 创建后从未操作，请发对应操作事件」。
2. `no-operations`(error)：`Σ opCountByFamily`（排除 scene）< 3。
3. `empty-desc`(error 当 `emptyDescCount / stepCount > 0.3`，否则 warn)。
4. `low-codeline`(warn 当 `codeLineCoverage < 0.4`)。
5. `grid-uniform`(error)：当 `structuresCreated` 含 `grid` 或 `matrix`，从 `script.steps[].events`
   找到对应 create 事件，若其 `values` 拉平后全部相等 → error。hint：「网格创建值全同，请传入真实网格并在访问时更新单元格」。
6. `recursion-no-callstack`(error，appliesTo `['recursion']`)：`structuresCreated` 不含 `callstack`。

**TDD：** 对每条规则构造命中/不命中的 `AnimationScript` 夹具（最小步骤数组，手填 `events`/`description`/`codeLine`），断言 `runQualityGate(script, category)` 的 `issues` 含/不含该 code、`passed` 正确。

**Acceptance:** `npx vitest run src/ai/quality` 全绿；`npx tsc --noEmit` 无输出。
**Commit:** `feat(ai): 质量门通用语义规则(空结构/无操作/空描述/代码行/全同网格/递归无栈)`

---

## WS2（agent，worktree `ws2-categories`）：类别提示词模块化

**Files:**
- Create: `src/ai/prompt/categories/{linear,recursion,grid,graph,tree,dp,structure}.ts`
- Create: `src/ai/prompt/categories/index.ts`（`export const CATEGORY_PROMPTS: Record<AlgorithmCategory,string>`）
- Modify: `src/ai/prompt/core.ts`（把类别专属章节移出到对应模块，core 只留通用）
- Modify: `src/ai/prompt/index.ts`（`buildGeneratorSystemPrompt` 拼 core + `CATEGORY_PROMPTS[category]`）
- Modify: `src/ai/categories.ts`（`CATEGORY_PROFILES[id].promptModule = CATEGORY_PROMPTS[id]`）
- Test: `src/ai/__tests__/promptAssembly.test.ts`

把当前 `core.ts` 内已有的各结构章节按类别归位：
- linear：数组(排序/查找/双指针/滑动窗口)、区间类、字符串
- recursion：递归调用栈(callStack*) + 回溯/分治写法
- grid：网格/迷宫/岛屿(grid*)
- graph：图(graphCreate/visitNode/...)
- tree：树(treeCreate/...) + 堆
- dp：DP 状态表(dpCreate/...) + 矩阵转移
- structure：栈/队列/双端队列/哈希/集合/位集

**TDD：**
- `buildGeneratorSystemPrompt('java','grid')` 含 `gridCreate`，不含无关的 `dpCreate` 大段；
- `buildGeneratorSystemPrompt('java','recursion')` 含 `callStackCreate`/`callPush`；
- `buildGeneratorSystemPrompt('python')`（无 category）含核心格式片段（兼容旧测试）。

**Acceptance:** `npx vitest run src/ai`（含既有 generatorPrompt 测试）全绿；`npx tsc --noEmit` 无输出。
**Commit:** `feat(ai): 提示词模块化 — core + 七类别模块,按 category 装配`

---

## WS3（agent，worktree `ws3-layout`）：布局与渲染清晰度

**Files:**
- Audit/Modify: `src/scene/regionLayout.ts`、`src/scene/layouts/*`、相关 compilers
- Test: `src/scene/__tests__/layoutClarity.test.ts`

目标与断言：
- 多结构(composite)时各结构区域有标题且包围盒不重叠（构造含 array+stack+grid 的 SceneState，断言区域 bbox 两两不相交）。
- 同层节点/单元格间距一致、不重叠（复用并扩展已修的 cell 自适应宽度、tree 打包）。
- 标签/数值不溢出单元格（复用 truncateToWidth 逻辑断言）。

**TDD：** 按 `src/scene` 既有测试风格构造 SceneState → 调布局 → 断言坐标/包围盒不相交。
**Acceptance:** `npx vitest run src/scene` 全绿；`npx tsc --noEmit` 无输出。
**Commit:** `fix(scene): 多结构分区不重叠与版面清晰度审计+测试`

---

## WS4（agent，worktree `ws4-narration`）：叙事/节奏/代码行同步

**Files:**
- Create: `src/ai/quality/rules/narration.ts`（叙事相关 QualityRule，复用 WS1 的 QualityRule 接口与 code 命名空间）
- Create/Modify: `src/sandbox/builder.ts` 的确定性兜底（关键操作事件若 desc 为空，填充由事件推导的默认中文描述——已有 `defaultDescFor`，扩展之）
- Test: `src/sandbox/__tests__/narration.test.ts`、`src/ai/quality/__tests__/narration.test.ts`

目标：
- 扩展 `defaultDescFor` 覆盖 callstack.*/grid.*/dp.* 事件，杜绝空描述。
- 叙事规则：连续相同 desc 过多(>3)→ warn `repetitive-desc`；关键操作步骤无 codeLine 比例过高→ warn（与 WS1 `low-codeline` 不重复，聚焦"关键操作"步）。

**TDD：** 构造含 callstack/grid/dp 事件但空 desc 的步骤 → 经 builder 得到非空 desc；叙事规则命中/不命中测试。
**Acceptance:** `npx vitest run src/sandbox src/ai/quality` 全绿；`npx tsc --noEmit` 无输出。
**Commit:** `feat(ai): 叙事兜底(callstack/grid/dp 默认描述)+叙事质量规则`

---

## WS5（agent，worktree `ws5-coverage`）：各类别覆盖包

**Files:**
- Create: `src/ai/golden/{linear,recursion,grid,graph,tree,dp,structure}.ts`（每个导出一个手写生成器源码字符串 `GOLDEN_<CAT>: string`，与 AI 应输出的 JS 生成器同构，使用 builder API）
- Create: `src/ai/golden/index.ts`（`export const GOLDEN_GENERATORS: Record<AlgorithmCategory,string>`）
- Create: `src/ai/quality/rules/category.ts`（各类别专属规则，写入 `CATEGORY_PROFILES[id].rules`）
- Modify: `src/ai/categories.ts`（挂接 rules）
- Test: `src/ai/golden/__tests__/golden.unit.test.ts`（每个 golden 源码可被沙箱执行、产出非空 script）

类别专属规则示例：
- graph：必须含 `graph` 结构且 `visit_node` op>0。
- dp：必须含 `dp` 结构且 `dp.set` op>0。
- recursion：`callstack` push/pop 成对（callstack push 计数>0）。
- grid：grid create 值非全同（与 WS1 `grid-uniform` 协同，这里加"必须有 grid.visit/set")。

每个 golden 生成器要求：用真实 input 驱动、结构+操作完整、每步有 desc+codeLine——即"标准答案"。

**TDD：** 用 `runGeneratorSandboxed(GOLDEN_X, sampleInput, {...})` 断言 ok 且 script.steps 非空；类别规则命中/不命中单测。
**Acceptance:** `npx vitest run src/ai/golden src/ai/quality` 全绿；`npx tsc --noEmit` 无输出。
**Commit:** `feat(ai): 七类别金样例生成器 + 类别专属质量规则`
**Depends on:** Task 0（接口）、WS2（类别 profile）、WS1（规则接口）——接口已冻结即可并行编码，golden 仅依赖稳定的 builder API。

---

## WS6（agent，worktree `ws6-harness`）：金样例回归测试台

**Files:**
- Create: `src/ai/quality/__tests__/golden.e2e.test.ts`

对 `GOLDEN_GENERATORS` 每个类别：
1. `runGeneratorSandboxed(body, sample, {...})` → ok。
2. 取 `script`，`classifyAlgorithm` 得 category（或直接用 key）。
3. `runQualityGate(script, category, CATEGORY_PROFILES[category].rules)` → `passed === true`、无 error。
4. 不变量断言：结构存在、Σop>0、recursion 含 callstack、grid 值非全同、每步 desc 非空、`codeLineCoverage >= 0.4`。

**TDD：** 该 WS 本身就是测试；先写断言（会因 golden 未就绪而 fail），WS5 完成后转 green。
**Acceptance:** `npx vitest run src/ai/quality/__tests__/golden.e2e.test.ts` 全绿。
**Commit:** `test(ai): 金样例端到端回归测试台(质量门+不变量,无 LLM)`
**Depends on:** WS1（runQualityGate）、WS5（golden + 类别规则）。WS6 在 WS1/WS5 合并后由 lead 或末位 agent 跑通。

---

## 合并与收尾（lead）

按依赖顺序合并 worktree：Task 0 已在主干 → 合 WS2、WS1 → WS3、WS4、WS5 → WS6。每合一个跑 `npx vitest run` + `npx tsc --noEmit`。

最后 lead 完成**管线接入**（不在并行 WS 内，避免冲突）：
- Modify `src/ai/client.ts`：`analyzeCodeGenerator` 接受可选 category，`buildGeneratorSystemPrompt(language, category)`。
- Modify `src/hooks/useAIGenerator.ts`：沙箱成功后 `classifyAlgorithm` → `runQualityGate(script, category, CATEGORY_PROFILES[category].rules)`；有 error → `repairGenerator` 一次 → 重跑沙箱+质量门；仍失败用 AIErrorReport 诊断。
- 收尾测试：`npx vitest run` + `npm run build` 全绿。
- Commit：`feat(ai): 接入类别驱动管线(分类→质量门→按需修复)`

---

## Self-Review 检查

- Spec 覆盖：类别(Task0/WS2)、质量门(Task0/WS1)、提示词模块化(Task0/WS2)、布局(WS3)、叙事(WS4)、覆盖包(WS5)、测试台(WS6)、管线接入(收尾) —— 全覆盖。
- 类型一致：`QualityRule/QualityIssue/QualityContext/QualityReport`、`AlgorithmCategory`、`buildGeneratorSystemPrompt(language, category?)`、`runQualityGate(script, category, extraRules?)`、`repairGenerator({body,language,category,issues,signal})` 各处签名一致。
- 占位：无 TBD/TODO；阈值均给具体数值；测试均给断言代码或明确断言项。
