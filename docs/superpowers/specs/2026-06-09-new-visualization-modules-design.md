# 设计：四个新可视化模块（几何 / 状态机 / 概率随机化 / 图高级分析）

- 日期：2026-06-09
- 状态：已批准，转入并行实现
- 背景：现有 Scene Engine 已覆盖主流结构（数组/字符串/树/图/堆/并查集/DP/位运算/数学变量等），但对力扣若干题类缺专属视觉元素。本轮补齐覆盖面最大的四类。

## 1. 目标与范围

新增四个相互独立的 Scene 模块，各自按现有扩展模式落地（`eventTypes` → `compiler` → `primitive` → `builder` → 注册 → 预设 → 测试）：

1. **几何（geometry）**：2D 坐标平面、点、线段、多边形、扫描线。覆盖几何、扫描线、计算几何题类。
2. **状态机（automaton）**：状态（圆形结点）+ 带标签的有向转移 + 当前态高亮 + 输入消耗。覆盖 KMP 自动机、字符串自动机、DFA/NFA。
3. **概率与随机化（prob）**：分布直方图、采样高亮、水塘抽样槽位。覆盖概率统计、随机化、水塘/拒绝采样。
4. **图高级分析（graphAnalysis overlay）**：在图上叠加 disc/low 值、DFS 栈、SCC 分组着色、Euler 路径边序。覆盖强连通分量、双连通分量、欧拉回路。

非目标（YAGNI）：数据库/多线程/Shell/交互题（不属于逐步结构动画）；3D 几何；完整 LaTeX 公式渲染。

## 2. 架构与共享契约

每个模块独立成文件，互不依赖。四者只在以下**共享文件**上做**追加式**改动（集成时由协调者合并，冲突均为"各加一行/一段"）：

| 共享文件 | 每个模块的追加 |
|---|---|
| `src/scene/eventTypes.ts` | 追加一个事件族类型并加入 `AlgorithmEvent` 联合 |
| `src/scene/eventCompiler.ts` | `import` 新 compiler + 加入 `compilers` 数组（overlay 类则走 overlayCompiler 注册） |
| `src/scene/SceneCanvas.tsx` | 在渲染区追加一个新 primitive 的渲染调用 |
| `src/store/algorithmStore.ts` | 追加演示算法目录项 |
| `src/presets/generators.ts` | 追加预设 wrapper 与 id 映射 |

**解耦原则**：
- 每个模块拥有独立的实体 id 前缀（`geo_*` / `auto_*` / `prob_*`），渲染按前缀分流，互不干扰。
- 不修改其它模块的 compiler/primitive。
- 几何/状态机/概率新增独立 primitive；图高级分析作为新的 overlay（类比现有 `dpTables`/`grids`/`callStack`），不重写 graphCompiler。

### 实体 / 事件命名约定

| 模块 | 事件族前缀 | 实体 id 前缀 | 新 primitive |
|---|---|---|---|
| 几何 | `geometry.` | `geo_` | `GeometryView` |
| 状态机 | `automaton.` | `auto_` | `AutomatonView` |
| 概率随机化 | `prob.` | `prob_` | `DistributionView` |
| 图高级分析 | overlay 事件 `graph_analysis.` | （叠加在 `graph` 节点上） | `GraphAnalysisOverlay` |

## 3. 各模块设计要点

### 3.1 几何（geometry）

事件族（`src/scene/eventTypes.ts`）：

```ts
export type GeometryAlgorithmEvent =
  | { type: 'geometry.plane'; xRange: [number, number]; yRange: [number, number] }
  | { type: 'geometry.point'; id: string; x: number; y: number; label?: string; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.segment'; id: string; from: [number, number]; to: [number, number]; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.polygon'; id: string; points: Array<[number, number]>; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.sweepline'; axis: 'x' | 'y'; value: number }
  | { type: 'geometry.clear' }
```

- 坐标系：数据坐标 → 场景坐标的线性映射，由 `geometry.plane` 的 range 决定，统一映射到固定画布矩形（如 800×500，内边距 40）。Y 轴向上为正（屏幕 y 取反）。
- `GeometryView` 渲染坐标轴 + 网格 + 点/线段/多边形 + 扫描线。点/线段/多边形以 `geo_<id>` cell 承载数据坐标（meta 存原始坐标），View 负责映射到屏幕。
- 演示预设：凸包（Andrew monotone chain）逐步加点连边。

### 3.2 状态机（automaton）

事件族：

```ts
export type AutomatonAlgorithmEvent =
  | { type: 'automaton.create'; states: Array<{ id: string; label?: string; accepting?: boolean; start?: boolean }> }
  | { type: 'automaton.transition'; id: string; from: string; to: string; label: string }
  | { type: 'automaton.activate'; stateId: string }
  | { type: 'automaton.consume'; symbol: string; index: number }
  | { type: 'automaton.clear' }
```

- 状态以 `auto_<id>` cell 表示，圆形结点，起始态带入箭头标记、接受态双圈。转移为带标签有向边（复用 EdgeView，支持自环）。
- 布局：默认横向链式排列（KMP/字符串自动机多为线性），支持自环。
- 演示预设：KMP 失败函数自动机匹配过程（消耗输入串，状态转移）。

### 3.3 概率与随机化（prob）

事件族：

```ts
export type ProbAlgorithmEvent =
  | { type: 'prob.dist'; bins: Array<{ label: string; weight: number }> }
  | { type: 'prob.sample'; index: number }
  | { type: 'prob.reservoir'; capacity: number; items: Array<number | string> }
  | { type: 'prob.note'; text: string }
  | { type: 'prob.clear' }
```

- 直方图：`prob_bin_<i>` cell，高度按 weight 归一化。采样高亮选中 bin。
- 水塘抽样：`prob_res_<i>` 槽位 + 当前替换高亮。
- `DistributionView` 渲染柱状图 + 轴 + 当前采样高亮。
- 演示预设：水塘抽样 k=1 在流上逐元素以 1/i 概率替换。

### 3.4 图高级分析（graphAnalysis overlay）

作为新的算法 overlay（类比 `src/scene/overlays/` 下 callStack/dp/grid）：

```ts
// overlay 事件，经 overlayCompiler 识别
export interface GraphAnalysisModel {
  discLow: Record<string, { disc: number; low: number }> // 每个节点的 disc/low
  dfsStack: string[]                                       // 当前 DFS 栈
  components: Record<string, number>                       // nodeId → SCC 分组号(着色)
  eulerOrder?: string[]                                    // Euler 路径的边序(edgeId 列表)
}
```

- `GraphAnalysisOverlay` 在图节点旁标注 `disc/low`，侧边画 DFS 栈，按 component 给节点描边着色，Euler 边按序号标注。
- 不改 graphCompiler 的结构事件；只新增 overlay 事件与渲染。
- 演示预设：Tarjan 求 SCC。

## 4. 并行 Agent 切分与集成

四个 agent，各占一个模块，git worktree 隔离：

| Agent | 模块 | 独占文件 | 共享文件(追加) |
|---|---|---|---|
| Agent-Geo | 几何 | `compilers/geometryCompiler.ts`、`primitives/GeometryView.tsx`、`presets/convexHull.ts` | eventTypes / eventCompiler / SceneCanvas / store / generators |
| Agent-Auto | 状态机 | `compilers/automatonCompiler.ts`、`primitives/AutomatonView.tsx`、`presets/kmpAutomaton.ts` | 同上 |
| Agent-Prob | 概率随机化 | `compilers/probCompiler.ts`、`primitives/DistributionView.tsx`、`presets/reservoir.ts` | 同上 |
| Agent-GraphAdv | 图高级分析 | `overlays/graphAnalysisTypes.ts`、`overlays/graphAnalysisCompiler` 接入、`primitives/GraphAnalysisOverlay.tsx`、`presets/tarjanScc.ts` | overlays/index、eventTypes、SceneCanvas、store、generators |

集成策略（协调者）：
1. 四线并行开发，各自 worktree。
2. 逐个合入；共享文件的冲突均为追加式（联合类型加一项、compilers 数组加一项、SceneCanvas 加一段渲染、store/generators 加一条），手动合并。
3. 每条线合入前 `npm run test` 全绿；合并后跑 `npx tsc --noEmit` + `npm run test` + `npm run lint` 总门禁。

## 5. 测试策略

每个模块的计划包含：
- compiler 单测（事件 → SceneCommand → 实体/overlay 断言）。
- 预设端到端测（`deriveSceneState` 在关键步产出预期实体，首帧非空）。
- 复用 Vitest + jsdom；primitive 的纯渲染可选 @testing-library/react 快照式断言（断言关键元素存在，不做像素快照）。

## 6. 验收

- 四个模块各有可运行的演示算法，出现在算法目录中，单步可播放且首帧非空。
- 全量 `npm run test` 全绿、`tsc` 通过、`lint` 无新增 error。
- README 的能力/编译器/算法表更新（集成后由协调者统一更新）。
