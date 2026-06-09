# AlgoViz

AI 驱动的算法可视化学习平台。项目基于 React 18、TypeScript、Vite 和 SVG 场景引擎构建，面向算法学习、课堂演示、刷题复盘和自定义代码理解。

AlgoViz 的核心思路是把算法执行过程统一表达为结构化 `AnimationScript`：内置算法由本地生成器稳定生成动画，自定义代码可交给 OpenAI 兼容模型分析，模型返回动画脚本或可执行动画生成器，前端再通过 Scene Engine 渲染为逐步可播放的可视化过程。

## 当前能力

- 算法目录覆盖排序、图算法、数据结构、动态规划、搜索回溯、进阶专题、面试高频和竞赛模板。
- 主可视化工作区支持算法搜索、分类筛选、代码编辑、输入数据配置、播放控制、步骤说明、复杂度与统计信息展示。
- AI 代码实验室支持 Python、JavaScript、C++、Java 代码输入，并把分析记录保存在本地历史中。
- AI 调用优先走同源 `/api/chat` 代理，开发环境由 Vite 插件提供，生产环境由 `server/proxy.cjs` 提供。
- AI 分析支持两条路径：直接生成 `AnimationScript`，或生成可复用的动画生成器并在 Web Worker 沙箱中执行。
- AI 生成具备分层健壮性：解析容错、多级修复、沙箱失败兜底，并区分「模型不可用 / 解析失败 / 运行超时」三类失败，任何路径都渲染可读的降级场景，永不白屏或裸报错。
- Scene Engine 支持事件驱动动画、复合结构分区布局、统一 SVG 画布、算法事件时间线和多数据结构编译器。
- 关键场景补间层让高价值变化平滑过渡（交换、指针移动、入出栈、连边等），交换以直线交叉动画表达且终态精确等于目标场景；支持可中断、播放速度联动与 `prefers-reduced-motion`。
- 设计令牌（`src/scene/tokens.ts`）作为视觉单一事实源（语义色、形状、排版、动效），统一「精修学术浅色」风格。
- i18next 提供中英双语，语言选择和 API 配置保存在浏览器 `localStorage`。
- Vitest 覆盖 AI 解析/修复/兜底、Scene Engine、补间、编译器、沙箱生成器和 store 等核心模块。

## 技术栈

| 层级 | 技术 |
|---|---|
| 构建工具 | Vite 8 |
| 前端框架 | React 18 |
| 类型系统 | TypeScript 6 |
| 路由 | React Router v6 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS、CSS Variables、Scene 设计令牌 (`tokens.ts`) |
| 动画与交互 | SVG Scene Engine、补间渲染层 (`interpolate.ts` + `useSceneTransition`)、Framer Motion |
| 代码编辑 | Monaco Editor |
| 国际化 | i18next、react-i18next |
| 图标 | lucide-react，部分 Heroicons 依赖保留 |
| 图/布局辅助 | d3 |
| 测试 | Vitest、jsdom、@testing-library/react、coverage-v8 |

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

Vite 默认运行在：

```text
http://localhost:5173
```

开发模式下，Vite 会同时挂载 `/api/chat` 代理，浏览器请求模型服务时会先走同源代理，避免大多数 CORS 问题。

### 生产构建

```bash
npm run build
```

### 预览构建产物

```bash
npm run preview
```

### 生产代理与静态服务

```bash
npm run start
```

或：

```bash
npm run proxy
```

`server/proxy.cjs` 默认监听 `3001` 端口。若 `dist/` 存在，它会同时提供静态文件和 `/api/chat` 代理；若 `dist/` 不存在，它只作为代理服务和健康检查入口使用。

## 开发脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Vite 开发服务器，包含开发期 `/api/chat` 代理 |
| `npm run build` | 先执行 TypeScript 编译，再执行 Vite 生产构建 |
| `npm run preview` | 本地预览 Vite 构建产物 |
| `npm run proxy` | 启动 Node 代理/静态服务 |
| `npm run start` | 同 `npm run proxy` |
| `npm run test` | 以 run 模式执行 Vitest |
| `npm run test:watch` | 启动 Vitest 监听模式 |
| `npm run test:ui` | 启动 Vitest UI |
| `npm run coverage` | 生成测试覆盖率，当前覆盖重点为 `src/scene/**` 和 `src/ai/**` |
| `npm run lint` | 对 `src` 执行 ESLint |
| `npm run format` | 使用 Prettier 格式化 `src` |

## 页面路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | Home | 首页与项目入口 |
| `/visualizer` | Visualizer | 主算法可视化工作区 |
| `/playground` | Playground | AI 代码实验室 |
| `/settings` | Settings | AI API 配置中心 |

路由定义位于 `src/App.tsx`。页面组件使用 `React.lazy` 懒加载，`/visualizer` 包裹在 `MainLayout` 中。

## 项目结构

```text
AlgoViz/
├── docs/                         # 阶段计划、Scene Engine 文档、Superpowers 规格与计划
├── server/
│   └── proxy.cjs                 # 生产代理和静态文件服务
├── src/
│   ├── ai/                       # AI 客户端、Prompt、解析、Schema、修复、生成器解析、失败兜底场景
│   ├── components/               # 通用组件、布局、编辑器、播放控制、旧版 Canvas 渲染器
│   ├── data/                     # 算法定义补充数据
│   ├── hooks/                    # 动画播放引擎与 AI 生成器 Hook
│   ├── i18n/                     # i18next 初始化与中英语言包
│   ├── icons/                    # 图标封装
│   ├── pages/                    # Home、Visualizer、Playground、Settings
│   ├── presets/                  # 内置算法动态生成器与算法识别
│   ├── sandbox/                  # AI 生成器 Builder、Worker 沙箱、执行器
│   ├── scene/                    # Scene Engine、补间层、设计令牌、事件编译器、布局、图元、诊断与测试
│   ├── store/                    # Zustand store 与测试
│   ├── types/                    # AnimationScript 类型定义
│   └── utils/                    # 输入解析、代码模板辅助
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 系统架构

### 整体流程

```text
用户选择内置算法 / 输入自定义代码
        ↓
配置输入数据
        ↓
内置算法：本地动态生成器生成 AnimationScript
自定义代码：AI 生成 AnimationScript 或动画生成器
        ↓
解析、校验、修复或沙箱执行
        ↓
AnimationScript steps + events
        ↓
Scene Engine 将算法事件编译为场景命令
        ↓
SceneCanvas 渲染 SVG 场景
        ↓
用户播放、暂停、单步调试、查看步骤说明和统计信息
```

### AI 请求链路

核心文件：

- `src/ai/client.ts`
- `src/ai/prompts.ts`
- `src/ai/generatorPrompt.ts`
- `src/ai/parser.ts`
- `src/ai/generatorParser.ts`
- `src/ai/schema.ts`
- `src/ai/repair.ts`
- `server/proxy.cjs`
- `vite.config.ts`

当前请求策略是代理优先：

```text
浏览器 fetch('/api/chat')
        ↓
Vite 开发代理 / Node 生产代理
        ↓
{baseUrl}/chat/completions
```

如果代理端点缺失或不可达，客户端会在有限条件下回退到浏览器直连。认证错误、模型错误、限流等服务端错误不会重复直连。

### AI 生成器模式

除一次性生成完整 JSON 外，项目还支持让 AI 生成一个可复用的 JavaScript 动画生成器。生成器响应会被解析为：

```js
// @algorithm bubble_sort
// @type array
// @sample [5,3,8,1]
// @time O(n^2)
// @space O(1)

b.arrayCreate(input)
b.desc('比较相邻元素').compare(0, 1)
```

解析后由 `src/sandbox/runGenerator.ts` 在 Web Worker 中执行，默认 5 秒超时。生成器只能通过 `AnimationBuilder` 提供的方法产生步骤，最终构建为标准 `AnimationScript`。

输入数据变化后，如果已经有内置算法识别结果或 AI 生成器，页面会本地重新生成动画，不会每次都重新请求 AI。

### AI 生成健壮性

自定义代码走 AI 生成时，管线按分层防线保证「永不白屏、永不卡死、永不裸报错」：

1. 解析容错：`src/ai/parser.ts` 兼容 markdown 包裹、首尾花括号截取、尾随逗号清洗等脏输出。
2. 多级修复：本地结构修复 → 回发 AI 修复一次 → 仍失败进入兜底。
3. 沙箱兜底：`src/sandbox/runGenerator.ts` 在 Worker 超时/崩溃时返回带 `kind` 的结构化失败。
4. 永不空白：`src/ai/fallbackScene.ts` 的 `buildFallbackScene` 在任何失败路径产出合法 `AnimationScript`——区分 `unavailable`（模型不可用）/ `parse`（解析失败）/ `runtime`（执行超时或报错）三类，至少画出输入并给出可读说明与重试入口；`src/hooks/useAIGenerator.ts` 的 `classifyFailure` 负责归类。
5. 稳定性测试台：`src/ai/__tests__/stability.corpus.test.ts` 用脏输入语料校验「要么解析成功、要么产出合法 fallback」。

## AnimationScript

核心类型位于 `src/types/animation.ts`。所有内置生成器、AI JSON 和 AI 生成器最终都会归一到该协议。

```ts
export interface AnimationScript {
  algorithm: string
  complexity: Complexity
  initialState: InitialState
  presentation?: PresentationConfig
  steps: AnimationStep[]
}
```

当前重点字段：

| 字段 | 说明 |
|---|---|
| `algorithm` | 算法标识或名称 |
| `complexity` | 时间/空间复杂度 |
| `initialState` | 初始数据结构，支持 array、graph、tree、matrix、linked_list |
| `presentation` | 场景引擎配置，如 `engine: 'scene'`、`layout: 'composite'` |
| `steps` | 动画步骤列表 |
| `steps[].action` | 旧版渲染器兼容动作 |
| `steps[].events` | Scene Engine 使用的算法语义事件 |
| `steps[].teachingState` | 变量、范围、图/树状态、注释等教学状态 |
| `steps[].stats` | 累计比较、交换、访问次数 |

示例：

```json
{
  "algorithm": "bubble_sort",
  "presentation": { "engine": "scene", "module": "array" },
  "complexity": {
    "time": { "best": "O(n)", "average": "O(n^2)", "worst": "O(n^2)" },
    "space": "O(1)"
  },
  "initialState": { "type": "array", "data": [5, 3, 8, 1] },
  "steps": [
    {
      "stepId": 1,
      "codeLine": 0,
      "description": { "zh": "初始化数组", "en": "Initialize array" },
      "action": { "type": "highlight", "targets": [], "color": "primary" },
      "events": [{ "type": "array.create", "values": [5, 3, 8, 1] }],
      "stats": { "comparisons": 0, "swaps": 0, "accesses": 0 }
    }
  ]
}
```

## Scene Engine

Scene Engine 是当前主要渲染路径。旧版 `src/components/Canvas/VisualizationCanvas.tsx` 和独立渲染器仍保留，用于兼容旧脚本。

### 数据流

```text
AnimationStep.events
        ↓
compileEvent(event, context)
        ↓
SceneCommand[]
        ↓
SceneEngine 应用命令并派生 SceneState（每步的目标快照）
        ↓
补间层 useSceneTransition / interpolateScene 在相邻步骤间插值
        ↓
SceneCanvas 渲染实体、边、标签、指针、区域和辅助结构
```

### 动画补间层

Scene 的每一步是一个完整的 `SceneState` 快照。`src/scene/useSceneTransition.ts` 与 `src/scene/interpolate.ts` 在「上一步」和「当前步」之间做插值渲染：

- 对同 id 实体插值位置与透明度，新增实体淡入、移除实体淡出。
- 识别「值互换」（如数组/堆的交换：固定位置交换数值），渲染成两元素沿**直线交叉**的动画，路径与坐标无关，因此数组单元与树/堆结点的交换共用同一机制。
- **终态不变量**：补间在 `t=1` 的结果逐实体等于原 `SceneState`，且不修改 `deriveSceneState`。
- 用「脚本+步骤」作为重启 key（而非每帧新对象引用），避免反复重启导致抖动；支持播放速度联动与 `prefers-reduced-motion`（降级为瞬移）。

### 设计令牌

`src/scene/tokens.ts` 是 Scene 视觉的单一事实源：语义色（`idle/primary/compare/active/success/danger/window`，各含 stroke/fill/text）、中性色 `NEUTRALS`、形状 `SHAPE`、排版 `TYPO`、动效 `MOTION`（缓动曲线与时长档位）。各图元统一引用令牌，缓动关键帧收敛在 `src/scene/primitives/sharedMotion.ts`。

### 事件编译器

当前 `src/scene/eventCompiler.ts` 注册的编译器包括：

| 编译器 | 事件前缀 |
|---|---|
| `arrayCompiler` | `array.*` |
| `treeCompiler` | `tree.*` |
| `graphCompiler` | `graph.*` |
| `matrixCompiler` | `matrix.*` / 部分 DP 网格事件 |
| `linkedListCompiler` | `linked_list.*` |
| `stackCompiler` | `stack.*` |
| `queueCompiler` | `queue.*` |
| `dequeCompiler` | `deque.*` |
| `stringCompiler` | `string.*` |
| `setCompiler` | `set.*` |
| `mapCompiler` | `map.*` |
| `hashTableCompiler` | `hashtable.*` |
| `heapCompiler` | `heap.*` |
| `bitsetCompiler` | `bitset.*` |
| `mathCompiler` | `math.*` |
| `geometryCompiler` | `geometry.*`（坐标平面/点/线段/多边形/扫描线） |
| `automatonCompiler` | `automaton.*`（状态机：状态/转移/接受态/当前态） |
| `probCompiler` | `prob.*`（概率分布直方图/采样/水塘槽） |
| `graphAnalysisCompiler` | `graph_analysis.*`（图叠加：disc/low、SCC 分组、DFS 栈） |

此外，`scene.note`、`scene.wait`、`scene.highlight`、`scene.link`、`scene.clear_highlight` 等通用事件在 `compileEvent` 中直接处理。

### 场景图元

主要图元位于 `src/scene/primitives/`：

- `CellView`：数组、矩阵、字符串单元格
- `NodeView`：树、图、链表节点
- `EdgeView`：结构边、曲线轨迹、虚线箭头
- `ContainerView`：栈、队列、双端队列等容器
- `PointerView`：指针和引用关系
- `LabelView`：标签、说明文本
- `RegionView`：复合场景分区
- `StringView`、`SetView`、`HashTableView`、`HeapView`、`BitsetView`、`VariablesView`：专用结构视图
- `GeometryView`、`AutomatonView`、`DistributionView`、`GraphAnalysisView`：几何坐标平面、状态机、概率直方图、图高级分析叠加层

### 复合场景布局

`src/scene/regionLayout.ts` 会把多结构脚本按实体分组，生成区域框和标题，避免数组、栈、队列、变量面板、主结构等内容相互重叠。

`AnimationBuilder` 会根据生成器使用到的事件族自动判断是否启用：

```ts
presentation.layout = 'composite'
```

## 内置算法与生成器

`src/presets/index.ts` 中的静态 preset 注册表目前为空，当前内置能力主要由动态生成器提供。

主要入口：

- `src/presets/generators.ts`
- `src/presets/recognize.ts`
- `src/presets/operationPresets.ts`
- 各算法独立文件，如 `dijkstra.ts`、`segmentTree.ts`、`hashTable.ts`、`bTree.ts`、`heap.ts`、`queue.ts`、`unionFind.ts`

堆、并查集等结构使用各自专属的 Scene 模块与编译器（`heap.*`、`union_find.*`），不再借用树渲染；堆操作的上浮/下沉交换复用补间层的结点直线交叉动画。

当前覆盖方向：

| 分类 | 示例 |
|---|---|
| 排序 | 冒泡、选择、插入、希尔、归并、快排、堆排、计数、基数、桶排 |
| 图算法 | BFS、DFS、Dijkstra、Bellman-Ford、A*、Floyd、Prim、Kruskal、拓扑排序 |
| 数据结构 | 数组、链表、双向链表、循环链表、栈、队列、双端队列、堆、并查集、哈希表、集合、映射、二叉树、BST、AVL、红黑树、Trie、B 树、B+ 树 |
| 动态规划 | 0/1 背包、完全背包、LCS、LIS、编辑距离、矩阵链乘、区间 DP |
| 搜索回溯 | 二分查找、回溯、N 皇后、数独 |
| 进阶专题 | KMP、Manacher、线段树、树状数组、单调栈、滑动窗口、位集、数学变量面板 |
| 几何 | 凸包（Andrew 单调链，坐标平面/点/线段/多边形/扫描线） |
| 自动机/字符串 | KMP 匹配自动机（状态机可视化） |
| 概率/随机化 | 水塘抽样（分布直方图 + 槽位） |
| 图高级分析 | Tarjan 强连通分量（disc/low + SCC 分组 + DFS 栈叠加） |
| 题单/模板 | LeetCode Hot 100、ACM 模板 |

算法目录状态主要定义在 `src/store/algorithmStore.ts`，补充说明数据位于 `src/data/algorithmDefs.ts`。

## AI 配置

进入 `/settings` 配置：

| 字段 | 当前默认值 |
|---|---|
| Base URL | `https://api.deepseek.com` |
| Model | `deepseek-v4-pro` |
| API Key | 用户自行填写 |

页面内置快捷服务：

- OpenAI：`https://api.openai.com/v1`
- Anthropic：`https://api.anthropic.com/v1`
- Gemini：`https://generativelanguage.googleapis.com/v1beta/openai`
- DeepSeek：`https://api.deepseek.com`

客户端会把最终请求发送到：

```text
{baseUrl}/chat/completions
```

配置保存在：

```text
localStorage key: algoviz-api-config
```

注意：

- API Key 当前以明文 JSON 保存在浏览器 `localStorage`，仅适合本地开发和个人使用。
- 开发期推荐使用 `npm run dev` 自带的同源代理。
- 生产部署推荐使用 `npm run build` 后由 `npm run start` 启动代理，或自行接入更安全的后端/边缘函数。
- 设置页中的 token 和成本估算来自本地静态表，仅用于 UI 参考，实际费用以模型服务商为准。

## 本地持久化

| key | 说明 |
|---|---|
| `algoviz-api-config` | API Key、Base URL、模型名称 |
| `algoviz-lang` | 当前界面语言 |
| `algoviz-ai-history` | AI 分析历史，最多保留 20 条 |

AI 历史记录会保存代码、语言、输入数据、状态、生成脚本或生成器源码。Visualizer 和 Playground 都会使用统一的 AI 生成器流程，但各自负责把结果写入适合当前页面的历史记录。

## 测试

测试配置位于 `vitest.config.ts`，环境为 `jsdom`，全局测试 API 已启用。

覆盖重点：

- `src/ai/__tests__/`：响应解析、Schema 校验、修复、生成器解析、请求中止、失败兜底场景（`fallbackScene`）、脏输入稳定性语料台（`stability.corpus`）
- `src/scene/__tests__/`：Scene Engine、区域布局、文本度量、复合迁移、数组种子状态、补间（`interpolate` 含值互换交叉与终态等价）、补间 Hook（`useSceneTransition` 含防抖动）、设计令牌（`tokens`）、边裁剪（`edgeTrim`）
- `src/scene/compilers/__tests__/`：bitset、hash table、heap、math、set、string 等编译器
- `src/sandbox/__tests__/`：AnimationBuilder、生成器执行、复合 builder、沙箱失败归类
- `src/presets/__tests__/`：算法识别、部分复合预设、堆操作端到端（`heapOperations`）
- `src/hooks/__tests__/`：动画引擎、AI 生成失败归类（`useAIGenerator.fallback`）
- `src/store/__tests__/`：Zustand store 行为

运行：

```bash
npm run test
```

覆盖率：

```bash
npm run coverage
```

## 样式与交互

全局样式入口为 `src/index.css`，Tailwind 配置在 `tailwind.config.js`。

当前视觉方向是简约教学工具风格：

- 主背景保持清爽，强调代码、画布和步骤信息的可读性。
- 主色用于当前焦点，绿色表示完成/成功，橙色表示当前步骤，红色表示冲突/删除，灰色表示非活跃。
- Scene Engine 使用开口 V 形箭头、曲线轨迹、虚线流动效果和几何裁剪，避免结构边与运动轨迹混淆。
- 复合场景通过区域布局呈现主结构、辅助队列/栈、变量面板等信息。
- 可视化工作区包含可拖拽分栏，便于在代码、画布和步骤信息之间调整空间。

## 扩展指南

### 新增内置算法

1. 在 `src/presets/` 新增生成器，返回标准 `AnimationScript`。
2. 在 `src/presets/index.ts` 或相关生成器入口注册导出。
3. 在 `src/store/algorithmStore.ts` 补充算法目录项。
4. 如需说明卡片，在 `src/data/algorithmDefs.ts` 补充定义、流程、复杂度和适用场景。
5. 为关键事件或边界输入补充 Vitest 用例。

### 新增 Scene 事件族

1. 在 `src/scene/eventTypes.ts` 添加事件类型。
2. 在 `src/scene/compilers/` 新增编译器，把事件转换为 `SceneCommand[]`。
3. 在 `src/scene/eventCompiler.ts` 注册编译器。
4. 如需新图元，在 `src/scene/primitives/` 添加视图组件。
5. 在 `src/sandbox/builder.ts` 为 AI 生成器暴露友好的 builder 方法。
6. 增加编译器测试和必要的 Scene Engine 回归测试。

### 调整 AI 输出

1. 修改 `src/ai/prompts.ts` 或 `src/ai/generatorPrompt.ts`。
2. 若响应格式变化，同步更新 `src/ai/parser.ts`、`src/ai/generatorParser.ts` 和 `src/ai/schema.ts`。
3. 为失败样例补充解析、修复或生成器测试。

## 当前限制

- 浏览器端仍会保存 API Key，生产级使用建议接入后端托管密钥。
- AI 生成器使用 Web Worker 和超时隔离，但仍应视为不可信模型输出，只适合本地/受控环境。
- AI 对复杂代码的执行理解依赖模型能力，生成步骤可能不完整或语义不精确。
- `RendererType` 的核心类型仍以 array、graph、tree、matrix、linked_list 为主，set、map、heap、bitset、math 等结构通过 Scene 事件和复合布局扩展。
- 旧版 Canvas 渲染器仍保留，部分历史脚本可能不会使用最新 Scene 事件能力。

## 相关文档

- [Phase 1 实施计划](docs/phase-1-implementation-plan.md)
- [Phase 2 实施计划](docs/phase-2-implementation-plan.md)
- [Phase 3 实施计划](docs/phase-3-implementation-plan.md)
- [Scene Engine 优化方案](docs/scene-engine-optimization-plan.md)
- [Scene Engine 使用说明](docs/scene-engine-usage.md)
- [复合场景架构规格](docs/superpowers/specs/2026-06-04-composite-scene-architecture.md)
- [AI 历史与导航持久化规格](docs/superpowers/specs/2026-06-04-ai-history-and-navigation-persistence.md)
- [场景动画/视觉打磨 + AI 健壮性设计](docs/superpowers/specs/2026-06-08-scene-polish-and-ai-robustness-design.md)
- [实现计划：设计令牌](docs/superpowers/plans/2026-06-08-design-tokens.md)
- [实现计划：场景补间层](docs/superpowers/plans/2026-06-08-scene-interpolation.md)
- [实现计划：AI 健壮性](docs/superpowers/plans/2026-06-08-ai-robustness.md)

## License

MIT
