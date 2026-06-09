# 图高级分析模块（SCC / disc-low / DFS 栈）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `graph_analysis.*` 事件族 + `GraphAnalysisView`，在已有图结点上叠加 disc/low 标注、DFS 栈面板与 SCC 分组着色，并提供 Tarjan 强连通分量演示。

**Architecture:** 不修改 graphCompiler。新增 compiler 把分析模型（disc/low、栈、分组）累积存入一个隐藏标记 cell `gan_marker` 的 `meta`；`GraphAnalysisView` 读取该标记 + 场景中的图结点位置（`type==='node'` 且 `variant` 以 `graph.` 开头），渲染标注与分组环。分组色用本地分类调色板（非语义令牌）。

**Tech Stack:** TypeScript、React + SVG、Vitest。

**前置阅读：** `src/scene/eventTypes.ts`、`src/scene/eventCompiler.ts`、`src/scene/compilers/heapCompiler.ts`（标记 cell 范式见 `variantMarkerCell`）、`src/scene/compilers/graphCompiler.ts`（确认图结点 id 与 variant）、`src/scene/primitives/EdgeView.tsx`（primitive 接收 `scene` 的范式）、`src/scene/SceneCanvas.tsx`、`src/scene/types.ts`。

**共享文件（追加式）：** eventTypes.ts、eventCompiler.ts、SceneCanvas.tsx、store/algorithmStore.ts、presets/generators.ts。

---

### Task 1: 事件族类型

**Files:** Modify `src/scene/eventTypes.ts`

- [ ] **Step 1: 追加类型并入联合**

```ts
export type GraphAnalysisAlgorithmEvent =
  | { type: 'graph_analysis.update'; discLow?: Record<string, [number, number]>; stack?: string[]; components?: Record<string, number> }
  | { type: 'graph_analysis.clear' }
```

把 `| GraphAnalysisAlgorithmEvent` 加入 `AlgorithmEvent` 联合。

- [ ] **Step 2: 验证编译** — Run: `npx tsc --noEmit`，Expected: exit 0。
- [ ] **Step 3: 提交**

```bash
git add src/scene/eventTypes.ts && git commit -m "feat(graph-analysis): 新增 graph_analysis.* 事件族类型"
```

---

### Task 2: graphAnalysisCompiler + 注册

**Files:**
- Create: `src/scene/compilers/graphAnalysisCompiler.ts`
- Modify: `src/scene/eventCompiler.ts`
- Test: `src/scene/compilers/__tests__/graphAnalysisCompiler.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/scene/compilers/__tests__/graphAnalysisCompiler.test.ts
import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'gan', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'graph', data: [], nodes: [], edges: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('graphAnalysisCompiler', () => {
  it('update 把模型累积到 gan_marker.meta', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'graph_analysis.update', discLow: { A: [1, 1] }, stack: ['A'] })
    scene = step(scene, { type: 'graph_analysis.update', components: { A: 0 } })
    const marker = scene.entities['gan_marker'] as SceneCell
    const model = marker.meta as { discLow: Record<string, [number, number]>; stack: string[]; components: Record<string, number> }
    expect(model.discLow.A).toEqual([1, 1])
    expect(model.stack).toEqual(['A'])
    expect(model.components.A).toBe(0) // 后一次 update 合并保留前者
  })

  it('clear 移除标记', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'graph_analysis.update', stack: ['A'] })
    scene = step(scene, { type: 'graph_analysis.clear' })
    expect(scene.entities['gan_marker']).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `npx vitest run src/scene/compilers/__tests__/graphAnalysisCompiler.test.ts`，Expected: FAIL。
- [ ] **Step 3: 写 compiler**

```ts
// src/scene/compilers/graphAnalysisCompiler.ts
import type { SceneCommand } from '../commandTypes'
import type { GraphAnalysisAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'

const MARKER = 'gan_marker'

interface AnalysisModel {
  discLow: Record<string, [number, number]>
  stack: string[]
  components: Record<string, number>
}

export const graphAnalysisCompiler: EventCompiler = {
  supports: (e): e is GraphAnalysisAlgorithmEvent => e.type.startsWith('graph_analysis.'),
  compile: (e, ctx) => compile(e as GraphAnalysisAlgorithmEvent, ctx),
}

function readModel(context: CompileContext): AnalysisModel {
  const m = context.scene.entities[MARKER]
  const meta = m?.type === 'cell' ? (m.meta as Partial<AnalysisModel> | undefined) : undefined
  return { discLow: { ...(meta?.discLow ?? {}) }, stack: [...(meta?.stack ?? [])], components: { ...(meta?.components ?? {}) } }
}

function markerCell(model: AnalysisModel): SceneCell {
  return {
    id: MARKER, type: 'cell',
    position: { x: 0, y: 0 }, size: { width: 0, height: 0 },
    value: '', state: { role: 'empty_placeholder', color: 'muted' },
    meta: { ...model },
  }
}

function compile(event: GraphAnalysisAlgorithmEvent, context: CompileContext): SceneCommand[] {
  if (event.type === 'graph_analysis.clear') {
    return context.scene.entities[MARKER] ? [{ type: 'remove_entity', entityId: MARKER }] : []
  }
  const model = readModel(context)
  if (event.discLow) Object.assign(model.discLow, event.discLow)
  if (event.stack) model.stack = [...event.stack]
  if (event.components) Object.assign(model.components, event.components)
  return [{ type: 'create_cell', cell: markerCell(model) }]
}
```

- [ ] **Step 4: 注册** — 在 `eventCompiler.ts` import 并加入 `compilers` 数组。
- [ ] **Step 5: 运行验证通过** — Run: `npx vitest run src/scene/compilers/__tests__/graphAnalysisCompiler.test.ts`，Expected: PASS。
- [ ] **Step 6: 提交**

```bash
git add src/scene/compilers/graphAnalysisCompiler.ts src/scene/eventCompiler.ts src/scene/compilers/__tests__/graphAnalysisCompiler.test.ts && git commit -m "feat(graph-analysis): graphAnalysisCompiler + 注册"
```

---

### Task 3: GraphAnalysisView 图元 + 接入 SceneCanvas

**Files:**
- Create: `src/scene/primitives/GraphAnalysisView.tsx`
- Modify: `src/scene/SceneCanvas.tsx`
- Test: `src/scene/primitives/__tests__/GraphAnalysisView.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
// src/scene/primitives/__tests__/GraphAnalysisView.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GraphAnalysisView from '../GraphAnalysisView'
import { createEmptyScene } from '../../types'
import type { SceneState, SceneNode, SceneCell } from '../../types'

function graphNode(id: string, x: number, y: number): SceneNode {
  return { id, type: 'node', variant: 'graph.directed', position: { x, y }, size: { width: 44, height: 44 }, ports: [], fields: [{ id: 'value', label: '', value: id, role: 'value' }] } as SceneNode
}

describe('GraphAnalysisView', () => {
  it('为有 disc/low 的图结点渲染标注文本', () => {
    const marker: SceneCell = { id: 'gan_marker', type: 'cell', position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, value: '', meta: { discLow: { A: [1, 1] }, stack: ['A'], components: { A: 0 } } } as SceneCell
    const scene: SceneState = { ...createEmptyScene(), entities: { A: graphNode('A', 100, 100), gan_marker: marker } }
    const { container } = render(<svg><GraphAnalysisView marker={marker} scene={scene} /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts.some(t => t?.includes('1/1'))).toBe(true) // disc/low 标注
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `npx vitest run src/scene/primitives/__tests__/GraphAnalysisView.test.tsx`，Expected: FAIL。
- [ ] **Step 3: 写 GraphAnalysisView**

```tsx
// src/scene/primitives/GraphAnalysisView.tsx
import type { SceneCell, SceneState } from '../types'
import { NEUTRALS } from '../tokens'

const GROUP_PALETTE = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D']

interface Props { marker: SceneCell; scene: SceneState }
interface Model { discLow: Record<string, [number, number]>; stack: string[]; components: Record<string, number> }

export default function GraphAnalysisView({ marker, scene }: Props) {
  const model = marker.meta as Partial<Model>
  const discLow = model.discLow ?? {}
  const stack = model.stack ?? []
  const components = model.components ?? {}

  const graphNodes = Object.values(scene.entities).filter(
    (e): e is import('../types').SceneNode => e.type === 'node' && e.variant.startsWith('graph.'),
  )

  return (
    <g className="graph-analysis-view">
      {/* 分组环 + disc/low 标注 */}
      {graphNodes.map(n => {
        const dl = discLow[n.id]
        const g = components[n.id]
        const r = (n.size?.width ?? 44) / 2 + 6
        return (
          <g key={`gan_${n.id}`}>
            {g !== undefined && (
              <circle cx={n.position.x} cy={n.position.y} r={r} fill="none" stroke={GROUP_PALETTE[g % GROUP_PALETTE.length]} strokeWidth={2.4} strokeOpacity={0.85} />
            )}
            {dl && (
              <text x={n.position.x} y={n.position.y - r - 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={NEUTRALS.bodyText}>
                {`${dl[0]}/${dl[1]}`}
              </text>
            )}
          </g>
        )
      })}
      {/* DFS 栈面板 */}
      {stack.length > 0 && (
        <g>
          <text x={40} y={40} fontSize={11} fontFamily="monospace" fill={NEUTRALS.labelText}>DFS 栈</text>
          {stack.map((id, i) => (
            <g key={`ganstk_${i}`}>
              <rect x={32} y={48 + (stack.length - 1 - i) * 30} width={56} height={26} rx={4} fill={NEUTRALS.surface} stroke={NEUTRALS.frameStroke} strokeWidth={1} />
              <text x={60} y={48 + (stack.length - 1 - i) * 30 + 17} textAnchor="middle" fontSize={12} fontFamily="monospace" fill={NEUTRALS.bodyText}>{id}</text>
            </g>
          ))}
        </g>
      )}
    </g>
  )
}
```

- [ ] **Step 4: 接入 SceneCanvas** — `import GraphAnalysisView from './primitives/GraphAnalysisView'`；在主渲染 `<g className="pointer-events-auto">` 内（能访问 `scene`）追加：

```tsx
{scene.entities['gan_marker']?.type === 'cell' && (
  <GraphAnalysisView marker={scene.entities['gan_marker'] as import('./types').SceneCell} scene={scene} />
)}
```

> `gan_marker` 是 0 尺寸 empty_placeholder，CellView 已对 `role==='empty_placeholder'` 返回 null，不会画出方块——无需改 CellView。

- [ ] **Step 5: 运行验证通过 + 场景回归** — Run: `npx vitest run src/scene`，Expected: PASS。
- [ ] **Step 6: 提交**

```bash
git add src/scene/primitives/GraphAnalysisView.tsx src/scene/SceneCanvas.tsx src/scene/primitives/__tests__/GraphAnalysisView.test.tsx && git commit -m "feat(graph-analysis): GraphAnalysisView 图元 + 接入"
```

---

### Task 4: builder 方法

**Files:** Modify `src/sandbox/builder.ts`；Test `src/sandbox/__tests__/builder.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
it('builder graph_analysis 方法产出事件', () => {
  const b = makeBuilder()
  b.ganUpdate({ discLow: { A: [1, 1] }, stack: ['A'] })
  const evs = b.build().steps.flatMap(s => s.events ?? [])
  expect(evs.some(e => e.type === 'graph_analysis.update')).toBe(true)
})
```

> `makeBuilder()` 按 builder.test.ts 现有写法替换。

- [ ] **Step 2: 运行验证失败** — Expected: FAIL。
- [ ] **Step 3: 实现 builder 方法**

```ts
ganUpdate(patch: { discLow?: Record<string, [number, number]>; stack?: string[]; components?: Record<string, number> }) { this.pushEvent({ type: 'graph_analysis.update', ...patch }); return this }
ganClear() { this.pushEvent({ type: 'graph_analysis.clear' }); return this }
```

> `pushEvent` 按 builder 真实 API 调整。

- [ ] **Step 4: 运行验证通过** — Expected: PASS。
- [ ] **Step 5: 提交**

```bash
git add src/sandbox/builder.ts src/sandbox/__tests__/builder.test.ts && git commit -m "feat(graph-analysis): builder 方法"
```

---

### Task 5: Tarjan SCC 演示预设 + 接线 + 端到端

**Files:**
- Create: `src/presets/tarjanScc.ts`
- Modify: `src/presets/generators.ts`、`src/store/algorithmStore.ts`
- Test: `src/presets/__tests__/tarjanScc.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/presets/__tests__/tarjanScc.test.ts
import { describe, it, expect } from 'vitest'
import { generateTarjanScc } from '../tarjanScc'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateTarjanScc', () => {
  it('创建图 + graph_analysis 标注,末步给出分组', () => {
    const script = generateTarjanScc()
    expect(script.presentation?.module).toBe('graph')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'graph.create')).toBe(true)
    expect(evs.some(e => e.type === 'graph_analysis.update')).toBe(true)
    const last = deriveSceneState(script, script.steps.length)
    const marker = last.entities['gan_marker']
    expect(marker).toBeDefined()
  })
})
```

- [ ] **Step 2: 运行验证失败** — Expected: FAIL。
- [ ] **Step 3: 写预设**

```ts
// src/presets/tarjanScc.ts
import type { AnimationScript } from '@/types/animation'

// 固定演示图：0→1→2→0 (一个 SCC), 2→3, 3→3 自环之外 3 单独成一组。
export function generateTarjanScc(): AnimationScript {
  const nodes = ['0', '1', '2', '3']
  const adj: Record<string, string[]> = { '0': ['1'], '1': ['2'], '2': ['0', '3'], '3': [] }
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (zh: string, en: string, events: AnimationScript['steps'][number]['events']) =>
    steps.push({ stepId: sid++, codeLine: 0, description: { zh, en }, action: { type: 'highlight', targets: [], color: 'primary' }, events, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  push('构建有向图', 'Build directed graph', [{
    type: 'graph.create', variant: 'directed',
    nodes: nodes.map(id => ({ id, label: id })),
    edges: Object.entries(adj).flatMap(([u, vs]) => vs.map(v => ({ from: u, to: v }))),
  }])

  // Tarjan
  let idx = 0
  const disc: Record<string, number> = {}, low: Record<string, number> = {}
  const onStack = new Set<string>(); const stack: string[] = []
  const comp: Record<string, number> = {}; let compId = 0

  const dfs = (u: string) => {
    idx++; disc[u] = idx; low[u] = idx; stack.push(u); onStack.add(u)
    push(`访问 ${u}，disc=low=${idx}，入栈`, `visit ${u}`, [
      { type: 'graph.visit', nodeId: u },
      { type: 'graph_analysis.update', discLow: { [u]: [disc[u], low[u]] }, stack: [...stack] },
    ])
    for (const v of adj[u]) {
      if (disc[v] === undefined) {
        dfs(v)
        low[u] = Math.min(low[u], low[v])
      } else if (onStack.has(v)) {
        low[u] = Math.min(low[u], disc[v])
      }
      push(`回溯/更新 ${u}.low=${low[u]}`, `update ${u}.low`, [
        { type: 'graph_analysis.update', discLow: { [u]: [disc[u], low[u]] } },
      ])
    }
    if (low[u] === disc[u]) {
      const members: string[] = []
      let w = ''
      do { w = stack.pop()!; onStack.delete(w); comp[w] = compId; members.push(w) } while (w !== u)
      push(`发现 SCC #${compId}: {${members.join(', ')}}`, `SCC #${compId}`, [
        { type: 'graph_analysis.update', stack: [...stack], components: { ...comp } },
      ])
      compId++
    }
  }
  for (const n of nodes) if (disc[n] === undefined) dfs(n)

  push(`完成，共 ${compId} 个强连通分量`, `Done, ${compId} SCCs`, [{ type: 'graph_analysis.update', components: { ...comp } }])

  return {
    algorithm: 'tarjan_scc',
    complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'graph' },
    initialState: { type: 'graph', data: [], nodes: nodes.map(id => ({ id, label: id })), edges: Object.entries(adj).flatMap(([u, vs]) => vs.map(v => ({ from: u, to: v }))) },
    steps,
  }
}
```

> 注：`graph.create` / `graph.visit` 的事件字段以 `src/scene/eventTypes.ts` 中 `GraphAlgorithmEvent` 真实定义为准（开工前先读，对齐 nodes/edges 字段名与 variant 取值）。

- [ ] **Step 4: 接线** — `generators.ts`：import + `const tarjanSccWrapper = () => generateTarjanScc()`，加入 id 映射 `tarjan_scc: tarjanSccWrapper`。`algorithmStore.ts`：追加目录项 `{ id: 'tarjan_scc', name: 'Tarjan 强连通分量', nameEn: 'Tarjan SCC', category: 'graph', difficulty: 'hard', ... }`（字段对齐现有项；category 用现有合法值如 'graph'）。
- [ ] **Step 5: 运行验证通过** — Run: `npx vitest run src/presets/__tests__/tarjanScc.test.ts`，Expected: PASS。
- [ ] **Step 6: 全量门禁 + 提交**

Run: `npx tsc --noEmit && npm run test && npm run lint`，Expected: 全绿。

```bash
git add src/presets/tarjanScc.ts src/presets/generators.ts src/store/algorithmStore.ts src/presets/__tests__/tarjanScc.test.ts && git commit -m "feat(graph-analysis): Tarjan SCC 演示 + 目录接线"
```

## 验收对照（spec §3.4 / §6）
- [x] graph_analysis.* 事件族 + compiler（累积模型）（Task 1-2）
- [x] GraphAnalysisView（disc/low 标注 + SCC 分组环 + DFS 栈面板，读图结点位置）（Task 3）
- [x] builder 方法（Task 4）
- [x] Tarjan SCC 演示、目录可见（Task 5）
