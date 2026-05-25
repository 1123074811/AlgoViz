# AlgoViz Phase 2 预制动画引擎增强实施计划

本文档用于指导后续 AI 编程工具对 AlgoViz 进行 Phase 2 预制动画引擎增强，实现范围聚焦于：

1. 优化排序算法动画细节。
2. 增强图算法和树结构的状态表达。
3. 为更多算法补充稳定、教学友好的步骤说明。

本阶段仍保持纯前端架构，不引入后端服务，不改变 AI API 调用流程。Phase 2 的核心目标是让预制动画脚本和生成器更稳定、更可解释、更适合课堂教学，并为 Phase 3 的 AI 动画 JSON Schema 校验打好协议基础。

---

## 一、当前项目基础情况

### 1. 相关技术栈

当前项目与 Phase 2 直接相关的技术包括：

- React 18
- TypeScript
- Vite
- Tailwind CSS
- D3.js
- Framer Motion
- Zustand
- i18next
- Monaco Editor

### 2. 当前动画相关目录

```text
src/
├── types/
│   └── animation.ts
├── hooks/
│   └── useAnimationEngine.ts
├── components/
│   └── Canvas/
│       ├── VisualizationCanvas.tsx
│       └── renderers/
│           ├── ArrayRenderer.tsx
│           ├── GraphRenderer.tsx
│           ├── TreeRenderer.tsx
│           ├── MatrixRenderer.tsx
│           └── LinkedListRenderer.tsx
├── presets/
│   ├── index.ts
│   ├── generators.ts
│   ├── bubbleSort.ts
│   ├── selectionSort.ts
│   ├── insertionSort.ts
│   ├── mergeSort.ts
│   ├── quickSort.ts
│   ├── bfsGraph.ts
│   ├── dfsGraph.ts
│   ├── dijkstra.ts
│   ├── prim.ts
│   ├── kruskal.ts
│   ├── topologicalSort.ts
│   ├── floyd.ts
│   ├── bellmanFord.ts
│   ├── aStar.ts
│   ├── binaryTree.ts
│   ├── bst.ts
│   ├── avlTree.ts
│   ├── redBlackTree.ts
│   └── trie.ts
└── data/
    └── algorithmDefs.ts
```

### 3. 当前 AnimationScript 基础协议

当前核心类型位于：

```text
src/types/animation.ts
```

当前协议已支持：

- `RendererType`: `array | graph | tree | matrix | linked_list`
- `ActionType`: `highlight | swap | compare | move | insert | delete | mark | annotate | edge`
- `ActionColor`: `primary | success | warning | danger | muted`
- `InitialState`: 数组、图节点边、树根和 children 的基础字段
- `AnimationStep`: `stepId`、`codeLine`、中英双语 `description`、`action`、`stats`

### 4. 当前动画引擎特点

`src/hooks/useAnimationEngine.ts` 当前主要做了以下事情：

- 根据 `currentStep` 回放 `steps`。
- 对数组类型执行 `swap` 来派生当前数组状态。
- 对 `mark` 类型动作保留持久颜色。
- 当前步骤动作颜色覆盖目标元素颜色。
- 将 `initialState.nodes` 和 `initialState.edges` 透传给图渲染器。

当前限制：

- 图算法没有独立的节点状态、边状态、队列、栈、距离表等派生状态。
- 树结构主要依赖数组下标生成完全二叉树布局，不能准确表达 BST、AVL、红黑树、Trie 的结构变化。
- `move`、`insert`、`delete`、`edge`、`annotate` 的状态语义还不够完整。
- 排序生成器对稳定性、分区范围、子数组、辅助数组、计数数组等教学信息表达不够细。

### 5. 当前渲染器特点

#### ArrayRenderer

当前能力：

- 支持柱状图展示数组值。
- 支持 `compare` 的边框闪烁。
- 支持 `swap` 的视觉强调。
- 支持柱子位置插值动画。
- 底部显示比较、交换、访问统计。

当前限制：

- 不区分当前指针、已排序区间、未排序区间、pivot、min、key、gap 等角色。
- 对归并排序、计数排序、基数排序、桶排序等非单纯交换类排序表达不足。
- `move` 动作不会真正改变数组状态。
- 无辅助数组、桶、计数数组、递归区间、子问题边界的统一可视化。

#### GraphRenderer

当前能力：

- 使用 D3 force simulation 渲染节点和边。
- 节点颜色从 `colorMap` 获取。
- 支持边权文本所需的基础数据字段，但当前渲染只画线，未完整突出权重和状态。

当前限制：

- 每一步重新绘制图，布局可能抖动。
- 边颜色状态没有持久化表达。
- 无 BFS 队列、DFS 栈、Dijkstra 距离表、Prim/Kruskal MST 集合、拓扑排序入度等教学面板。
- `edge` 动作没有被系统化使用。

#### TreeRenderer

当前能力：

- 根据数组下标构造完全二叉树。
- 使用节点颜色表达高亮或标记。

当前限制：

- 未优先使用 `initialState.root` 和 `initialState.children`。
- 不能表达树旋转、插入路径、删除替换、Trie 字符边、红黑树颜色、AVL 平衡因子。
- 边状态和结构变化表达较弱。

---

## 二、Phase 2 总体目标

Phase 2 的目标是把预制动画从“能播放”提升到“适合教学讲解”。完成后，常用排序、图、树算法应具备更稳定的状态表达、更精细的步骤说明和更可预测的渲染结果。

### 目标 1：排序动画细节增强

排序算法需要清楚表达：

- 当前比较对象。
- 是否发生交换或移动。
- 当前轮次和子区间。
- 已排序区域和未排序区域。
- 关键变量，例如 `pivot`、`minIdx`、`key`、`gap`、`heapSize`、`count`、`bucket`。
- 非交换类排序的辅助结构，例如计数数组、桶、按位分组。
- 稳定性相关说明，例如插入排序和归并排序为什么稳定。

优先覆盖算法：

```text
bubble_sort
selection_sort
insertion_sort
shell_sort
merge_sort
quick_sort
heap_sort
counting_sort
radix_sort
bucket_sort
```

### 目标 2：图算法状态表达增强

图算法需要清楚表达：

- 当前访问节点。
- 当前检查边。
- 已访问集合。
- 待访问队列或栈。
- 最短路算法中的距离表、前驱节点、松弛成功/失败。
- 最小生成树算法中的候选边、已选边、并查集分量。
- 拓扑排序中的入度变化和输出序列。
- A* 中的 `gScore`、`hScore`、`fScore` 和 open/closed 集合。

优先覆盖算法：

```text
bfs_graph
dfs_graph
dijkstra
bellman_ford
floyd
prim
kruskal
topological_sort
a_star
```

### 目标 3：树结构状态表达增强

树结构需要清楚表达：

- 当前节点、父节点、子节点。
- 搜索路径和插入路径。
- 子树范围。
- 旋转前后结构。
- 节点高度、平衡因子、红黑树颜色、Trie 前缀状态。
- 删除场景中的替换节点、后继节点或前驱节点。

优先覆盖算法或数据结构：

```text
binary_tree
bst
avl_tree
red_black_tree
trie
heap_ds
segment_tree
fenwick_tree
```

### 目标 4：更多算法步骤说明教学化

预制脚本和生成器的步骤说明需要统一风格：

- 每一步说明必须同时包含 `zh` 和 `en`。
- 中文说明面向初学者，避免只有变量名。
- 英文说明保持准确、简洁。
- 对关键步骤解释“为什么这样做”，而不只是“做了什么”。
- 对失败分支也要给出说明，例如“不交换”“松弛失败”“目标不在左半区”。
- 对最终结果明确说明返回值或结构状态。

---

## 三、实施原则

### 1. 渐进式协议扩展

Phase 2 可以扩展 `AnimationScript` 类型，但必须保持旧脚本兼容。

原则：

- 不删除现有字段。
- 新增字段必须是可选字段。
- 旧的 `AnimationScript` 仍能正常播放。
- 渲染器必须能处理新旧两类脚本。
- AI 输出暂不强制使用新字段，避免影响 Phase 3 前的 AI 能力。

### 2. 先增强预制动画，不大改 AI 流程

本阶段重点是 `src/presets/`、`useAnimationEngine` 和渲染器。

不要在 Phase 2 中做：

- 改写 AI 请求客户端。
- 强制 AI 输出新协议。
- 大规模重写 parser。
- 引入后端服务。

可以做的轻量准备：

- 在类型定义中为 Phase 3 预留可选字段。
- 在 README 或后续文档中记录新协议字段。
- 让预制脚本先使用新字段，AI 仍可使用旧字段。

### 3. 状态表达优先于复杂动画特效

本阶段优先保证：

- 状态正确。
- 步骤解释清楚。
- 播放稳定。
- 教学含义明确。

不建议优先投入：

- 复杂三维动画。
- 过度炫目的转场。
- 大型动画库替换。
- 和算法无关的视觉装饰。

### 4. 小步实现，小步验收

建议每次只增强一个类别：

1. 先统一协议和状态模型。
2. 再增强排序算法。
3. 再增强图算法。
4. 再增强树结构。
5. 最后统一教学文案和验收。

每个阶段完成后都运行构建并手动播放核心算法。

---

## 四、任务 A：扩展 AnimationScript 状态协议

### A.1 当前问题

当前 `AnimationStep.action` 只能表达一个动作和一组数字 targets。对于复杂算法，这会导致：

- 图节点 ID 是字符串，但 `targets` 只能是 `number[]`。
- 边状态难以表示，因为边没有统一 ID。
- 排序中的角色状态只能靠颜色猜测。
- 树节点只能靠数组下标表达，难以表达真实节点 ID。
- 辅助结构只能写在 description 中，渲染器无法展示。

### A.2 改造目标

在兼容旧协议的基础上，为每一步增加可选的教学状态字段。

建议在 `src/types/animation.ts` 中新增或扩展以下类型：

```ts
export type VisualRole =
  | 'current'
  | 'compare'
  | 'swap'
  | 'sorted'
  | 'unsorted'
  | 'pivot'
  | 'min'
  | 'key'
  | 'visited'
  | 'queued'
  | 'stacked'
  | 'relaxed'
  | 'candidate'
  | 'selected'
  | 'discarded'
  | 'path'
  | 'root'
  | 'parent'
  | 'child'
  | 'rotating'
  | 'balanced'
  | 'conflict'

export interface VisualAnnotation {
  id: string
  label: string
  value?: string | number
  target?: number | string
  color?: ActionColor
}

export interface RangeState {
  id: string
  label: string
  start: number
  end: number
  role: VisualRole
  color?: ActionColor
}

export interface AuxiliaryArrayState {
  id: string
  label: string
  data: Array<number | string>
  activeIndices?: number[]
  colorMap?: Record<number, ActionColor>
}

export interface GraphNodeState {
  id: string
  role: VisualRole
  color?: ActionColor
  distance?: number | string
  predecessor?: string | null
  metadata?: Record<string, string | number | boolean | null>
}

export interface GraphEdgeState {
  id?: string
  source: string
  target: string
  role: VisualRole
  color?: ActionColor
  weight?: number
  directed?: boolean
  metadata?: Record<string, string | number | boolean | null>
}

export interface TreeNodeState {
  id: string | number
  role: VisualRole
  color?: ActionColor
  height?: number
  balanceFactor?: number
  rbColor?: 'red' | 'black'
  metadata?: Record<string, string | number | boolean | null>
}

export interface TeachingState {
  variables?: Record<string, string | number | boolean | null>
  ranges?: RangeState[]
  auxiliaryArrays?: AuxiliaryArrayState[]
  graph?: {
    nodeStates?: GraphNodeState[]
    edgeStates?: GraphEdgeState[]
    queue?: string[]
    stack?: string[]
    distances?: Record<string, number | string>
    predecessors?: Record<string, string | null>
    output?: string[]
    sets?: Record<string, string[]>
  }
  tree?: {
    nodeStates?: TreeNodeState[]
    edgeStates?: GraphEdgeState[]
    traversalPath?: Array<string | number>
    rotation?: {
      type: 'left' | 'right' | 'left-right' | 'right-left'
      pivot: string | number
      child?: string | number
    }
  }
  annotations?: VisualAnnotation[]
}
```

再在 `AnimationStep` 中新增：

```ts
teachingState?: TeachingState
```

### A.3 兼容性要求

实现工具必须保证：

- 旧脚本没有 `teachingState` 时仍正常播放。
- `targets` 仍作为基础兼容字段保留。
- 数组渲染器可以优先读取 `teachingState.ranges` 和 `teachingState.auxiliaryArrays`，没有时退回原逻辑。
- 图渲染器可以优先读取 `teachingState.graph`，没有时只用 `colorMap`。
- 树渲染器可以优先读取 `initialState.children` 和 `teachingState.tree`，没有时退回数组完全二叉树布局。

### A.4 建议修改文件

```text
src/types/animation.ts
src/hooks/useAnimationEngine.ts
src/components/Canvas/renderers/ArrayRenderer.tsx
src/components/Canvas/renderers/GraphRenderer.tsx
src/components/Canvas/renderers/TreeRenderer.tsx
src/presets/generators.ts
src/presets/*.ts
```

### A.5 useAnimationEngine 增强建议

建议将当前 `VisualState` 扩展为：

```ts
export interface VisualState {
  arrayData: number[]
  colorMap: Map<number, ActionColor>
  elementIds: number[]
  currentStep: number
  totalSteps: number
  nodes?: { id: string; label?: string; x?: number; y?: number }[]
  edges?: { source: string; target: string; weight?: number }[]
  teachingState?: TeachingState
  edgeColorMap?: Map<string, ActionColor>
  nodeRoleMap?: Map<string, VisualRole>
}
```

关键要求：

- `teachingState` 取当前步骤的 `teachingState`。
- `mark` 仍保留持久颜色逻辑。
- `edge` 动作需要能持久标记边状态。
- 为边生成稳定 key，建议格式为 `${source}->${target}`，无向图可额外兼容 `${target}->${source}`。
- 对 `move`、`insert`、`delete` 的数组状态更新可以先只覆盖预制脚本需要的最小行为，避免一次性引入过多复杂逻辑。

### A.6 验收标准

完成后应满足：

- `npm run build` 通过。
- 旧的排序、图、树预制脚本仍能播放。
- 新增类型均为可选字段，不破坏现有数据。
- `visualState.teachingState` 可在渲染器中读取当前步骤教学状态。
- 不修改 AI API 配置和 AI 请求流程。

---

## 五、任务 B：排序算法动画细节优化

### B.1 当前问题

当前排序生成器已能产生基本比较和交换步骤，但教学表达仍不足：

- 冒泡排序没有清晰展示“本轮最大值逐步冒泡到末尾”的过程。
- 选择排序没有持续展示当前最小值候选。
- 插入排序使用 `swap` 表达右移，语义不够准确。
- 归并排序只显示合并描述，缺少辅助数组和写回过程。
- 快速排序当前生成器使用额外数组分区，不是典型原地双指针分区，不利于教学常见模板。
- 堆排序缺少树形堆视角和 heapSize 边界。
- 计数、基数、桶排序缺少辅助结构可视化。

### B.2 排序统一教学状态模型

所有排序算法建议统一使用以下状态：

```text
variables:
- i
- j
- left
- right
- mid
- pivot
- minIdx
- key
- gap
- heapSize
- digit
- bucketIndex

ranges:
- sorted: 已排序区域
- unsorted: 未排序区域
- active: 当前处理区间
- left_part: 左子数组
- right_part: 右子数组
- heap: 当前堆范围
- output: 已输出范围

auxiliaryArrays:
- temp: 归并临时数组
- count: 计数数组
- buckets: 桶结构
- output: 基数排序输出数组
```

颜色语义建议：

| 角色 | 颜色 | 含义 |
|---|---|---|
| `current` | `warning` | 当前指针或当前处理元素 |
| `compare` | `warning` | 正在比较的两个元素 |
| `swap` | `danger` | 即将交换或刚交换 |
| `sorted` | `success` | 已排序区域 |
| `pivot` | `primary` | 快排基准 |
| `min` | `danger` | 当前最小值候选 |
| `key` | `primary` | 插入排序 key |
| `discarded` | `muted` | 已排除或非活跃区域 |

### B.3 ArrayRenderer 增强建议

建议修改：

```text
src/components/Canvas/renderers/ArrayRenderer.tsx
```

新增能力：

1. 顶部显示当前关键变量。
2. 数组下方显示区间标签。
3. 支持已排序区间背景带。
4. 支持 pivot、key、minIdx 等角色徽标。
5. 支持辅助数组小面板。
6. 对 `move` 动作使用不同于 `swap` 的视觉提示。
7. 对非交换类排序显示“写入”或“输出”状态。

建议渲染层级：

```text
SVG / 容器
├── 变量栏 variables
├── 主数组 bars
├── 区间背景 ranges
├── 操作标识 compare / swap / move
├── 辅助数组 auxiliaryArrays
└── 统计栏 stats
```

### B.4 具体算法增强要求

#### B.4.1 冒泡排序 `bubble_sort`

建议修改文件：

```text
src/presets/generators.ts
src/presets/bubbleSort.ts
```

步骤要求：

1. 开始每一轮时标注未排序区间 `[0, n - 1 - i]`。
2. 比较相邻元素时显示 `j` 和 `j + 1`。
3. 如果左侧更大，说明“大元素向右冒泡”，执行交换。
4. 如果不交换，说明这两个元素相对顺序已正确。
5. 每轮结束标记末尾元素已就位。
6. 如果一轮没有发生交换，增加“提前结束”步骤。

建议新增变量：

```text
i, j, swapped, sortedEnd
```

验收标准：

- 能显示每轮边界。
- 能显示提前结束优化。
- 最终所有元素标记为 `success`。

#### B.4.2 选择排序 `selection_sort`

步骤要求：

1. 每轮开始标注当前位置 `i` 和未排序区间。
2. 初始 `minIdx = i`。
3. 扫描 `j` 时比较 `arr[j]` 和 `arr[minIdx]`。
4. 找到更小值时持续标记新的 `minIdx`。
5. 扫描结束后解释为什么把最小值放到 `i`。
6. 即使 `minIdx === i`，也要说明无需交换。

建议新增变量：

```text
i, j, minIdx
```

验收标准：

- 当前最小值候选始终可见。
- 已排序前缀持续标记。
- “无需交换”分支有明确说明。

#### B.4.3 插入排序 `insertion_sort`

步骤要求：

1. 标注已排序前缀 `[0, i - 1]`。
2. 取出 `key = arr[i]`，将其标为 `key`。
3. 比较 `arr[j] > key`。
4. 如果成立，用 `move` 表达右移，而不是 `swap`。
5. 找到插入位置后写入 `key`。
6. 说明插入排序稳定性的原因：只在 `arr[j] > key` 时右移，相等元素不越过。

建议新增变量：

```text
i, j, key, insertPos
```

验收标准：

- 右移和交换视觉语义不同。
- 插入位置清晰可见。
- 对相等元素的稳定性有说明。

#### B.4.4 希尔排序 `shell_sort`

步骤要求：

1. 每个 gap 开始时显示 `gap`。
2. 标注同一 gap 分组内的元素。
3. 对每个分组执行插入排序式比较和移动。
4. gap 缩小到 1 时说明退化为普通插入排序。
5. 最终标记完成。

验收标准：

- gap 分组可见。
- 当前分组与当前比较元素可区分。

#### B.4.5 归并排序 `merge_sort`

步骤要求：

1. 递归拆分时显示当前区间 `[start, end]` 和 `mid`。
2. 到达单元素区间时说明天然有序。
3. 合并时显示左数组、右数组和临时数组。
4. 比较 `left[i]` 与 `right[j]`。
5. 将较小值写入 `temp[k]`。
6. 剩余元素复制到临时数组。
7. 将临时数组写回原数组。
8. 说明归并排序稳定性：相等时优先取左数组元素。

建议使用：

```text
teachingState.auxiliaryArrays: temp, left, right
teachingState.ranges: active, left_part, right_part
```

验收标准：

- 拆分和合并边界清楚。
- 辅助数组可视化。
- 写回过程不只停留在文字描述。

#### B.4.6 快速排序 `quick_sort`

建议将动态生成器改为教学常见的原地分区策略之一，并在说明中固定策略。

推荐方案：Lomuto 分区。

步骤要求：

1. 标注当前递归区间 `[low, high]`。
2. 选择 `pivot = arr[high]`。
3. 维护 `i` 作为小于 pivot 区域的边界。
4. 扫描 `j`。
5. 如果 `arr[j] <= pivot`，扩大“小于等于 pivot”区域并交换。
6. 扫描结束，将 pivot 交换到 `i + 1`。
7. 标记 pivot 已归位。
8. 递归处理左右区间。

建议新增变量：

```text
low, high, i, j, pivot, pivotIndex
```

验收标准：

- pivot 角色可见。
- 当前分区区间可见。
- pivot 归位后持久标记。
- 递归左右区间有清晰说明。

#### B.4.7 堆排序 `heap_sort`

步骤要求：

1. 建堆阶段显示从最后一个非叶子节点开始。
2. 每次 `heapify` 标注父节点、左孩子、右孩子。
3. 比较并更新 `largest`。
4. 发生交换后继续向下调整。
5. 排序阶段显示 `heapSize` 边界。
6. 将堆顶最大值交换到末尾并标记已排序。

建议同步增强：

```text
TreeRenderer 或 ArrayRenderer 中显示堆结构
```

可选方案：

- Phase 2.1 先在 ArrayRenderer 中显示 heap 区间和 sorted 区间。
- Phase 2.2 再在 TreeRenderer 中增加堆树视图。

验收标准：

- heapSize 边界清晰。
- 父子节点比较清晰。
- 已排序后缀持续标记。

#### B.4.8 计数排序 `counting_sort`

步骤要求：

1. 找到最大值 `maxVal`。
2. 创建计数数组 `count[0..maxVal]`。
3. 扫描原数组并更新 count。
4. 可选：如果实现稳定版，计算前缀和。
5. 输出结果数组。
6. 写回原数组。

建议优先实现稳定版计数排序，因为更具教学价值。

建议新增辅助数组：

```text
count
output
```

验收标准：

- count 数组可见。
- 每次计数更新可见。
- 输出数组写入过程可见。

#### B.4.9 基数排序 `radix_sort`

步骤要求：

1. 显示当前处理位：个位、十位、百位。
2. 按当前位放入 0-9 号桶或使用计数数组。
3. 保持稳定收集。
4. 每轮结束展示数组状态。
5. 说明低位到高位处理的原因。

验收标准：

- 当前 digit 可见。
- 桶或计数结构可见。
- 每轮收集顺序稳定。

#### B.4.10 桶排序 `bucket_sort`

步骤要求：

1. 根据数据范围创建桶。
2. 将元素分配到对应桶。
3. 对每个桶内部排序。
4. 按桶顺序收集输出。
5. 说明适用场景：数据较均匀时效果好。

验收标准：

- 桶结构可见。
- 分配和收集过程可见。
- 空桶也可被说明但不需要高亮过度。

---

## 六、任务 C：图算法和 GraphRenderer 状态增强

### C.1 当前问题

当前图渲染只表达节点颜色，难以教学：

- BFS 队列不可见。
- DFS 调用栈或显式栈不可见。
- Dijkstra 距离更新不可见。
- Prim/Kruskal 的候选边和已选边不可见。
- 拓扑排序入度变化不可见。
- Floyd 的矩阵状态更适合 MatrixRenderer，但当前步骤解释可能不足。

### C.2 GraphRenderer 增强目标

建议修改：

```text
src/components/Canvas/renderers/GraphRenderer.tsx
```

新增能力：

1. 支持稳定布局。
2. 支持边颜色和边宽状态。
3. 显示边权重。
4. 显示有向边箭头。
5. 显示当前节点角色，例如 visited、queued、current。
6. 显示队列、栈、距离表、输出序列等侧边教学面板。
7. 对 `teachingState.graph` 做兼容读取。

### C.3 稳定布局要求

优先使用 `initialState.nodes` 中的 `x/y` 坐标。

如果没有坐标：

- 可以继续使用 D3 force simulation。
- 但同一脚本播放过程中应保持布局稳定。
- 建议对 `script.algorithm + nodes + edges` 计算一次布局后缓存，不要每一步重新随机布局。

验收标准：

- 播放 BFS/DFS 时节点位置不明显跳动。
- 切换步骤只变化颜色、边状态、标签或面板内容。

### C.4 图状态统一语义

建议角色与颜色：

| 状态 | 颜色 | 用途 |
|---|---|---|
| `current` | `warning` | 当前展开节点 |
| `visited` | `success` | 已访问节点 |
| `queued` | `primary` | 已入队待处理 |
| `stacked` | `primary` | DFS 栈中节点 |
| `candidate` | `warning` | 候选边或候选节点 |
| `selected` | `success` | 已选入路径或 MST |
| `discarded` | `muted` | 已跳过边 |
| `relaxed` | `success` | 松弛成功 |
| `conflict` | `danger` | 检测到不可用或冲突 |

### C.5 BFS `bfs_graph`

建议修改文件：

```text
src/presets/bfsGraph.ts
```

步骤要求：

1. 选择起点并入队。
2. 展示队列当前内容。
3. 出队当前节点。
4. 检查当前节点的每条邻边。
5. 如果邻接点未访问，标记访问并入队。
6. 如果已访问，说明跳过原因。
7. 输出 BFS 访问顺序。

建议 `teachingState.graph`：

```text
queue: 当前队列
nodeStates: current / visited / queued
edgeStates: candidate / selected / discarded
output: 访问顺序
```

验收标准：

- 队列可见。
- 访问顺序可见。
- 已访问节点不会重复入队。

### C.6 DFS `dfs_graph`

建议修改文件：

```text
src/presets/dfsGraph.ts
```

步骤要求：

1. 选择起点并进入 DFS。
2. 展示递归调用栈或显式栈。
3. 高亮当前节点。
4. 逐条检查邻边。
5. 未访问则沿边深入。
6. 已访问则跳过。
7. 子节点处理完成后回溯。

建议 `teachingState.graph`：

```text
stack: 当前递归路径
nodeStates: current / visited / stacked
edgeStates: path / discarded
output: DFS 访问顺序
```

验收标准：

- 当前递归路径可见。
- 回溯步骤有说明。
- DFS 与 BFS 的状态面板明显不同。

### C.7 Dijkstra `dijkstra`

建议修改文件：

```text
src/presets/dijkstra.ts
```

步骤要求：

1. 初始化距离表，起点距离为 0，其他为 ∞。
2. 从未确定节点中选择距离最小的节点。
3. 标记该节点为已确定。
4. 遍历出边并计算候选距离。
5. 松弛成功时更新距离和前驱。
6. 松弛失败时说明当前路径不更短。
7. 最终展示最短距离表和路径树。

建议 `teachingState.graph`：

```text
distances
predecessors
sets.settled
sets.unsettled
edgeStates: candidate / relaxed / selected / discarded
```

验收标准：

- 距离表可见。
- 松弛成功和失败有不同颜色。
- 最短路径树边可见。

### C.8 Bellman-Ford `bellman_ford`

步骤要求：

1. 初始化距离表。
2. 进行第 `i` 轮边遍历。
3. 对每条边尝试松弛。
4. 松弛成功更新距离。
5. 一轮无更新时说明可提前结束。
6. 可选：第 `n` 轮检测负环。

验收标准：

- 当前轮次可见。
- 当前边可见。
- 松弛成功/失败可见。
- 负环检测步骤有说明，即使预置图没有负环。

### C.9 Floyd `floyd`

Floyd 更适合矩阵表达，建议同时增强：

```text
src/components/Canvas/renderers/MatrixRenderer.tsx
src/presets/floyd.ts
```

步骤要求：

1. 显示当前中转点 `k`。
2. 显示当前检查的 `i -> j`。
3. 比较 `dist[i][j]` 和 `dist[i][k] + dist[k][j]`。
4. 更新成功时高亮矩阵单元。
5. 每个 k 完成后说明允许使用的中转点集合扩大。

验收标准：

- k、i、j 变量可见。
- 矩阵更新单元可见。
- 成功/失败分支说明完整。

### C.10 Prim `prim`

步骤要求：

1. 从起点开始构建 MST。
2. 标记已在 MST 中的节点集合。
3. 展示横跨集合边界的候选边。
4. 选择权重最小的候选边。
5. 将新节点和边加入 MST。
6. 重复直到所有节点加入。

验收标准：

- MST 节点集合可见。
- 候选边和已选边颜色不同。
- 当前最小边有明确说明。

### C.11 Kruskal `kruskal`

步骤要求：

1. 按权重排序所有边。
2. 依次检查当前最小边。
3. 使用并查集判断两端是否属于同一连通分量。
4. 不成环则加入 MST。
5. 成环则跳过。
6. 显示当前并查集分量。

建议配合 `unionFind` 教学面板：

```text
sets.components: 当前连通分量
```

验收标准：

- 边排序顺序可见。
- 成环判断有说明。
- 已选 MST 边持续高亮。

### C.12 拓扑排序 `topological_sort`

步骤要求：

1. 初始化每个节点入度。
2. 将入度为 0 的节点入队。
3. 出队节点并加入输出序列。
4. 删除其出边，降低邻接点入度。
5. 如果邻接点入度变为 0，入队。
6. 最终输出拓扑序。
7. 可选：如果输出数量不足，说明存在环。

验收标准：

- 入度表可见。
- 队列可见。
- 输出序列可见。
- 边删除或弱化状态可见。

### C.13 A* `a_star`

步骤要求：

1. 初始化 open set、closed set、gScore、hScore、fScore。
2. 从 open set 中选择 fScore 最小节点。
3. 检查是否到达目标。
4. 遍历邻居，计算 tentative gScore。
5. 如果路径更优，更新前驱和分数。
6. 将节点移入 closed set。
7. 找到目标后回溯路径。

验收标准：

- open / closed 集合可见。
- g / h / f 分数可见。
- 最终路径可见。

---

## 七、任务 D：树结构和 TreeRenderer 状态增强

### D.1 当前问题

当前 TreeRenderer 只根据数组下标构造完全二叉树，不适合 BST、AVL、红黑树和 Trie。

需要增强：

- 支持 `initialState.root` 和 `initialState.children`。
- 支持节点 ID 与节点值分离。
- 支持树节点元数据。
- 支持边状态。
- 支持旋转动画或至少旋转前后状态表达。
- 支持红黑树节点颜色。
- 支持 Trie 字符边和单词结束标记。

### D.2 InitialState 树结构建议

在兼容现有字段基础上，建议扩展：

```ts
export interface TreeInitialNode {
  id: string | number
  value: string | number
  label?: string
  x?: number
  y?: number
  metadata?: Record<string, string | number | boolean | null>
}

export interface InitialState {
  type: RendererType
  data: number[]
  labels?: string[]
  nodes?: { id: string; label?: string; x?: number; y?: number }[]
  edges?: { source: string; target: string; weight?: number }[]
  root?: number | string
  children?: Record<string | number, Array<string | number>>
  treeNodes?: TreeInitialNode[]
}
```

注意：

- 如果 TypeScript 对 `Record<string | number, ...>` 处理复杂，可使用 `Record<string, Array<string | number>>`，并在渲染时统一转字符串 key。
- 保留原 `data`，保证旧脚本兼容。

### D.3 TreeRenderer 增强目标

建议修改：

```text
src/components/Canvas/renderers/TreeRenderer.tsx
```

新增能力：

1. 优先使用 `initialState.treeNodes + root + children` 构造真实树。
2. 如果没有真实树字段，再退回数组完全二叉树布局。
3. 自动计算层级布局。
4. 支持节点角色颜色。
5. 支持边状态颜色。
6. 支持节点元数据显示，例如 `height`、`bf`、`red/black`、`end`。
7. 支持旋转提示。
8. 支持遍历路径显示。

### D.4 树布局建议

树布局优先级：

1. 如果节点有 `x/y`，直接使用。
2. 如果有 `root/children`，按层级布局。
3. 如果只有 `data`，按完全二叉树布局。

层级布局建议：

- BFS 计算每个节点深度。
- 每层按出现顺序分配 x 坐标。
- y 坐标按深度均分。
- 对过宽树允许缩小节点半径或增加横向滚动。

验收标准：

- BST 不再被错误渲染为完全二叉树。
- Trie 可以显示字符节点和边标签。
- AVL 和红黑树能显示核心元数据。

### D.5 二叉树遍历 `binary_tree`

步骤要求：

1. 支持前序、中序、后序或层序中的至少一种预置演示。
2. 当前访问节点高亮。
3. 遍历路径或输出序列可见。
4. 对递归进入和回溯进行说明。

验收标准：

- 当前节点可见。
- 输出序列可见。
- 回溯说明清楚。

### D.6 BST `bst`

步骤要求：

1. 插入或搜索时从根节点开始。
2. 比较目标值与当前节点。
3. 小于则走左子树，大于则走右子树。
4. 找到空位置时插入新节点。
5. 搜索失败时说明到达空子树。
6. 可选：删除时展示后继节点替换。

建议状态：

```text
nodeStates: current / path / parent / child / selected
variables: target, current, parent
```

验收标准：

- 搜索路径可见。
- 左右分支选择原因明确。
- 插入位置或搜索结果明确。

### D.7 AVL `avl_tree`

步骤要求：

1. 正常 BST 插入。
2. 回溯更新节点高度。
3. 计算平衡因子。
4. 检测 LL、RR、LR、RL 四种失衡情况。
5. 展示对应旋转类型。
6. 旋转后展示新根和更新后的高度/平衡因子。

建议状态：

```text
nodeStates: current / path / rotating / balanced
teachingState.tree.rotation
variables: height, balanceFactor, caseType
```

验收标准：

- 平衡因子可见。
- 旋转类型可见。
- 旋转前后结构变化可见。

### D.8 红黑树 `red_black_tree`

步骤要求：

1. 按 BST 规则插入新节点，默认红色。
2. 检查父节点颜色。
3. 如果父节点为黑色，插入结束。
4. 如果父节点为红色，判断叔叔节点颜色。
5. 叔叔为红：变色并继续向上修复。
6. 叔叔为黑或空：根据形态旋转并变色。
7. 最终根节点置黑。

建议状态：

```text
rbColor: red / black
variables: parent, uncle, grandparent, caseType
```

验收标准：

- 红黑颜色不能只靠 action color，必须有明确 rbColor 表达。
- 父/叔/祖父角色可见。
- 变色和旋转步骤分开说明。

### D.9 Trie `trie`

步骤要求：

1. 从根节点开始插入或搜索单词。
2. 逐字符处理。
3. 如果字符边不存在，创建新节点。
4. 如果字符边存在，沿边继续。
5. 单词结束时标记 `isEnd`。
6. 搜索时区分“前缀存在但不是单词”和“单词存在”。

建议结构：

```text
treeNodes: value 可为字符
edges: source, target, label 可扩展为字符边
metadata: isEnd
```

验收标准：

- 字符边或节点字符可见。
- 当前前缀可见。
- 单词结束标记可见。

### D.10 Segment Tree `segment_tree`

虽然属于进阶专题，但 Phase 2 可作为树结构增强的延伸。

步骤要求：

1. 建树时显示区间 `[l, r]`。
2. 叶子节点对应原数组元素。
3. 内部节点由左右子节点合并。
4. 查询时显示当前节点区间与查询区间关系。
5. 修改时显示从叶子回溯更新。

验收标准：

- 每个节点显示区间。
- 查询覆盖、相交、不相交分支说明明确。

### D.11 Fenwick Tree `fenwick_tree`

Fenwick Tree 可继续使用数组视图，但需要更教学化。

步骤要求：

1. 显示 `lowbit(x)`。
2. 更新时展示 `i += lowbit(i)` 的跳转。
3. 查询前缀和时展示 `i -= lowbit(i)` 的跳转。
4. 显示每个 tree[i] 覆盖的区间。

验收标准：

- lowbit 可见。
- 跳转路径可见。
- 覆盖区间可见。

---

## 八、任务 E：预制步骤说明统一与补全

### E.1 当前问题

当前预制生成器中的说明存在以下问题：

- 有些步骤只描述操作，没有解释原因。
- 有些英文说明过短或不够自然。
- 部分算法的失败分支说明不足。
- 静态 preset 和动态 generator 的文案风格不完全一致。
- 部分高级算法可能只有简略步骤。

### E.2 统一文案模板

建议建立统一的步骤说明风格。

#### 比较类

```text
zh: 比较 arr[i]=x 和 arr[j]=y，判断是否需要交换。
en: Compare arr[i]=x with arr[j]=y to decide whether a swap is needed.
```

#### 命中条件

```text
zh: 条件成立，执行 xxx，因为 xxx。
en: The condition is true, so perform xxx because xxx.
```

#### 跳过条件

```text
zh: 条件不成立，跳过 xxx，当前状态保持不变。
en: The condition is false, skip xxx and keep the current state unchanged.
```

#### 数据结构状态变化

```text
zh: 将节点 A 入队，表示它已被发现但尚未展开。
en: Enqueue node A, meaning it has been discovered but not expanded yet.
```

#### 松弛成功

```text
zh: 通过 u 到达 v 的距离更短，更新 dist[v] 和前驱节点。
en: The path through u gives a shorter distance to v, so update dist[v] and its predecessor.
```

#### 松弛失败

```text
zh: 新路径不优于当前 dist[v]，因此不更新。
en: The new path is not better than the current dist[v], so no update is made.
```

#### 递归和回溯

```text
zh: 子问题处理完成，回到上一层继续检查剩余分支。
en: The subproblem is complete, return to the previous level and continue with the remaining branches.
```

### E.3 补全文案的优先级

第一优先级：

```text
bubble_sort
selection_sort
insertion_sort
merge_sort
quick_sort
heap_sort
bfs_graph
dfs_graph
dijkstra
bst
avl_tree
trie
```

第二优先级：

```text
shell_sort
counting_sort
radix_sort
bucket_sort
bellman_ford
floyd
prim
kruskal
topological_sort
a_star
red_black_tree
segment_tree
fenwick_tree
```

第三优先级：

```text
lcs
lis
edit_distance
knapsack_01
unbounded_knapsack
matrix_chain
interval_dp
kmp
manacher
sliding_window
monotonic_stack
union_find
hash_table
linked_list
doubly_linked_list
stack
queue
heap_ds
n_queens
sudoku
backtracking
leetcode_hot100
acm_templates
```

### E.4 建议新增文案辅助工具

为避免每个生成器重复写 `makeStep`，建议新增：

```text
src/presets/utils.ts
```

可包含：

```ts
createStep(...)
createCompareStep(...)
createMarkStep(...)
createTeachingState(...)
makeRange(...)
makeAuxArray(...)
makeGraphNodeState(...)
makeGraphEdgeState(...)
```

注意：

- 不要求一次性迁移所有生成器。
- 可以先让新增强的排序、图、树算法使用工具函数。
- 旧生成器可逐步迁移。

### E.5 验收标准

完成后应满足：

- 第一优先级算法每一步都有完整中英说明。
- 关键分支都有“为什么”的解释。
- 说明中变量值和可视状态一致。
- 不出现明显错误变量名或过期数组值。
- `npm run build` 通过。

---

## 九、建议执行顺序

建议后续 AI 编程工具按以下顺序实现，降低风险。

### Step 1：协议扩展和兼容层

目标：让项目能承载更丰富的教学状态。

修改文件：

```text
src/types/animation.ts
src/hooks/useAnimationEngine.ts
```

任务：

- 新增 `VisualRole`、`TeachingState` 等可选类型。
- 在 `AnimationStep` 中新增 `teachingState?: TeachingState`。
- 在 `VisualState` 中新增 `teachingState?: TeachingState`。
- 确保旧脚本不受影响。

验收：

- `npm run build` 通过。
- 旧 preset 可播放。

### Step 2：ArrayRenderer 支持教学状态

目标：排序增强有展示容器。

修改文件：

```text
src/components/Canvas/renderers/ArrayRenderer.tsx
```

任务：

- 支持 `teachingState.variables` 显示。
- 支持 `teachingState.ranges` 显示。
- 支持 `teachingState.auxiliaryArrays` 显示。
- 支持 pivot/key/min/current 角色徽标。
- 保持旧脚本视觉不退化。

验收：

- 旧排序脚本可播放。
- 新增测试脚本能显示变量、区间和辅助数组。

### Step 3：增强核心排序生成器

目标：完成排序动画细节优化的主体。

修改文件：

```text
src/presets/generators.ts
src/presets/bubbleSort.ts
src/presets/selectionSort.ts
src/presets/insertionSort.ts
src/presets/mergeSort.ts
src/presets/quickSort.ts
```

任务：

- 先增强动态 generator，因为 Visualizer 会优先使用动态生成器时可覆盖自定义输入。
- 再同步静态 preset，保证无输入时的默认动画也教学友好。
- 优先覆盖冒泡、选择、插入、归并、快排。

验收：

- 五个核心排序算法可播放。
- 每个算法能表达关键变量和区间。
- 步骤说明中英完整。

### Step 4：增强高级排序生成器

目标：覆盖 Phase 2 要求中的更多排序算法。

修改文件：

```text
src/presets/generators.ts
src/presets/radixSort.ts
src/presets/bucketSort.ts
```

任务：

- 增强希尔排序、堆排序、计数排序。
- 增强基数排序、桶排序。
- 为辅助结构提供 `auxiliaryArrays`。

验收：

- 10 个排序算法均有稳定教学步骤。
- 非交换类排序能显示辅助结构。

### Step 5：GraphRenderer 支持图状态

目标：为图算法增强提供展示能力。

修改文件：

```text
src/components/Canvas/renderers/GraphRenderer.tsx
```

任务：

- 支持稳定布局。
- 支持边状态颜色。
- 支持边权显示。
- 支持队列、栈、距离表、输出序列等面板。
- 支持有向边箭头。

验收：

- BFS/DFS/Dijkstra 不抖动。
- 图节点和边状态可区分。
- 队列或距离表可见。

### Step 6：增强核心图算法 preset

目标：让主要图算法具备教学状态。

修改文件：

```text
src/presets/bfsGraph.ts
src/presets/dfsGraph.ts
src/presets/dijkstra.ts
src/presets/prim.ts
src/presets/kruskal.ts
src/presets/topologicalSort.ts
```

任务：

- BFS 增加队列和访问顺序。
- DFS 增加栈和回溯说明。
- Dijkstra 增加距离表和前驱。
- Prim/Kruskal 增加 MST 边状态。
- 拓扑排序增加入度表和输出序列。

验收：

- 每个算法的核心数据结构可见。
- 边状态不是只靠文字描述。

### Step 7：增强剩余图算法和矩阵算法

目标：补齐图算法集合。

修改文件：

```text
src/presets/bellmanFord.ts
src/presets/floyd.ts
src/presets/aStar.ts
src/components/Canvas/renderers/MatrixRenderer.tsx
```

任务：

- Bellman-Ford 增加轮次和松弛状态。
- Floyd 增加 k/i/j 和矩阵单元更新。
- A* 增加 open/closed 和 g/h/f 分数。

验收：

- 三个算法有稳定、清晰的教学步骤。
- Floyd 的矩阵状态可见。

### Step 8：TreeRenderer 支持真实树结构

目标：让树算法不再受完全二叉树布局限制。

修改文件：

```text
src/types/animation.ts
src/components/Canvas/renderers/TreeRenderer.tsx
src/hooks/useAnimationEngine.ts
```

任务：

- 支持 `treeNodes`、`root`、`children`。
- 支持节点元数据。
- 支持边状态。
- 支持遍历路径和旋转提示。
- 保持数组完全二叉树回退。

验收：

- 旧二叉树数据仍可显示。
- BST/AVL/Trie 可按真实结构显示。

### Step 9：增强树结构生成器

目标：树结构动画教学化。

修改文件：

```text
src/presets/binaryTree.ts
src/presets/bst.ts
src/presets/avlTree.ts
src/presets/redBlackTree.ts
src/presets/trie.ts
src/presets/segmentTree.ts
```

任务：

- 二叉树遍历展示路径和输出。
- BST 展示搜索/插入路径。
- AVL 展示高度、平衡因子和旋转。
- 红黑树展示颜色修复。
- Trie 展示字符路径和单词结束。
- Segment Tree 展示区间节点。

验收：

- 树节点状态、路径、元数据可见。
- AVL 和红黑树关键修复步骤清晰。

### Step 10：统一步骤说明和最终回归

目标：完成整体教学质量打磨。

修改文件：

```text
src/presets/*.ts
src/presets/generators.ts
src/data/algorithmDefs.ts
README.md
```

任务：

- 统一中英步骤说明风格。
- 检查变量值与动画状态一致。
- 在算法元数据中补充必要说明。
- 可选更新 README 中 Phase 2 状态。

验收：

- `npm run build` 通过。
- 手动播放验收清单中的算法。
- 无明显运行时报错。

---

## 十、建议新增/修改文件清单

### 建议新增

```text
src/presets/utils.ts
```

可选新增：

```text
src/types/teachingState.ts
src/components/Canvas/common/StateLegend.tsx
src/components/Canvas/common/VariablePanel.tsx
src/components/Canvas/common/AuxiliaryArrayPanel.tsx
src/components/Canvas/common/GraphStatePanel.tsx
```

是否拆分文件由实现工具决定。若新增公共组件，应保持简单，不要过早抽象复杂框架。

### 必改文件

```text
src/types/animation.ts
src/hooks/useAnimationEngine.ts
src/components/Canvas/renderers/ArrayRenderer.tsx
src/components/Canvas/renderers/GraphRenderer.tsx
src/components/Canvas/renderers/TreeRenderer.tsx
src/presets/generators.ts
```

### 排序相关文件

```text
src/presets/bubbleSort.ts
src/presets/selectionSort.ts
src/presets/insertionSort.ts
src/presets/mergeSort.ts
src/presets/quickSort.ts
src/presets/radixSort.ts
src/presets/bucketSort.ts
```

### 图算法相关文件

```text
src/presets/bfsGraph.ts
src/presets/dfsGraph.ts
src/presets/dijkstra.ts
src/presets/bellmanFord.ts
src/presets/floyd.ts
src/presets/prim.ts
src/presets/kruskal.ts
src/presets/topologicalSort.ts
src/presets/aStar.ts
```

### 树结构相关文件

```text
src/presets/binaryTree.ts
src/presets/bst.ts
src/presets/avlTree.ts
src/presets/redBlackTree.ts
src/presets/trie.ts
src/presets/segmentTree.ts
src/presets/fenwick.ts
```

### 可选修改

```text
src/components/Canvas/renderers/MatrixRenderer.tsx
src/data/algorithmDefs.ts
README.md
```

---

## 十一、不要做的事情

Phase 2 中不要做以下事项：

- 不要引入后端服务。
- 不要改变 AI API Key 的存储方式。
- 不要强制 AI 输出新协议。
- 不要让旧 `AnimationScript` 失效。
- 不要删除现有 preset 或 generator。
- 不要一次性重写整个渲染系统。
- 不要引入大型新图形框架替换当前 SVG/D3 方案。
- 不要把教学说明只写在 UI 中，应尽量进入 `AnimationScript.steps`。
- 不要只优化静态 preset 而忽略动态 generator。
- 不要只做视觉颜色变化而没有解释性状态。

---

## 十二、手动验收清单

### 协议兼容

- [ ] 旧脚本没有 `teachingState` 时仍可播放。
- [ ] `AnimationStep` 新字段均为可选。
- [ ] `npm run build` 通过。
- [ ] TypeScript 没有新增类型错误。

### 排序算法

- [ ] `bubble_sort` 显示轮次、比较、交换、已排序后缀。
- [ ] `selection_sort` 显示当前最小值候选。
- [ ] `insertion_sort` 显示 key、右移、插入位置和稳定性说明。
- [ ] `merge_sort` 显示拆分区间、辅助数组和写回。
- [ ] `quick_sort` 显示 pivot、分区边界和递归区间。
- [ ] `heap_sort` 显示 heapSize、父子比较和已排序后缀。
- [ ] `counting_sort` 显示 count 和 output 数组。
- [ ] `radix_sort` 显示当前位和桶/计数结构。
- [ ] `bucket_sort` 显示桶分配和收集过程。
- [ ] 所有排序最终状态正确。

### 图算法

- [ ] `bfs_graph` 显示队列和访问顺序。
- [ ] `dfs_graph` 显示栈/递归路径和回溯。
- [ ] `dijkstra` 显示距离表、前驱和松弛状态。
- [ ] `bellman_ford` 显示轮次和每条边松弛。
- [ ] `floyd` 显示 k/i/j 和矩阵更新。
- [ ] `prim` 显示候选边和 MST 集合。
- [ ] `kruskal` 显示边排序、并查集分量和成环跳过。
- [ ] `topological_sort` 显示入度、队列和输出序列。
- [ ] `a_star` 显示 open/closed、g/h/f 和最终路径。
- [ ] 图播放过程中布局稳定，不明显抖动。

### 树结构

- [ ] `binary_tree` 显示遍历路径和输出序列。
- [ ] `bst` 显示搜索/插入路径。
- [ ] `avl_tree` 显示高度、平衡因子和旋转类型。
- [ ] `red_black_tree` 显示红黑颜色、父/叔/祖父和修复过程。
- [ ] `trie` 显示字符路径、前缀和单词结束标记。
- [ ] `segment_tree` 显示区间节点和查询/更新路径。
- [ ] `fenwick_tree` 显示 lowbit 和跳转路径。
- [ ] TreeRenderer 能使用真实树结构，不只依赖完全二叉树数组下标。

### 步骤说明

- [ ] 每一步都有 `zh` 和 `en`。
- [ ] 关键分支说明“为什么”。
- [ ] 变量值与可视状态一致。
- [ ] 失败分支有说明。
- [ ] 最终步骤说明结果。
- [ ] 英文说明没有明显语法或变量错误。

### 回归页面

- [ ] `/visualizer` 可正常选择和播放算法。
- [ ] `/playground` 旧 AI 返回脚本仍可播放。
- [ ] `/settings` 不受影响。
- [ ] 首页不受影响。

---

## 十三、推荐测试数据

### 排序测试数据

建议至少使用以下输入测试排序生成器：

```text
[5, 3, 8, 1, 9, 2]
[1, 2, 3, 4, 5]
[5, 4, 3, 2, 1]
[3, 3, 2, 1, 2]
[10, 1, 100, 50, 5]
```

关注点：

- 已有序数组是否能体现提前结束或少移动。
- 逆序数组是否能正确排序。
- 重复元素是否能解释稳定性。
- 大小差距较大的数值是否仍能正常显示柱状图。

### 图算法测试图

建议使用一个包含 6 个节点的加权图：

```text
nodes: A, B, C, D, E, F
edges:
A-B: 4
A-C: 2
B-C: 1
B-D: 5
C-D: 8
C-E: 10
D-E: 2
D-F: 6
E-F: 3
```

关注点：

- BFS/DFS 可使用无权视角。
- Dijkstra/Prim/Kruskal 可使用权重。
- 节点和边布局稳定。
- 权重标签不遮挡节点。

### 有向图测试数据

用于拓扑排序和部分最短路：

```text
A -> C
B -> C
B -> D
C -> E
D -> F
E -> F
```

关注点：

- 入度初始化正确。
- 入度为 0 的节点入队顺序稳定。
- 输出拓扑序合理。

### 树结构测试数据

BST 插入序列：

```text
[8, 3, 10, 1, 6, 14, 4, 7, 13]
```

AVL 插入序列：

```text
LL: [30, 20, 10]
RR: [10, 20, 30]
LR: [30, 10, 20]
RL: [10, 30, 20]
```

Trie 单词集合：

```text
["cat", "car", "dog", "door"]
```

关注点：

- BST 左右分支正确。
- AVL 四种旋转都有演示。
- Trie 共享前缀清晰。

---

## 十四、交付建议

建议每完成一个大任务提交一次变更：

1. `feat(animation): add optional teaching state protocol`
2. `feat(array): render variables ranges and auxiliary arrays`
3. `feat(presets): enhance sorting animation generators`
4. `feat(graph): add graph state rendering panels`
5. `feat(presets): enrich graph algorithm teaching steps`
6. `feat(tree): support explicit tree structure and node metadata`
7. `feat(presets): enrich tree algorithm teaching steps`
8. `chore: normalize preset step descriptions and run build`

如果由 AI 编程工具自动实现，建议一次只执行一个 Step。每个 Step 完成后先运行构建，再人工播放 2-3 个代表算法，确认没有破坏旧功能后再继续下一步。
