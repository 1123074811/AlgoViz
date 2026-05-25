# AlgoViz Phase 1 项目基础能力完善实施计划

本文档用于指导后续 AI 编程工具对 AlgoViz 进行 Phase 1 基础能力完善，实现范围聚焦于：

1. 完善图标规范和分类图标覆盖。
2. 优化响应式布局，增强平板端体验。
3. 统一代码编辑器、输入数据区和控制栏交互。

本阶段不引入后端，不改变现有 AI 调用架构，不重构核心 AnimationScript 协议，重点是提升现有前端工程的一致性、可维护性和可用性。

---

## 一、当前项目基础情况

### 1. 技术栈

当前项目为纯前端应用，核心技术包括：

- React 18
- TypeScript
- Vite
- Tailwind CSS
- CSS Variables
- React Router v6
- Zustand
- Monaco Editor
- i18next
- lucide-react
- @heroicons/react

### 2. 关键目录

```text
src/
├── App.tsx
├── index.css
├── icons/
│   └── index.tsx
├── components/
│   ├── Canvas/
│   └── Layout/
├── pages/
│   ├── Home/
│   ├── Playground/
│   ├── Settings/
│   └── Visualizer/
├── store/
├── presets/
├── ai/
├── hooks/
└── types/
```

### 3. 当前相关实现

- 图标统一封装在 `src/icons/index.tsx`。
- 侧边栏分类图标映射为 `categoryIcons`。
- 顶部导航在 `src/components/Layout/Header.tsx`。
- 侧边栏在 `src/components/Layout/Sidebar.tsx`。
- 主布局在 `src/components/Layout/MainLayout.tsx`。
- 主可视化页面在 `src/pages/Visualizer/index.tsx`。
- AI 代码实验室页面在 `src/pages/Playground/index.tsx`。
- 全局 CSS 变量在 `src/index.css`。
- Tailwind 扩展配置在 `tailwind.config.js`。

---

## 二、Phase 1 总体目标

Phase 1 的目标是让项目具备更稳定的基础 UI 体系，为后续预制动画引擎、AI 动画引擎、多渲染器扩展和完整算法目录打好基础。

### 目标 1：图标系统规范化

需要形成统一、可扩展、类型安全的图标系统，避免各页面随意引入图标库。

### 目标 2：平板端体验优化

需要让项目在常见平板尺寸下可正常学习和演示，尤其是主可视化工作区、侧边栏、代码编辑器和控制栏。

### 目标 3：交互组件统一

需要统一 Visualizer 与 Playground 中代码编辑器、输入数据区、控制栏的视觉样式和交互行为，减少重复实现，为后续抽象公共组件做准备。

---

## 三、实施原则

### 1. 保持现有功能稳定

- 不改变现有路由。
- 不改变 AnimationScript JSON 协议。
- 不改变 AI 请求流程。
- 不改变预制动画生成器注册机制。
- 不删除现有算法数据和预制动画。

### 2. 渐进式抽象

优先抽取可复用组件，但不要一次性进行大规模重构。

建议优先抽象：

- 图标系统类型和映射。
- 播放控制栏。
- 输入数据面板。
- 编辑器外层容器样式。

### 3. 类型安全

项目约束是 TypeScript 严格类型优先，新增代码应避免使用 `any`。

如果短期无法完全消除已有 `any`，也不要扩大使用范围。

### 4. 保持教材风设计

继续使用当前设计语言：

- 主蓝：`#2563EB`
- 成功绿：`#10B981`
- 当前橙：`#F59E0B`
- 危险红：`#EF4444`
- 非活跃灰：`#94A3B8`
- 白色 / 浅灰背景
- 轻边框与圆角卡片

---

## 四、任务 A：完善图标规范和分类图标覆盖

### A.1 当前问题

当前项目已经有 `src/icons/index.tsx`，但仍存在以下可优化点：

- 图标命名集中在单个联合类型中，后续扩展时容易混乱。
- 分类图标覆盖较基础，无法充分表达算法子类。
- 图标使用规范只在 README 中描述，代码中缺少更明确的常量约束。
- 当前图标系统主要封装 Lucide，但依赖中也包含 Heroicons，后续需要明确使用边界。
- 不同页面中图标尺寸存在 `12`、`14`、`16`、`18`、`20` 等多种用法，缺少语义化尺寸规范。

### A.2 改造目标

实现一个更清晰的图标系统：

- 所有业务图标统一从 `@/icons` 导入。
- 不允许页面直接从 `lucide-react` 或 `@heroicons/react` 导入业务图标。
- 所有图标默认 `strokeWidth=1.5`。
- 默认尺寸为 `20`。
- 常用尺寸应语义化，例如 `xs=12`、`sm=14`、`md=16`、`lg=20`、`xl=24`。
- 分类图标覆盖到全部算法大类。
- 可选增加算法类型图标映射，例如排序、图、树、DP、搜索、字符串、数据结构、专题集合等。

### A.3 建议修改文件

```text
src/icons/index.tsx
src/components/Layout/Header.tsx
src/components/Layout/Sidebar.tsx
src/pages/Home/index.tsx
src/pages/Playground/index.tsx
src/pages/Visualizer/index.tsx
```

如需补充类型，也可新增：

```text
src/icons/types.ts
src/icons/registry.tsx
```

是否拆分文件由实现工具决定，但要保持对外导入路径尽量稳定：

```ts
import { Icon, categoryIcons } from '@/icons'
```

### A.4 建议实现方案

#### A.4.1 增加图标尺寸规范

建议在 `src/icons/index.tsx` 中维护尺寸常量：

```ts
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const
```

`Icon` 组件可以继续支持 `size?: number`，但新增 `presetSize?: keyof typeof ICON_SIZES` 更利于统一。

示例：

```tsx
<Icon name="play" presetSize="md" />
```

为了兼容现有代码，也可以保留：

```tsx
<Icon name="play" size={16} />
```

#### A.4.2 完善分类图标映射

当前大类映射可保留并补充语义：

```ts
export const categoryIcons = {
  sorting: 'arrow-up-down',
  graph: 'git-graph',
  'data-structure': 'database',
  dp: 'table-cells 或 hash',
  'search-backtrack': 'search',
  advanced: 'brain',
  interview: 'zap',
  contest: 'filter',
}
```

如 Lucide 中缺少合适图标，可补充 Heroicons，但必须遵守：

- 同一类别不要混用两个图标库的同类图标。
- 页面层不直接关心图标来自哪个库。
- 对外仍统一暴露 `Icon` 组件。

#### A.4.3 增加算法细分图标映射

建议新增：

```ts
export const algorithmTypeIcons: Record<string, IconName> = {
  bubble_sort: 'arrow-up-down',
  quick_sort: 'arrow-up-down',
  bfs_graph: 'git-graph',
  dfs_graph: 'git-graph',
  binary_tree: 'tree-pine',
  bst: 'tree-pine',
  hash_table: 'hash',
  knapsack_01: 'database',
  binary_search: 'search',
  kmp: 'code2',
}
```

侧边栏可优先使用具体算法图标，如果不存在再回退到分类图标：

```ts
const iconName = algorithmTypeIcons[algo.id] || categoryIcons[algo.category] || 'code2'
```

#### A.4.4 统一图标使用方式

将页面中的手写 SVG 或散落图标逐步替换为 `Icon` 组件。

需要特别检查：

- `VisualizationCanvas.tsx` 空状态中的内联 SVG。
- Header 导航图标。
- Sidebar 分类图标。
- Playground 控制栏图标。
- Visualizer 控制栏图标。

### A.5 验收标准

完成后应满足：

- 全项目业务图标统一从 `@/icons` 获取。
- `src/icons/index.tsx` 中有明确的尺寸、线宽、分类映射规则。
- 侧边栏所有分类都有图标。
- 首页所有分类卡片都有图标。
- 控制栏图标视觉尺寸一致。
- 不新增 IconGallery 页面。
- 不破坏现有页面渲染。
- `npm run build` 通过。

---

## 五、任务 B：优化响应式布局，增强平板端体验

### B.1 当前问题

当前布局在桌面端可用，但在平板尺寸可能存在以下问题：

- Header 导航项较多，窄屏下容易拥挤。
- Visualizer 三栏布局在宽度不足时可视化画布和编辑器空间不足。
- Sidebar 固定宽度为 `w-64`，平板端占比偏大。
- Playground 历史面板、代码编辑器、可视化区域横向并排，在平板端可能拥挤。
- 控制栏按钮、进度条、速度滑块在窄屏下空间不足。
- 信息浮层可能遮挡可视化区域。

### B.2 目标设备范围

优先保证以下宽度：

| 设备类型 | 参考宽度 | 目标 |
|---|---:|---|
| 小平板竖屏 | 768px | 可导航、可编辑、可播放 |
| 平板横屏 | 1024px | 主功能完整可用 |
| 小笔记本 | 1280px | 接近桌面体验 |
| 桌面端 | 1440px+ | 保持现有完整三栏体验 |

### B.3 建议修改文件

```text
src/components/Layout/Header.tsx
src/components/Layout/MainLayout.tsx
src/components/Layout/Sidebar.tsx
src/pages/Home/index.tsx
src/pages/Visualizer/index.tsx
src/pages/Playground/index.tsx
src/index.css
tailwind.config.js
```

### B.4 建议实现方案

#### B.4.1 Header 响应式优化

目标：窄屏下减少导航文字占用。

建议：

- `md` 以下隐藏部分导航文字，仅保留图标。
- 或将导航项压缩为更小 padding。
- 保留语言切换按钮。
- 保持 Logo 区域不换行。

示例策略：

```tsx
<span className="hidden md:inline">{item.label}</span>
```

#### B.4.2 Sidebar 响应式优化

目标：平板端默认更紧凑。

建议：

- `lg` 以下默认使用折叠侧边栏，宽度 `w-14`。
- 展开时可覆盖在内容上，而不是挤压主区域。
- 搜索框和分类按钮在窄屏展开态可正常滚动。
- 列表项保持最小可点击高度。

可选方案：

- 桌面：固定侧边栏。
- 平板：抽屉式侧边栏。
- 移动端：默认隐藏，仅通过菜单按钮打开。

#### B.4.3 Visualizer 主区域响应式

目标：平板端避免三栏横向挤压。

建议布局：

| 断点 | 布局 |
|---|---|
| `xl` 及以上 | 代码区 + 可视化区 + 信息区/浮层，横向布局 |
| `lg` 到 `xl` | 代码区与可视化区横向，信息面板压缩或浮层 |
| `md` 到 `lg` | 上方可视化，下方代码/输入，或使用 Tab 切换 |
| 小于 `md` | 单列布局，优先展示可视化和控制栏 |

Phase 1 不要求做完整移动端，但至少应保证 `768px` 宽度下：

- 页面不出现严重横向溢出。
- 播放控制栏可完整使用。
- 代码编辑器可编辑。
- 可视化画布可见。

#### B.4.4 Playground 响应式优化

当前 Playground 有历史记录、编辑器、可视化区三部分。

建议：

- 平板端默认隐藏历史记录面板。
- 历史记录通过按钮打开抽屉或窄侧栏。
- 编辑器和可视化区在 `lg` 以下可上下排列。
- 输入数据区高度可在小屏下缩小。
- AI 分析按钮不要被语言选择器挤压。

#### B.4.5 控制栏响应式优化

播放控制栏应支持换行或压缩。

建议抽象成公共组件后支持：

- 小屏隐藏文字，仅保留图标。
- 进度条宽度自适应。
- 速度滑块在窄屏下移到第二行或使用短宽度。
- 按钮可点击区域至少 `32px x 32px`。

#### B.4.6 信息面板响应式

当前信息可能以浮层形式展示。

建议：

- 桌面端可使用右侧信息面板或右上浮层。
- 平板端改为底部可折叠信息卡片。
- 避免遮挡画布核心区域。
- 当前步骤说明应优先可见。

### B.5 验收标准

完成后应满足：

- `768px` 宽度下页面无严重横向滚动。
- `/visualizer` 可选择算法、编辑代码、输入数据、播放动画。
- `/playground` 可输入代码、输入数据、触发 AI 分析、播放结果。
- Header 不挤压变形。
- Sidebar 在平板端可折叠或覆盖展示。
- 控制栏按钮完整可用。
- 信息面板不遮挡核心交互。
- 桌面端原有体验不明显退化。
- `npm run build` 通过。

---

## 六、任务 C：统一代码编辑器、输入数据区和控制栏交互

### C.1 当前问题

Visualizer 和 Playground 都使用 Monaco Editor、输入数据区和播放控制栏，但当前实现较分散：

- 控制栏按钮样式可能重复定义。
- 输入数据区的提示、布局、禁用状态不够统一。
- 编辑器外层容器、标题栏、语言选择等交互不完全一致。
- 后续如果要增加代码行高亮、执行标记、输入模式切换，重复维护成本较高。

### C.2 改造目标

抽象可复用的基础组件，优先覆盖：

1. 代码编辑器面板。
2. 输入数据面板。
3. 动画播放控制栏。

建议新增目录：

```text
src/components/Editor/
src/components/Controls/
```

可选结构：

```text
src/components/Editor/
├── CodeEditorPanel.tsx
└── InputDataPanel.tsx

src/components/Controls/
└── PlaybackControls.tsx
```

### C.3 CodeEditorPanel 建议

#### 职责

统一 Monaco Editor 的外层布局和默认配置。

#### 建议 Props

```ts
interface CodeEditorPanelProps {
  value: string
  language: string
  onChange: (value: string) => void
  onMount?: OnMount
  disabled?: boolean
  title?: string
  subtitle?: string
  rightSlot?: React.ReactNode
  highlightedLine?: number | null
}
```

#### 默认 Monaco 配置

建议统一：

- `fontSize: 13`
- `fontFamily: 'var(--font-code)'`
- `lineNumbers: 'on'`
- `minimap.enabled: false`
- `scrollBeyondLastLine: false`
- `wordWrap: 'on'`
- `glyphMargin: true`
- `folding: true`
- `renderLineHighlight: 'line'`

#### 验收标准

- Visualizer 和 Playground 均使用该组件或共享同一配置来源。
- 编辑器样式一致。
- 语言切换后 Monaco language 正常映射。
- 不影响现有编辑能力。

### C.4 InputDataPanel 建议

#### 职责

统一输入数据区域。

#### 建议 Props

```ts
interface InputDataPanelProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  mode?: 'text' | 'visual'
  onModeChange?: (mode: 'text' | 'visual') => void
  placeholder?: string
  helperText?: string
  error?: string | null
}
```

#### Phase 1 范围

Phase 1 可以先实现文本模式，预留可视化模式接口。

输入数据区应统一：

- 标题文案。
- JSON 格式提示。
- 禁用状态。
- 错误态样式。
- 高度策略。
- 字体使用 `font-code`。

#### 验收标准

- Visualizer 和 Playground 输入区视觉一致。
- 禁用态、提示文案、placeholder 一致。
- 未来可平滑增加“文本 / 可视化”模式切换。

### C.5 PlaybackControls 建议

#### 职责

统一动画播放控制栏。

#### 建议 Props

```ts
interface PlaybackControlsProps {
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  speed: number
  onReset: () => void
  onStepBackward: () => void
  onTogglePlay: () => void
  onStepForward: () => void
  onGoToEnd: () => void
  onSpeedChange: (speed: number) => void
  disabled?: boolean
  compact?: boolean
}
```

#### 交互要求

控制栏应包含：

- 重置
- 上一步
- 播放 / 暂停
- 下一步
- 跳到末尾
- 当前步骤 / 总步骤
- 进度条
- 速度滑块

#### 响应式策略

- 桌面端完整展示。
- 平板端压缩间距。
- 窄屏下可隐藏 `Speed` 文案，仅保留滑块和倍率。
- 所有按钮应有 `title` 或 `aria-label`。

#### 验收标准

- Visualizer 和 Playground 使用同一个 `PlaybackControls`。
- 控制栏视觉一致。
- 播放、暂停、上一步、下一步、重置、跳到末尾功能保持正常。
- 速度控制保持正常。
- 进度条正确显示。

### C.6 代码行高亮预留

Phase 1 不强制实现完整代码行同步高亮，但组件设计应预留：

```ts
highlightedLine?: number | null
```

后续可根据 `currentStepData.codeLine` 对 Monaco Editor 添加 decoration。

---

## 七、建议执行顺序

建议 AI 编程工具按以下顺序实现，降低风险：

### Step 1：图标系统小步增强

- 增加图标尺寸常量。
- 补充分类图标与算法图标映射。
- 保持 `Icon` 原有 API 兼容。
- 替换明显的内联 SVG 或散落图标。

### Step 2：抽象 PlaybackControls

- 新建 `src/components/Controls/PlaybackControls.tsx`。
- 先在 Playground 中替换控制栏。
- 再在 Visualizer 中替换控制栏。
- 确认播放行为不变。

### Step 3：抽象输入数据区

- 新建 `src/components/Editor/InputDataPanel.tsx`。
- 替换 Playground 输入区。
- 替换 Visualizer 输入区。
- 保持原有状态管理和回调不变。

### Step 4：抽象代码编辑器面板

- 新建 `src/components/Editor/CodeEditorPanel.tsx`。
- 统一 Monaco 默认配置。
- 替换 Playground 编辑器。
- 替换 Visualizer 编辑器。

### Step 5：响应式布局优化

- 调整 Header 小屏显示。
- 调整 Sidebar 平板行为。
- 调整 Visualizer 主区域布局。
- 调整 Playground 主区域布局。
- 优化控制栏在窄屏下的布局。

### Step 6：构建与手动验收

- 运行 `npm run build`。
- 手动检查以下页面：
  - `/`
  - `/visualizer`
  - `/playground`
  - `/settings`
- 使用浏览器开发者工具检查宽度：
  - 768px
  - 1024px
  - 1280px
  - 1440px

---

## 八、建议新增/修改文件清单

### 建议新增

```text
src/components/Controls/PlaybackControls.tsx
src/components/Editor/CodeEditorPanel.tsx
src/components/Editor/InputDataPanel.tsx
```

可选新增：

```text
src/icons/types.ts
src/icons/registry.tsx
```

### 建议修改

```text
src/icons/index.tsx
src/components/Layout/Header.tsx
src/components/Layout/Sidebar.tsx
src/components/Layout/MainLayout.tsx
src/pages/Home/index.tsx
src/pages/Visualizer/index.tsx
src/pages/Playground/index.tsx
src/components/Canvas/VisualizationCanvas.tsx
src/index.css
tailwind.config.js
```

---

## 九、不要做的事情

Phase 1 中不要做以下事项：

- 不要引入后端服务。
- 不要改变 AI API 配置格式。
- 不要删除现有算法目录。
- 不要重写 AnimationScript 类型协议。
- 不要移除现有预制动画。
- 不要新建 IconGallery 页面。
- 不要把 API Key 写入代码或环境变量示例中。
- 不要大规模重写 Visualizer 业务逻辑。
- 不要引入新的大型 UI 框架。

---

## 十、最终验收清单

Phase 1 完成后，请逐项检查：

### 图标系统

- [ ] 图标统一从 `@/icons` 导入。
- [ ] 图标尺寸和线宽有统一规范。
- [ ] 分类图标覆盖全部算法大类。
- [ ] 算法列表图标有合理回退策略。
- [ ] 未新增 IconGallery 页面。

### 响应式布局

- [ ] 768px 宽度下 `/visualizer` 无严重横向溢出。
- [ ] 768px 宽度下 `/playground` 可完成代码输入、数据输入和播放。
- [ ] Header 在平板端不拥挤变形。
- [ ] Sidebar 可折叠或以更紧凑方式展示。
- [ ] 控制栏在平板端可完整操作。

### 编辑器与控制栏

- [ ] Visualizer 和 Playground 使用统一播放控制栏。
- [ ] Visualizer 和 Playground 输入数据区风格一致。
- [ ] Monaco Editor 默认配置统一。
- [ ] 速度控制、进度条、步骤计数正常。
- [ ] 所有控制按钮有 `title` 或 `aria-label`。

### 构建与回归

- [ ] `npm run build` 通过。
- [ ] 首页正常显示。
- [ ] 设置页可保存 API 配置。
- [ ] AI 代码实验室仍可触发分析。
- [ ] 预制算法仍可播放。

---

## 十一、交付建议

建议每完成一个大任务提交一次变更：

1. `feat(icons): standardize icon registry and category mapping`
2. `feat(controls): extract shared playback controls`
3. `feat(editor): extract shared code editor and input data panels`
4. `feat(layout): improve tablet responsive layouts`
5. `chore: run build and fix type issues`

如果由 AI 编程工具自动实现，建议一次只执行一个 Step，完成后先构建并人工检查，再继续下一步。
