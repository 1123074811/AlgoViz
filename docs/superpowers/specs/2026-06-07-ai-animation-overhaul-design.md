# AI 可视化动画生成 —— 类别驱动管线大优化（设计）

- 日期：2026-06-07
- 状态：已批准，待实现
- 架构：方案 A「类别驱动生成管线」
- 隔离：每个工作流独立 git worktree，由 lead 统一合并

## 1. 背景与动机

AI 代码实验室把用户代码 + 输入交给 LLM，生成一段 JavaScript「生成器」，在沙箱里执行
产出 `AnimationScript`，再由 Scene Engine 编译渲染。近期发现一批质量问题：

- **生成器没用对图元**：递归 DFS 用普通 `stackCreate` 充当调用栈却从不 `push`（栈一直空）；
  网格用 `matrixCreate` 建全 0 空格子只靠高亮（看不到陆地/标记过程）。
- **缺语义质量门**：现有校验只检查 JSON/schema 结构，不检测「有结构无操作 / 空栈 / 全同网格 /
  空描述 / 代码行不动」等语义问题，劣质动画直接呈现给用户。
- **提示词单体化**：所有算法类别的指引堆在一个巨型 system prompt 里，难聚焦、难扩展。
- **清晰度/叙事零散**：多结构布局、间距、标签、步骤叙事与代码行同步缺统一保障。

目标（四维度全做）：**生成正确性与可靠性、动画清晰度与版面、叙事与教学性、算法覆盖广度**。

## 2. 总体架构

新管线：

```
代码+输入 → [分类 category] → 生成器(LLM, 单次) → 沙箱执行 → AnimationScript
          → [确定性质量门 runQualityGate] → 有 error? 
              是 → 带问题清单 repairGenerator(LLM, 一次) → 沙箱 → 质量门(复检)
              否 → 渲染
          → 仍失败 → AIErrorReport 清晰诊断
```

LLM 成本：通常 1 次调用，质量不达标时最多 2 次（确定性质量门 + 按需一次修复）。

## 3. 共享接口（基础层，lead 先行，使并行成为可能）

### 3.1 算法类别 `src/ai/categories.ts`

```ts
export type AlgorithmCategory =
  | 'linear'     // 排序/查找/双指针/滑动窗口（array、string）
  | 'recursion'  // DFS/回溯/分治/树递归 —— 必须驱动调用栈
  | 'grid'       // 迷宫/岛屿/棋盘/网格寻路
  | 'graph'      // BFS/DFS 图/最短路/MST/拓扑
  | 'tree'       // BST/AVL/堆/Trie/B 树
  | 'dp'         // 2D 动态规划
  | 'structure'  // 栈/队列/哈希/集合/位集 等数据结构操作

export interface CategoryProfile {
  id: AlgorithmCategory
  /** 提示词中该类别专属章节（WS2 填充） */
  promptModule: string
  /** 该类别专属质量规则（WS5 填充） */
  rules: QualityRule[]
}

/** 确定性分类器：优先用 @category 指令，否则由 @algorithm/@type/代码启发式推断。 */
export function classifyAlgorithm(input: {
  algorithm?: string
  type?: string
  declaredCategory?: string
  code?: string
}): AlgorithmCategory

export const CATEGORY_PROFILES: Record<AlgorithmCategory, CategoryProfile>
```

### 3.2 质量门 `src/ai/quality/types.ts`

QualityContext 完全从 `AnimationScript` 派生（`steps[].events` 提供完整事件流，
`codeLine`/`description` 提供叙事/同步信息），**无需改动 builder**。

```ts
export interface QualityIssue {
  code: string                 // 如 'empty-structure'
  severity: 'error' | 'warn'
  message: string              // 给人看
  hint: string                 // 给 AI 修复用的具体修正建议
}

export interface QualityContext {
  script: AnimationScript
  category: AlgorithmCategory
  /** 由 steps[].events 预计算的索引（结构创建集合、各结构操作计数、事件族计数等） */
  structuresCreated: Set<string>      // 'stack'|'grid'|'array'|'callstack'|...
  opCountByFamily: Record<string, number>
  stepCount: number
  codeLineCoverage: number            // 带有效 codeLine 的步骤占比
  emptyDescCount: number
}

export interface QualityRule {
  id: string
  appliesTo?: AlgorithmCategory[]     // 缺省=通用
  check(ctx: QualityContext): QualityIssue[]
}

export interface QualityReport {
  passed: boolean                     // 无 error 即通过
  issues: QualityIssue[]
}

export function buildQualityContext(script: AnimationScript, category: AlgorithmCategory): QualityContext
export function runQualityGate(script: AnimationScript, category: AlgorithmCategory, extraRules?: QualityRule[]): QualityReport
```

### 3.3 提示词装配 `src/ai/prompt/`

```ts
// src/ai/prompt/index.ts
export function buildGeneratorSystemPrompt(language: string, category?: AlgorithmCategory): string
// 内部：core.ts（格式/可用变量/硬性规则/质量底线）+ categories/<id>.ts 按需拼装
```

向后兼容：保留 `src/ai/generatorPrompt.ts` 的 `buildGeneratorSystemPrompt` 导出（转调新实现）。

### 3.4 修复函数 `src/ai/repairGenerator.ts`

```ts
/** 带质量问题清单回发 AI，请其在保持算法逻辑前提下修复生成器。返回新的生成器源码或 null。 */
export async function repairGenerator(args: {
  body: string
  language: string
  category: AlgorithmCategory
  issues: QualityIssue[]
  signal?: AbortSignal
}): Promise<{ body: string } | null>
```

## 4. 工作流拆分（WS）

| WS | 范围 | 主要产出 | 依赖 |
|----|------|----------|------|
| WS1 | 质量门核心 | `src/ai/quality/`：types、buildQualityContext、runQualityGate、通用规则、单元测试 | 基础接口 |
| WS2 | 类别体系 + 提示词模块化 | `src/ai/categories.ts`、`src/ai/prompt/`（core + 各类别）、分类器、测试 | 基础接口 |
| WS3 | 布局与渲染清晰度 | 多结构分区/间距/标签/不重叠审计与修复，沉淀已修单元格自适应/树打包，补测试 | 无（独立） |
| WS4 | 叙事/节奏/代码行同步 | 关键步骤强制 codeLine + 有意义 desc 的确定性兜底与规则、步骤去重/节奏，测试 | 与 WS1 共享 QualityIssue 码 |
| WS5 | 各类别覆盖包 | 每类别金样例生成器 + 类别 QualityRule + 内嵌 few-shot 示例 | WS1（规则接口）、WS2（类别/提示词） |
| WS6 | 金样例回归测试台 | `src/ai/quality/__tests__/golden.*`：金样例→沙箱→编译→断言质量门+不变量 | WS1、WS5 金样例 |

### 4.1 管线接入（lead 在合并阶段完成）

`src/hooks/useAIGenerator.ts` 的 `analyze`：沙箱成功后 `classifyAlgorithm` → `runQualityGate`；
若有 error → `repairGenerator` 一次 → 重跑沙箱 + 质量门；仍失败用 AIErrorReport 诊断。
`analyzeCodeGenerator` 传入 category 以选用对应提示词模块。

## 5. 通用质量规则（WS1）

- `empty-structure`(error)：建了结构却无实质变更（stack 0 push / grid 全同值 / array 无 compare·swap·visit）。
- `no-operations`(error)：实质操作事件 < 阈值。
- `empty-desc`(warn→error 累计)：步骤 description 为空或「步骤 N」占位。
- `low-codeline`(warn)：带有效 codeLine 的步骤占比过低（箭头几乎不动）。
- `grid-uniform`(error)：grid/matrix 全部单元格同值（全 0 bug）。
- `recursion-no-callstack`(error，仅 recursion 类）：代码递归但无 callstack.* 事件。

类别规则（WS5）在各类别 profile 内追加，如 graph 必须有 visit_node/visit_edge、dp 必须有 dp.set 等。

## 6. 测试策略（确定性，不调 LLM）

- WS1：对构造的 AnimationScript 夹具逐规则单测（命中/不命中）。
- WS2：分类器表驱动测试；提示词装配包含核心片段断言。
- WS3：布局不重叠/分区/宽度自适应单测（复用现有 scene 测试风格）。
- WS4：叙事/代码行规则单测。
- WS6：金样例端到端——每个手写金样例生成器经沙箱→`build()`→Scene 编译，断言
  （a）`runQualityGate` 0 error；（b）不变量：结构存在、操作数>0、recursion 调用栈深度与递归一致、
  grid 非全同、每步有 desc、codeLine 覆盖率达标。

CI：`npx tsc --noEmit` + `npx vitest run` 全绿，`npm run build` 通过。

## 7. 非目标（YAGNI）

- 不重写为两阶段规划器（方案 C）。
- 不引入always-two-pass 自批（按需修复即可）。
- 不在 CI 中调用真实 LLM（成本/不确定性）。
- 不改 Scene Engine 协议；仅在其上补规则与图元用法。

## 8. 风险与缓解

- **接口漂移**：基础接口 commit 先行并冻结；各 WS 针对接口编码。
- **并行合并冲突**：worktree 隔离 + 文件边界清晰（各 WS 主要新增独立目录/文件）。
- **质量门误杀**：error/warn 分级，只有 error 触发修复；阈值可调并由 WS6 金样例校准。
- **修复发散**：repair 提示词约束「保持算法逻辑，仅按问题清单修正」，且只修一次。
