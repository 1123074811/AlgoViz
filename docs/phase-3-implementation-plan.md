# AlgoViz Phase 3 AI 动画引擎增强优化文档

本文档用于指导后续 AI 编程工具对 AlgoViz 进行 Phase 3 AI 动画引擎增强，实现范围聚焦于：

1. 增强 AI 输出 JSON Schema 校验。
2. 增加更明确的错误提示和修复建议。
3. 支持更多输入数据结构，例如图、树、矩阵对象。
4. 支持 AI 失败后自动重试或请求格式修复。

本阶段仍保持纯前端架构，不引入后端服务，不改变 OpenAI 兼容接口调用方式。Phase 3 的核心目标是把 AI 生成链路从“能解析成功即可播放”提升到“可诊断、可修复、可扩展、可教学验收”的稳定生成系统。

---

## 一、当前项目基础情况

### 1. 相关技术栈

当前项目与 Phase 3 直接相关的技术包括：

- React 18
- TypeScript
- Vite
- Zustand
- Monaco Editor
- OpenAI 兼容 Chat Completions API
- `localStorage` 本地 API 配置保存
- `AnimationScript` 结构化动画协议

当前依赖中暂未引入 JSON Schema 校验库。Phase 3 可以选择两条路线：

- 继续使用手写类型守卫和结构化校验函数，减少依赖体积。
- 引入轻量 Schema 校验库，例如 `zod` 或 `ajv`，提升 Schema 表达能力和错误定位能力。

如果项目仍希望保持最小依赖，建议先使用手写校验器；如果后续需要导出标准 JSON Schema 或支持更复杂的对象联合类型，建议引入 `zod` 或 `ajv`。

### 2. 当前 AI 相关目录

```text
src/
├── ai/
│   ├── client.ts
│   ├── index.ts
│   ├── parser.ts
│   └── prompts.ts
├── pages/
│   └── Playground/
│       └── index.tsx
├── types/
│   └── animation.ts
├── hooks/
│   └── useAnimationEngine.ts
└── components/
    └── Canvas/
        ├── VisualizationCanvas.tsx
        └── renderers/
```

### 3. 当前 AI 生成调用链

当前 AI Playground 的主要链路如下：

```text
Playground.handleAnalyze
  → analyzeCode(params)
    → getApiConfig()
    → buildSystemPrompt(language)
    → buildUserMessage(params)
    → fetch(OpenAI compatible /chat/completions)
    → parseAIResponse(content)
      → JSON 提取
      → validateAndSanitize(json)
    → 返回 AIResult
  → setAnimationScript(script)
  → useAnimationEngine(animationScript)
  → VisualizationCanvas 渲染
```

当前链路的优点：

- 调用路径清晰，所有 AI 入口集中在 `src/ai/`。
- `client.ts` 已区分 API Key 缺失、认证失败、404、429、CORS/网络错误。
- `parser.ts` 已支持直接 JSON、Markdown JSON 代码块、首尾大括号截取三种提取策略。
- `parser.ts` 会对动作类型、颜色、步骤编号、统计数据进行基础兜底。

当前链路的主要问题：

- `parseAIResponse` 只返回 `AnimationScript | null`，无法告诉调用方具体失败字段和修复建议。
- `validateAndSanitize` 要求 `initialState.data` 必须是非空数组，导致图、树、矩阵对象型输入难以通过。
- `parser.ts` 当前只保留 `initialState.type` 和 `initialState.data`，会丢弃 `labels`、`nodes`、`edges`、`root`、`children`、`treeNodes` 等字段。
- `sanitizeStep` 当前只保留 `action.type`、`targets`、`color`，会丢弃 `from`、`to`、`value` 和 Phase 2 已扩展的 `teachingState`。
- `VALID_RENDERER_TYPES` 当前包含 `array | graph | tree | matrix`，而 `RendererType` 类型还包含 `linked_list`，存在校验白名单不一致问题。
- `prompts.ts` 的输出规范主要围绕数组，图、树、矩阵、链表的字段要求不够明确。
- `client.ts` 解析失败后直接返回错误，不会自动向模型发起格式修复请求。
- Playground UI 只展示单行错误文本，缺少可执行的修复建议和原始响应查看入口。

---

## 二、Phase 3 总体目标

Phase 3 的目标是让 AI 动画生成流程具备更强的可靠性、可解释性和输入结构覆盖能力。完成后，用户在 Playground 输入数组、图、树、矩阵等不同结构时，系统应能：

- 清楚告诉 AI 应输出什么结构。
- 对 AI 返回内容进行严格但可恢复的校验。
- 在失败时明确指出错误字段、错误原因和用户可采取的操作。
- 在格式错误可修复时自动请求 AI 输出修正版 JSON。
- 在无法修复时保留原始响应，方便用户或开发者排查。

### 目标 1：结构化 Schema 校验

需要从“返回 null 表示失败”升级为“带路径、级别、原因、建议的校验报告”。

校验应覆盖：

- 顶层字段：`algorithm`、`complexity`、`initialState`、`steps`。
- 渲染器类型：`array`、`graph`、`tree`、`matrix`、`linked_list`。
- 初始状态：不同 `initialState.type` 对应不同字段要求。
- 动作字段：`action.type`、`targets`、`color`、`from`、`to`、`value`。
- 步骤字段：`stepId`、`codeLine`、`description`、`stats`、`teachingState`。
- 教学状态：`variables`、`ranges`、`auxiliaryArrays`、`graph`、`tree`、`annotations`。

### 目标 2：错误提示和修复建议增强

错误不应只显示“无法解析 JSON”，而应分层展示：

- 错误类型：网络错误、认证错误、模型响应为空、JSON 语法错误、Schema 校验错误、渲染不兼容错误。
- 错误位置：例如 `initialState.nodes[0].id`、`steps[3].action.targets`。
- 错误原因：例如“图节点 id 必须是字符串”。
- 修复建议：例如“请把 targets 改为节点下标数组，图节点状态请放在 teachingState.graph.nodeStates 中”。
- 是否可自动修复：例如字段缺失可以补默认值，结构冲突需要重新请求 AI。

### 目标 3：支持更多输入数据结构

Playground 输入数据不应只局限于数组字符串。Phase 3 需要支持以下结构：

- 数组：`[5, 3, 8, 1]`
- 图：`{ "nodes": [...], "edges": [...], "directed": false }`
- 树：`{ "root": "A", "children": { "A": ["B", "C"] }, "nodes": [...] }`
- 矩阵：`[[1, 0], [0, 1]]` 或 `{ "rows": 2, "cols": 2, "data": [[...]] }`
- 链表：`{ "values": [1, 2, 3], "head": 0 }`

### 目标 4：AI 失败后自动重试或格式修复

当模型返回内容可恢复时，系统应优先本地修复；当本地无法修复但错误信息明确时，应向 AI 发起一次格式修复请求。

推荐顺序：

1. 原始 AI 分析请求。
2. 本地 JSON 提取与轻量修复。
3. Schema 校验与错误报告生成。
4. 如果错误可修复，调用 AI 修复请求。
5. 对修复结果再次解析和校验。
6. 成功则播放，失败则展示最终错误和原始响应。

---

## 三、实施原则

### 1. 保持纯前端架构

Phase 3 不引入后端服务，不要求用户改变 API 配置方式。

允许改造：

- `src/ai/client.ts`
- `src/ai/parser.ts`
- `src/ai/prompts.ts`
- 新增 `src/ai/schema.ts`
- 新增 `src/ai/errors.ts`
- 新增 `src/ai/input.ts`
- 新增 `src/ai/repair.ts`
- 调整 `src/pages/Playground/index.tsx` 的错误展示和输入说明

不建议在本阶段做：

- 改写整个 Playground 页面布局。
- 引入服务端代理。
- 改变设置页 API Key 存储策略。
- 替换现有渲染器体系。
- 强制所有预制动画迁移到新 Schema。

### 2. 校验必须兼容现有 AnimationScript

Phase 3 的 Schema 校验不能破坏已有预制脚本和历史记录。

原则：

- 现有合法数组动画必须继续通过。
- 新增字段优先作为可选字段。
- 对旧字段保持兼容读取。
- 对可安全补齐的字段进行默认值修复。
- 对无法安全推断的字段返回错误而不是静默篡改。

### 3. 错误报告要面向用户和开发者双层表达

用户需要知道如何继续操作，开发者需要知道具体字段路径。

建议错误对象同时包含：

- `message`：面向用户的短消息。
- `details`：面向开发者的详细错误列表。
- `suggestions`：可执行建议。
- `rawResponse`：原始 AI 响应。
- `canRetry`：是否可以自动修复。
- `stage`：错误发生阶段。

### 4. 先本地修复，再请求 AI 修复

不要把所有错误都交给 AI 重试。

可本地修复的情况：

- Markdown 代码块包裹 JSON。
- JSON 前后带解释文字。
- 缺失非关键字段，例如 `stats`。
- `description` 缺少英文或中文时使用另一种语言兜底。
- `stepId` 缺失时按顺序补齐。
- `action.color` 缺失时默认 `primary`。

应请求 AI 修复的情况：

- JSON 语法严重错误但可以提供原始内容。
- 顶层字段缺失较多。
- `initialState.type` 与数据结构冲突。
- 图、树、矩阵对象字段明显放错位置。
- 步骤结构不是数组。
- 动画步骤与输入数据不一致。

不可自动修复的情况：

- API Key 无效。
- Base URL 错误。
- CORS 阻止请求。
- 模型输出为空且重试后仍为空。
- 用户输入数据本身不是可解析 JSON，且无法推断意图。

---

## 四、推荐架构设计

### 1. AI 模块拆分

建议将当前 `src/ai/` 扩展为：

```text
src/ai/
├── client.ts       # API 请求编排：分析、重试、修复
├── errors.ts       # 结构化错误类型与提示文案
├── input.ts        # 输入数据解析、类型识别、Prompt 上下文生成
├── parser.ts       # JSON 提取、解析入口、兼容旧 API
├── prompts.ts      # 分析 Prompt 和修复 Prompt
├── repair.ts       # 本地修复策略、AI 修复请求消息构造
├── schema.ts       # AnimationScript Schema 校验与规范化
└── index.ts        # 对外导出
```

### 2. 新的解析返回结构

当前 `parseAIResponse(raw)` 返回 `AnimationScript | null`。建议新增结构化结果：

```ts
export interface ParseResult {
  success: boolean
  script?: AnimationScript
  error?: AIErrorReport
  rawJson?: unknown
  extractedText?: string
}
```

为了兼容旧调用，可以保留：

```ts
export function parseAIResponse(raw: string): AnimationScript | null
```

并新增：

```ts
export function parseAIResponseDetailed(raw: string): ParseResult
```

### 3. 结构化错误模型

建议新增 `src/ai/errors.ts`，定义统一错误报告：

```ts
export type AIErrorStage =
  | 'config'
  | 'request'
  | 'response'
  | 'json_extract'
  | 'json_parse'
  | 'schema_validation'
  | 'repair'
  | 'render_compatibility'

export type AIErrorSeverity = 'info' | 'warning' | 'error'

export interface AIValidationIssue {
  path: string
  code: string
  message: string
  suggestion?: string
  severity: AIErrorSeverity
  recoverable: boolean
}

export interface AIErrorReport {
  stage: AIErrorStage
  title: string
  message: string
  issues: AIValidationIssue[]
  suggestions: string[]
  canRetry: boolean
  rawResponse?: string
}
```

### 4. Schema 校验和规范化职责边界

`schema.ts` 建议分成两层：

- `validateAnimationScript(raw)`：只检查结构并生成错误列表。
- `normalizeAnimationScript(raw)`：在结构可接受时补默认值、排序步骤、过滤无效字段。

推荐对外函数：

```ts
export interface SchemaValidationResult {
  valid: boolean
  script?: AnimationScript
  issues: AIValidationIssue[]
}

export function validateAndNormalizeAnimationScript(raw: unknown): SchemaValidationResult
```

原则：

- 校验函数不发网络请求。
- 校验函数不依赖 React。
- 规范化函数必须保持输入语义，不做激进猜测。
- 对新增结构保持类型安全，避免扩大 `any` 使用。

---

## 五、任务 A：增强 AI 输出 JSON Schema 校验

### A.1 当前问题

当前 `parser.ts` 的校验逻辑存在以下不足：

- 顶层字段只做最小存在性判断。
- `complexity.time` 使用弱类型断言，字段类型错误时不生成具体错误。
- `initialState.data` 被强制转换为 `number[]`，不适合图、树、矩阵和链表。
- 对图结构的 `nodes`、`edges` 没有校验和保留。
- 对树结构的 `root`、`children`、`treeNodes` 没有校验和保留。
- 对矩阵结构没有明确二维数组规则。
- 对 `steps` 中的 `teachingState` 没有校验和保留。
- 对动作目标与渲染器类型之间的关系没有检查。

### A.2 改造目标

新增一套可诊断的 Schema 校验器，至少覆盖以下规则。

#### 顶层规则

| 字段 | 必填 | 类型 | 规则 |
|---|---:|---|---|
| `algorithm` | 是 | string | 非空字符串，建议使用蛇形命名 |
| `complexity` | 是 | object | 必须包含 `time` 和 `space` |
| `initialState` | 是 | object | 必须包含 `type` |
| `steps` | 是 | array | 至少 1 个步骤 |

#### complexity 规则

| 字段 | 必填 | 类型 | 默认值 |
|---|---:|---|---|
| `complexity.time.best` | 否 | string | `O(?)` |
| `complexity.time.average` | 否 | string | `O(?)` |
| `complexity.time.worst` | 否 | string | `O(?)` |
| `complexity.space` | 否 | string | `O(?)` |

#### initialState 通用规则

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| `type` | 是 | enum | `array | graph | tree | matrix | linked_list` |
| `data` | 视类型而定 | array | 数组、矩阵、链表可使用 |
| `labels` | 否 | string[] | 节点、数组元素或矩阵行列标签 |

### A.3 array 类型规则

数组动画输入示例：

```json
{
  "type": "array",
  "data": [5, 3, 8, 1],
  "labels": ["0", "1", "2", "3"]
}
```

校验规则：

- `data` 必须是数组。
- 默认支持 `number[]`。
- 如后续支持字符串数组，需要同步扩展 `InitialState.data` 类型。
- `labels` 如果存在，长度应与 `data` 一致。
- `steps[*].action.targets` 应是数组下标。
- 下标应在 `[0, data.length - 1]` 范围内。

### A.4 graph 类型规则

图动画输入示例：

```json
{
  "type": "graph",
  "data": [],
  "nodes": [
    { "id": "A", "label": "A" },
    { "id": "B", "label": "B" }
  ],
  "edges": [
    { "source": "A", "target": "B", "weight": 3 }
  ]
}
```

校验规则：

- `nodes` 必须是数组，且至少包含 1 个节点。
- `nodes[*].id` 必须是非空字符串。
- `nodes[*].label` 可选，必须是字符串。
- `edges` 可为空数组。
- `edges[*].source` 和 `edges[*].target` 必须引用已存在节点 id。
- `edges[*].weight` 可选，必须是数字。
- `data` 对图类型可为空数组，用于兼容旧协议。
- 图算法的节点状态建议放在 `steps[*].teachingState.graph.nodeStates`。
- 图算法的边状态建议放在 `steps[*].teachingState.graph.edgeStates` 或 `action.type = "edge"`。

### A.5 tree 类型规则

树动画输入示例：

```json
{
  "type": "tree",
  "data": [],
  "root": "A",
  "children": {
    "A": ["B", "C"],
    "B": ["D", "E"],
    "C": []
  },
  "treeNodes": [
    { "id": "A", "value": 8 },
    { "id": "B", "value": 3 },
    { "id": "C", "value": 10 }
  ]
}
```

校验规则：

- `root` 必须存在，类型为字符串或数字。
- `children` 必须是对象，key 为节点 id，value 为子节点 id 数组。
- `treeNodes` 可选；如果存在，`treeNodes[*].id` 应覆盖 `root` 和 `children` 中出现的节点。
- 不能出现明显环路。若发现子节点回指祖先，应报告错误。
- 如果 `data` 非空且没有 `children`，可兼容旧数组式完全二叉树表达。
- 树旋转、平衡因子、红黑颜色等应放在 `steps[*].teachingState.tree` 中。

### A.6 matrix 类型规则

矩阵动画输入示例：

```json
{
  "type": "matrix",
  "data": [
    [1, 0, 1],
    [0, 1, 0]
  ],
  "labels": ["row0", "row1"]
}
```

如果当前 `InitialState.data` 仍是 `number[]`，建议 Phase 3 做协议扩展：

```ts
export interface MatrixInitialState {
  type: 'matrix'
  data: number[][]
  labels?: string[]
}
```

或者先采用兼容结构：

```json
{
  "type": "matrix",
  "data": [],
  "matrix": [
    [1, 0, 1],
    [0, 1, 0]
  ]
}
```

推荐长期方案是扩展 `InitialState.data` 类型，使其可以表达 `number[] | number[][]`，并同步调整矩阵渲染器和动画引擎。

校验规则：

- 矩阵必须是二维数组。
- 每一行长度必须一致。
- 单元格建议是数字；如支持字符串，需要明确渲染策略。
- `steps[*].action.targets` 可使用线性下标，或在 Phase 3 扩展为 `{ row, col }` 形式。
- 如果继续使用线性下标，需要在文档和 Prompt 中明确 `index = row * cols + col`。

### A.7 linked_list 类型规则

链表动画输入示例：

```json
{
  "type": "linked_list",
  "data": [1, 2, 3, 4],
  "labels": ["head", "", "", "tail"]
}
```

校验规则：

- `RendererType`、`VALID_RENDERER_TYPES` 和渲染入口必须统一支持 `linked_list`。
- `data` 必须是数组。
- `steps[*].action.type` 可使用 `highlight`、`insert`、`delete`、`move`、`annotate`。
- 指针变化建议通过 `teachingState.variables` 或后续扩展的链表状态表达。

### A.8 steps 规则

每个步骤至少应满足：

| 字段 | 必填 | 类型 | 默认值 |
|---|---:|---|---|
| `stepId` | 否 | number | 按顺序补齐 |
| `codeLine` | 否 | number | `0` |
| `description.zh` | 是 | string | 不建议自动空填 |
| `description.en` | 否 | string | 可用中文兜底 |
| `action.type` | 是 | enum | 无效时报错或降级为 `highlight` |
| `action.targets` | 否 | number[] | `[]` |
| `action.color` | 否 | enum | `primary` |
| `stats` | 否 | object | `{ comparisons: 0, swaps: 0, accesses: 0 }` |
| `teachingState` | 否 | object | 保留并校验 |

额外建议：

- `stepId` 应从 1 开始递增。
- `stats.comparisons`、`stats.swaps`、`stats.accesses` 应单调不减。
- `codeLine` 不应为负数。
- 步骤数量不应过少。简单算法至少 5 步，复杂算法至少覆盖关键分支。
- `description.zh` 不应是空字符串。

### A.9 可恢复与不可恢复错误划分

| 场景 | 处理方式 |
|---|---|
| 缺少 `stepId` | 本地补齐 |
| 缺少 `stats` | 本地补默认值 |
| 缺少 `action.color` | 本地补 `primary` |
| `description.en` 缺失 | 用 `description.zh` 兜底，并标记 warning |
| `action.type` 无效 | 可降级为 `highlight`，但应标记 warning |
| `initialState.type` 缺失 | 根据输入和字段尝试推断，失败则请求 AI 修复 |
| 图边引用不存在节点 | 不应本地修复，应请求 AI 修复 |
| 矩阵行长度不一致 | 不应本地修复，应提示用户检查输入或请求 AI 修复 |
| steps 不是数组 | 请求 AI 修复 |
| JSON 语法错误 | 尝试提取；失败后请求 AI 修复 |

---

## 六、任务 B：增加更明确的错误提示和修复建议

### B.1 当前问题

当前 `AIResult.error` 是普通字符串，Playground 只显示简短失败信息。用户无法判断：

- 是 API 配置问题，还是模型返回格式问题。
- 是输入数据问题，还是 AnimationScript 字段问题。
- 是否可以点击重试。
- 是否需要修改 Prompt、输入数据或代码。
- 原始 AI 响应是什么。

### B.2 改造目标

将 `AIResult` 扩展为结构化结果：

```ts
export interface AIResult {
  success: boolean
  script?: AnimationScript
  error?: string
  errorReport?: AIErrorReport
  rawResponse?: string
  repaired?: boolean
  retryCount?: number
}
```

兼容旧 UI 的 `error` 字符串仍保留；新 UI 优先使用 `errorReport`。

### B.3 错误类型与展示文案

#### API 配置缺失

- 标题：`缺少 API 配置`
- 消息：`请先在设置页面配置 API Key、Base URL 和模型名称。`
- 建议：
  - `点击右上角设置进入 API 配置页面。`
  - `确认 Base URL 使用 OpenAI 兼容的 /chat/completions 服务。`

#### 认证失败

- 标题：`认证失败`
- 消息：`API Key 无效、已过期，或当前模型不允许访问。`
- 建议：
  - `检查 API Key 是否复制完整。`
  - `确认账号余额和模型权限。`
  - `重新保存设置后再试。`

#### CORS 或网络错误

- 标题：`网络请求被浏览器阻止`
- 消息：`浏览器可能因跨域策略无法直接访问该 API 服务。`
- 建议：
  - `确认 Base URL 是否支持浏览器跨域请求。`
  - `如服务不支持 CORS，需要使用支持跨域的代理或兼容网关。`
  - `检查网络连接和浏览器控制台。`

#### JSON 解析失败

- 标题：`AI 返回内容不是合法 JSON`
- 消息：`模型返回了说明文字、不完整 JSON 或语法错误。`
- 建议：
  - `系统将尝试自动请求模型修复格式。`
  - `如果多次失败，请降低代码复杂度或减少输入规模。`
  - `可以查看原始响应定位问题。`

#### Schema 校验失败

- 标题：`AnimationScript 结构不符合规范`
- 消息：`AI 返回了 JSON，但字段结构不能被当前动画引擎安全播放。`
- 建议：
  - `检查错误路径对应的字段。`
  - `图、树、矩阵数据需要使用 Phase 3 指定结构。`
  - `可以点击“自动修复格式”重新请求 AI 输出规范 JSON。`

#### 渲染不兼容

- 标题：`动画脚本暂不支持当前渲染结构`
- 消息：`脚本通过了基础校验，但当前渲染器无法完整表达该结构。`
- 建议：
  - `尝试改用更简单的输入结构。`
  - `检查 initialState.type 是否与算法类型一致。`
  - `如果是新结构，需要同步扩展对应渲染器。`

### B.4 Playground UI 优化建议

错误展示建议从右下角短 Toast 升级为可展开错误面板。

面板内容：

- 错误标题。
- 简短说明。
- 修复建议列表。
- 详细错误路径列表。
- “重试分析”按钮。
- “自动修复格式”按钮，仅在 `canRetry = true` 时显示。
- “复制错误详情”按钮。
- “查看原始响应”折叠区。

示例展示结构：

```text
AI 分析失败：AnimationScript 结构不符合规范

发现 2 个问题：
1. initialState.nodes[0].id：图节点 id 必须是字符串。
   建议：请将节点 id 写成 "A" 或 "1"。
2. steps[3].action.targets：targets 必须是数字数组。
   建议：图节点状态请使用 teachingState.graph.nodeStates。

可尝试：自动修复格式 / 重新分析 / 查看原始响应
```

### B.5 错误详情复制格式

建议复制为 Markdown，方便用户提交 issue：

````markdown
## AI Error Report

- Stage: schema_validation
- Title: AnimationScript 结构不符合规范
- Retry Count: 1
- Repaired: false

### Issues

1. `initialState.nodes[0].id`
   - Code: invalid_type
   - Message: 图节点 id 必须是字符串
   - Suggestion: 请将节点 id 写成字符串

### Raw Response

```json
...
```
````

---

## 七、任务 C：支持更多输入数据结构

### C.1 当前问题

当前 Playground 输入框提示为：

```text
JSON 数组格式，如 [5,3,8,1,9,2]
```

这会让用户默认只能输入数组。Phase 3 需要让输入区明确支持结构化对象，并将输入类型传递给 Prompt。

### C.2 输入解析器设计

建议新增 `src/ai/input.ts`：

```ts
export type InputDataKind = 'array' | 'graph' | 'tree' | 'matrix' | 'linked_list' | 'unknown'

export interface ParsedInputData {
  kind: InputDataKind
  raw: string
  value: unknown
  valid: boolean
  message?: string
  promptContext: string
}

export function parseInputData(inputData: string): ParsedInputData
```

职责：

- 尝试 `JSON.parse` 用户输入。
- 自动识别结构类型。
- 生成给 AI 的输入上下文说明。
- 对输入数据本身的语法错误给出用户提示。

### C.3 输入类型识别规则

#### 数组识别

满足以下条件之一：

- 顶层是 `number[]`。
- 顶层是简单数组，且不是二维矩阵。

示例：

```json
[5, 3, 8, 1, 9, 2]
```

#### 矩阵识别

满足以下条件之一：

- 顶层是二维数组。
- 顶层对象包含 `matrix` 字段。
- 顶层对象包含 `rows`、`cols`、`data`，且 `data` 是二维数组。

示例：

```json
[[1, 2], [3, 4]]
```

```json
{
  "rows": 2,
  "cols": 2,
  "data": [[1, 2], [3, 4]]
}
```

#### 图识别

满足以下条件之一：

- 顶层对象包含 `nodes` 和 `edges`。
- 顶层对象包含 `adjacencyList`。
- 顶层对象包含 `adjacencyMatrix`。

示例：

```json
{
  "directed": false,
  "nodes": [
    { "id": "A" },
    { "id": "B" },
    { "id": "C" }
  ],
  "edges": [
    { "source": "A", "target": "B", "weight": 1 },
    { "source": "B", "target": "C", "weight": 2 }
  ],
  "start": "A"
}
```

#### 树识别

满足以下条件之一：

- 顶层对象包含 `root` 和 `children`。
- 顶层对象包含 `treeNodes`。
- 顶层对象包含 `value` 和递归 `left` / `right`。

示例：

```json
{
  "root": "8",
  "children": {
    "8": ["3", "10"],
    "3": ["1", "6"],
    "10": []
  }
}
```

#### 链表识别

满足以下条件之一：

- 顶层对象包含 `values` 和 `head`。
- 顶层对象包含 `nodes`，且节点包含 `next` 字段。

示例：

```json
{
  "values": [1, 2, 3, 4],
  "head": 0
}
```

### C.4 Prompt 上下文增强

`buildUserMessage` 当前只把输入原文拼接进去。Phase 3 建议改为：

```text
输入数据类型: graph
输入数据 JSON:
...

请使用以下 initialState 结构：
- type 必须为 "graph"
- nodes 必须保留原始节点 id
- edges 必须保留 source/target/weight
- data 可使用 [] 作为兼容字段
```

不同输入类型对应不同输出要求。

#### array Prompt 要求

- `initialState.type = "array"`
- `initialState.data` 必须等于用户数组。
- `action.targets` 使用数组下标。
- 排序过程必须保持每一步的数组状态可由动作回放推导。

#### graph Prompt 要求

- `initialState.type = "graph"`
- `initialState.nodes` 和 `initialState.edges` 必须来自用户输入。
- 图节点 id 使用字符串。
- `action.targets` 如使用数字，表示节点在 `nodes` 数组中的下标。
- 节点访问、队列、栈、距离、前驱应放入 `teachingState.graph`。
- 边高亮可使用 `action.type = "edge"` 或 `teachingState.graph.edgeStates`。

#### tree Prompt 要求

- `initialState.type = "tree"`
- `initialState.root` 必须保留。
- `initialState.children` 必须表达树结构。
- 如果存在节点值，写入 `treeNodes`。
- 遍历路径、旋转、平衡因子、红黑颜色应放入 `teachingState.tree`。

#### matrix Prompt 要求

- `initialState.type = "matrix"`
- 矩阵必须保持二维结构。
- 如果当前协议暂不支持二维 `data`，使用兼容字段并在渲染器扩展时统一。
- `action.targets` 需要明确使用线性下标，或新增单元格目标结构。

### C.5 Playground 输入区优化建议

输入数据区建议增加：

- 输入类型自动识别标签，例如 `array`、`graph`、`tree`、`matrix`。
- 示例下拉菜单。
- JSON 格式错误即时提示。
- 当前输入结构的简短说明。

示例菜单：

```text
输入示例
- 数组排序：[5, 3, 8, 1]
- 图遍历：nodes + edges
- 二叉树：root + children
- 矩阵 DP：二维数组
- 链表：values + head
```

---

## 八、任务 D：支持 AI 失败后自动重试或请求格式修复

### D.1 当前问题

当前失败路径为：

```text
AI 返回 content
  → parseAIResponse(content)
  → null
  → 展示“无法解析 AI 返回的 AnimationScript JSON”
```

这会导致模型轻微格式错误也直接失败。

### D.2 重试策略设计

建议将 `analyzeCode` 改造为可配置重试：

```ts
export interface AnalyzeOptions {
  maxRepairAttempts?: number
  enableLocalRepair?: boolean
  enableAIRepair?: boolean
}
```

默认策略：

- `enableLocalRepair = true`
- `enableAIRepair = true`
- `maxRepairAttempts = 1`

不建议默认多次重试，避免 token 消耗不可控。

### D.3 本地修复策略

本地修复应只处理低风险格式问题：

1. 去除 Markdown 代码块。
2. 截取首个完整 JSON 对象。
3. 去除 JSON 前后解释文字。
4. 规范常见中文引号为英文引号，仅在不会破坏内容时使用。
5. 补齐可安全默认的字段。
6. 过滤明显多余的顶层说明字段。

不建议本地修复：

- 猜测缺失的算法步骤。
- 猜测图边对应节点。
- 猜测矩阵缺失单元格。
- 猜测树结构中的父子关系。

### D.4 AI 格式修复 Prompt

建议新增 `buildRepairPrompt`：

```text
你是 AnimationScript JSON 修复器。

请根据以下错误报告修复 JSON。
要求：
1. 只输出修复后的完整 JSON。
2. 不要输出 Markdown 代码块。
3. 不要省略任何必要字段。
4. 保持原算法步骤语义不变。
5. 如果字段缺失，按照 AnimationScript Schema 补齐。
6. 图、树、矩阵结构必须符合指定 initialState.type。

错误报告：
...

原始响应：
...
```

修复请求建议使用更低温度：

```json
{
  "temperature": 0,
  "max_tokens": 4096
}
```

### D.5 请求链路改造

推荐流程：

```text
analyzeCode(params)
  → requestAnimationScript(params)
  → parseAIResponseDetailed(content)
    → success: return script
    → fail: build error report
  → if canRepairLocally: localRepair(content)
    → parse again
  → if canRetryWithAI: requestRepair(content, report)
    → parse repaired content
  → return success or final error report
```

### D.6 重试状态回传给 UI

`AIResult` 建议包含：

- `retryCount`
- `repaired`
- `repairHistory`

示例：

```ts
export interface AIRepairAttempt {
  type: 'local' | 'ai'
  success: boolean
  issuesBefore: number
  issuesAfter?: number
}
```

UI 可展示：

```text
已自动修复格式并生成动画
- 本地修复：成功
- AI 修复：未使用
```

或：

```text
自动修复失败
- 本地修复：失败，JSON 缺少 steps 数组
- AI 修复：失败，返回内容仍不符合 Schema
```

### D.7 Token 和成本控制

自动重试会增加 token 消耗，建议加入限制：

- 默认只自动修复 1 次。
- 修复请求只发送原始响应、错误报告和精简 Schema，不重复发送完整用户代码，除非必要。
- 原始响应超过阈值时截断并提示用户。
- UI 中显示“已使用 1 次自动修复”。

---

## 九、任务 E：Prompt 协议增强

### E.1 当前 Prompt 问题

当前 `buildSystemPrompt` 主要提供基础 JSON 示例，但存在以下不足：

- `initialState.type` 未包含 `linked_list`。
- 图、树、矩阵字段缺少完整示例。
- 没有强调保留 `nodes`、`edges`、`root`、`children`、`treeNodes`。
- 没有描述 `teachingState`。
- 没有说明错误输出禁止事项，例如禁止注释、禁止尾随逗号。
- 没有针对输入类型生成差异化要求。

### E.2 Prompt 增强目标

系统 Prompt 应明确告诉模型：

- 输出必须是严格 JSON，不允许 Markdown。
- 必须符合当前 AnimationScript Schema。
- 不同渲染类型使用不同 `initialState` 字段。
- 复杂教学状态使用 `teachingState`，不要塞进 `description`。
- `stats` 是累计值。
- `codeLine` 从 0 开始。
- 不确定复杂度时使用 `O(?)`，不要省略字段。

### E.3 推荐 Prompt 分层

建议将 Prompt 拆成：

- 基础协议说明。
- 渲染器类型说明。
- 动作类型说明。
- 教学状态说明。
- 输入类型专属说明。
- 输出禁止事项。

示例结构：

```text
## 角色
你是算法执行模拟器和 AnimationScript 生成器。

## 输出硬性要求
只输出严格 JSON。不得输出 Markdown。不得添加注释。不得使用尾随逗号。

## AnimationScript 顶层结构
...

## 根据输入类型选择 initialState
...

## teachingState 用法
...

## 常见错误避免
...
```

### E.4 负面约束

Prompt 中应明确禁止：

- 输出解释文字。
- 输出 Markdown 代码块。
- 输出 JavaScript 对象字面量。
- 使用单引号。
- 使用 `undefined`、`NaN`、`Infinity`。
- 省略 `complexity`。
- 将图节点 id 混用数字和字符串。
- 将图节点 id 直接写入 `action.targets` 数组。
- 对矩阵使用不规则二维数组。

---

## 十、任务 F：AnimationScript 协议兼容扩展

### F.1 当前类型不一致点

当前 `src/types/animation.ts` 中：

```ts
export type RendererType = 'array' | 'graph' | 'tree' | 'matrix' | 'linked_list'
```

但 `parser.ts` 中：

```ts
const VALID_RENDERER_TYPES = new Set(['array', 'graph', 'tree', 'matrix'])
```

Phase 3 应统一支持 `linked_list`。

### F.2 `InitialState.data` 扩展建议

当前：

```ts
export interface InitialState {
  type: RendererType
  data: number[]
  labels?: string[]
  nodes?: { id: string; label?: string; x?: number; y?: number }[]
  edges?: { source: string; target: string; weight?: number }[]
  root?: number | string
  children?: Record<string, Array<string | number>>
  treeNodes?: TreeInitialNode[]
}
```

问题：

- `data: number[]` 对矩阵不友好。
- 图和树被迫携带空数组。
- 链表没有专属状态字段。

短期兼容方案：

- 保持 `data: number[]` 必填。
- 图、树使用 `data: []`。
- 矩阵暂用 `data` 扁平化或新增可选 `matrix` 字段。
- Schema 校验器针对不同类型放宽 `data` 非空要求。

长期推荐方案：

```ts
type InitialState =
  | ArrayInitialState
  | GraphInitialState
  | TreeInitialState
  | MatrixInitialState
  | LinkedListInitialState
```

优势：

- TypeScript 可按 `type` 自动缩窄字段。
- Prompt 和 Schema 更清晰。
- 渲染器接入新结构时更安全。

风险：

- 需要同步更新渲染器、动画引擎和预制生成器。
- 历史记录里的旧脚本需要兼容迁移。

Phase 3 建议先做“兼容型扩展”，完整联合类型重构可作为后续按需渐进落地的架构优化。

### F.3 保留 Phase 2 teachingState

Phase 3 的 AI Schema 必须支持 Phase 2 已扩展的 `teachingState`，否则 AI 生成会丢失图、树、复杂排序教学信息。

重点保留：

- `teachingState.variables`
- `teachingState.ranges`
- `teachingState.auxiliaryArrays`
- `teachingState.graph.nodeStates`
- `teachingState.graph.edgeStates`
- `teachingState.graph.queue`
- `teachingState.graph.stack`
- `teachingState.graph.distances`
- `teachingState.tree.nodeStates`
- `teachingState.tree.edgeStates`
- `teachingState.tree.traversalPath`
- `teachingState.tree.rotation`
- `teachingState.annotations`

---

## 十一、分阶段实施计划

### 阶段 1：结构化错误模型与详细解析结果

目标：不改变 UI 的前提下，先让解析器返回详细错误。

任务：

1. 新增 `src/ai/errors.ts`。
2. 新增 `parseAIResponseDetailed(raw)`。
3. 保留旧 `parseAIResponse(raw)` 兼容现有调用。
4. 将 JSON 提取失败、JSON 解析失败、Schema 校验失败拆分成不同错误阶段。
5. 给每个错误生成 `path`、`message`、`suggestion`。

验收：

- 非 JSON 响应能返回 `stage = json_extract` 或 `json_parse`。
- 缺少 `steps` 能返回 `path = steps`。
- 旧的 `parseAIResponse` 仍可被 `client.ts` 调用。

### 阶段 2：Schema 校验与规范化

目标：用新的校验器替换当前 `validateAndSanitize`。

任务：

1. 新增 `src/ai/schema.ts`。
2. 将 renderer 类型白名单统一为 `RendererType` 全量类型。
3. 校验并保留 `labels`、`nodes`、`edges`、`root`、`children`、`treeNodes`。
4. 校验并保留 `action.from`、`action.to`、`action.value`。
5. 校验并保留 `teachingState`。
6. 针对 `array | graph | tree | matrix | linked_list` 建立不同 initialState 规则。

验收：

- 数组脚本与现有历史记录继续通过。
- 图脚本不会丢失 `nodes` 和 `edges`。
- 树脚本不会丢失 `root` 和 `children`。
- 带 `teachingState` 的步骤不会被清洗掉。
- 非法图边能给出具体路径错误。

### 阶段 3：输入数据结构识别与 Prompt 增强

目标：让 AI 在生成前知道用户输入属于哪类结构。

任务：

1. 新增 `src/ai/input.ts`。
2. 在 `buildUserMessage` 中加入输入类型、结构说明和专属约束。
3. 增强 `buildSystemPrompt`，补充图、树、矩阵、链表示例。
4. Playground 输入区 helperText 从“JSON 数组格式”改为“支持数组、图、树、矩阵 JSON”。
5. 增加示例输入说明。

验收：

- 输入数组时，Prompt 要求 `initialState.type = "array"`。
- 输入 `nodes + edges` 时，Prompt 要求 `initialState.type = "graph"`。
- 输入 `root + children` 时，Prompt 要求 `initialState.type = "tree"`。
- 输入二维数组时，Prompt 要求 `initialState.type = "matrix"`。

### 阶段 4：自动修复与重试链路

目标：解析失败后自动进行一次低成本修复。

任务：

1. 新增 `src/ai/repair.ts`。
2. 在 `client.ts` 中封装 `requestChatCompletion`，复用分析请求和修复请求。
3. `analyzeCode` 支持 `maxRepairAttempts`。
4. 解析失败后先做本地修复。
5. 本地修复失败且 `canRetry = true` 时发起 AI 修复请求。
6. 返回 `repaired`、`retryCount`、`rawResponse`、`errorReport`。

验收：

- AI 返回 Markdown JSON 代码块时能自动提取成功。
- AI 返回轻微字段缺失时能本地补齐。
- AI 返回 Schema 错误时能触发一次修复请求。
- 修复失败时 UI 能展示原始响应和错误详情。

### 阶段 5：Playground 错误体验优化

目标：让用户看得懂失败原因，并知道下一步操作。

任务：

1. Playground 增加结构化错误面板。
2. 展示错误标题、消息、建议和字段路径。
3. 增加“重新分析”按钮。
4. 增加“查看原始响应”折叠区。
5. 增加“复制错误详情”按钮。
6. 成功但经过修复时显示轻量提示。

验收：

- API 配置错误能引导用户去设置页。
- Schema 错误能显示字段路径。
- 自动修复成功时用户能看到“已自动修复格式”。
- 原始响应不直接铺满页面，需要折叠显示。

---

## 十二、测试与验收用例

### 1. 数组成功用例

输入：

```json
[5, 3, 8, 1]
```

期望：

- AI 输出 `initialState.type = "array"`。
- `initialState.data` 保持 `[5, 3, 8, 1]`。
- `steps` 至少包含比较、高亮或交换动作。
- 播放器可正常播放。

### 2. 图成功用例

输入：

```json
{
  "directed": false,
  "nodes": [
    { "id": "A" },
    { "id": "B" },
    { "id": "C" }
  ],
  "edges": [
    { "source": "A", "target": "B", "weight": 1 },
    { "source": "B", "target": "C", "weight": 2 }
  ],
  "start": "A"
}
```

期望：

- AI 输出 `initialState.type = "graph"`。
- `nodes`、`edges` 被 parser 保留。
- BFS/DFS 的队列或栈状态进入 `teachingState.graph`。
- 图渲染器能显示节点和边。

### 3. 树成功用例

输入：

```json
{
  "root": "8",
  "children": {
    "8": ["3", "10"],
    "3": ["1", "6"],
    "10": []
  }
}
```

期望：

- AI 输出 `initialState.type = "tree"`。
- `root` 和 `children` 被保留。
- 遍历路径进入 `teachingState.tree.traversalPath`。
- 树节点高亮能按步骤变化。

### 4. 矩阵成功用例

输入：

```json
[[1, 2, 3], [4, 5, 6]]
```

期望：

- AI 输出 `initialState.type = "matrix"`。
- Schema 能识别二维结构。
- 如果渲染器仍使用扁平数据，规范化层应明确转换规则。
- 单元格高亮目标可被稳定映射。

### 5. JSON 语法错误用例

AI 返回：

```text
这是结果：
{"algorithm":"bubble_sort","steps":[}
```

期望：

- 返回 `stage = json_parse`。
- 显示“AI 返回内容不是合法 JSON”。
- `canRetry = true`。
- 自动修复请求被触发一次。

### 6. Schema 错误用例

AI 返回：

```json
{
  "algorithm": "bfs",
  "complexity": { "time": {}, "space": "O(V)" },
  "initialState": {
    "type": "graph",
    "nodes": [{ "label": "A" }],
    "edges": []
  },
  "steps": []
}
```

期望：

- 返回 `stage = schema_validation`。
- 问题包含：
  - `initialState.nodes[0].id` 缺失。
  - `steps` 不能为空。
- 建议包含：
  - `为每个图节点补充字符串 id`。
  - `至少生成一个动画步骤`。

### 7. 自动修复成功用例

AI 首次返回 Markdown 代码块：

````text
```json
{ "algorithm": "bubble_sort", ... }
```
````

期望：

- 本地提取成功。
- `repaired = true` 或 `repairHistory` 记录本地提取。
- 不需要发起 AI 修复请求。

### 8. 自动修复失败用例

AI 修复后仍缺少 `initialState`。

期望：

- 最终返回失败。
- `retryCount = 1`。
- UI 展示最终错误和原始响应。
- 不继续无限重试。

---

## 十三、风险与注意事项

### 1. Schema 过严可能降低成功率

如果校验规则一次性过严，可能导致原本可播放的脚本被拒绝。

应对：

- 将错误分为 `warning` 和 `error`。
- 对不影响播放的问题给 warning。
- 对会导致渲染崩溃的问题给 error。
- Phase 3 初期允许“通过但提示”。

### 2. 自动修复会增加 token 成本

修复请求会额外消耗 token。

应对：

- 默认最多 1 次 AI 修复。
- 本地能修复就不请求 AI。
- 错误报告和 Schema 说明尽量精简。
- UI 显示是否发生自动修复。

### 3. 输入结构扩展可能牵动渲染器

AI 支持输出图、树、矩阵结构后，渲染器也必须能消费对应字段。

应对：

- Phase 3 先保证 parser 不丢字段。
- 渲染器不支持的字段先安全忽略。
- 对不兼容结构生成 `render_compatibility` warning。

### 4. 历史记录兼容问题

Playground 历史记录保存在 `localStorage`，旧脚本可能缺少新字段。

应对：

- 读取历史记录时不强制重新校验。
- 播放历史记录时按旧协议兼容。
- 新生成脚本使用新校验器。

### 5. 类型重构范围控制

完整联合类型重构会影响多个文件。

应对：

- Phase 3 优先做兼容扩展。
- 不一次性重写所有渲染器。
- 先通过 Schema 层屏蔽不稳定输入。

---

## 十四、完成标准

Phase 3 可认为完成的标准：

1. `parseAIResponseDetailed` 能返回结构化解析结果。
2. Schema 校验能覆盖 `array | graph | tree | matrix | linked_list`。
3. Parser 不再丢弃图、树、矩阵所需的关键字段。
4. Parser 不再丢弃 `teachingState`。
5. AI Prompt 明确说明不同输入结构的输出规范。
6. Playground 输入说明明确支持数组、图、树、矩阵对象。
7. AI 格式错误时能至少执行一次本地修复或 AI 修复。
8. 错误 UI 能展示错误路径、原因、建议和原始响应。
9. 自动修复不会无限重试。
10. 现有数组类 AI 动画生成和播放能力不回退。

---

## 十五、建议优先级

### P0：必须完成

- 结构化错误模型。
- 详细解析结果。
- Schema 校验器。
- 保留图、树、`teachingState` 字段。
- Parser 与 `RendererType` 白名单统一。
- 基础错误面板。

### P1：强烈建议完成

- 输入数据类型识别。
- 图、树、矩阵 Prompt 增强。
- 本地修复策略。
- 一次 AI 格式修复请求。
- 原始响应查看与错误详情复制。

### P2：可后续完成

- 引入第三方 Schema 库。
- 完整联合类型重构。
- 矩阵单元格目标结构扩展。
- 链表专属 `teachingState`。
- 更细粒度 token 成本估算。

---

## 十六、推荐落地顺序

建议按以下顺序实施，降低回归风险：

1. 新增错误类型和详细解析结果，不改 UI。
2. 新增 Schema 校验器，替换旧 `validateAndSanitize`。
3. 保留旧 `parseAIResponse` 兼容调用。
4. 扩展 Prompt，使 AI 更少犯格式错误。
5. 增加输入类型识别，先用于 Prompt，不立即大改 UI。
6. 增加本地修复和一次 AI 修复。
7. 最后优化 Playground 错误面板。

每完成一个阶段，都应使用数组排序、图遍历、树遍历、矩阵输入各跑一次手动验收，确保 AI 生成链路和播放链路都没有明显回退。
