# 几何可视化模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `geometry.*` 事件族 + `GeometryView`，在 2D 坐标平面上可视化点、线段、多边形与扫描线，并提供凸包演示。

**Architecture:** 几何对象以 `geo_<id>` cell 承载**数据坐标**（存在 `meta`），`GeometryView` 按 `geometry.plane` 设定的数据范围线性映射到固定画布矩形（Y 轴向上为正），渲染坐标轴/网格/点/线段/多边形/扫描线。坐标映射是纯函数，单测覆盖。

**Tech Stack:** TypeScript、React + SVG、Vitest。

**前置阅读：** `src/scene/eventTypes.ts`（事件联合）、`src/scene/eventCompiler.ts`（注册）、`src/scene/compilers/heapCompiler.ts`（compiler 范式）、`src/scene/SceneCanvas.tsx`（renderContainers 接入）、`src/scene/types.ts`（SceneCell）。

**共享文件（追加式改动，集成时协调者合并）：** eventTypes.ts、eventCompiler.ts、SceneCanvas.tsx、store/algorithmStore.ts、presets/generators.ts。

---

### Task 1: 坐标映射纯函数

**Files:**
- Create: `src/scene/compilers/geometryMap.ts`
- Test: `src/scene/compilers/__tests__/geometryMap.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/scene/compilers/__tests__/geometryMap.test.ts
import { describe, it, expect } from 'vitest'
import { makeProjector, PLANE } from '../geometryMap'

describe('geometry 坐标映射', () => {
  it('数据范围映射到画布矩形,Y 轴翻转(上为正)', () => {
    const p = makeProjector([0, 10], [0, 10])
    const origin = p(0, 0)
    const topRight = p(10, 10)
    // x: 0→左内边距, 10→右内边距
    expect(origin.x).toBeCloseTo(PLANE.pad)
    expect(topRight.x).toBeCloseTo(PLANE.width - PLANE.pad)
    // y 翻转: 数据 y=0 在底部(屏幕 y 大), y=10 在顶部(屏幕 y 小)
    expect(origin.y).toBeGreaterThan(topRight.y)
  })

  it('零宽度范围不除零(退化为居中)', () => {
    const p = makeProjector([5, 5], [0, 10])
    expect(Number.isFinite(p(5, 5).x)).toBe(true)
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/compilers/__tests__/geometryMap.test.ts`
Expected: FAIL（`Cannot find module '../geometryMap'`）

- [ ] **Step 3: 写实现**

```ts
// src/scene/compilers/geometryMap.ts
export const PLANE = { width: 800, height: 500, pad: 48 } as const

export interface Projector {
  (x: number, y: number): { x: number; y: number }
}

/** 数据坐标 → 场景坐标的线性映射。Y 轴翻转(数据上为正)。零宽度范围退化为居中。 */
export function makeProjector(xRange: [number, number], yRange: [number, number]): Projector {
  const [x0, x1] = xRange
  const [y0, y1] = yRange
  const innerW = PLANE.width - 2 * PLANE.pad
  const innerH = PLANE.height - 2 * PLANE.pad
  const dx = x1 - x0
  const dy = y1 - y0
  return (x, y) => ({
    x: PLANE.pad + (dx === 0 ? innerW / 2 : ((x - x0) / dx) * innerW),
    y: PLANE.pad + (dy === 0 ? innerH / 2 : ((y1 - y) / dy) * innerH),
  })
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/scene/compilers/__tests__/geometryMap.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/scene/compilers/geometryMap.ts src/scene/compilers/__tests__/geometryMap.test.ts
git commit -m "feat(geometry): 坐标平面映射纯函数"
```

---

### Task 2: 事件族类型

**Files:**
- Modify: `src/scene/eventTypes.ts`（追加 `GeometryAlgorithmEvent` 并加入 `AlgorithmEvent` 联合）

- [ ] **Step 1: 追加类型**

在 `src/scene/eventTypes.ts` 末尾的某个事件族之后追加：

```ts
export type GeometryAlgorithmEvent =
  | { type: 'geometry.plane'; xRange: [number, number]; yRange: [number, number] }
  | { type: 'geometry.point'; id: string; x: number; y: number; label?: string; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.segment'; id: string; from: [number, number]; to: [number, number]; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.polygon'; id: string; points: Array<[number, number]>; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.sweepline'; axis: 'x' | 'y'; value: number }
  | { type: 'geometry.clear' }
```

并把 `GeometryAlgorithmEvent` 加入 `AlgorithmEvent` 联合类型（找到 `export type AlgorithmEvent =` 定义，追加 `| GeometryAlgorithmEvent`）。

- [ ] **Step 2: 验证类型编译**

Run: `npx tsc --noEmit`
Expected: 通过（exit 0，无新错误）

- [ ] **Step 3: 提交**

```bash
git add src/scene/eventTypes.ts
git commit -m "feat(geometry): 新增 geometry.* 事件族类型"
```

---

### Task 3: geometryCompiler

**Files:**
- Create: `src/scene/compilers/geometryCompiler.ts`
- Test: `src/scene/compilers/__tests__/geometryCompiler.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/scene/compilers/__tests__/geometryCompiler.test.ts
import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'geo', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'array', data: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('geometryCompiler', () => {
  it('point 事件产出 geo_<id> cell,meta 存数据坐标', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'geometry.plane', xRange: [0, 10], yRange: [0, 10] })
    scene = step(scene, { type: 'geometry.point', id: 'A', x: 3, y: 4 })
    const cell = scene.entities['geo_A'] as SceneCell
    expect(cell?.type).toBe('cell')
    expect((cell.meta as { gx?: number; gy?: number }).gx).toBe(3)
    expect((cell.meta as { gy?: number }).gy).toBe(4)
  })

  it('clear 移除所有 geo_ 实体', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'geometry.plane', xRange: [0, 10], yRange: [0, 10] })
    scene = step(scene, { type: 'geometry.point', id: 'A', x: 1, y: 1 })
    scene = step(scene, { type: 'geometry.clear' })
    expect(Object.keys(scene.entities).filter(k => k.startsWith('geo_'))).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/compilers/__tests__/geometryCompiler.test.ts`
Expected: FAIL（compiler 未注册，事件未处理 → geo_A 不存在）

- [ ] **Step 3: 写 compiler**

```ts
// src/scene/compilers/geometryCompiler.ts
import type { SceneCommand } from '../commandTypes'
import type { GeometryAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { ActionColor } from '@/types/animation'
import type { SceneCell } from '../types'
import { PLANE } from './geometryMap'

export const geometryCompiler: EventCompiler = {
  supports: (event): event is GeometryAlgorithmEvent => event.type.startsWith('geometry.'),
  compile: (event, context) => compile(event as GeometryAlgorithmEvent, context),
}

const PLANE_ID = 'geo_plane'

function geoCell(id: string, gx: number, gy: number, kind: string, extra: Record<string, unknown>, color: ActionColor): SceneCell {
  return {
    id: `geo_${id}`, type: 'cell',
    position: { x: PLANE.width / 2, y: PLANE.height / 2 }, // 实际位置由 GeometryView 按 meta 映射
    size: { width: 1, height: 1 },
    value: '', state: { role: 'idle', color },
    meta: { kind, gx, gy, color, ...extra },
  }
}

function compile(event: GeometryAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'geometry.plane':
      return [{ type: 'create_cell', cell: {
        id: PLANE_ID, type: 'cell', position: { x: PLANE.width / 2, y: PLANE.height / 2 },
        size: { width: PLANE.width, height: PLANE.height }, value: '',
        state: { role: 'idle', color: 'muted' },
        meta: { kind: 'plane', xRange: event.xRange, yRange: event.yRange },
      } }]
    case 'geometry.point':
      return [{ type: 'create_cell', cell: geoCell(event.id, event.x, event.y, 'point', { label: event.label }, event.color ?? 'primary') }]
    case 'geometry.segment':
      return [{ type: 'create_cell', cell: geoCell(event.id, event.from[0], event.from[1], 'segment', { to: event.to }, event.color ?? 'muted') }]
    case 'geometry.polygon':
      return [{ type: 'create_cell', cell: geoCell(event.id, event.points[0]?.[0] ?? 0, event.points[0]?.[1] ?? 0, 'polygon', { points: event.points }, event.color ?? 'primary') }]
    case 'geometry.sweepline':
      return [{ type: 'create_cell', cell: geoCell('sweep', event.axis === 'x' ? event.value : 0, event.axis === 'y' ? event.value : 0, 'sweepline', { axis: event.axis, value: event.value }, 'warning') }]
    case 'geometry.clear':
      return Object.keys(context.scene.entities).filter(k => k.startsWith('geo_')).map(id => ({ type: 'remove_entity' as const, entityId: id }))
  }
}
```

> 注：上面 `geoCell` 的 `state.color` 类型写法仅示意，实现时用 `state: { role: 'idle', color: color as ActionColor }`（`import type { ActionColor } from '@/types/animation'`），避免示意里的伪类型。请按真实类型修正。

- [ ] **Step 4: 注册 compiler**

在 `src/scene/eventCompiler.ts`：`import { geometryCompiler } from './compilers/geometryCompiler'`，并把 `geometryCompiler` 加入 `compilers` 数组。

- [ ] **Step 5: 运行验证通过**

Run: `npx vitest run src/scene/compilers/__tests__/geometryCompiler.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/scene/compilers/geometryCompiler.ts src/scene/eventCompiler.ts src/scene/compilers/__tests__/geometryCompiler.test.ts
git commit -m "feat(geometry): geometryCompiler + 注册"
```

---

### Task 4: GeometryView 图元 + 接入 SceneCanvas

**Files:**
- Create: `src/scene/primitives/GeometryView.tsx`
- Modify: `src/scene/SceneCanvas.tsx`（在 renderContainers 或主渲染区追加 geo_ 分流）
- Test: `src/scene/primitives/__tests__/GeometryView.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
// src/scene/primitives/__tests__/GeometryView.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GeometryView from '../GeometryView'
import type { SceneCell } from '../../types'

function cell(id: string, meta: Record<string, unknown>): SceneCell {
  return { id, type: 'cell', position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, value: '', meta } as SceneCell
}

describe('GeometryView', () => {
  it('渲染平面与一个点', () => {
    const cells = [
      cell('geo_plane', { kind: 'plane', xRange: [0, 10], yRange: [0, 10] }),
      cell('geo_A', { kind: 'point', gx: 3, gy: 4, color: 'primary' }),
    ]
    const { container } = render(<svg><GeometryView cells={cells} /></svg>)
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/primitives/__tests__/GeometryView.test.tsx`
Expected: FAIL（无 GeometryView）

- [ ] **Step 3: 写 GeometryView**

```tsx
// src/scene/primitives/GeometryView.tsx
import type { SceneCell } from '../types'
import { makeProjector } from '../compilers/geometryMap'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

const COLOR = (c?: string) =>
  c === 'success' ? SEMANTIC_COLORS.success.stroke
  : c === 'danger' ? SEMANTIC_COLORS.danger.stroke
  : c === 'warning' ? SEMANTIC_COLORS.compare.stroke
  : c === 'muted' ? NEUTRALS.mutedText
  : SEMANTIC_COLORS.primary.stroke

interface Props { cells: SceneCell[] }

export default function GeometryView({ cells }: Props) {
  const plane = cells.find(c => (c.meta as { kind?: string })?.kind === 'plane')
  if (!plane) return null
  const meta = plane.meta as { xRange: [number, number]; yRange: [number, number] }
  const project = makeProjector(meta.xRange, meta.yRange)

  return (
    <g className="geometry-view">
      {/* 坐标轴 */}
      <line x1={project(meta.xRange[0], 0).x} y1={project(meta.xRange[0], 0).y} x2={project(meta.xRange[1], 0).x} y2={project(meta.xRange[1], 0).y} stroke={NEUTRALS.frameStroke} strokeWidth={1} />
      <line x1={project(0, meta.yRange[0]).x} y1={project(0, meta.yRange[0]).y} x2={project(0, meta.yRange[1]).x} y2={project(0, meta.yRange[1]).y} stroke={NEUTRALS.frameStroke} strokeWidth={1} />
      {cells.map(c => {
        const m = c.meta as Record<string, unknown>
        const color = COLOR(m.color as string)
        if (m.kind === 'segment') {
          const a = project(m.gx as number, m.gy as number)
          const to = m.to as [number, number]
          const b = project(to[0], to[1])
          return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1.6} />
        }
        if (m.kind === 'polygon') {
          const pts = (m.points as Array<[number, number]>).map(([x, y]) => { const p = project(x, y); return `${p.x},${p.y}` }).join(' ')
          return <polygon key={c.id} points={pts} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.6} />
        }
        if (m.kind === 'sweepline') {
          const axis = m.axis as 'x' | 'y'; const v = m.value as number
          return axis === 'x'
            ? <line key={c.id} x1={project(v, meta.yRange[0]).x} y1={project(v, meta.yRange[0]).y} x2={project(v, meta.yRange[1]).x} y2={project(v, meta.yRange[1]).y} stroke={color} strokeWidth={1.4} strokeDasharray="5 4" />
            : <line key={c.id} x1={project(meta.xRange[0], v).x} y1={project(meta.xRange[0], v).y} x2={project(meta.xRange[1], v).x} y2={project(meta.xRange[1], v).y} stroke={color} strokeWidth={1.4} strokeDasharray="5 4" />
        }
        if (m.kind === 'point') {
          const p = project(m.gx as number, m.gy as number)
          return (
            <g key={c.id}>
              <circle cx={p.x} cy={p.y} r={5} fill={color} />
              {m.label != null && <text x={p.x + 8} y={p.y - 6} fontSize={12} fill={NEUTRALS.bodyText} fontFamily="monospace">{String(m.label)}</text>}
            </g>
          )
        }
        return null
      })}
    </g>
  )
}
```

- [ ] **Step 4: 接入 SceneCanvas**

在 `src/scene/SceneCanvas.tsx`：`import GeometryView from './primitives/GeometryView'`。在主渲染 `<g>` 内（实体渲染附近）追加：

```tsx
{(() => {
  const geoCells = entities.filter((e): e is import('./types').SceneCell => e.type === 'cell' && e.id.startsWith('geo_'))
  return geoCells.length > 0 ? <GeometryView cells={geoCells} /> : null
})()}
```

（确保 `entities` 变量在作用域内；它在组件顶部已由 `Object.values(scene.entities)` 得到。）

- [ ] **Step 5: 运行验证通过 + 场景回归**

Run: `npx vitest run src/scene`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/scene/primitives/GeometryView.tsx src/scene/SceneCanvas.tsx src/scene/primitives/__tests__/GeometryView.test.tsx
git commit -m "feat(geometry): GeometryView 图元 + 接入 SceneCanvas"
```

---

### Task 5: builder 方法（供 AI 生成器使用）

**Files:**
- Modify: `src/sandbox/builder.ts`（新增 geometry builder 方法）
- Test: `src/sandbox/__tests__/builder.test.ts`（追加）

- [ ] **Step 1: 追加失败测试**

```ts
// 追加到 src/sandbox/__tests__/builder.test.ts
it('builder geometry 方法产出 geometry.* 事件', () => {
  const b = makeBuilder() // 按文件现有创建方式
  b.geoPlane([0, 10], [0, 10])
  b.geoPoint('A', 3, 4)
  const script = b.build()
  const evs = script.steps.flatMap(s => s.events ?? [])
  expect(evs.some(e => e.type === 'geometry.plane')).toBe(true)
  expect(evs.some(e => e.type === 'geometry.point')).toBe(true)
})
```

> 注：`makeBuilder()` 按 `builder.test.ts` 现有的 builder 实例化方式替换。先读该测试文件头部，沿用其创建 builder 的写法。

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/sandbox/__tests__/builder.test.ts`
Expected: FAIL（无 geoPlane/geoPoint）

- [ ] **Step 3: 实现 builder 方法**

在 `src/sandbox/builder.ts` 的 AnimationBuilder 类中，仿照已有结构方法（如 arrayCreate / heapPush）新增：

```ts
geoPlane(xRange: [number, number], yRange: [number, number]) { this.pushEvent({ type: 'geometry.plane', xRange, yRange }); return this }
geoPoint(id: string, x: number, y: number, label?: string, color?: string) { this.pushEvent({ type: 'geometry.point', id, x, y, label, color } as never); return this }
geoSegment(id: string, from: [number, number], to: [number, number], color?: string) { this.pushEvent({ type: 'geometry.segment', id, from, to, color } as never); return this }
geoPolygon(id: string, points: Array<[number, number]>, color?: string) { this.pushEvent({ type: 'geometry.polygon', id, points, color } as never); return this }
geoSweep(axis: 'x' | 'y', value: number) { this.pushEvent({ type: 'geometry.sweepline', axis, value }); return this }
geoClear() { this.pushEvent({ type: 'geometry.clear' }); return this }
```

> 注：`pushEvent` 用 builder 内部既有的「追加事件并开新步」机制（读 builder.ts 确认方法名，如 `step`/`emit`/`addStep`），按真实 API 调整。

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/sandbox/__tests__/builder.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/sandbox/builder.ts src/sandbox/__tests__/builder.test.ts
git commit -m "feat(geometry): builder 几何方法"
```

---

### Task 6: 凸包演示预设 + 接线 + 端到端测试

**Files:**
- Create: `src/presets/convexHull.ts`
- Modify: `src/presets/generators.ts`、`src/store/algorithmStore.ts`
- Test: `src/presets/__tests__/convexHull.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/presets/__tests__/convexHull.test.ts
import { describe, it, expect } from 'vitest'
import { generateConvexHull } from '../convexHull'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateConvexHull', () => {
  it('走 geometry.* 且首帧有平面与点', () => {
    const script = generateConvexHull([[0, 0], [4, 0], [2, 3], [1, 1]])
    expect(script.presentation?.module).toBe('geometry')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'geometry.plane')).toBe(true)
    expect(evs.filter(e => e.type === 'geometry.point').length).toBeGreaterThanOrEqual(4)
    const scene = deriveSceneState(script, 1)
    expect(scene.entities['geo_plane']).toBeDefined()
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/presets/__tests__/convexHull.test.ts`
Expected: FAIL（无 generateConvexHull）

- [ ] **Step 3: 写预设**

```ts
// src/presets/convexHull.ts
import type { AnimationScript } from '@/types/animation'

type Pt = [number, number]
const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

export function generateConvexHull(input?: Pt[]): AnimationScript {
  const pts: Pt[] = (input && input.length >= 3 ? input : [[0, 0], [5, 0], [5, 5], [0, 5], [2, 2], [3, 1]])
    .map(([x, y]) => [x, y] as Pt)
  const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1])
  const xRange: Pt = [Math.min(...xs) - 1, Math.max(...xs) + 1]
  const yRange: Pt = [Math.min(...ys) - 1, Math.max(...ys) + 1]
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (zh: string, en: string, events: AnimationScript['steps'][number]['events']) =>
    steps.push({ stepId: sid++, codeLine: 0, description: { zh, en }, action: { type: 'highlight', targets: [], color: 'primary' }, events, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  push('初始化平面与点集', 'Init plane and points', [
    { type: 'geometry.plane', xRange, yRange },
    ...pts.map((p, i) => ({ type: 'geometry.point' as const, id: `p${i}`, x: p[0], y: p[1], label: String(i) })),
  ])

  // Andrew monotone chain
  const sorted = pts.map((p, i) => ({ p, i })).sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1])
  const lower: Array<{ p: Pt; i: number }> = []
  for (const cur of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2].p, lower[lower.length - 1].p, cur.p) <= 0) lower.pop()
    lower.push(cur)
    push(`加入点 ${cur.i}，维护下凸壳`, `Add point ${cur.i}, maintain lower hull`,
      lower.slice(1).map((q, k) => ({ type: 'geometry.segment' as const, id: `low_${k}`, from: lower[k].p, to: q.p, color: 'success' })))
  }
  push('凸包构建完成（下链）', 'Lower hull done', [])

  return {
    algorithm: 'convex_hull',
    complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'geometry' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
```

- [ ] **Step 4: 接线**

在 `src/presets/generators.ts`：`import { generateConvexHull } from './convexHull'`；新增 `const convexHullWrapper = (input: unknown) => generateConvexHull(parsePoints(input))`（若无点解析工具，先用 `() => generateConvexHull()` 忽略输入）；把 `convex_hull: convexHullWrapper` 加入 id 映射表。
在 `src/store/algorithmStore.ts`：仿照 `heap_ds` 项追加目录项 `{ id: 'convex_hull', name: '凸包 (Andrew)', nameEn: 'Convex Hull (Andrew)', category: 'data-structure', difficulty: 'medium', ... }`（字段对齐现有项）。

- [ ] **Step 5: 运行验证通过**

Run: `npx vitest run src/presets/__tests__/convexHull.test.ts`
Expected: PASS

- [ ] **Step 6: 全量门禁 + 提交**

Run: `npx tsc --noEmit && npm run test && npm run lint`
Expected: tsc 0、测试全绿、lint 无新增 error。

```bash
git add src/presets/convexHull.ts src/presets/generators.ts src/store/algorithmStore.ts src/presets/__tests__/convexHull.test.ts
git commit -m "feat(geometry): 凸包演示预设 + 目录接线"
```

## 验收对照（spec §3.1 / §6）
- [x] geometry.* 事件族 + 映射 + compiler（Task 1-3）
- [x] GeometryView 渲染点/线段/多边形/扫描线/轴（Task 4）
- [x] builder 方法（Task 5）
- [x] 凸包演示、目录可见、首帧非空（Task 6）
