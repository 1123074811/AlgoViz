# AlgoViz 场景化算法动画引擎优化方案

## 1. 背景与目标

当前 AlgoViz 已经具备以下基础能力：

- 基于 `AnimationScript` 的统一动画数据协议。
- 数组、图、树、矩阵、链表等基础渲染器入口。
- `useAnimationEngine` 根据 `steps` 回放并派生可视状态。
- AI 可根据用户代码生成结构化 JSON。
- Phase 3 已增强 AI 输出校验、输入结构识别、错误报告与自动修复能力。

这些能力已经可以支撑“算法步骤播放”，但如果希望达到类似教学课件、动态交互演示甚至游戏化模拟的效果，现有模型仍有明显限制：

1. 当前渲染器大多面向“某一类结构的当前状态”，而不是一个可组合、可扩展、可持续演化的动画世界。
2. 链表节点、树节点、图节点、数组格子等视觉元素缺少统一抽象，无法作为可复用的“游戏对象”被创建、连接、移动、销毁和高亮。
3. AI 如果直接输出具体布局、坐标或 UI 细节，会非常不稳定，也难以适配不同屏幕尺寸。
4. 对于双向链表、循环链表、跳表、B 树、Trie、AVL 旋转、图算法松弛等更复杂结构，固定渲染器很容易快速膨胀。

因此，本方案建议在现有 `AnimationScript` 和渲染体系之上新增一层：

> **Scene Engine：场景化算法动画引擎**

它的目标不是替代现有渲染器，而是提供一套可扩展的动画对象系统，使 AlgoViz 可以从“渲染某个状态”升级为“播放算法事件驱动的动态场景”。

---

## 2. 总体设计原则

### 2.1 AI 只描述算法语义，不负责画图

AI 不应该输出：

- 节点坐标。
- CSS 样式。
- 具体箭头路径。
- 绝对布局尺寸。
- DOM 结构。
- 动画时长细节。

AI 应该输出：

- 当前算法使用的数据结构。
- 当前发生的算法事件。
- 操作目标。
- 变量状态。
- 教学说明。
- 复杂度和统计信息。

例如，AI 不输出：

```json
{
  "nodeId": "n4",
  "x": 320,
  "y": 140,
  "width": 48,
  "height": 32
}
```

而应输出：

```json
{
  "type": "linked_list.insert_after",
  "targetNodeId": "n3",
  "newNode": {
    "id": "n4",
    "value": 4
  }
}
```

布局、动画和视觉表现由前端 Scene Engine 决定。

### 2.2 基础图元必须可组合

链表节点、树节点、图节点、B 树节点、跳表节点本质上都是“节点”，区别在于：

- 有哪些字段。
- 有哪些端口。
- 端口怎么连接。
- 节点如何布局。
- 节点在当前算法中扮演什么角色。

因此不应写死：

```ts
SinglyLinkedNode = data + next
```

而应抽象为：

```ts
NodeEntity = fields + ports + state + variant
```

### 2.3 动画由事件驱动

系统不应仅依赖每一步的最终状态，而应支持事件：

- 创建节点。
- 删除节点。
- 移动节点。
- 连接端口。
- 断开连接。
- 移动指针。
- 高亮对象。
- 设置标签。
- 重新布局。
- 等待。

这让链表插入、树旋转、图松弛、N 皇后回溯等操作都能拆解成连续动画。

### 2.4 渐进式接入，不推翻现有系统

现有系统仍然保留：

- `ArrayRenderer`
- `GraphRenderer`
- `TreeRenderer`
- `MatrixRenderer`
- `LinkedListRenderer`
- `useAnimationEngine`
- `AnimationScript.action`
- `AnimationScript.teachingState`

新增 Scene Engine 后：

- 如果 `step.events` 存在，优先使用 Scene Engine。
- 如果没有 `step.events`，继续使用现有 Renderer。
- 预制算法可以逐步迁移。
- AI 生成逻辑可以逐步增强。

---

## 3. 推荐总体架构

```text
用户代码 / 预制算法
        ↓
AnimationScript
        ↓
AnimationStep.events（算法语义事件）
        ↓
Event Compiler（事件编译器）
        ↓
SceneCommand[]（视觉命令）
        ↓
SceneEngine（场景状态机 + 动画调度）
        ↓
SceneState
        ↓
SceneCanvas + Primitives
        ↓
动态算法动画
```

建议新增目录：

```text
src/scene/
  index.ts
  types.ts
  eventTypes.ts
  commandTypes.ts
  SceneCanvas.tsx
  SceneEngine.ts
  eventCompiler.ts
  registry.ts

  primitives/
    NodeView.tsx
    EdgeView.tsx
    PointerView.tsx
    LabelView.tsx
    GroupView.tsx
    CellView.tsx
    HighlightView.tsx

  layouts/
    linkedListLayout.ts
    treeLayout.ts
    graphLayout.ts
    matrixLayout.ts
    arrayLayout.ts

  compilers/
    linkedListCompiler.ts
    treeCompiler.ts
    graphCompiler.ts
    arrayCompiler.ts
    matrixCompiler.ts
    nQueensCompiler.ts

  variants/
    nodeVariants.ts
    edgeVariants.ts
```

---

## 4. 核心数据模型

### 4.1 Point 与 Size

```ts
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}
```

Scene Engine 内部可以使用逻辑坐标，例如：

- `x: 0-1000`
- `y: 0-600`

最终由 `SceneCanvas` 根据容器尺寸缩放。

---

### 4.2 SceneState

```ts
export interface SceneState {
  entities: Record<string, SceneEntity>
  edges: Record<string, SceneEdge>
  pointers: Record<string, ScenePointer>
  labels: Record<string, SceneLabel>
  groups: Record<string, SceneGroup>
  camera?: SceneCamera
  selectedIds?: string[]
}
```

其中：

```ts
export interface SceneCamera {
  x: number
  y: number
  zoom: number
}
```

---

### 4.3 SceneEntity 联合类型

```ts
export type SceneEntity =
  | SceneNode
  | SceneCell
  | SceneLabel
  | SceneGroup
  | ScenePointer
```

边可以单独维护在 `edges` 中，也可以作为实体之一。建议单独维护，便于做连接关系查询。

---

## 5. 通用节点模型 NodeEntity

### 5.1 SceneNode

```ts
export interface SceneNode {
  id: string
  type: 'node'
  variant: string
  position: Point
  size?: Size
  fields: NodeField[]
  ports: NodePort[]
  state?: SceneEntityState
  meta?: Record<string, unknown>
}
```

关键点：

- `variant` 决定节点视觉模板。
- `fields` 决定节点内部显示内容。
- `ports` 决定节点有哪些可连接点。
- `state` 决定高亮、访问、删除、冲突等视觉状态。
- `meta` 存放具体算法扩展数据。

---

### 5.2 NodeField

```ts
export interface NodeField {
  id: string
  label?: string
  value?: string | number | boolean | null
  role?:
    | 'data'
    | 'key'
    | 'value'
    | 'index'
    | 'metadata'
    | 'pointer_slot'
    | 'custom'
  width?: number
  color?: ActionColor
  state?: SceneEntityState
}
```

字段用于表示节点内部结构。

例如单链表：

```json
[
  { "id": "data", "label": "data", "value": 1, "role": "data" },
  { "id": "next", "label": "next", "role": "pointer_slot" }
]
```

双向链表：

```json
[
  { "id": "prev", "label": "prev", "role": "pointer_slot" },
  { "id": "data", "label": "data", "value": 1, "role": "data" },
  { "id": "next", "label": "next", "role": "pointer_slot" }
]
```

B 树节点：

```json
[
  { "id": "key0", "value": 10, "role": "key" },
  { "id": "key1", "value": 20, "role": "key" }
]
```

---

### 5.3 NodePort

```ts
export interface NodePort {
  id: string
  side:
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'center'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-left'
    | 'top-right'
  role:
    | 'input'
    | 'output'
    | 'next'
    | 'prev'
    | 'left'
    | 'right'
    | 'parent'
    | 'child'
    | 'forward'
    | 'backward'
    | 'custom'
  label?: string
  index?: number
  offset?: Point
  visible?: boolean
}
```

端口是可扩展性的核心。

一个节点可以有：

- 一个 `next` 指针。
- 一个 `prev` 指针。
- 多个 `child` 指针。
- 多层 `forward` 指针。
- 自定义端口。

---

### 5.4 SceneEdge

```ts
export interface SceneEdge {
  id: string
  type: 'edge'
  from: AnchorRef
  to: AnchorRef
  directed?: boolean
  label?: string
  variant?: string
  state?: SceneEntityState
  style?: EdgeStyle
  meta?: Record<string, unknown>
}

export interface AnchorRef {
  entityId: string
  portId?: string
}

export interface EdgeStyle {
  dashed?: boolean
  curved?: boolean
  thickness?: number
  color?: ActionColor
}
```

边应该连接端口，而不是连接节点中心。

示例：

```json
{
  "id": "e_n1_n2",
  "type": "edge",
  "from": { "entityId": "n1", "portId": "next" },
  "to": { "entityId": "n2", "portId": "input" },
  "directed": true
}
```

---

### 5.5 ScenePointer

```ts
export interface ScenePointer {
  id: string
  type: 'pointer'
  label: string
  target: AnchorRef | null
  position?: Point
  variant?: string
  state?: SceneEntityState
}
```

用于表示：

- `head`
- `tail`
- `cur`
- `prev`
- `fast`
- `slow`
- `root`
- `parent`

指针可以指向某个节点的某个端口，也可以指向 `null`。

---

### 5.6 SceneEntityState

```ts
export interface SceneEntityState {
  role?:
    | 'idle'
    | 'active'
    | 'visited'
    | 'comparing'
    | 'swapping'
    | 'inserted'
    | 'deleted'
    | 'conflict'
    | 'safe'
    | 'sorted'
    | 'candidate'
    | 'current'
  color?: ActionColor
  opacity?: number
  pulse?: boolean
  disabled?: boolean
  badge?: string
  note?: string
}
```

状态用于统一控制视觉表现：

- 高亮。
- 闪烁。
- 透明度。
- 标记。
- 徽章。
- 删除态。
- 当前态。
- 冲突态。

---

## 6. 节点 Variant 设计

`variant` 决定节点模板和默认字段/端口布局。

建议约定：

```text
linked_list.singly
linked_list.doubly
linked_list.circular
skip_list.node
tree.binary
tree.avl
tree.btree
tree.trie
graph.vertex
matrix.cell
array.cell
n_queens.cell
```

---

### 6.1 单链表节点

```ts
variant = 'linked_list.singly'
fields = ['data', 'next']
ports = ['input', 'next']
```

视觉结构：

```text
┌──────┬──────┐
│ data │ next │
└──────┴──────┘
```

---

### 6.2 双向链表节点

```ts
variant = 'linked_list.doubly'
fields = ['prev', 'data', 'next']
ports = ['prev', 'next']
```

视觉结构：

```text
┌──────┬──────┬──────┐
│ prev │ data │ next │
└──────┴──────┴──────┘
```

---

### 6.3 跳表节点

```ts
variant = 'skip_list.node'
fields = ['data', 'forward0', 'forward1', 'forward2']
ports = ['forward0', 'forward1', 'forward2']
```

跳表节点端口数量随层高动态变化。

---

### 6.4 二叉树节点

```ts
variant = 'tree.binary'
fields = ['value']
ports = ['parent', 'left', 'right']
```

视觉结构：

```text
      parent
        │
      value
     /     \
  left     right
```

---

### 6.5 AVL 节点

```ts
variant = 'tree.avl'
fields = ['value', 'height', 'balanceFactor']
ports = ['parent', 'left', 'right']
```

AVL 节点可以额外显示：

- 高度。
- 平衡因子。
- 旋转状态。

---

### 6.6 B 树节点

```ts
variant = 'tree.btree'
fields = ['key0', 'key1', 'key2']
ports = ['child0', 'child1', 'child2', 'child3']
```

B 树节点字段和端口数量都动态变化。

---

## 7. AlgorithmEvent：算法语义事件协议

`AlgorithmEvent` 是给 AI 和预制算法生成器使用的高层协议。

建议在 `AnimationStep` 中新增：

```ts
export interface AnimationStep {
  stepId: number
  codeLine: number
  description: {
    zh: string
    en: string
  }
  action: AnimationAction
  events?: AlgorithmEvent[]
  teachingState?: TeachingState
  stats: StepStats
}
```

保留 `action` 是为了兼容旧渲染器。

---

### 7.1 通用事件

```ts
export type CommonAlgorithmEvent =
  | {
      type: 'scene.note'
      text: string
    }
  | {
      type: 'scene.highlight'
      entityId: string
      color?: ActionColor
      role?: SceneEntityState['role']
    }
  | {
      type: 'scene.clear_highlight'
      entityIds?: string[]
    }
  | {
      type: 'scene.wait'
      duration?: number
    }
```

---

### 7.2 链表事件

```ts
export type LinkedListAlgorithmEvent =
  | {
      type: 'linked_list.create'
      variant: 'singly' | 'doubly' | 'circular'
      nodes: Array<{ id: string; value: number | string }>
      headId?: string
      tailId?: string
    }
  | {
      type: 'linked_list.visit'
      nodeId: string
      pointerId?: string
    }
  | {
      type: 'linked_list.move_pointer'
      pointerId: string
      toNodeId: string | null
    }
  | {
      type: 'linked_list.insert_after'
      targetNodeId: string
      newNode: { id: string; value: number | string }
    }
  | {
      type: 'linked_list.insert_before'
      targetNodeId: string
      newNode: { id: string; value: number | string }
    }
  | {
      type: 'linked_list.delete'
      nodeId: string
    }
  | {
      type: 'linked_list.reverse_link'
      fromNodeId: string
      toNodeId: string | null
    }
  | {
      type: 'linked_list.set_head'
      nodeId: string | null
    }
  | {
      type: 'linked_list.set_tail'
      nodeId: string | null
    }
```

---

### 7.3 树事件

```ts
export type TreeAlgorithmEvent =
  | {
      type: 'tree.create'
      variant: 'binary' | 'bst' | 'avl' | 'btree' | 'trie'
      rootId: string
      nodes: Array<{ id: string; value: number | string }>
      edges: Array<{ parentId: string; childId: string; port?: string }>
    }
  | {
      type: 'tree.visit'
      nodeId: string
    }
  | {
      type: 'tree.compare'
      nodeId: string
      value: number | string
      result?: 'less' | 'greater' | 'equal'
    }
  | {
      type: 'tree.insert'
      parentId: string
      node: { id: string; value: number | string }
      side?: 'left' | 'right' | string
    }
  | {
      type: 'tree.delete'
      nodeId: string
    }
  | {
      type: 'tree.rotate'
      rotation: 'left' | 'right' | 'left-right' | 'right-left'
      pivotId: string
    }
  | {
      type: 'tree.update_metadata'
      nodeId: string
      height?: number
      balanceFactor?: number
      metadata?: Record<string, unknown>
    }
```

---

### 7.4 数组事件

```ts
export type ArrayAlgorithmEvent =
  | {
      type: 'array.create'
      values: Array<number | string>
    }
  | {
      type: 'array.compare'
      indices: [number, number]
    }
  | {
      type: 'array.swap'
      indices: [number, number]
    }
  | {
      type: 'array.move'
      from: number
      to: number
    }
  | {
      type: 'array.mark_sorted'
      indices: number[]
    }
  | {
      type: 'array.partition'
      pivotIndex: number
      left: number
      right: number
    }
```

---

### 7.5 图事件

```ts
export type GraphAlgorithmEvent =
  | {
      type: 'graph.create'
      nodes: Array<{ id: string; label?: string }>
      edges: Array<{ id?: string; source: string; target: string; weight?: number }>
      directed?: boolean
    }
  | {
      type: 'graph.visit_node'
      nodeId: string
    }
  | {
      type: 'graph.visit_edge'
      source: string
      target: string
    }
  | {
      type: 'graph.relax_edge'
      source: string
      target: string
      oldDistance?: number | string
      newDistance?: number | string
      success: boolean
    }
  | {
      type: 'graph.enqueue'
      nodeId: string
    }
  | {
      type: 'graph.dequeue'
      nodeId: string
    }
```

---

### 7.6 矩阵与棋盘事件

```ts
export type MatrixAlgorithmEvent =
  | {
      type: 'matrix.create'
      rows: number
      cols: number
      values?: Array<Array<number | string>>
    }
  | {
      type: 'matrix.visit_cell'
      row: number
      col: number
    }
  | {
      type: 'matrix.update_cell'
      row: number
      col: number
      value: number | string
    }
  | {
      type: 'matrix.mark_path'
      cells: Array<{ row: number; col: number }>
    }
  | {
      type: 'matrix.mark_conflict'
      cells: Array<{ row: number; col: number }>
    }
```

N 皇后可基于矩阵扩展：

```ts
export type NQueensAlgorithmEvent =
  | {
      type: 'n_queens.try_place'
      row: number
      col: number
    }
  | {
      type: 'n_queens.place'
      row: number
      col: number
    }
  | {
      type: 'n_queens.conflict'
      row: number
      col: number
      conflicts: Array<{ row: number; col: number }>
    }
  | {
      type: 'n_queens.backtrack'
      row: number
      col: number
    }
  | {
      type: 'n_queens.solution'
      queens: Array<{ row: number; col: number }>
    }
```

---

## 8. SceneCommand：视觉命令协议

`SceneCommand` 是前端内部协议，由事件编译器生成，不建议让 AI 直接输出。

```ts
export type SceneCommand =
  | CreateNodeCommand
  | RemoveEntityCommand
  | MoveEntityCommand
  | ConnectCommand
  | DisconnectCommand
  | SetStateCommand
  | SetFieldCommand
  | SetFieldsCommand
  | AddPortCommand
  | RemovePortCommand
  | MovePointerCommand
  | RelayoutCommand
  | WaitCommand
```

---

### 8.1 创建节点

```ts
export interface CreateNodeCommand {
  type: 'create_node'
  node: SceneNode
  animation?: 'fade' | 'scale' | 'drop' | 'none'
}
```

---

### 8.2 移动实体

```ts
export interface MoveEntityCommand {
  type: 'move'
  entityId: string
  to: Point
  duration?: number
  easing?: 'linear' | 'ease' | 'spring'
}
```

---

### 8.3 连接端口

```ts
export interface ConnectCommand {
  type: 'connect'
  edge: SceneEdge
  animation?: 'draw' | 'fade' | 'none'
}
```

---

### 8.4 断开连接

```ts
export interface DisconnectCommand {
  type: 'disconnect'
  edgeId: string
  animation?: 'fade' | 'cut' | 'none'
}
```

---

### 8.5 设置状态

```ts
export interface SetStateCommand {
  type: 'set_state'
  entityId: string
  state: SceneEntityState
  merge?: boolean
}
```

---

### 8.6 移动指针

```ts
export interface MovePointerCommand {
  type: 'move_pointer'
  pointerId: string
  target: AnchorRef | null
  duration?: number
}
```

---

### 8.7 重新布局

```ts
export interface RelayoutCommand {
  type: 'relayout'
  layout: 'linked_list' | 'tree' | 'graph' | 'matrix' | 'array'
  scope?: string[]
  duration?: number
}
```

---

### 8.8 删除实体

```ts
export interface RemoveEntityCommand {
  type: 'remove_entity'
  entityId: string
  animation?: 'fade' | 'shrink' | 'none'
}
```

删除实体时，Scene Engine 应同步处理相关边和指针：

- 删除节点时，清理连接到该节点端口的边。
- 删除节点时，指向该节点的指针应转为 `null` 或根据事件编译器指定目标移动。
- 删除边时，不应删除两端节点。

---

### 8.9 更新字段

```ts
export interface SetFieldCommand {
  type: 'set_field'
  nodeId: string
  fieldId: string
  field: Partial<NodeField>
  animation?: 'flash' | 'fade' | 'none'
}

export interface SetFieldsCommand {
  type: 'set_fields'
  nodeId: string
  fields: NodeField[]
  animation?: 'morph' | 'fade' | 'none'
}
```

字段更新用于支持：

- B 树节点 key 数量变化。
- Trie 节点字符或终止标记变化。
- AVL 节点高度和平衡因子变化。
- 动态规划单元格数值变化。

---

### 8.10 动态端口

```ts
export interface AddPortCommand {
  type: 'add_port'
  nodeId: string
  port: NodePort
  animation?: 'fade' | 'none'
}

export interface RemovePortCommand {
  type: 'remove_port'
  nodeId: string
  portId: string
  animation?: 'fade' | 'none'
}
```

动态端口用于支持更复杂的数据结构：

- 双向链表节点具备 `prev` 和 `next`。
- 跳表节点根据层高动态增加 `forward0`、`forward1`、`forward2` 等端口。
- B 树节点根据 key 数量动态维护 `child0...childN` 端口。
- 图节点可以拥有多个入边/出边连接点。

---

### 8.11 等待命令

```ts
export interface WaitCommand {
  type: 'wait'
  duration: number
}
```

等待命令用于将复杂操作拆成多个可观察阶段，例如链表插入时先展示新节点，再展示指针重连，最后执行整体布局。

---

## 9. 事件编译器设计

事件编译器负责：

```text
AlgorithmEvent -> SceneCommand[]
```

### 9.1 编译器注册表

```ts
export interface EventCompiler {
  supports: (event: AlgorithmEvent) => boolean
  compile: (event: AlgorithmEvent, context: CompileContext) => SceneCommand[]
}

export interface CompileContext {
  scene: SceneState
  stepIndex: number
  script: AnimationScript
}
```

注册：

```ts
export const compilers: EventCompiler[] = [
  linkedListCompiler,
  treeCompiler,
  graphCompiler,
  arrayCompiler,
  matrixCompiler,
  nQueensCompiler,
]
```

---

### 9.2 链表插入编译示例

高层事件：

```json
{
  "type": "linked_list.insert_after",
  "targetNodeId": "n3",
  "newNode": { "id": "n4", "value": 4 }
}
```

编译过程：

1. 查找 `n3.next` 当前连接到哪个节点。
2. 创建新节点 `n4`，初始位置放在 `n3` 下方。
3. 高亮 `n3` 和原后继节点。
4. 连接 `n4.next -> oldNext`。
5. 断开 `n3.next -> oldNext`。
6. 连接 `n3.next -> n4`。
7. 重新执行链表布局。
8. 高亮 `n4` 为插入成功。

生成命令：

```ts
[
  { type: 'set_state', entityId: 'n3', state: { role: 'active', color: 'warning', pulse: true } },
  { type: 'create_node', node: createSinglyNode('n4', 4) },
  { type: 'connect', edge: createEdge('n4_next_old', 'n4', 'next', oldNextId, 'input') },
  { type: 'disconnect', edgeId: oldEdgeId },
  { type: 'connect', edge: createEdge('n3_next_n4', 'n3', 'next', 'n4', 'input') },
  { type: 'relayout', layout: 'linked_list', duration: 500 },
  { type: 'set_state', entityId: 'n4', state: { role: 'inserted', color: 'success' } }
]
```

---

### 9.3 树旋转编译示例

事件：

```json
{
  "type": "tree.rotate",
  "rotation": "left",
  "pivotId": "node_3"
}
```

编译过程：

1. 找到 pivot、右子节点、右子节点左子树。
2. 高亮旋转相关节点和边。
3. 更新父子边关系。
4. 执行树布局。
5. 所有节点平滑移动到新位置。
6. 更新高度和平衡因子。

---

## 10. 布局系统设计

### 10.1 布局职责

布局器只负责计算位置，不负责动画。

```ts
export interface LayoutEngine {
  layout: (scene: SceneState, options?: LayoutOptions) => Record<string, Point>
}
```

Scene Engine 根据布局结果生成 `move` 命令。

---

### 10.2 链表布局

单链表：

```text
head -> n1 -> n2 -> n3 -> null
```

默认横向排列：

- 节点间距固定。
- `head` 指针在首节点上方。
- `tail` 指针可选。
- `null` 作为特殊节点。

双向链表：

- `next` 边在上方或中线。
- `prev` 边可以使用弧线或下方回边。
- 节点字段显示 `prev/data/next`。

循环链表：

- 尾节点 `next` 回连头节点。
- 回连边使用弧线绕过节点。

---

### 10.3 树布局

二叉树：

- 根节点居中。
- 左右子树递归分布。
- 同层节点保持相同 `y`。
- 子树间距根据叶子数量动态调整。

AVL / 红黑树：

- 节点额外显示高度、颜色或平衡因子。
- 旋转后使用同一布局器重新计算位置。

B 树：

- 每个节点宽度由 key 数量决定。
- 子节点根据 child port 对齐。

---

### 10.4 图布局

图布局可以分阶段实现：

1. 首期使用圆形布局或网格布局。
2. 后续支持力导向布局。
3. 对 BFS/DFS 可支持层级布局。
4. 对最短路可支持距离标签和路径高亮。

---

### 10.5 矩阵布局

矩阵布局：

- 固定网格。
- 每个单元格作为 `SceneCell`。
- 支持访问、高亮、更新、路径、冲突区域。

N 皇后：

- 棋盘是矩阵布局的特殊 variant。
- 皇后可以是 cell 内图标，也可以是独立实体。
- 冲突格、可放置格、回溯格通过 cell state 表示。

---

## 11. SceneCanvas 与基础图元

### 11.1 SceneCanvas

`SceneCanvas` 负责：

- 接收 `SceneState`。
- 渲染所有节点、边、指针、标签、分组。
- 处理缩放与自适应。
- 调度 Framer Motion 或 CSS/SVG 动画。

建议使用 SVG 作为第一阶段实现：

- 适合线条、节点、箭头。
- 容易做坐标系转换。
- 与现有项目渲染风格一致。

后续如需大量节点，可再考虑 Canvas 或 WebGL。

---

### 11.2 NodeView

通用节点视图根据 `variant` 渲染：

```ts
const nodeVariantViews = {
  'linked_list.singly': SinglyLinkedNodeView,
  'linked_list.doubly': DoublyLinkedNodeView,
  'tree.binary': BinaryTreeNodeView,
  'tree.avl': AvlNodeView,
  'tree.btree': BTreeNodeView,
  'graph.vertex': GraphVertexView,
}
```

所有节点视图共享：

- 选中态。
- 高亮态。
- pulse 动画。
- badge。
- note。
- fade in / fade out。

---

### 11.3 EdgeView

`EdgeView` 根据端口位置自动连线。

支持：

- 直线。
- 曲线。
- 折线。
- 虚线。
- 箭头。
- 标签。
- 绘制动画。
- 高亮动画。

---

### 11.4 PointerView

`PointerView` 用于显示指针变量。

常见形态：

```text
head
  ↓
 node
```

支持：

- 指针移动。
- 指针为空。
- 多指针同时存在。
- `cur`、`prev`、`fast`、`slow` 等标签。

---

## 12. 与现有 AnimationScript 的集成

### 12.1 类型扩展

建议在 `src/types/animation.ts` 中新增：

```ts
export interface AnimationScript {
  algorithm: string
  complexity: Complexity
  initialState: InitialState
  presentation?: PresentationConfig
  steps: AnimationStep[]
}

export interface PresentationConfig {
  engine?: 'classic' | 'scene'
  module?: string
  variant?: string
  layout?: string
}
```

`AnimationStep` 新增：

```ts
events?: AlgorithmEvent[]
```

### 12.2 兼容策略

渲染决策：

```text
if script.presentation.engine === 'scene' 或当前 step 有 events:
  使用 SceneCanvas
else:
  使用现有 VisualizationCanvas 分发逻辑
```

也可以在 `VisualizationCanvas` 中增加：

```ts
const shouldUseSceneEngine = script.presentation?.engine === 'scene' || script.steps.some(step => step.events?.length)
```

---

## 13. AI Prompt 升级方案

### 13.1 总原则

Prompt 中应明确告诉 AI：

```text
你不要输出 UI 坐标、布局、CSS 或动画细节。
你只需要输出算法语义事件 events。
前端 Scene Engine 会根据 events 自动生成动画。
```

### 13.2 新增输出字段说明

```text
如果算法涉及结构动态变化，请在每个 step 中输出 events。

events 是算法语义事件数组，不是 UI 指令。

合法事件包括：
- linked_list.create
- linked_list.visit
- linked_list.move_pointer
- linked_list.insert_after
- linked_list.delete
- linked_list.reverse_link
- tree.create
- tree.visit
- tree.insert
- tree.rotate
- graph.visit_node
- graph.relax_edge
- array.compare
- array.swap
- matrix.visit_cell
- n_queens.try_place
```

### 13.3 链表 Prompt 示例

```text
当代码是链表算法时：
1. 使用 presentation.engine = "scene"。
2. 使用 initialState.type = "linked_list"。
3. 如果是单链表，events 中使用 variant = "singly"。
4. 如果是双向链表，events 中使用 variant = "doubly"。
5. 不要输出节点坐标。
6. 不要输出箭头路径。
7. 插入、删除、反转必须用 linked_list.* 事件描述。
```

### 13.4 树 Prompt 示例

```text
当代码是树结构算法时：
1. 使用 presentation.engine = "scene"。
2. 使用 tree.* 事件描述访问、比较、插入、删除、旋转。
3. 如果是 AVL 或红黑树，需要输出节点 metadata，例如 height、balanceFactor 或 color。
4. 不要输出节点坐标。
```

---

## 14. Schema 校验升级方案

Phase 3 已有 `schema.ts`，可以继续扩展：

### 14.1 校验 presentation

```ts
presentation?: {
  engine?: 'classic' | 'scene'
  module?: string
  variant?: string
  layout?: string
}
```

校验规则：

- `engine` 必须是 `classic` 或 `scene`。
- 如果 `engine = scene`，建议至少一个 step 包含 `events`。
- `module` 可以是 `linked_list`、`tree`、`graph`、`array`、`matrix`、`n_queens` 等。

### 14.2 校验 events

基础规则：

- `events` 必须是数组。
- 每个事件必须有 `type`。
- `type` 必须属于白名单。
- 不同事件检查必填字段。

例如：

```text
linked_list.insert_after 必须包含 targetNodeId 和 newNode。
linked_list.create 必须包含 variant 和 nodes。
tree.rotate 必须包含 rotation 和 pivotId。
array.swap 必须包含 indices，且长度为 2。
n_queens.try_place 必须包含 row 和 col。
```

### 14.3 自动修复策略

可恢复问题：

- `events` 缺失但 `action` 足够明确，可保持 classic 渲染。
- `variant` 缺失时，根据 `initialState.type` 和 algorithm 推断。
- `node id` 是数字时转换为字符串。
- `indices` 是单个值时转为数组失败报告。

不可恢复问题：

- 事件没有 `type`。
- 插入事件缺少新节点。
- 边连接引用不存在的节点。
- 树旋转 pivot 不存在。

---

## 15. 预制算法与 AI 的分工

### 15.1 预制算法

预制算法应尽可能生成高质量 `events`。

例如：

- 冒泡排序生成 `array.compare`、`array.swap`、`array.mark_sorted`。
- 链表插入生成 `linked_list.create`、`linked_list.visit`、`linked_list.insert_after`。
- AVL 插入生成 `tree.compare`、`tree.insert`、`tree.rotate`、`tree.update_metadata`。

预制算法是最适合验证 Scene Engine 的数据来源。

### 15.2 AI 生成

AI 生成可以分阶段：

1. 第一阶段：仍输出 `action`，只对链表和树补充少量 `events`。
2. 第二阶段：对已支持模块强制输出 `events`。
3. 第三阶段：对未知算法仍回退 classic renderer。

---

## 16. 示例：双向链表插入动画

### 16.1 AI 输出

```json
{
  "algorithm": "doubly_linked_list_insert",
  "presentation": {
    "engine": "scene",
    "module": "linked_list",
    "variant": "doubly"
  },
  "initialState": {
    "type": "linked_list",
    "data": [1, 3, 5]
  },
  "steps": [
    {
      "stepId": 1,
      "codeLine": 0,
      "description": {
        "zh": "创建双向链表 1 ⇄ 3 ⇄ 5",
        "en": "Create a doubly linked list 1 ⇄ 3 ⇄ 5"
      },
      "action": {
        "type": "highlight",
        "targets": [],
        "color": "primary"
      },
      "events": [
        {
          "type": "linked_list.create",
          "variant": "doubly",
          "nodes": [
            { "id": "n1", "value": 1 },
            { "id": "n3", "value": 3 },
            { "id": "n5", "value": 5 }
          ],
          "headId": "n1",
          "tailId": "n5"
        }
      ],
      "stats": {
        "comparisons": 0,
        "swaps": 0,
        "accesses": 3
      }
    },
    {
      "stepId": 2,
      "codeLine": 5,
      "description": {
        "zh": "在节点 3 后插入节点 4",
        "en": "Insert node 4 after node 3"
      },
      "action": {
        "type": "insert",
        "targets": [1],
        "color": "warning",
        "value": 4
      },
      "events": [
        {
          "type": "linked_list.insert_after",
          "targetNodeId": "n3",
          "newNode": { "id": "n4", "value": 4 }
        }
      ],
      "stats": {
        "comparisons": 0,
        "swaps": 0,
        "accesses": 5
      }
    }
  ]
}
```

### 16.2 前端生成动画

```text
Step 1:
- 创建 n1、n3、n5。
- 每个节点使用 doubly variant，显示 prev/data/next。
- 建立 next 和 prev 双向边。
- 创建 head 和 tail 指针。

Step 2:
- 高亮 n3。
- 创建 n4，初始放在 n3 下方。
- n4.next 指向 n5。
- n4.prev 指向 n3。
- 断开 n3.next -> n5。
- 断开 n5.prev -> n3。
- 连接 n3.next -> n4。
- 连接 n5.prev -> n4。
- 重新布局成 n1 ⇄ n3 ⇄ n4 ⇄ n5。
```

---

## 17. 示例：AVL 左旋动画

AI 输出：

```json
{
  "type": "tree.rotate",
  "rotation": "left",
  "pivotId": "node_10"
}
```

前端动画：

```text
1. 高亮 pivot node_10。
2. 高亮其右子节点 node_20。
3. 用虚线标出将要变化的边。
4. 更新 node_20 成为子树根。
5. node_10 成为 node_20 的左孩子。
6. 原 node_20.left 成为 node_10.right。
7. 重新计算树布局。
8. 节点平滑移动到新位置。
9. 更新 height 和 balanceFactor 字段。
```

---

## 18. 实施路线

### 阶段 A：类型与协议落地

目标：先定义 Scene Engine 的协议，不改变现有渲染结果。

任务：

1. 新增 `src/scene/types.ts`。
2. 新增 `src/scene/eventTypes.ts`。
3. 新增 `src/scene/commandTypes.ts`。
4. 扩展 `AnimationStep.events`。
5. 扩展 `AnimationScript.presentation`。
6. 扩展 `schema.ts` 校验基础字段。

验收：

- TypeScript 编译通过。
- 旧数据不受影响。
- 新字段可被 parser 保留。

---

### 阶段 B：SceneCanvas 与基础图元

目标：实现最小可运行场景渲染。

任务：

1. 实现 `SceneCanvas.tsx`。
2. 实现 `NodeView.tsx`。
3. 实现 `EdgeView.tsx`。
4. 实现 `PointerView.tsx`。
5. 实现基础高亮、移动、连接渲染。

验收：

- 可以手写一个 `SceneState` 渲染单链表。
- 节点支持字段和端口。
- 边能连接指定端口。
- 指针能指向节点。

---

### 阶段 C：链表编译器

目标：用链表验证“事件 -> 命令 -> 场景”的完整链路。

任务：

1. 实现 `linkedListCompiler.ts`。
2. 支持 `linked_list.create`。
3. 支持 `linked_list.visit`。
4. 支持 `linked_list.move_pointer`。
5. 支持 `linked_list.insert_after`。
6. 支持 `linked_list.delete`。
7. 支持 `linked_list.reverse_link`。
8. 实现单链表和双向链表 variant。

验收：

- 单链表创建、遍历、插入、删除、反转可动画播放。
- 双向链表节点显示 `prev/data/next`。
- 双向边能正确展示和更新。

---

### 阶段 D：树编译器

目标：支持树类算法结构变化。

任务：

1. 实现 `treeLayout.ts`。
2. 实现 `treeCompiler.ts`。
3. 支持 `tree.create`。
4. 支持 `tree.visit`。
5. 支持 `tree.compare`。
6. 支持 `tree.insert`。
7. 支持 `tree.rotate`。
8. 支持 AVL metadata 展示。

验收：

- BST 插入过程可动画播放。
- AVL 左旋、右旋可动画播放。
- 节点平滑重新布局。

---

### 阶段 E：数组、矩阵、N 皇后扩展

目标：让排序、DP、回溯类算法进入 Scene Engine。

任务：

1. 实现 `arrayCompiler.ts`。
2. 实现 `matrixCompiler.ts`。
3. 实现 `nQueensCompiler.ts`。
4. 支持数组比较、交换、移动、标记。
5. 支持矩阵访问、更新、路径、冲突。
6. 支持 N 皇后尝试、放置、冲突、回溯、解集展示。

验收：

- 冒泡排序可用事件驱动播放。
- N 皇后回溯可动态展示尝试、冲突和回退。

---

### 阶段 F：AI Prompt 与 Playground 集成

目标：让 AI 能生成 Scene Engine 可用脚本。

任务：

1. 在 `prompts.ts` 增加 `events` 输出规范。
2. 在 `input.ts` 根据输入类型补充 Scene Engine 建议。
3. 在 `schema.ts` 校验 events。
4. 在 `Playground` 中显示是否使用 Scene Engine。
5. 错误报告中展示 events 校验问题。

验收：

- AI 分析链表代码时能生成 `linked_list.*` events。
- events 校验失败时能展示明确错误路径和修复建议。
- 没有 events 时仍回退经典渲染器。

---

## 19. 风险与规避

### 19.1 AI 输出事件不稳定

风险：AI 可能漏字段、id 不一致或事件顺序错误。

规避：

- Schema 严格校验。
- 事件白名单。
- 明确 Prompt 示例。
- 对可恢复问题做 normalize。
- 对不可恢复问题展示结构化错误。

### 19.2 Scene Engine 复杂度过高

风险：一次性实现所有结构会导致范围失控。

规避：

- 先做链表。
- 再做树。
- 最后扩展图、矩阵和回溯。
- 保留 classic renderer 回退。

### 19.3 布局和动画耦合

风险：布局计算与动画播放混在一起，后续难维护。

规避：

- 布局器只计算目标位置。
- Scene Engine 根据位置变化生成动画。
- 图元只负责渲染。

### 19.4 节点模型过度抽象

风险：过度抽象导致简单算法开发成本变高。

规避：

- 提供 variant 模板。
- 提供 helper 函数。
- 预制算法不需要手写底层 SceneCommand。
- AI 使用高层 AlgorithmEvent。

---

## 20. 验收标准

### 20.1 基础能力验收

- 支持通用 `SceneNode`。
- 节点支持动态字段。
- 节点支持动态端口。
- 边支持连接端口。
- 指针支持指向节点或 null。
- 节点支持高亮、访问、删除、插入等状态。

### 20.2 链表能力验收

- 单链表创建、遍历、插入、删除、反转可播放。
- 双向链表节点可显示 `prev/data/next`。
- 双向链表可展示前向和后向指针。
- 循环链表可展示回连边。

### 20.3 树能力验收

- 二叉树创建、访问、插入可播放。
- BST 比较路径可高亮。
- AVL 旋转可播放。
- 节点 metadata 可展示。

### 20.4 AI 集成验收

- AI 能输出 `presentation.engine = "scene"`。
- AI 能为链表代码输出 `linked_list.*` events。
- Schema 能校验 events。
- 校验失败能展示结构化错误。
- 无 events 时仍可正常使用经典渲染器。

---

## 21. 推荐优先级

### P0：必须先做

1. Scene 类型协议。
2. `AnimationStep.events` 扩展。
3. `SceneCanvas` 最小版本。
4. 通用 `NodeView`、`EdgeView`、`PointerView`。
5. 单链表 `create`、`visit`、`insert_after`。

### P1：核心增强

1. 双向链表。
2. 删除节点。
3. 反转链表。
4. 树节点和树布局。
5. BST 插入。

### P2：高级能力

1. AVL 旋转。
2. 冒泡排序事件驱动重构。
3. N 皇后回溯动画。
4. 图算法事件。
5. AI Prompt 全面支持 events。

### P3：体验优化

1. 自动缩放与视口跟随。
2. 动画速度控制。
3. 鼠标悬浮查看实体信息。
4. 事件时间轴。
5. 导出动画脚本。

---

## 22. 最终目标形态

完成后，AlgoViz 的动画系统将从：

```text
AnimationScript.steps -> useAnimationEngine -> Renderer
```

升级为：

```text
AnimationScript.steps.events
        ↓
AlgorithmEvent
        ↓
EventCompiler
        ↓
SceneCommand
        ↓
SceneEngine
        ↓
SceneCanvas
        ↓
可组合、可扩展、可动态演化的算法动画场景
```

这样 AlgoViz 可以支持：

- 一个节点有任意数量字段。
- 一个节点有任意数量端口。
- 节点之间任意连接。
- 指针动态移动。
- 边动态断开和重连。
- 树结构旋转。
- 链表结构插入、删除、反转。
- 图算法路径、高亮、松弛。
- 矩阵、棋盘、回溯搜索。
- AI 根据代码生成语义事件，前端自动构建动画。

最终效果接近一个专门服务算法教学的“小型 2D 游戏引擎”。
