# AlgoViz 算法动画统一样式重构 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将全部 30+ 算法预设从旧 action 格式迁移到 Scene Engine events 格式，优化图元渲染质量达到极简学术风，确保无重叠无溢出。

**Architecture:** 优化 Scene Engine 的 5 个图元视图 → 增强 5 个事件编译器和 3 个布局器 → 迁移 30+ 预设的步骤生成逻辑添加 events → 清理旧渲染器。

**Tech Stack:** React 18 + TypeScript + SVG + Tailwind CSS

**Design Doc:** `docs/superpowers/specs/2026-05-30-algoviz-animation-refactor-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/scene/primitives/NodeView.tsx` | 渲染各种结点（链表/树/图）的 SVG 视图 |
| `src/scene/primitives/CellView.tsx` | 渲染数组单元格和矩阵格的 SVG 视图 |
| `src/scene/primitives/EdgeView.tsx` | 渲染结点间连线和箭头的 SVG 视图 |
| `src/scene/primitives/PointerView.tsx` | 渲染指针变量标签的 SVG 视图 |
| `src/scene/primitives/LabelView.tsx` | 渲染文本标注 |
| `src/scene/primitives/DataUnits.ts` | 工厂函数，创建 SceneNode/SceneCell/SceneEdge 等 |
| `src/scene/SceneCanvas.tsx` | SVG 画布容器，渲染整个场景 |
| `src/scene/SceneEngine.ts` | 核心引擎：deriveSceneState + applyCommands |
| `src/scene/eventCompiler.ts` | 事件路由器，将 AlgorithmEvent 分发到对应编译器 |
| `src/scene/compilers/arrayCompiler.ts` | 数组事件 → SceneCommand |
| `src/scene/compilers/treeCompiler.ts` | 树事件 → SceneCommand |
| `src/scene/compilers/graphCompiler.ts` | 图事件 → SceneCommand |
| `src/scene/compilers/matrixCompiler.ts` | 矩阵/N皇后事件 → SceneCommand |
| `src/scene/compilers/linkedListCompiler.ts` | 链表事件 → SceneCommand |
| `src/scene/layouts/linkedListLayout.ts` | 链表横向布局算法 |
| `src/scene/layouts/treeLayout.ts` | 树递归布局算法 |
| `src/scene/layouts/graphLayout.ts` | 圆形/层级图布局算法 |
| `src/scene/variants/nodeVariants.ts` | 结点 variant 工厂 |
| `src/scene/variants/graphNodeVariants.ts` | 图结点 variant 工厂 |
| `src/scene/variants/edgeVariants.ts` | 边 variant 工厂 |
| `src/scene/registry.ts` | 编译器注册表 |
| `src/presets/generators.ts` | 排序/搜索/DP/KMP 等算法动态步骤生成器 |
| `src/presets/linkedList.ts` | 链表操作预设（已用 events） |
| `src/presets/doublyLinkedList.ts` | 双向链表预设（已用 events） |
| `src/presets/bst.ts` | BST 操作预设（已用 events） |
| `src/presets/bfsGraph.ts` | BFS 图预设（已用 events） |
| `src/presets/operationPresets.ts` | 数据结构操作预设（已用 events） |
| `src/presets/*.ts` | 各算法预设（待迁移） |
| `src/components/Canvas/VisualizationCanvas.tsx` | 渲染调度入口 |
| `src/components/Canvas/renderers/*.tsx` | 旧渲染器（将废弃） |

---

### Task 1: 优化 CellView 和数组单元格样式

**Files:**
- Modify: `src/scene/primitives/CellView.tsx`
- Modify: `src/scene/primitives/DataUnits.ts:19-48`

- [ ] **Step 1: 重写 CellView 支持索引标签和柔和填充**

将 `CellView.tsx` 改为：

```tsx
import type { SceneCell } from '../types'

const COLOR_MAP: Record<string, { stroke: string; fill: string }> = {
  primary: { stroke: '#3B82F6', fill: '#EFF6FF' },
  success: { stroke: '#10B981', fill: '#ECFDF5' },
  warning: { stroke: '#F59E0B', fill: '#FFFBEB' },
  danger:  { stroke: '#EF4444', fill: '#FEF2F2' },
  muted:   { stroke: '#E2E8F0', fill: '#F8FAFC' },
}

interface CellViewProps {
  cell: SceneCell
}

export default function CellView({ cell }: CellViewProps) {
  const width = cell.size?.width ?? 44
  const height = cell.size?.height ?? 44
  const palette = cell.state?.role === 'idle' ? COLOR_MAP.muted
    : cell.state?.color ? (COLOR_MAP[cell.state.color] ?? COLOR_MAP.muted)
    : COLOR_MAP.muted
  const opacity = cell.state?.opacity ?? 1
  const value = cell.value?.toString() ?? ''
  const isCurrent = cell.state?.role === 'current' || cell.state?.role === 'active'
  const isDanger = cell.state?.role === 'swapping' || cell.state?.role === 'conflict'
  const textColor = isDanger ? '#EF4444' : '#1E293B'

  return (
    <g transform={`translate(${cell.position.x}, ${cell.position.y})`} opacity={opacity}>
      <title>{`${cell.id}${cell.row !== undefined ? ` (${cell.row},${cell.col})` : ''} · ${cell.state?.role ?? 'idle'}`}</title>
      <g className={cell.state?.pulse ? 'cell-pulse' : undefined}>
        {isCurrent && (
          <rect x={-width / 2 - 4} y={-height / 2 - 4}
            width={width + 8} height={height + 8} rx={10}
            fill={palette.stroke} opacity="0.08" className="cell-current-ring" />
        )}
        <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8}
          fill={palette.fill} stroke={palette.stroke} strokeWidth={1.5} />
        <text x={0} y={4} textAnchor="middle" fontSize="14" fontFamily="monospace"
          fill={textColor} fontWeight={isCurrent ? 600 : 400}>
          {value}
        </text>
        {cell.col !== undefined && (
          <text x={0} y={height / 2 + 14} textAnchor="middle" fontSize="10"
            fill="#94A3B8" fontFamily="monospace">
            {cell.col}
          </text>
        )}
      </g>
      <style>{`
        .cell-pulse { animation: cell-pop 0.5s ease-in-out; transform-box: fill-box; transform-origin: center; }
        .cell-current-ring { animation: cell-ring 0.9s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes cell-pop { 0% { transform: scale(0.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
        @keyframes cell-ring { from { opacity: 0.15; transform: scale(0.94); } to { opacity: 0.02; transform: scale(1.12); } }
      `}</style>
    </g>
  )
}
```

- [ ] **Step 2: 调整 DataUnit.arrayCell 默认尺寸**

将 `DataUnits.ts` 中 `arrayCell` 函数改为：

```ts
arrayCell(options: {
  id: string; value: string | number; index: number;
  role?: SceneEntityState['role']; color?: ActionColor;
  pulse?: boolean; x?: number; y?: number;
}): SceneCell {
  return {
    id: options.id, type: 'cell',
    position: { x: options.x ?? 0, y: options.y ?? 0 },
    size: { width: 44, height: 44 },
    value: options.value, col: options.index, row: 0,
    state: { role: options.role ?? 'idle', color: options.color ?? 'muted', pulse: options.pulse ?? false },
  }
},
```

- [ ] **Step 3: 提交**

```bash
git add src/scene/primitives/CellView.tsx src/scene/primitives/DataUnits.ts
git commit -m "style(scene): 优化 CellView 数组单元格样式，支持索引标签和柔和填充"
```

---

### Task 2: 优化 NodeView 结点视图

**Files:**
- Modify: `src/scene/primitives/NodeView.tsx`

- [ ] **Step 1: 重写 NodeView 为极简学术风**

将 `NodeView.tsx` 改为：

```tsx
import type { SceneNode } from '../types'

const COLOR_MAP: Record<string, { stroke: string; fill: string }> = {
  primary: { stroke: '#3B82F6', fill: '#EFF6FF' },
  success: { stroke: '#10B981', fill: '#ECFDF5' },
  warning: { stroke: '#F59E0B', fill: '#FFFBEB' },
  danger:  { stroke: '#EF4444', fill: '#FEF2F2' },
  muted:   { stroke: '#E2E8F0', fill: 'white' },
}

interface NodeViewProps { node: SceneNode }

export default function NodeView({ node }: NodeViewProps) {
  const isCircle = node.variant.startsWith('graph.') || node.variant.startsWith('tree.')
  const width = node.size?.width ?? (isCircle ? 48 : 96)
  const height = node.size?.height ?? (isCircle ? 48 : 44)
  const palette = node.state?.color ? (COLOR_MAP[node.state.color] ?? COLOR_MAP.muted) : COLOR_MAP.muted
  const opacity = node.state?.opacity ?? 1
  const isActive = node.state?.role === 'active' || node.state?.role === 'visited' || node.state?.role === 'current'
  const isDanger = node.state?.role === 'swapping' || node.state?.role === 'conflict' || node.state?.role === 'deleted'

  if (isCircle) {
    return renderCircle(node, width, palette, opacity, isActive, isDanger)
  }
  return renderRect(node, width, height, palette, opacity, isActive, isDanger)
}

function renderCircle(node: SceneNode, d: number, palette: { stroke: string; fill: string }, opacity: number, isActive: boolean, _isDanger: boolean) {
  const r = d / 2
  const value = node.fields[0]?.value?.toString() ?? ''
  return (
    <g transform={`translate(${node.position.x}, ${node.position.y})`} opacity={opacity}>
      <title>{`${node.id} · ${node.variant}${node.state?.role ? ` · ${node.state.role}` : ''}`}</title>
      <g className={node.state?.pulse ? 'node-pulse' : undefined}>
        {isActive && (
          <circle cx={0} cy={0} r={r + 4} fill={palette.stroke} opacity="0.08" className="node-active-ring" />
        )}
        <circle cx={0} cy={0} r={r} fill={palette.fill} stroke={palette.stroke} strokeWidth={1.5} />
        <text x={0} y={4} textAnchor="middle" fontSize="15" fontFamily="monospace" fill="#1E293B">{value}</text>
        {node.fields.length > 1 && node.fields.slice(1).map((field, i) => (
          <text key={field.id} x={0} y={r + 14 + i * 12} textAnchor="middle" fontSize="10" fill="#94A3B8">
            {field.label}:{field.value ?? ''}
          </text>
        ))}
      </g>
    </g>
  )
}

function renderRect(node: SceneNode, width: number, height: number, palette: { stroke: string; fill: string }, opacity: number, isActive: boolean, _isDanger: boolean) {
  const fieldWidth = width / Math.max(node.fields.length, 1)
  return (
    <g transform={`translate(${node.position.x}, ${node.position.y})`} opacity={opacity}>
      <title>{`${node.id} · ${node.variant}${node.state?.role ? ` · ${node.state.role}` : ''}`}</title>
      <g className={node.state?.pulse ? 'node-pulse' : undefined}>
        {isActive && (
          <rect x={-width / 2 - 4} y={-height / 2 - 4} width={width + 8} height={height + 8}
            rx={12} fill={palette.stroke} opacity="0.08" className="node-active-ring" />
        )}
        <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8}
          fill="white" stroke={palette.stroke} strokeWidth={1.5} />
        {node.fields.map((field, index) => {
          const x = -width / 2 + index * fieldWidth
          const isData = field.role === 'data' || field.role === 'key' || field.role === 'value'
          return (
            <g key={field.id}>
              {index > 0 && <line x1={x} y1={-height / 2 + 4} x2={x} y2={height / 2 - 4} stroke="#E2E8F0" strokeWidth={1} />}
              <text x={x + fieldWidth / 2} y={isData ? -2 : 0} textAnchor="middle"
                fontSize={isData ? 14 : 11} fontFamily="monospace"
                fill={isData ? '#1E293B' : '#94A3B8'} fontWeight={isData ? 600 : 400}>
                {field.value ?? field.label ?? field.id}
              </text>
              {field.label && isData && (
                <text x={x + fieldWidth / 2} y={15} textAnchor="middle" fontSize="9" fill="#94A3B8">{field.label}</text>
              )}
            </g>
          )
        })}
      </g>
    </g>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/scene/primitives/NodeView.tsx
git commit -m "style(scene): 重写 NodeView 为极简学术风，支持圆形/矩形双形态"
```

---

### Task 3: 优化 EdgeView 和 PointerView

**Files:**
- Modify: `src/scene/primitives/EdgeView.tsx`
- Modify: `src/scene/primitives/PointerView.tsx`

- [ ] **Step 1: 优化 EdgeView 箭头和连线样式**

将 `EdgeView.tsx` 的渲染部分改为使用更细的箭头标记和更柔和的颜色。关键改动：

```tsx
const color = edge.state?.color ? COLOR_MAP[edge.state.color] : edge.style?.color ? COLOR_MAP[edge.style.color] : '#94A3B8'
const markerEnd = edge.directed ? 'url(#sceneArrow)' : undefined
const path = edge.style?.curved
  ? `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.max(from.y, to.y) + 40} ${to.x} ${to.y}`
  : `M ${from.x} ${from.y} L ${to.x} ${to.y}`
```

标记定义改为更小更尖的箭头（在 SceneCanvas 的 defs 中）：

```xml
<marker id="sceneArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
  <path d="M0,0 L0,6 L8,3 z" fill="#94A3B8" />
</marker>
```

- [ ] **Step 2: 优化 PointerView 标签框样式**

将 `PointerView.tsx` 的标签框改为更小的圆角标签，颜色使用 COLOR_MAP 的柔和色调：

```tsx
export default function PointerView({ pointer, scene, index }: PointerViewProps) {
  const target = pointer.target ? resolveAnchor(scene, pointer.target.entityId, pointer.target.portId) : null
  const x = target?.x ?? pointer.position?.x ?? 80 + index * 78
  const y = target ? target.y - 72 - index * 16 : pointer.position?.y ?? 80

  return (
    <g>
      <title>{`${pointer.id} → ${pointer.target?.entityId ?? 'null'}`}</title>
      <rect x={x - 24} y={y - 14} width={48} height={22} rx={6}
        fill="#EFF6FF" stroke="#93C5FD" strokeWidth={1} />
      <text x={x} y={y} textAnchor="middle" fontSize="11" fontFamily="monospace"
        fill="#3B82F6" fontWeight={600}>{pointer.label}</text>
      {target ? (
        <line x1={x} y1={y + 8} x2={target.x} y2={target.y - 24}
          stroke="#93C5FD" strokeWidth={1.5} markerEnd="url(#scenePointerArrow)" />
      ) : (
        <text x={x} y={y + 28} textAnchor="middle" fontSize="10" fill="#94A3B8">null</text>
      )}
    </g>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add src/scene/primitives/EdgeView.tsx src/scene/primitives/PointerView.tsx
git commit -m "style(scene): 优化 EdgeView 细线箭头和 PointerView 标签框样式"
```

---

### Task 4: 优化 SceneCanvas 和颜色标记定义

**Files:**
- Modify: `src/scene/SceneCanvas.tsx`

- [ ] **Step 1: 更新 SceneCanvas 的 SVG defs 为极简风格**

将 `SceneCanvas.tsx` 的 `rect` 背景和 `defs` 改为：

```tsx
<svg viewBox={viewBox} className="h-full w-full" style={{ background: 'white' }}>
  <defs>
    <marker id="sceneArrow" markerWidth="8" markerHeight="8" refX="7" refY="3"
      orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L8,3 z" fill="#94A3B8" />
    </marker>
    <marker id="sceneDependencyArrow" markerWidth="8" markerHeight="8" refX="7" refY="3"
      orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L8,3 z" fill="#F59E0B" />
    </marker>
    <marker id="scenePointerArrow" markerWidth="8" markerHeight="8" refX="7" refY="3"
      orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L8,3 z" fill="#93C5FD" />
    </marker>
  </defs>
  {/* Remove the background rect with filter — cleaner look */}
  {edges.map((edge) => <EdgeView key={edge.id} edge={edge} scene={scene} />)}
  ...
```

- [ ] **Step 2: 改进 viewBox 计算**

```tsx
function computeViewBox(entities: SceneEntity[], labels: SceneEntity[]): string {
  const positioned = [...entities, ...labels].filter(
    (e): e is SceneEntity & { position: { x: number; y: number } } =>
      'position' in e && !!e.position
  )
  if (positioned.length === 0) return '0 0 1000 620'

  const padding = 100
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const e of positioned) {
    const w = ('size' in e ? e.size?.width : 80) ?? 80
    const h = ('size' in e ? e.size?.height : 60) ?? 60
    const hw = w / 2; const hh = h / 2
    if (e.position.x - hw < minX) minX = e.position.x - hw
    if (e.position.y - hh < minY) minY = e.position.y - hh
    if (e.position.x + hw > maxX) maxX = e.position.x + hw
    if (e.position.y + hh > maxY) maxY = e.position.y + hh
  }

  const width = Math.max(1000, maxX - minX + padding * 2)
  const height = Math.max(620, maxY - minY + padding * 2)
  return `${minX - padding} ${minY - padding} ${width} ${height}`
}
```

- [ ] **Step 3: 提交**

```bash
git add src/scene/SceneCanvas.tsx
git commit -m "style(scene): 优化 SceneCanvas 背景和 viewBox 计算"
```

---

### Task 5: 增强 arrayCompiler 支持完整排序动画

**Files:**
- Modify: `src/scene/compilers/arrayCompiler.ts`

- [ ] **Step 1: 增强 arrayCompiler 支持更多状态和批量操作**

```ts
function compileArrayEvent(event: ArrayAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'array.create':
      return event.values.map((value, index) => ({
        type: 'create_cell' as const,
        cell: DataUnit.arrayCell({
          id: cellId(index), value, index,
          x: 120 + index * 64,
          y: 310,
        }),
      }))

    case 'array.compare': {
      const allIds = Object.keys(context.scene.entities).filter(k => k.startsWith('arr_'))
      const reset = allIds
        .filter(id => !event.indices.includes(parseInt(id.replace('arr_', ''))))
        .map(id => ({ type: 'set_state' as const, entityId: id, state: { role: 'idle' as const, color: 'muted' as const, pulse: false }, merge: true }))
      const highlight = event.indices.map(index => ({
        type: 'set_state' as const, entityId: cellId(index),
        state: { role: 'comparing' as const, color: 'warning' as const, pulse: true }, merge: true,
      }))
      return [...reset, ...highlight]
    }

    case 'array.swap': {
      const [a, b] = event.indices
      const cellA = context.scene.entities[cellId(a)]
      const cellB = context.scene.entities[cellId(b)]
      const valueA = cellA?.type === 'cell' ? cellA.value : undefined
      const valueB = cellB?.type === 'cell' ? cellB.value : undefined
      return [
        { type: 'set_cell', cellId: cellId(a), value: valueB, state: { role: 'swapping', color: 'danger', pulse: true } },
        { type: 'set_cell', cellId: cellId(b), value: valueA, state: { role: 'swapping', color: 'danger', pulse: true } },
        { type: 'wait', duration: 200 },
      ]
    }

    case 'array.mark_sorted':
      return event.indices.map(index => ({
        type: 'set_state', entityId: cellId(index),
        state: { role: 'sorted', color: 'success', pulse: false }, merge: true,
      }))

    case 'array.partition':
      return [
        { type: 'set_state', entityId: cellId(event.pivotIndex),
          state: { role: 'current', color: 'primary', badge: 'pivot' }, merge: true },
        ...range(event.left, event.right).map(index => ({
          type: 'set_state' as const, entityId: cellId(index),
          state: { role: 'candidate' as const, color: 'warning' as const }, merge: true,
        })),
      ]

    case 'array.move':
      return [
        { type: 'set_cell', cellId: cellId(event.to), value: context.scene.entities[cellId(event.from)]?.type === 'cell' ? context.scene.entities[cellId(event.from)].value : undefined,
          state: { role: 'current', color: 'primary', pulse: true } },
        { type: 'set_state', entityId: cellId(event.from), state: { role: 'idle', color: 'muted' }, merge: true },
      ]
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/scene/compilers/arrayCompiler.ts
git commit -m "feat(scene): 增强 arrayCompiler 支持排序动画全流程"
```

---

### Task 6: 迁移 generators.ts 排序算法（P0）

**Files:**
- Modify: `src/presets/generators.ts`

这是最大的任务。需要给 `generateBubbleSort`、`generateSelectionSort`、`generateInsertionSort`、`generateQuickSort`、`generateHeapSort`、`generateShellSort`、`generateCountingSort`、`generateMergeSort` 这 8 个生成器添加 `presentation` 和 `events`。

- [ ] **Step 1: 添加 `presentation` 字段到所有排序生成器返回值**

在每个生成器的 return 语句中添加 `presentation: { engine: 'scene' as const, module: 'array' as const }`。

例如 bubbleSort 的 return：
```ts
return {
  algorithm: 'bubble_sort',
  presentation: { engine: 'scene', module: 'array' },
  complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' },
  initialState: { type: 'array', data: [...arr] },
  steps,
}
```

- [ ] **Step 2: 在首位步骤添加 `array.create` 事件**

在每个生成器的第一个 step 中添加 events：

```ts
events: [{ type: 'array.create', values: [...arr] }],
```

- [ ] **Step 3: 替换每个步骤的 action 为对应 events**

模式映射：
- `action: 'compare', targets: [a, b]` → `events: [{ type: 'array.compare', indices: [a, b] }]`
- `action: 'swap', targets: [a, b]` → `events: [{ type: 'array.swap', indices: [a, b] }]`
- `action: 'mark', targets: [...]` → `events: [{ type: 'array.mark_sorted', indices: [...] }]`
- `action: 'move', targets: [from, to]` → `events: [{ type: 'array.move', from, to }]`
- 分区步骤 → `events: [{ type: 'array.partition', pivotIndex, left, right }]`

需要修改 `makeStep` 函数接受 `events` 参数，或在每个 `makeStep` 调用后添加 events。

具体改动（以 bubbleSort 为例）：

```ts
// 第一个 step 添加 create 事件
steps.push({
  ...makeStep(sid++, 3, descZh, descEn, 'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2, teachingState),
  events: sid === 2 ? [{ type: 'array.create', values: [...arr] }] : undefined,
})

// 比较 step 添加 compare 事件
steps.push({
  ...makeStep(sid++, 3, descZh, descEn, 'compare', [j, j + 1], 'warning', ++comps, sw, acc += 2, teachingState),
  events: [{ type: 'array.compare', indices: [j, j + 1] }],
})

// 交换 step 添加 swap 事件
steps.push({
  ...makeStep(sid++, 4, descZh, descEn, 'swap', [j, j + 1], 'danger', comps, sw, acc, teachingState),
  events: [{ type: 'array.swap', indices: [j, j + 1] }],
})

// mark 步骤添加 mark_sorted 事件
steps.push({
  ...makeStep(sid++, 7, descZh, descEn, 'mark', [n - 1 - i], 'muted', comps, sw, acc += 1, teachingState),
  events: [{ type: 'array.mark_sorted', indices: [n - 1 - i] }],
})
```

- [ ] **Step 4: 对全部 8 个排序生成器重复此模式**

依次处理：bubbleSort → selectionSort → insertionSort → quickSort → heapSort → shellSort → countingSort → mergeSort

- [ ] **Step 5: 提交**

```bash
git add src/presets/generators.ts
git commit -m "feat(presets): 迁移全部排序生成器到 Scene Engine events 格式"
```

---

### Task 7: 迁移 binarySearch 和其他数组类生成器

**Files:**
- Modify: `src/presets/generators.ts`（binarySearch 部分）

- [ ] **Step 1: binarySearch 添加 presentation + events**

为 `generateBinarySearch` 添加 `presentation` 字段和 events：
- 第一步：`array.create` + `scene.highlight` 
- 比较步：`array.compare`
- 标记步：`array.mark_sorted`

- [ ] **Step 2: 提交**

```bash
git add src/presets/generators.ts
git commit -m "feat(presets): 迁移 binarySearch 到 Scene Engine events 格式"
```

---

### Task 8: 迁移数组数据结构预设

**Files:**
- Modify: `src/presets/arrayDS.ts`

- [ ] **Step 1: 重写 generateArray 使用 events**

将硬编码的步骤改为动态生成，添加 `presentation` 和 events：

```ts
export function generateArray(): AnimationScript {
  const arr = [1, 2, 3, 4, 5]
  return {
    algorithm: 'array',
    presentation: { engine: 'scene', module: 'array' },
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
    initialState: { type: 'array', data: arr },
    steps: [
      { stepId: 1, codeLine: 0,
        description: { zh: `数组初始化: [${arr.join(', ')}]`, en: `Array init: [${arr.join(', ')}]` },
        action: { type: 'highlight', targets: [], color: 'primary' },
        events: [{ type: 'array.create', values: arr }],
        stats: { comparisons: 0, swaps: 0, accesses: arr.length },
      },
      { stepId: 2, codeLine: 2,
        description: { zh: `随机访问 arr[2] = ${arr[2]} (O(1))`, en: `Random access arr[2] = ${arr[2]} (O(1))` },
        action: { type: 'compare', targets: [2], color: 'warning' },
        events: [{ type: 'array.compare', indices: [2, 2] }],
        stats: { comparisons: 0, swaps: 0, accesses: 1 },
      },
      { stepId: 3, codeLine: 3,
        description: { zh: `追加 6 → [${[...arr, 6].join(', ')}]`, en: `Append 6 → [${[...arr, 6].join(', ')}]` },
        action: { type: 'insert', targets: [5], color: 'success' },
        events: [{ type: 'array.create', values: [...arr, 6] }],
        stats: { comparisons: 0, swaps: 0, accesses: 1 },
      },
      { stepId: 4, codeLine: 4,
        description: { zh: `删除索引 1 → [${[...arr.slice(0,1), ...arr.slice(2)].join(', ')}] (O(n))`, en: `Remove idx 1 → [${[...arr.slice(0,1), ...arr.slice(2)].join(', ')}] (O(n))` },
        action: { type: 'delete', targets: [1], color: 'danger' },
        events: [{ type: 'array.create', values: [...arr.slice(0, 1), ...arr.slice(2)] }],
        stats: { comparisons: 0, swaps: 0, accesses: 4 },
      },
    ],
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/presets/arrayDS.ts
git commit -m "feat(presets): 迁移 arrayDS 到 Scene Engine events 格式"
```

---

### Task 9: 迁移 DP 和字符串算法生成器（P3/P4）

**Files:**
- Modify: `src/presets/knapsack.ts`
- Modify: `src/presets/unboundedKnapsack.ts`
- Modify: `src/presets/lcs.ts`
- Modify: `src/presets/lis.ts`
- Modify: `src/presets/editDistance.ts`
- Modify: `src/presets/matrixChain.ts`
- Modify: `src/presets/intervalDP.ts`
- Modify: `src/presets/kmp.ts`
- Modify: `src/presets/manacher.ts`
- Modify: `src/presets/slidingWindow.ts`
- Modify: `src/presets/monotonicStack.ts`
- Modify: `src/presets/nQueens.ts`
- Modify: `src/presets/sudoku.ts`
- Modify: `src/presets/backtracking.ts`

- [ ] **Step 1: 迁移 knapsack.ts**

添加 `presentation: { engine: 'scene', module: 'matrix' }` 和 `events: [{ type: 'matrix.create', rows, cols, values }]` 到首步。
后续步骤中使用 `matrix.visit_cell`、`matrix.update_cell`、`matrix.mark_path`。

- [ ] **Step 2: 迁移 lcs.ts 和 editDistance.ts**

同矩阵类模式：`matrix.create` → `matrix.visit_cell` → `matrix.update_cell` → `matrix.mark_path`

- [ ] **Step 3: 迁移 lis.ts**

数组类模式：使用 `array.create`、`array.compare`、`array.mark_sorted`

- [ ] **Step 4: 迁移 nQueens.ts**

使用 `n_queens.*` 事件：`n_queens.try_place` → `n_queens.place` / `n_queens.conflict` → `n_queens.backtrack` → `n_queens.solution`

- [ ] **Step 5: 迁移 kmp.ts、manacher.ts、slidingWindow.ts、monotonicStack.ts**

数组类模式，使用 `array.create`、`array.compare`、`array.mark_sorted`

- [ ] **Step 6: 迁移 backtracking.ts**

数组 + 矩阵混合模式

- [ ] **Step 7: 提交（每批独立提交）**

```bash
git add src/presets/knapsack.ts src/presets/unboundedKnapsack.ts src/presets/lcs.ts src/presets/lis.ts
git commit -m "feat(presets): 迁移 DP 预设到 Scene Engine events 格式"

git add src/presets/editDistance.ts src/presets/matrixChain.ts src/presets/intervalDP.ts
git commit -m "feat(presets): 迁移更多 DP 预设到 Scene Engine events 格式"

git add src/presets/nQueens.ts src/presets/sudoku.ts src/presets/backtracking.ts
git commit -m "feat(presets): 迁移回溯预设到 Scene Engine events 格式"

git add src/presets/kmp.ts src/presets/manacher.ts src/presets/slidingWindow.ts src/presets/monotonicStack.ts
git commit -m "feat(presets): 迁移字符串算法预设到 Scene Engine events 格式"
```

---

### Task 10: 迁移数据结构预设

**Files:**
- Modify: `src/presets/stack.ts`
- Modify: `src/presets/queue.ts`
- Modify: `src/presets/heap.ts`
- Modify: `src/presets/unionFind.ts`
- Modify: `src/presets/binaryTree.ts`
- Modify: `src/presets/avlTree.ts`
- Modify: `src/presets/redBlackTree.ts`
- Modify: `src/presets/trie.ts`
- Modify: `src/presets/hashTable.ts`
- Modify: `src/presets/fenwick.ts`
- Modify: `src/presets/segmentTree.ts`

- [ ] **Step 1: 迁移树结构预设**

binaryTree、avlTree、redBlackTree、trie 使用 `tree.*` 事件：
`tree.create` → `tree.visit` → `tree.compare` → `tree.insert` → `tree.rotate` → `tree.update_metadata`

- [ ] **Step 2: 迁移 stack、queue、heap、hashTable**

数组类模式，使用 `array.create`、`array.compare`、`array.mark_sorted`

- [ ] **Step 3: 迁移 unionFind、fenwick、segmentTree**

数组/树混合模式

- [ ] **Step 4: 提交**

```bash
git add src/presets/binaryTree.ts src/presets/avlTree.ts src/presets/redBlackTree.ts src/presets/trie.ts
git commit -m "feat(presets): 迁移树结构预设到 Scene Engine events 格式"

git add src/presets/stack.ts src/presets/queue.ts src/presets/heap.ts src/presets/hashTable.ts
git commit -m "feat(presets): 迁移线性数据结构预设到 Scene Engine events 格式"

git add src/presets/unionFind.ts src/presets/fenwick.ts src/presets/segmentTree.ts
git commit -m "feat(presets): 迁移高级数据结构预设到 Scene Engine events 格式"
```

---

### Task 11: 迁移图算法预设（P2）

**Files:**
- Modify: `src/presets/dijkstra.ts`
- Modify: `src/presets/floyd.ts`
- Modify: `src/presets/bellmanFord.ts`
- Modify: `src/presets/prim.ts`
- Modify: `src/presets/kruskal.ts`
- Modify: `src/presets/topologicalSort.ts`
- Modify: `src/presets/aStar.ts`
- Modify: `src/presets/dfsGraph.ts`（部分已迁移，补充）

- [ ] **Step 1: 为图算法预设添加 `graph.*` events**

模式：
- 图创建：`graph.create` + nodes + edges
- 节点访问：`graph.visit_node`
- 边访问：`graph.visit_edge`
- 边松弛：`graph.relax_edge`
- 入/出队：`graph.enqueue` / `graph.dequeue`

- [ ] **Step 2: 提交**

```bash
git add src/presets/dijkstra.ts src/presets/floyd.ts src/presets/bellmanFord.ts src/presets/prim.ts src/presets/kruskal.ts src/presets/topologicalSort.ts src/presets/aStar.ts src/presets/dfsGraph.ts
git commit -m "feat(presets): 迁移图算法预设到 Scene Engine events 格式"
```

---

### Task 12: 迁移静态 Preset 文件（排序算法旧文件）

**Files:**
- Modify: `src/presets/bubbleSort.ts`
- Modify: `src/presets/selectionSort.ts`
- Modify: `src/presets/insertionSort.ts`
- Modify: `src/presets/mergeSort.ts`
- Modify: `src/presets/quickSort.ts`
- Modify: `src/presets/binarySearch.ts`

这些是旧的静态预设文件。generators.ts 已有它们的动态生成器版本。直接改为导出空对象或删除。

- [ ] **Step 1: 将静态预设改为导出空函数或删除文件**

每个文件改为：
```ts
// Deprecated: use generators.ts generateXxx instead
export {}
```

- [ ] **Step 2: 移除算法注册表中对这些静态预设的引用**

检查 `src/store/algorithmStore.ts` 和 `src/data/algorithmDefs.ts`，确保它们引用的是 generators.ts 中的动态生成器。

- [ ] **Step 3: 提交**

```bash
git add src/presets/bubbleSort.ts src/presets/selectionSort.ts src/presets/insertionSort.ts src/presets/mergeSort.ts src/presets/quickSort.ts src/presets/binarySearch.ts
git commit -m "refactor(presets): 废弃静态排序预设，统一使用 generators.ts 动态生成器"
```

---

### Task 13: 改进树布局器的自适应缩放

**Files:**
- Modify: `src/scene/layouts/treeLayout.ts`

- [ ] **Step 1: 实现自适应节点间距**

根据节点数量动态计算水平和垂直间距：

```ts
function layoutTree(scene: SceneState): Record<string, Point> {
  const nodes = getTreeNodeEntities(scene)
  if (nodes.length === 0) return {}

  const rootId = findRoot(scene, nodes)
  if (!rootId) return {}

  const depth = computeDepth(scene, rootId, nodes)
  const leafCount = countLeaves(scene, rootId, nodes)

  // Adaptive spacing
  const hGap = Math.max(64, Math.min(120, 900 / Math.max(leafCount, 1)))
  const vGap = Math.max(56, Math.min(90, 500 / Math.max(depth, 1)))

  const positions: Record<string, Point> = {}
  let nextX = 0

  function dfs(nodeId: string, y: number): number {
    const children = getChildren(scene, nodeId)
    if (children.length === 0) {
      positions[nodeId] = { x: nextX * hGap + 500 - (leafCount * hGap) / 2, y }
      nextX++
      return nextX - 1
    }
    const childXs = children.map(c => dfs(c, y + vGap))
    const centerX = (childXs[0] + childXs[childXs.length - 1]) * hGap / 2 + 500 - (leafCount * hGap) / 2
    positions[nodeId] = { x: centerX, y }
    return (childXs[0] + childXs[childXs.length - 1]) / 2
  }

  dfs(rootId, 100)
  return positions
}
```

- [ ] **Step 2: 提交**

```bash
git add src/scene/layouts/treeLayout.ts
git commit -m "feat(scene): 树布局器自适应节点间距和缩放"
```

---

### Task 14: 改进图布局器

**Files:**
- Modify: `src/scene/layouts/graphLayout.ts`

- [ ] **Step 1: 实现圆形布局 + 自适应半径**

```ts
export function layoutGraph(scene: SceneState): Record<string, Point> {
  const nodes = Object.values(scene.entities)
    .filter(e => e.type === 'node' && e.variant === 'graph.vertex')
  if (nodes.length === 0) return {}

  const cx = 500, cy = 300
  const radius = Math.max(120, Math.min(280, nodes.length * 32))
  const positions: Record<string, Point> = {}

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    positions[node.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })
  return positions
}
```

- [ ] **Step 2: 提交**

```bash
git add src/scene/layouts/graphLayout.ts
git commit -m "feat(scene): 图布局器自适应圆形布局半径"
```

---

### Task 15: 清理旧渲染器

**Files:**
- Modify: `src/components/Canvas/VisualizationCanvas.tsx`

- [ ] **Step 1: 简化 VisualizationCanvas 为仅使用 SceneCanvas**

旧的渲染器分发逻辑改为纯 SceneCanvas + 一个 fallback：

```tsx
export default function VisualizationCanvas({ script, visualState, currentStepData }: VisualizationCanvasProps) {
  if (!script) {
    return <EmptyState />
  }

  const shouldUseSceneEngine = usesSceneEngine(script)

  return (
    <div className="h-full p-6 bg-slate-50">
      <div className="h-full bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {shouldUseSceneEngine ? (
          <SceneCanvas script={script} currentStep={visualState.currentStep} />
        ) : (
          <FallbackRenderer visualState={visualState} currentStepData={currentStepData} script={script} />
        )}
      </div>
    </div>
  )
}
```

保留旧渲染器的导入作为 fallback，待全部迁移完成后可完全移除。

- [ ] **Step 2: 提交**

```bash
git add src/components/Canvas/VisualizationCanvas.tsx
git commit -m "refactor(canvas): 简化渲染调度，SceneCanvas 为主要渲染路径"
```

---

### Task 16: 集成测试与验证

- [ ] **Step 1: 启动开发服务器检查视觉效果**

```bash
npm run dev
```

访问 `http://localhost:5173/visualizer`，逐一测试每个算法：
1. 冒泡排序 — 检查柱子+格子渲染、颜色过渡、不溢出
2. 链表插入 — 检查结点分区、箭头连接、指针标签
3. BST 插入 — 检查圆形结点、树布局、旋转动画
4. BFS 图 — 检查圆形顶点、边高亮、访问顺序
5. DP 背包 — 检查矩阵表格、行/列标题、路径标记
6. N 皇后 — 检查棋盘、♛ 符号、冲突标记

- [ ] **Step 2: 检查 TypeScript 编译**

```bash
npx tsc --noEmit
```

修复任何类型错误。

- [ ] **Step 3: 提交最终修复**

```bash
git add -A
git commit -m "fix: 集成测试修正，确保全部预设可正常播放"
```

---

## 实施顺序

```
Task 1-4 (图元优化)
    ↓
Task 5   (arrayCompiler 增强)
    ↓
Task 6   (P0: 排序算法迁移 — 最大工作量)
    ↓
Task 7   (binarySearch)
    ↓
Task 8-12 (P1-P4: 其余预设迁移)
    ↓
Task 13-14 (布局优化)
    ↓
Task 15  (清理旧渲染器)
    ↓
Task 16  (集成测试)
```

**预计总工作量：16 个任务，按顺序执行。**
