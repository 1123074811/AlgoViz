# 算法动画基础元素优化方案

本文档用于规划 AlgoViz 动画表达层的下一轮扩展。目标不是推翻现有 Scene Engine，而是在当前 `CellView`、`NodeView`、`EdgeView`、`PointerView`、`RegionView`、`VariablesView` 等基础图元之上，补充更接近算法语义的专用视图和事件族，使平台能够更自然地表达图论、动态规划、递归回溯、自动机、几何、调度等更广泛算法。

## 1. 背景与目标

当前 AlgoViz 已经具备较完整的算法可视化基础能力：

- 数组、字符串、矩阵、链表、树、图等主结构可以通过 Scene Engine 表达。
- 栈、队列、双端队列、堆、集合、映射、哈希表、位集、变量面板等辅助结构已经具备专用编译器或图元。
- 复合场景布局能够把主结构、辅助结构和变量状态分区展示，适合 BFS、DFS、Dijkstra、DP、数据结构操作等常见算法。
- `AnimationScript` 与事件编译器已经形成统一协议，内置算法生成器和 AI 生成器都可以输出结构化动画步骤。

但如果目标是覆盖“几乎所有常见算法”，现有基础图元还缺少一些高层语义表达。例如递归算法可以用普通栈模拟，但无法自然展示函数调用帧；A* 可以用普通图展示，但二维地图、障碍、路径代价和访问热度不够直观；最大流可以用图边展示，但容量、流量、残量边、增广路径需要更强的边语义。

本轮优化的核心目标：

1. 补充算法可视化中的高频语义组件。
2. 保持 Scene Engine 的底层通用性，不让每个算法都新增一套孤立渲染器。
3. 让内置生成器和 AI 生成器都能通过清晰事件族调用新能力。
4. 降低复杂算法的动画脚本编写成本。
5. 提高教学表达力：不仅展示“数据变了”，也展示“为什么这样变”。

## 2. 现状评估

### 2.1 已覆盖较好的算法类型

| 类型 | 当前表达能力 | 代表算法 |
|---|---|---|
| 线性结构 | 强 | 排序、二分、滑动窗口、单调栈、前缀类操作 |
| 树结构 | 强 | BST、AVL、红黑树、B 树、B+ 树、堆、Trie |
| 基础图论 | 强 | BFS、DFS、Dijkstra、Prim、Kruskal、拓扑排序 |
| 表格 DP | 中高 | 背包、LCS、编辑距离、区间 DP、矩阵链乘 |
| 容器结构 | 强 | 栈、队列、双端队列、集合、映射、哈希表 |
| 数学变量 | 中 | GCD、ACM 模板、计数和状态跟踪 |
| 位运算结构 | 中 | 位集、标记集合、状态压缩基础展示 |

### 2.2 当前表达方式的优势

- **统一协议好**：事件编译到 SceneCommand，降低了渲染和生成器之间的耦合。
- **组合能力强**：一个步骤可以同时操作数组、图、队列、变量面板和说明文本。
- **教学状态清晰**：`teachingState` 与 `stats` 能补充变量、范围、计数等解释信息。
- **适合渐进迁移**：新增事件族和图元可以独立落地，不需要一次性改造全部算法。

### 2.3 当前主要缺口

| 缺口 | 影响 |
|---|---|
| 缺少调用栈语义 | 递归、回溯、分治、DFS、树形 DP 的执行过程不够直观 |
| 缺少网格/地图语义 | 迷宫、岛屿、棋盘、寻路、二维 DP 的空间感不足 |
| 图边语义偏基础 | 最大流、匹配、SCC、桥、割点、残量网络表达成本高 |
| DP 依赖表达不足 | 状态转移、滚动数组、回溯路径、依赖箭头需要更专门的视图 |
| 缺少自动机视图 | AC 自动机、DFA/NFA、正则匹配、词法分析不够自然 |
| 缺少几何图元 | 凸包、扫描线、线段相交、最近点对等计算几何难以表达 |
| 缺少时间轴/调度视图 | 调度、缓存、事件模拟、并发流程缺少合适载体 |
| 公式表达较弱 | 数论、概率、贪心证明、复杂度推导的解释空间有限 |

## 3. 设计原则

### 3.1 底层通用，顶层语义化

新增能力应优先以“语义视图 + 事件族”的方式实现。例如 `GridView` 底层仍可复用 cell、label、edge、region，但对生成器暴露 `grid.visitCell`、`grid.markPath` 等语义接口。

### 3.2 事件可组合

复杂算法往往同时涉及多种结构。例如 Dinic 需要图、队列、层级变量、增广路径；A* 需要网格、优先队列、路径、变量面板。新增事件不应假设自己独占画布，应天然支持复合布局。

### 3.3 渐进增强

旧生成器不需要立即迁移。新增专用事件族后，旧算法仍可使用基础图元运行；新算法和重点算法再逐步迁移到更强表达。

### 3.4 教学优先

动画不只追求“还原执行”，更要降低理解成本。新增视图要优先支持：

- 当前焦点
- 候选状态
- 已确认状态
- 被剪枝或废弃状态
- 依赖来源
- 关键变量
- 不变量和公式

### 3.5 AI 生成器友好

每个新事件族都应同步设计 `AnimationBuilder` 的高级方法，使 AI 不需要拼复杂底层事件。例如 AI 应调用 `b.callPush('dfs', { u, parent })`，而不是手写一组节点、文本、区域和变量事件。

## 4. 建议新增的核心语义组件

### 4.1 CallStackView：调用栈与递归帧

#### 适用场景

- DFS、递归树遍历
- 回溯、N 皇后、数独
- 分治算法：归并排序、快速排序、二分递归版
- 树形 DP、记忆化搜索
- 递归转迭代教学对照

#### 展示内容

每个调用帧建议包含：

- 函数名
- 参数列表
- 局部变量
- 当前代码阶段
- 返回值
- 调用深度
- 状态标签：active、paused、returned、pruned、failed

#### 建议事件

```ts
type CallStackEvent =
  | { type: 'callstack.create'; title?: string }
  | { type: 'callstack.push'; frameId: string; functionName: string; args?: Record<string, unknown>; locals?: Record<string, unknown> }
  | { type: 'callstack.update'; frameId: string; args?: Record<string, unknown>; locals?: Record<string, unknown>; status?: string }
  | { type: 'callstack.return'; frameId: string; value?: unknown }
  | { type: 'callstack.pop'; frameId: string }
  | { type: 'callstack.highlight'; frameId: string; color?: string }
```

#### Builder API 草案

```ts
b.callStackCreate('DFS 调用栈')
b.callPush('dfs', { u: 0, parent: -1 })
b.callLocal('visited', [0, 1, 0])
b.callReturn(true)
b.callPop()
```

#### 优先级

高。该组件对递归、回溯、DFS、分治和 DP 都有收益。

### 4.2 GridView：网格、地图与棋盘

#### 适用场景

- A*、迷宫 BFS、Dijkstra 网格版
- 岛屿数量、腐烂橘子、最短桥
- N 皇后、数独、骑士巡游
- 二维 DP、路径计数、最小路径和
- 图像处理、洪泛填充

#### 展示内容

- 二维坐标
- 单元格值
- 障碍、起点、终点
- 当前访问点
- open/closed 集合
- 路径、回溯路径
- 权重、代价、启发函数值
- 访问热度

#### 建议事件

```ts
type GridEvent =
  | { type: 'grid.create'; rows: number; cols: number; values?: unknown[][]; cellSize?: number }
  | { type: 'grid.set_cell'; row: number; col: number; value?: unknown; state?: string; color?: string }
  | { type: 'grid.visit'; row: number; col: number; order?: number }
  | { type: 'grid.frontier'; cells: Array<[number, number]> }
  | { type: 'grid.path'; cells: Array<[number, number]>; color?: string }
  | { type: 'grid.wall'; row: number; col: number; enabled: boolean }
  | { type: 'grid.weight'; row: number; col: number; weight: number }
  | { type: 'grid.arrow'; from: [number, number]; to: [number, number]; label?: string }
```

#### Builder API 草案

```ts
b.gridCreate(matrix)
b.gridWall(1, 3)
b.gridVisit(2, 4)
b.gridFrontier([[2, 5], [3, 4]])
b.gridPath([[0, 0], [0, 1], [1, 1]])
```

#### 优先级

高。网格能显著提升寻路、棋盘和二维 DP 的教学效果。

### 4.3 DPTableView：动态规划状态表

#### 适用场景

- 背包、完全背包、多重背包
- LCS、编辑距离
- LIS 的 DP 版和二分版对照
- 区间 DP、矩阵链乘
- 树形 DP、DAG DP
- 状态压缩 DP

#### 展示内容

- 状态表
- 行列含义
- 当前状态 `dp[i][j]`
- 依赖状态
- 转移公式
- 候选值比较
- 滚动数组覆盖关系
- 最优路径回溯
- 状态热力图

#### 建议事件

```ts
type DPEvent =
  | { type: 'dp.create'; tableId: string; rows: string[]; cols: string[]; values?: unknown[][] }
  | { type: 'dp.set'; tableId: string; row: number; col: number; value: unknown; reason?: string }
  | { type: 'dp.highlight'; tableId: string; cells: Array<[number, number]>; role?: 'current' | 'dependency' | 'candidate' | 'answer' }
  | { type: 'dp.dependency'; tableId: string; from: Array<[number, number]>; to: [number, number]; labels?: string[] }
  | { type: 'dp.formula'; tableId: string; formula: string; values?: Record<string, unknown> }
  | { type: 'dp.traceback'; tableId: string; path: Array<[number, number]> }
  | { type: 'dp.roll'; tableId: string; fromRow: number; toRow: number }
```

#### Builder API 草案

```ts
b.dpCreate('dp', rows, cols)
b.dpCurrent('dp', i, j)
b.dpDeps('dp', [[i - 1, j], [i, j - 1]], [i, j])
b.dpFormula('dp[i][j] = max(dp[i-1][j], dp[i][j-1])')
b.dpSet('dp', i, j, value)
```

#### 优先级

高。DP 是 AlgoViz 现有算法库的重要板块，专用 DP 视图能明显提升可读性。

### 4.4 FlowGraphView：高级图边语义

#### 适用场景

- 最大流：Edmonds-Karp、Dinic、ISAP
- 最小费用最大流
- 二分图匹配
- SCC、桥、割点、双连通分量
- 差分约束、负环检测
- 图着色、欧拉路径

#### 展示内容

- 边容量和当前流量
- 残量边和反向边
- 增广路径
- 分层图
- 匹配边
- DFS 时间戳、lowlink
- 栈内状态
- 连通分量编号
- 桥、割点标记

#### 建议事件

```ts
type AdvancedGraphEvent =
  | { type: 'graph.edge_metric'; edgeId: string; label?: string; capacity?: number; flow?: number; cost?: number; residual?: number }
  | { type: 'graph.residual_edge'; edgeId: string; from: string; to: string; capacity: number; reverseOf?: string }
  | { type: 'graph.augment_path'; edgeIds: string[]; amount?: number }
  | { type: 'graph.level'; nodeId: string; level: number }
  | { type: 'graph.match'; edgeId: string; matched: boolean }
  | { type: 'graph.discovery'; nodeId: string; dfn: number; low?: number }
  | { type: 'graph.lowlink'; nodeId: string; low: number; source?: string }
  | { type: 'graph.component'; nodeIds: string[]; componentId: string; color?: string }
  | { type: 'graph.cut_vertex'; nodeId: string; enabled: boolean }
  | { type: 'graph.bridge'; edgeId: string; enabled: boolean }
```

#### Builder API 草案

```ts
b.graphCapacity('s-a', 10, 3)
b.graphResidual('a-s', 'a', 's', 3)
b.graphAugment(['s-a', 'a-t'], 2)
b.graphLevel('a', 1)
b.graphLowlink('u', 2)
b.graphComponent(['1', '2', '3'], 'SCC-1')
```

#### 优先级

高。高级图论是当前算法库下一阶段最值得补的方向，图边语义是它的基础。

### 4.5 AutomatonView：状态机与自动机

#### 适用场景

- AC 自动机
- KMP 前缀自动机
- DFA/NFA
- 正则匹配
- 词法分析
- 字符串状态转移 DP

#### 展示内容

- 状态节点
- 字符转移边
- failure 指针
- 当前状态
- 接受状态
- 匹配输出
- 输入扫描位置

#### 建议事件

```ts
type AutomatonEvent =
  | { type: 'automaton.create'; states: string[]; start: string; accepts?: string[] }
  | { type: 'automaton.transition'; from: string; to: string; char: string }
  | { type: 'automaton.failure'; from: string; to: string }
  | { type: 'automaton.current'; state: string; inputIndex?: number }
  | { type: 'automaton.accept'; state: string; matched?: string }
  | { type: 'automaton.output'; state: string; values: string[] }
```

#### Builder API 草案

```ts
b.automatonCreate(states, 'root')
b.automatonTransition('root', 's1', 'a')
b.automatonFailure('s3', 's1')
b.automatonCurrent('s3', i)
b.automatonAccept('s5', 'he')
```

#### 优先级

中高。字符串专题补充 AC 自动机、Z Algorithm、Rabin-Karp 后会很需要该能力。

### 4.6 FormulaView：公式、递推与不变量

#### 适用场景

- 数论：快速幂、扩展欧几里得、模逆元、中国剩余定理
- DP 递推式
- 贪心证明
- 复杂度推导
- 概率与期望
- 哈希计算

#### 展示内容

- 当前公式
- 变量代入
- 计算过程
- 取模结果
- 不变量
- 结论高亮

#### 建议事件

```ts
type FormulaEvent =
  | { type: 'formula.create'; formulaId: string; title?: string }
  | { type: 'formula.set'; formulaId: string; expression: string }
  | { type: 'formula.substitute'; formulaId: string; values: Record<string, unknown> }
  | { type: 'formula.step'; formulaId: string; expression: string; note?: string }
  | { type: 'formula.highlight'; formulaId: string; tokens: string[]; color?: string }
```

#### Builder API 草案

```ts
b.formula('gcd(a, b) = gcd(b, a mod b)')
b.formulaValues({ a: 48, b: 18, r: 12 })
b.formulaStep('gcd(48, 18) = gcd(18, 12)')
```

#### 优先级

中。它不是单独算法结构，但能明显提高数学类算法的解释质量。

### 4.7 GeometryView：计算几何图元

#### 适用场景

- 凸包：Graham Scan、Andrew Monotonic Chain
- 扫描线
- 线段相交
- 最近点对
- 点在多边形内
- Voronoi / Delaunay 入门展示

#### 展示内容

- 点、线段、射线
- 多边形、凸包
- 扫描线
- 当前事件点
- 活动集合
- 交点
- 距离、角度、叉积符号

#### 建议事件

```ts
type GeometryEvent =
  | { type: 'geometry.points'; points: Array<{ id: string; x: number; y: number; label?: string }> }
  | { type: 'geometry.segment'; id: string; from: string; to: string; state?: string }
  | { type: 'geometry.polygon'; id: string; points: string[]; closed?: boolean }
  | { type: 'geometry.scanline'; x?: number; y?: number; orientation: 'vertical' | 'horizontal' }
  | { type: 'geometry.highlight'; ids: string[]; color?: string }
  | { type: 'geometry.measure'; from: string; to: string; label: string }
  | { type: 'geometry.cross'; a: string; b: string; c: string; value: number }
```

#### 优先级

中低。计算几何很有价值，但依赖新增算法较多，可排在核心教学能力之后。

### 4.8 TimelineView：时间轴与调度图

#### 适用场景

- 操作系统调度：FCFS、SJF、RR、优先级调度
- 缓存算法：LRU、LFU
- 事件模拟
- 并发流程、锁竞争
- 拓扑层级执行
- 网络包传输、滑动窗口协议

#### 展示内容

- 时间刻度
- 任务区间
- 当前时间
- 等待队列
- 执行状态
- 阻塞状态
- 命中/未命中

#### 建议事件

```ts
type TimelineEvent =
  | { type: 'timeline.create'; start?: number; end?: number; lanes?: string[] }
  | { type: 'timeline.block'; lane: string; start: number; end: number; label?: string; state?: string }
  | { type: 'timeline.cursor'; time: number }
  | { type: 'timeline.mark'; time: number; label: string }
  | { type: 'timeline.highlight'; lane?: string; start?: number; end?: number; color?: string }
```

#### 优先级

中低。适合拓展专题，但不是当前算法库主路径的刚需。

## 5. 事件体系扩展建议

### 5.1 命名规范

新增事件建议继续使用 `module.action` 格式：

- `callstack.*`
- `grid.*`
- `dp.*`
- `automaton.*`
- `formula.*`
- `geometry.*`
- `timeline.*`

高级图语义可继续放在 `graph.*` 下，避免图算法同时出现 `graph.*` 和 `flow.*` 两套节点边模型。若后续发现最大流模型复杂度过高，再考虑引入 `flow.*` 作为 `graph.*` 的专门扩展。

### 5.2 状态字段规范

建议统一状态枚举，减少颜色和语义散落：

```ts
type VisualState =
  | 'default'
  | 'active'
  | 'visited'
  | 'candidate'
  | 'confirmed'
  | 'rejected'
  | 'pruned'
  | 'matched'
  | 'path'
  | 'warning'
  | 'error'
```

颜色由视图层根据状态映射，事件中只在特殊场景允许传 `color` 覆盖。

### 5.3 实体 ID 规范

跨视图引用时应保持稳定 ID：

- 数组单元：`array:${arrayId}:${index}`
- 矩阵单元：`matrix:${matrixId}:${row}:${col}`
- 网格单元：`grid:${gridId}:${row}:${col}`
- 图节点：`graph:${graphId}:node:${nodeId}`
- 图边：`graph:${graphId}:edge:${edgeId}`
- 调用帧：`call:${frameId}`

稳定 ID 可以降低路径动画、依赖箭头和复合布局的实现难度。

## 6. Scene Engine 层改造建议

### 6.1 新增专用图元

建议按优先级新增：

1. `CallStackView.tsx`
2. `GridView.tsx`
3. `DPTableView.tsx`
4. `AutomatonView.tsx`
5. `FormulaView.tsx`
6. `GeometryView.tsx`
7. `TimelineView.tsx`

其中 `GridView` 和 `DPTableView` 可以先复用 `CellView` 的视觉规则，减少初期样式工作量。

### 6.2 新增编译器

建议新增：

- `callStackCompiler.ts`
- `gridCompiler.ts`
- `dpCompiler.ts`
- `automatonCompiler.ts`
- `formulaCompiler.ts`
- `geometryCompiler.ts`
- `timelineCompiler.ts`

高级图语义可优先扩展现有 `graphCompiler.ts`。

### 6.3 SceneState 扩展方向

当前 SceneState 若主要围绕实体、边、标签、区域组织，可以采用两种策略：

1. **扁平实体策略**：新视图最终都编译为通用实体和边。
2. **专用模型策略**：SceneState 增加 `grids`、`tables`、`callStacks` 等专用状态集合。

建议采用混合策略：

- 简单视图继续编译为通用实体。
- 需要内部布局和交互语义的视图使用专用状态集合。

推荐专用模型：

```ts
interface SceneState {
  entities: Record<string, SceneEntity>
  edges: Record<string, SceneEdge>
  regions: Record<string, SceneRegion>
  overlays?: {
    callStacks?: Record<string, CallStackModel>
    grids?: Record<string, GridModel>
    dpTables?: Record<string, DPTableModel>
    automata?: Record<string, AutomatonModel>
    formulas?: Record<string, FormulaModel>
    geometries?: Record<string, GeometryModel>
    timelines?: Record<string, TimelineModel>
  }
}
```

这样能避免把 DP 表、网格和时间轴拆成大量普通实体后难以维护。

### 6.4 布局系统扩展

复合布局需要识别新结构类型：

| 类型 | 推荐区域 |
|---|---|
| `callstack` | 右侧窄栏或下方辅助栏 |
| `grid` | 主区域 |
| `dp` | 主区域或下方宽表格 |
| `formula` | 上方说明区或右侧解释区 |
| `automaton` | 主区域 |
| `geometry` | 主区域 |
| `timeline` | 下方横向区域 |

建议新增 `regionRole`：

```ts
type RegionRole =
  | 'main'
  | 'support'
  | 'variables'
  | 'callstack'
  | 'formula'
  | 'timeline'
  | 'trace'
```

## 7. AnimationBuilder 扩展建议

AI 生成器和内置生成器都应通过 Builder 操作语义事件。建议分阶段扩展：

### 7.1 第一批 Builder 方法

```ts
// Call stack
b.callStackCreate(title)
b.callPush(functionName, args, locals?)
b.callUpdate(locals)
b.callReturn(value?)
b.callPop()

// Grid
b.gridCreate(values, options?)
b.gridSet(row, col, value, state?)
b.gridVisit(row, col)
b.gridFrontier(cells)
b.gridPath(cells)

// DP
b.dpCreate(tableId, rows, cols, values?)
b.dpSet(tableId, row, col, value)
b.dpHighlight(tableId, cells, role)
b.dpDeps(tableId, from, to)
b.dpFormula(expression, values?)
```

### 7.2 第二批 Builder 方法

```ts
// Advanced graph
b.graphEdgeMetric(edgeId, metric)
b.graphAugment(edgeIds, amount)
b.graphLevel(nodeId, level)
b.graphLowlink(nodeId, low)
b.graphComponent(nodeIds, componentId)

// Automaton
b.automatonCreate(states, start, accepts?)
b.automatonTransition(from, to, char)
b.automatonFailure(from, to)
b.automatonCurrent(state, inputIndex?)

// Formula
b.formula(expression)
b.formulaValues(values)
b.formulaStep(expression, note?)
```

### 7.3 第三批 Builder 方法

```ts
// Geometry
b.geometryPoints(points)
b.geometrySegment(id, from, to)
b.geometryPolygon(id, points)
b.geometryScanline(position, orientation)

// Timeline
b.timelineCreate(range, lanes)
b.timelineBlock(lane, start, end, label)
b.timelineCursor(time)
```

## 8. 分阶段实施路线

### Phase A：递归、网格和 DP 基础能力

目标：解决当前最高频表达缺口。

实施内容：

1. 新增 `CallStackView`、`GridView`、`DPTableView`。
2. 新增 `callstack.*`、`grid.*`、`dp.*` 事件类型。
3. 新增对应编译器并注册到 `eventCompiler`。
4. 扩展 `AnimationBuilder` 第一批方法。
5. 迁移或新增以下算法示例：
   - N 皇后：棋盘 + 调用栈
   - 数独：网格 + 调用栈 + 候选状态
   - A*：网格 + open/closed 集合 + 路径
   - LCS：DP 表 + 依赖箭头 + 回溯路径
   - 归并排序：数组 + 调用栈

验收标准：

- 递归帧 push/pop/return 动画稳定。
- 网格单元在桌面和移动视口不重叠。
- DP 依赖箭头不遮挡核心数值。
- Builder 生成的脚本通过现有沙箱执行。

### Phase B：高级图论表达

目标：支撑最大流、SCC、桥、割点、二分图匹配。

实施内容：

1. 扩展 `graphCompiler` 的边指标、残量边、层级、匹配、lowlink、component 事件。
2. 补充图边标签布局，支持容量/流量/残量多字段展示。
3. 增强边高亮和路径高亮，支持增广路径动画。
4. 扩展 Builder 第二批高级图方法。
5. 新增或迁移算法：
   - Tarjan SCC
   - 桥和割点
   - Edmonds-Karp
   - Dinic
   - 匈牙利算法

验收标准：

- 图边多标签在稠密图中仍可读。
- 反向边与正向边可以清晰区分。
- SCC/bridge/cut vertex 状态可在步骤中保留。
- 最大流每次增广后，容量、流量、残量同步更新。

### Phase C：自动机与公式表达

目标：补全字符串和数学算法的高层解释能力。

实施内容：

1. 新增 `AutomatonView` 与 `FormulaView`。
2. 新增 `automaton.*`、`formula.*` 事件族。
3. 扩展字符串输入扫描条，与自动机当前状态联动。
4. 扩展 Builder 的自动机和公式方法。
5. 新增或迁移算法：
   - AC 自动机
   - Rabin-Karp
   - Z Algorithm
   - 快速幂
   - 扩展欧几里得
   - 素数筛

验收标准：

- 自动机节点、转移边、failure 指针同时展示时不混淆。
- 当前输入字符和当前状态能联动高亮。
- 公式面板能展示代入和推导步骤。

### Phase D：几何和时间轴专题

目标：拓展到计算几何、调度、缓存、事件模拟。

实施内容：

1. 新增 `GeometryView` 与 `TimelineView`。
2. 新增 `geometry.*`、`timeline.*` 事件族。
3. 新增几何坐标到 SVG 坐标的缩放和边界适配。
4. 新增时间轴 lane 布局和时间刻度渲染。
5. 新增算法：
   - 凸包
   - 扫描线
   - 线段相交
   - LRU Cache
   - Round Robin 调度

验收标准：

- 几何坐标缩放后不失真。
- 扫描线移动过程平滑。
- 时间轴在任务数量变化时保持稳定高度。

## 9. 测试策略

### 9.1 编译器单元测试

每个新增编译器至少覆盖：

- create 事件生成初始状态。
- update/highlight 事件只影响目标实体。
- invalid id 或越界输入不会导致崩溃。
- 多事件组合后状态一致。

建议文件：

- `src/scene/compilers/__tests__/callStackCompiler.test.ts`
- `src/scene/compilers/__tests__/gridCompiler.test.ts`
- `src/scene/compilers/__tests__/dpCompiler.test.ts`
- `src/scene/compilers/__tests__/automatonCompiler.test.ts`

### 9.2 Builder 测试

覆盖 Builder 高级方法输出的事件结构，确保 AI 生成器可以安全调用：

- 方法链式调用正常。
- 默认参数合理。
- 输出 `AnimationScript` 能通过 schema。
- 复合布局自动启用。

### 9.3 Scene Engine 回归测试

重点验证：

- 同一画面多结构共存。
- 新 overlay 状态不会破坏旧实体渲染。
- 清除高亮、步骤回放、重新生成动画后状态一致。
- 区域布局不会相互覆盖。

### 9.4 视觉回归建议

对重点算法准备固定输入，手动或自动截取关键步骤：

- N 皇后第一个解
- A* 找到路径
- LCS 回溯答案
- Dinic 分层图和增广路径
- AC 自动机 failure 指针

验收时重点看：

- 文本是否溢出。
- 边和箭头是否遮挡关键标签。
- 移动端是否仍可辨认。
- 颜色语义是否一致。

## 10. 与现有算法库的迁移关系

### 10.1 可保持不变的算法

排序、基础数据结构操作、基础 BFS/DFS、Dijkstra、Kruskal、Prim 等算法可以继续使用现有事件。它们已经能被现有基础图元良好表达。

### 10.2 建议增强的算法

| 算法 | 建议增强 |
|---|---|
| 归并排序 | 增加调用栈和分治区间 |
| 快速排序 | 增加调用栈和分区递归树 |
| N 皇后 | 使用 GridView + CallStackView |
| 数独 | 使用 GridView + CallStackView + 候选状态 |
| A* | 使用 GridView + frontier/path/weight |
| LCS | 使用 DPTableView + 依赖箭头 + 回溯路径 |
| 编辑距离 | 使用 DPTableView + 公式面板 |
| 区间 DP | 使用 DPTableView + 区间依赖 |
| KMP | 增加自动机或字符串扫描联动 |
| GCD | 增加公式推导面板 |

### 10.3 新增算法的依赖关系

| 新算法 | 依赖的新能力 |
|---|---|
| Tarjan SCC | CallStackView + graph.discovery + graph.lowlink |
| 桥与割点 | CallStackView + graph.lowlink + graph.bridge/cut_vertex |
| Dinic | graph.level + graph.edge_metric + graph.augment_path |
| AC 自动机 | AutomatonView + string scan |
| 快速幂 | FormulaView + VariablesView |
| 凸包 | GeometryView |
| LRU Cache | TimelineView 或 Map + LinkedList 复合视图 |

## 11. 风险与注意事项

### 11.1 事件族过多导致维护成本上升

缓解方式：

- 新事件必须有明确算法场景。
- 优先抽象“跨多个算法复用”的能力。
- Builder API 保持小而稳定。

### 11.2 画布信息密度过高

缓解方式：

- 使用复合布局分区。
- 默认只显示核心字段，详细字段放在步骤说明或 hover 状态。
- 支持折叠辅助区域，例如调用栈只展示最近 N 帧。

### 11.3 AI 生成事件质量不稳定

缓解方式：

- Builder 方法提供安全默认值。
- schema 明确枚举和字段约束。
- 对 AI prompt 增加示例，不鼓励直接手写底层复杂事件。

### 11.4 移动端可读性

缓解方式：

- 表格和网格支持缩放或滚动。
- 长公式换行。
- 调用栈和变量面板在移动端切换为下方折叠区。

## 12. 推荐优先级总结

推荐按照以下顺序推进：

1. `CallStackView`：最大化提升递归、回溯、分治、树形算法表达力。
2. `GridView`：提升寻路、棋盘、二维 DP 和图像类题目表达力。
3. `DPTableView`：提升 DP 专题的解释质量。
4. 高级 `graph.*` 边语义：为最大流、SCC、桥、割点、匹配铺路。
5. `AutomatonView`：支撑 AC 自动机、DFA/NFA 和字符串专题扩展。
6. `FormulaView`：强化数论、递推和证明类算法。
7. `GeometryView`：拓展计算几何专题。
8. `TimelineView`：拓展调度、缓存和事件模拟专题。

短期最建议落地 Phase A。完成后，AlgoViz 的动画基础能力会从“数据结构变化可视化”提升到“算法执行语义可视化”。随后推进 Phase B，即可支撑一大批更高级、更有区分度的图论算法。
