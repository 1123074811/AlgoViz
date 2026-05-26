# AlgoViz —— AI 驱动的算法可视化学习平台

AlgoViz 是一个面向算法学习、课堂演示与代码理解的纯前端算法可视化平台。项目基于 **React 18 + TypeScript + Vite** 构建，核心目标是让用户不仅能观看预制算法动画，还能将自己编写的算法代码交给 AI 分析，由 AI 生成标准化的结构化动画脚本，再由前端渲染引擎逐步播放。

与传统“预先写死动画”的算法学习网站不同，AlgoViz 的核心创新是：

> **AI 实时分析用户代码，输出 AnimationScript JSON，前端根据 JSON 动态驱动可视化动画与步骤讲解。**

---

## 目录

- [项目定位](#项目定位)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [AnimationScript 规范](#animationscript-规范)
- [功能模块](#功能模块)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [AI 配置说明](#ai-配置说明)
- [预制动画库](#预制动画库)
- [算法目录](#算法目录)
- [界面与交互设计](#界面与交互设计)
- [国际化](#国际化)
- [图标系统](#图标系统)
- [状态管理与数据流](#状态管理与数据流)
- [开发脚本](#开发脚本)
- [当前实现状态](#当前实现状态)
- [阶段成果](#阶段成果)

---

## 项目定位

AlgoViz 面向以下场景：

- **算法初学者**：通过逐步动画理解排序、搜索、图论、动态规划、数据结构等算法。
- **教师与助教**：用于课堂演示算法执行过程、复杂度和关键状态变化。
- **面试刷题者**：辅助理解 LeetCode 高频算法模板和常见数据结构操作。
- **开发者与研究者**：验证自己的算法代码执行逻辑，并将代码行为转换为可视化步骤。

项目采用纯前端架构，无自建后端服务器。AI 请求由浏览器直接调用用户自行配置的 OpenAI 兼容接口。

---

## 核心特性

### 1. AI 驱动的代码可视化

用户可以在 **AI 代码实验室** 中输入 Python、JavaScript、C++ 或 Java 代码，并提供初始输入数据。系统会调用用户配置的 OpenAI 兼容模型，让 AI 逐步模拟代码执行过程，返回结构化 `AnimationScript` JSON。

前端解析该 JSON 后，会自动渲染：

- 当前执行步骤说明
- 当前操作类型
- 数据结构状态变化
- 比较 / 交换 / 访问次数统计
- 算法复杂度信息
- 动画播放进度

### 2. 预制动画快速通道

对于常见算法，项目内置预制动画脚本或生成器，无需调用 AI 即可快速播放。

优势：

- 响应速度快
- 无 token 成本
- 步骤稳定可控
- 适合教学演示

### 3. 多类型可视化渲染器

当前渲染入口位于 `src/components/Canvas/VisualizationCanvas.tsx`，根据 `initialState.type` 选择不同渲染器：

| 类型 | 渲染器 | 说明 |
|---|---|---|
| `array` | `ArrayRenderer` | 数组、排序、搜索、滑动窗口等 |
| `graph` | `GraphRenderer` | BFS、DFS、最短路、最小生成树等 |
| `tree` | `TreeRenderer` | 二叉树、BST、AVL、Trie 等 |
| `matrix` | `MatrixRenderer` | 动态规划表格、矩阵类算法 |
| `linked_list` | `LinkedListRenderer` | 单链表、双向链表等结构 |

### 4. 中英双语

项目使用 `i18next` 和 `react-i18next` 提供中英双语资源，语言配置保存在浏览器本地。

### 5. 统一教材风设计

视觉风格偏向清晰、克制、适合教学场景的教材风：

- 白色主背景
- 蓝色主色
- 绿色表示完成
- 橙色表示当前高亮
- 红色表示冲突、比较或错误
- 灰色表示非活跃状态

---

## 技术栈

| 层级 | 技术选型 |
|---|---|
| 构建工具 | Vite |
| 前端框架 | React 18 |
| 类型系统 | TypeScript |
| 路由 | React Router v6 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS + CSS Variables |
| 可视化 | D3.js + Canvas/SVG 渲染思路 + Framer Motion |
| 代码编辑器 | Monaco Editor |
| 国际化 | i18next + react-i18next |
| AI 调用 | 用户自配置 OpenAI 兼容 Chat Completions 接口 |
| 图标 | Lucide React，部分依赖保留 Heroicons |

---

## 系统架构

### 整体工作流

```text
用户选择算法 / 输入自定义代码
        ↓
输入数据配置
        ↓
判断是否存在预制动画或生成器
        ↓
是：直接生成 AnimationScript
        ↓
否：调用 AI 分析代码
        ↓
AI 返回 AnimationScript JSON
        ↓
前端解析与校验 JSON
        ↓
useAnimationEngine 派生当前可视状态
        ↓
VisualizationCanvas 选择对应渲染器
        ↓
用户看到动画、步骤说明、复杂度与统计信息
```

### AI 动画引擎分层

| 分层 | 代码位置 | 作用 |
|---|---|---|
| AI 客户端 | `src/ai/client.ts` | 读取 API 配置，调用 OpenAI 兼容接口，编排解析、错误处理与修复流程 |
| Prompt 模板 | `src/ai/prompts.ts` | 约束 AI 输出严格 AnimationScript JSON |
| JSON 解析器 | `src/ai/parser.ts` | 提取 AI 返回内容，调用 Schema 校验并返回结构化解析结果 |
| Schema 校验 | `src/ai/schema.ts` | 校验并规范化 AnimationScript，保留图、树、矩阵、链表和教学状态字段 |
| 输入解析 | `src/ai/input.ts` | 识别数组、图、树、矩阵、链表等输入数据结构并生成 Prompt 上下文 |
| 错误模型 | `src/ai/errors.ts` | 定义结构化 AI 错误报告、校验问题和修复记录 |
| 自动修复 | `src/ai/repair.ts` | 执行本地 JSON 修复，并构造 AI 二次修复请求 |
| 类型定义 | `src/types/animation.ts` | 定义 AnimationScript、Step、Action 等类型 |
| 动画引擎 Hook | `src/hooks/useAnimationEngine.ts` | 根据当前步骤派生可视状态，控制播放 |
| 渲染入口 | `src/components/Canvas/VisualizationCanvas.tsx` | 根据状态类型选择渲染器 |
| 预制脚本/生成器 | `src/presets/` | 为常见算法提供稳定动画数据 |

---

## AnimationScript 规范

`AnimationScript` 是 AlgoViz 的核心数据协议。无论动画来自预制脚本、生成器还是 AI，最终都需要转换为该结构。

### TypeScript 类型

核心类型定义位于：

```text
src/types/animation.ts
```

主要结构：

```ts
export type RendererType = 'array' | 'graph' | 'tree' | 'matrix' | 'linked_list'

export type ActionType =
  | 'highlight'
  | 'swap'
  | 'compare'
  | 'move'
  | 'insert'
  | 'delete'
  | 'mark'
  | 'annotate'
  | 'edge'

export type ActionColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
```

### JSON 示例

```json
{
  "algorithm": "quicksort",
  "complexity": {
    "time": {
      "best": "O(n log n)",
      "average": "O(n log n)",
      "worst": "O(n²)"
    },
    "space": "O(log n)"
  },
  "initialState": {
    "type": "array",
    "data": [5, 3, 8, 1, 9, 2]
  },
  "steps": [
    {
      "stepId": 1,
      "codeLine": 0,
      "description": {
        "zh": "选择基准元素 pivot = 5",
        "en": "Select pivot element = 5"
      },
      "action": {
        "type": "highlight",
        "targets": [0],
        "color": "primary"
      },
      "stats": {
        "comparisons": 0,
        "swaps": 0,
        "accesses": 1
      }
    }
  ]
}
```

### action.type 枚举

| 类型 | 含义 | 常见场景 |
|---|---|---|
| `highlight` | 高亮元素 | 当前访问、当前基准、当前节点 |
| `swap` | 交换两个位置 | 排序算法 |
| `compare` | 比较元素 | 排序、搜索、路径松弛 |
| `move` | 移动元素 | 插入排序、链表移动 |
| `insert` | 插入元素 | 数据结构操作 |
| `delete` | 删除元素 | 链表、树、哈希表 |
| `mark` | 标记状态 | 已完成、已访问、已确定 |
| `annotate` | 添加说明 | 特殊状态标注 |
| `edge` | 高亮边 | 图、树结构遍历 |

### action.color 枚举

| 颜色 | 语义 |
|---|---|
| `primary` | 默认主色，强调当前关注点 |
| `success` | 成功、完成、已访问 |
| `warning` | 当前执行、临时高亮 |
| `danger` | 冲突、错误、交换、比较失败 |
| `muted` | 非活跃、已跳过、背景状态 |

### AI 输出要求

内置 Prompt 要求 AI：

1. 逐步模拟算法执行过程。
2. 将每一步转化为标准 `AnimationScript` JSON。
3. 只输出 JSON，不输出解释文字。
4. `codeLine` 需要精确对应用户代码行号。
5. `description` 必须同时包含 `zh` 和 `en` 字段。
6. `stats` 需要记录累计的比较、交换、访问次数。

当前项目中的 Prompt 实现位于：

```text
src/ai/prompts.ts
```

---

## 功能模块

### 1. 首页 Home

代码位置：

```text
src/pages/Home/index.tsx
```

主要能力：

- 展示项目定位与核心创新。
- 提供“开始学习”和“AI 代码实验室”入口。
- 展示算法分类卡片。
- 根据分类跳转到可视化页面。

### 2. 主可视化页面 Visualizer

代码位置：

```text
src/pages/Visualizer/index.tsx
```

主要能力：

- 左侧侧边栏展示算法目录。
- 支持搜索算法。
- 支持按分类筛选。
- 支持难度标签。
- 支持 Monaco Editor 展示/编辑算法代码。
- 支持输入数据配置。
- 支持优先使用预制动画或本地生成器。
- 支持在缺少预制动画时调用 AI 分析。
- 支持播放、暂停、上一步、下一步、重置、跳到结尾。
- 支持步骤说明、复杂度、统计数据展示。

### 3. AI 代码实验室 Playground

代码位置：

```text
src/pages/Playground/index.tsx
```

主要能力：

- 支持用户自由输入算法代码。
- 支持语言切换：Python、JavaScript、C++、Java。
- 支持输入 JSON 数组作为初始数据。
- 调用 AI 生成 `AnimationScript`。
- 渲染 AI 返回的动画。
- 保存最近分析历史到 `localStorage`。
- 支持从历史记录恢复代码、输入数据和动画脚本。

### 4. 设置页 Settings

代码位置：

```text
src/pages/Settings/index.tsx
```

主要能力：

- 配置 API Key。
- 配置 Base URL。
- 配置模型名称。
- 提供 OpenAI、DeepSeek、Moonshot 等 Base URL 快捷项。
- 测试 Chat Completions 接口连通性。
- 显示连接状态与响应时间。
- 根据模型估算单次请求 token 和成本。

配置保存在浏览器本地：

```text
localStorage key: algoviz-api-config
```

> 注意：当前项目无后端，API Key 不会上传到项目服务器。但当前代码以 JSON 形式保存在 `localStorage`，如需更高安全级别，可后续接入 Web Crypto API 做本地加密。

### 5. 布局与导航

相关代码：

```text
src/components/Layout/Header.tsx
src/components/Layout/MainLayout.tsx
src/components/Layout/Sidebar.tsx
```

主要能力：

- 顶部导航栏。
- 首页 / 可视化 / AI 实验室 / 设置页路由入口。
- 中英文切换。
- 可折叠侧边栏。
- 分类导航与搜索。

---

## 项目结构

当前项目核心目录如下：

```text
AlgoViz/
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── ai/
    │   ├── client.ts
    │   ├── index.ts
    │   ├── parser.ts
    │   └── prompts.ts
    ├── components/
    │   ├── Canvas/
    │   │   ├── VisualizationCanvas.tsx
    │   │   └── renderers/
    │   │       ├── ArrayRenderer.tsx
    │   │       ├── GraphRenderer.tsx
    │   │       ├── LinkedListRenderer.tsx
    │   │       ├── MatrixRenderer.tsx
    │   │       └── TreeRenderer.tsx
    │   └── Layout/
    │       ├── Header.tsx
    │       ├── MainLayout.tsx
    │       └── Sidebar.tsx
    ├── data/
    │   └── algorithmDefs.ts
    ├── hooks/
    │   └── useAnimationEngine.ts
    ├── i18n/
    │   ├── index.ts
    │   └── locales/
    ├── icons/
    │   └── index.tsx
    ├── pages/
    │   ├── Home/
    │   ├── Playground/
    │   ├── Settings/
    │   └── Visualizer/
    ├── presets/
    │   ├── generators.ts
    │   ├── index.ts
    │   └── *.ts
    ├── store/
    │   └── algorithmStore.ts
    └── types/
        └── animation.ts
```

---

## 快速开始

### 环境要求

建议使用：

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

启动后，在浏览器中访问 Vite 输出的本地地址，通常为：

```text
http://localhost:5173
```

### 构建生产版本

```bash
npm run build
```

### 本地预览生产构建

```bash
npm run preview
```

---

## AI 配置说明

AlgoViz 支持 OpenAI 兼容的 Chat Completions API。

### 配置入口

进入：

```text
/settings
```

需要填写：

| 字段 | 说明 | 默认值 |
|---|---|---|
| API Key | 用户自己的模型服务密钥 | 空 |
| Base URL | OpenAI 兼容接口地址 | `https://api.openai.com/v1` |
| Model | 模型名称 | `gpt-4o` |

### 支持的接口格式

项目调用路径为：

```text
{baseUrl}/chat/completions
```

请求方式：

```http
POST /chat/completions
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

### CORS 注意事项

因为项目是纯前端应用，浏览器会直接请求模型服务。如果模型服务没有开放浏览器跨域访问，可能出现 CORS 或 `Failed to fetch` 错误。

可选解决方式：

- 使用支持浏览器跨域的 API 服务。
- 使用本地代理或边缘函数代理请求。
- 将项目部署到允许访问目标 API 的环境中。

---

## 预制动画库

预制动画位于：

```text
src/presets/
```

入口文件：

```text
src/presets/index.ts
src/presets/generators.ts
```

项目包含两类预制能力：

### 1. 静态 Preset

部分算法直接导出固定 `AnimationScript`，例如：

- 冒泡排序
- 选择排序
- 插入排序
- 归并排序
- 快速排序
- 二分查找
- BFS
- DFS
- Dijkstra
- Prim
- Kruskal
- 拓扑排序
- Floyd
- Bellman-Ford
- A* 搜索

### 2. 动态 Generator

`generators.ts` 会根据输入数组动态生成步骤，覆盖更多算法与数据结构，例如：

- 排序算法：冒泡、选择、插入、希尔、归并、快排、堆排、计数、基数、桶排
- 搜索：二分查找、回溯、N 皇后、数独
- 动态规划：0/1 背包、完全背包、LCS、LIS、编辑距离、矩阵链乘、区间 DP
- 高级专题：KMP、Manacher、线段树、树状数组、单调栈、滑动窗口
- 数据结构：数组、链表、双向链表、栈、队列、堆、并查集、二叉树、BST、AVL、红黑树、Trie、哈希表
- 专题集合：LeetCode Hot 100、ACM 模板

---

## 算法目录

算法目录数据主要定义在：

```text
src/store/algorithmStore.ts
src/data/algorithmDefs.ts
```

### 分类

当前目录包含以下分类：

| 分类 | 说明 |
|---|---|
| 排序算法 | 冒泡、选择、插入、希尔、归并、快排、堆排、计数、基数、桶排 |
| 图算法 | BFS、DFS、Dijkstra、Bellman-Ford、A*、Floyd、Prim、Kruskal、拓扑排序 |
| 数据结构 | 数组、链表、双向链表、栈、队列、二叉树、BST、AVL、红黑树、堆、Trie、并查集、哈希表 |
| 动态规划 | 0/1 背包、完全背包、LCS、LIS、编辑距离、矩阵链乘、区间 DP |
| 搜索与回溯 | 二分查找、回溯、N 皇后、数独求解 |
| 进阶专题 | KMP、Manacher、线段树、树状数组、单调栈、滑动窗口 |
| 面试高频 | LeetCode Hot 100 精选 |
| 竞赛专题 | ACM 常用算法模板 |

### 难度标签

| 难度 | 含义 |
|---|---|
| easy | 基础 |
| medium | 中等 |
| hard | 困难 |

侧边栏支持：

- 分类筛选
- 中英文名称搜索
- 序号搜索
- 折叠 / 展开
- 当前选中状态高亮

---

## 界面与交互设计

### 页面路由

项目路由定义在 `src/App.tsx`：

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | Home | 首页与功能介绍 |
| `/visualizer` | Visualizer | 主算法可视化工作区 |
| `/playground` | Playground | AI 代码实验室 |
| `/settings` | Settings | AI API 配置中心 |

当前项目没有单独的 `IconGallery` 页面，符合“取消图标预览页”的约束。

### 主工作区布局

主可视化页采用教学平台常见的多栏布局：

- **左侧**：算法目录与筛选。
- **中间左侧**：代码编辑器与输入数据。
- **中间主体**：可视化画布。
- **右侧浮层 / 信息区域**：当前步骤、统计数据、复杂度。
- **底部控制栏**：播放控制与速度控制。

### 播放控制

`useAnimationEngine` 提供以下控制能力：

- `reset`：重置到初始状态。
- `stepBackward`：上一步。
- `togglePlay`：播放 / 暂停。
- `stepForward`：下一步。
- `goToEnd`：跳到最后一步。
- `setSpeed`：设置播放速度。

默认播放间隔约为：

```text
1500ms / speed
```

---

## 国际化

国际化初始化位于：

```text
src/i18n/index.ts
```

语言资源位于：

```text
src/i18n/locales/zh.json
src/i18n/locales/en.json
```

当前支持：

- 中文 `zh`
- 英文 `en`

语言选择保存在：

```text
localStorage key: algoviz-lang
```

---

## 图标系统

图标封装位于：

```text
src/icons/index.tsx
```

当前主要使用 `lucide-react`：

- 默认尺寸：`20`
- 默认线宽：`1.5`
- 颜色继承父级 `currentColor`
- 通过统一 `Icon` 组件按名称调用

示例：

```tsx
<Icon name="play" size={16} />
```

分类图标映射：

| 分类 | 图标 |
|---|---|
| sorting | `arrow-up-down` |
| graph | `git-graph` |
| data-structure | `database` |
| dp | `hash` |
| search-backtrack | `search` |
| advanced | `brain` |
| interview | `zap` |
| contest | `filter` |

---

## 状态管理与数据流

项目使用 Zustand 管理全局算法状态。

核心文件：

```text
src/store/algorithmStore.ts
```

主要状态包括：

- 当前算法列表
- 当前选中算法
- 当前分类
- 搜索关键词
- 当前语言
- 当前动画脚本
- 播放步骤状态相关数据

局部页面状态则由 React `useState`、`useMemo`、`useCallback` 管理，例如 Playground 中的：

- 当前代码
- 当前语言
- 输入数据
- AI 分析状态
- 分析历史
- 当前动画脚本

---

## 样式规范

全局样式入口：

```text
src/index.css
```

Tailwind 扩展配置：

```text
tailwind.config.js
```

核心 CSS Variables：

```css
:root {
  --color-primary: #2563EB;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-muted: #94A3B8;
  --color-bg: #FFFFFF;
  --color-surface: #F8FAFC;
  --color-border: #E2E8F0;
  --font-code: 'JetBrains Mono', monospace;
  --font-body: 'Inter', 'Noto Sans SC', sans-serif;
}
```

颜色语义：

| 变量 | 用途 |
|---|---|
| `--color-primary` | 主按钮、选中状态、重点元素 |
| `--color-success` | 完成、正确、已访问 |
| `--color-warning` | 当前步骤、当前元素 |
| `--color-danger` | 冲突、错误、交换、失败 |
| `--color-muted` | 非活跃状态、辅助信息 |
| `--color-surface` | 面板、侧栏、浅色背景 |
| `--color-border` | 边框与分割线 |

---

## 开发脚本

`package.json` 中定义了以下脚本：

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 先运行 TypeScript 编译，再执行 Vite 生产构建 |
| `npm run preview` | 本地预览生产构建结果 |

---

## 当前实现状态

根据当前代码结构，项目已实现：

- React 18 + TypeScript + Vite 项目脚手架。
- Tailwind CSS 与 CSS Variables 教材风样式体系。
- 首页、可视化页、AI 代码实验室、设置页。
- React Router v6 路由。
- Zustand 算法状态管理。
- Monaco Editor 代码编辑器集成。
- i18next 中英双语。
- Lucide 图标封装。
- OpenAI 兼容接口调用。
- AI System Prompt 模板与多输入结构 Prompt 上下文。
- AI 返回 JSON 提取、Schema 校验、规范化和自动修复。
- 结构化 AI 错误报告、修复建议、原始响应查看和修复历史展示。
- AnimationScript 类型系统。
- 数组、图、树、矩阵、链表渲染器入口。
- 播放控制 Hook。
- 多个预制算法脚本。
- 大量算法动态生成器。
- Playground 分析历史本地保存。
- API 连接测试与 token 成本预估。

---

## 当前限制

- 项目是纯前端应用，AI 调用受浏览器 CORS 策略影响。
- 当前 API Key 保存在浏览器 `localStorage`，没有后端转发；生产级安全可进一步接入本地加密或代理层。
- AI 输出质量仍依赖模型能力，复杂代码可能出现步骤不完整或语义不精确。
- 系统已提供本地修复和 AI 二次修复，但不保证所有非标准输出都能恢复。
- 当前动画状态主要通过逐步回放 `AnimationScript.steps` 派生，复杂图形结构和高级操作可继续扩展。

---

## 阶段成果

### Phase 1：项目基础能力完善（已完成）

- 完善图标规范和分类图标覆盖。
- 优化响应式布局，增强平板端体验。
- 统一代码编辑器、输入数据区和控制栏交互。

### Phase 2：预制动画引擎增强（已完成）

- 优化排序算法动画细节。
- 增强图算法和树结构的状态表达。
- 为更多算法补充稳定、教学友好的步骤说明。

### Phase 3：AI 动画引擎增强（已完成）

- 详细实施计划：[docs/phase-3-implementation-plan.md](docs/phase-3-implementation-plan.md)
- 增强 AI 输出 JSON Schema 校验。
- 增加更明确的错误提示和修复建议。
- 支持更多输入数据结构，例如图、树、矩阵对象。
- 支持 AI 失败后自动重试或请求格式修复。

---

## 贡献建议

如果你希望继续扩展 AlgoViz，可以优先从以下方向入手：

1. **新增算法生成器**：在 `src/presets/` 中新增生成函数，并注册到 `generators.ts`。
2. **扩展渲染器**：根据新的 `initialState.type` 添加新的可视化组件。
3. **完善算法元数据**：在 `src/data/algorithmDefs.ts` 中补充定义、流程、复杂度和适用场景。
4. **增强 AI Prompt**：在 `src/ai/prompts.ts` 中优化输出约束。
5. **强化解析器**：在 `src/ai/parser.ts` 中增加更严格的 Schema 校验与错误恢复。
6. **改进 UI 体验**：优化 `Visualizer` 和 `Playground` 的响应式布局与信息密度。

---

## License

本项目在 `package.json` 中声明为 MIT License。
