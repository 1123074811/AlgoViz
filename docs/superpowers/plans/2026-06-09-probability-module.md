# 概率/随机化可视化模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `prob.*` 事件族 + `DistributionView`，可视化概率分布直方图、采样高亮与水塘抽样槽位，并提供水塘抽样演示。

**Architecture:** 直方图柱以 `prob_bin_<i>` cell 承载（meta 存 label/weight），水塘槽以 `prob_res_<i>` cell 承载；`DistributionView` 按权重归一化绘制柱状图、轴与当前采样/替换高亮。

**Tech Stack:** TypeScript、React + SVG、Vitest。

**前置阅读：** `src/scene/eventTypes.ts`、`src/scene/eventCompiler.ts`、`src/scene/compilers/heapCompiler.ts`、`src/scene/SceneCanvas.tsx`、`src/scene/types.ts`、`src/scene/tokens.ts`。

**共享文件（追加式）：** eventTypes.ts、eventCompiler.ts、SceneCanvas.tsx、store/algorithmStore.ts、presets/generators.ts。`prob_` 的 CellView 跳过由协调者统一处理（见集成说明），本计划不改 CellView。

---

### Task 1: 事件族类型

**Files:** Modify `src/scene/eventTypes.ts`

- [ ] **Step 1: 追加类型并入联合**

```ts
export type ProbAlgorithmEvent =
  | { type: 'prob.dist'; bins: Array<{ label: string; weight: number }> }
  | { type: 'prob.sample'; index: number }
  | { type: 'prob.reservoir'; capacity: number; items: Array<number | string> }
  | { type: 'prob.note'; text: string }
  | { type: 'prob.clear' }
```

把 `| ProbAlgorithmEvent` 加入 `AlgorithmEvent` 联合。

- [ ] **Step 2: 验证编译** — Run: `npx tsc --noEmit`，Expected: exit 0。
- [ ] **Step 3: 提交**

```bash
git add src/scene/eventTypes.ts && git commit -m "feat(prob): 新增 prob.* 事件族类型"
```

---

### Task 2: probCompiler + 注册

**Files:**
- Create: `src/scene/compilers/probCompiler.ts`
- Modify: `src/scene/eventCompiler.ts`
- Test: `src/scene/compilers/__tests__/probCompiler.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/scene/compilers/__tests__/probCompiler.test.ts
import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'prob', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'array', data: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('probCompiler', () => {
  it('dist 为每个 bin 产出 prob_bin_<i> cell,meta 存 weight', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'prob.dist', bins: [{ label: 'a', weight: 1 }, { label: 'b', weight: 3 }] })
    expect((scene.entities['prob_bin_0'] as SceneCell)?.type).toBe('cell')
    expect(((scene.entities['prob_bin_1'] as SceneCell).meta as { weight?: number }).weight).toBe(3)
  })

  it('sample 高亮选中 bin', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'prob.dist', bins: [{ label: 'a', weight: 1 }, { label: 'b', weight: 2 }] })
    scene = step(scene, { type: 'prob.sample', index: 1 })
    expect((scene.entities['prob_bin_1'] as SceneCell).state?.pulse).toBe(true)
  })

  it('reservoir 产出 prob_res_<i> 槽位', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'prob.reservoir', capacity: 2, items: [7, 9] })
    expect((scene.entities['prob_res_0'] as SceneCell)?.value).toBe('7')
    expect((scene.entities['prob_res_1'] as SceneCell)?.value).toBe('9')
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `npx vitest run src/scene/compilers/__tests__/probCompiler.test.ts`，Expected: FAIL。
- [ ] **Step 3: 写 compiler**

```ts
// src/scene/compilers/probCompiler.ts
import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { ProbAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'

const BASE_X = 160, BASE_Y = 360, BAR_GAP = 56, BAR_W = 40, RES_Y = 120, RES_GAP = 50

export const probCompiler: EventCompiler = {
  supports: (e): e is ProbAlgorithmEvent => e.type.startsWith('prob.'),
  compile: (e, ctx) => compile(e as ProbAlgorithmEvent, ctx),
}

function binCell(i: number, label: string, weight: number, color: ActionColor, pulse: boolean): SceneCell {
  return {
    id: `prob_bin_${i}`, type: 'cell',
    position: { x: BASE_X + i * BAR_GAP, y: BASE_Y }, size: { width: BAR_W, height: 1 },
    value: label, col: i, state: { role: pulse ? 'active' : 'idle', color, pulse },
    meta: { kind: 'bin', label, weight },
  }
}
function resCell(i: number, value: number | string, color: ActionColor, pulse: boolean): SceneCell {
  return {
    id: `prob_res_${i}`, type: 'cell',
    position: { x: BASE_X + i * RES_GAP, y: RES_Y }, size: { width: 40, height: 40 },
    value: String(value), col: i, state: { role: pulse ? 'inserted' : 'idle', color, pulse },
    meta: { kind: 'reservoir' },
  }
}

function compile(event: ProbAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'prob.dist':
      return event.bins.map((b, i) => ({ type: 'create_cell' as const, cell: binCell(i, b.label, b.weight, 'primary', false) }))
    case 'prob.sample': {
      const cleanup = Object.keys(context.scene.entities)
        .filter(k => k.startsWith('prob_bin_') && context.scene.entities[k]?.state?.pulse)
        .map(k => ({ type: 'set_state' as const, entityId: k, state: { pulse: false, role: 'idle' as const, color: 'primary' as const }, merge: true }))
      return [...cleanup, { type: 'set_state', entityId: `prob_bin_${event.index}`, state: { role: 'active', color: 'success', pulse: true }, merge: true }]
    }
    case 'prob.reservoir':
      return event.items.map((v, i) => ({ type: 'create_cell' as const, cell: resCell(i, v, 'primary', false) }))
    case 'prob.note':
      return [{ type: 'add_note', text: event.text }]
    case 'prob.clear':
      return Object.keys(context.scene.entities).filter(k => k.startsWith('prob_')).map(id => ({ type: 'remove_entity' as const, entityId: id }))
  }
}
```

- [ ] **Step 4: 注册** — 在 `eventCompiler.ts` import 并加入 `compilers` 数组。
- [ ] **Step 5: 运行验证通过** — Run: `npx vitest run src/scene/compilers/__tests__/probCompiler.test.ts`，Expected: PASS。
- [ ] **Step 6: 提交**

```bash
git add src/scene/compilers/probCompiler.ts src/scene/eventCompiler.ts src/scene/compilers/__tests__/probCompiler.test.ts && git commit -m "feat(prob): probCompiler + 注册"
```

---

### Task 3: DistributionView 图元 + 接入 SceneCanvas

**Files:**
- Create: `src/scene/primitives/DistributionView.tsx`
- Modify: `src/scene/SceneCanvas.tsx`
- Test: `src/scene/primitives/__tests__/DistributionView.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
// src/scene/primitives/__tests__/DistributionView.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DistributionView from '../DistributionView'
import type { SceneCell } from '../../types'

function bin(i: number, weight: number): SceneCell {
  return { id: `prob_bin_${i}`, type: 'cell', position: { x: 100 + i * 56, y: 360 }, size: { width: 40, height: 1 }, value: String.fromCharCode(97 + i), col: i, state: { role: 'idle', color: 'primary' }, meta: { kind: 'bin', label: String.fromCharCode(97 + i), weight } } as SceneCell
}

describe('DistributionView', () => {
  it('按权重绘制柱(权重大的柱更高)', () => {
    const cells = [bin(0, 1), bin(1, 4)]
    const { container } = render(<svg><DistributionView cells={cells} /></svg>)
    const rects = Array.from(container.querySelectorAll('rect'))
    expect(rects.length).toBeGreaterThanOrEqual(2)
    const h0 = Number(rects[0].getAttribute('height'))
    const h1 = Number(rects[1].getAttribute('height'))
    expect(h1).toBeGreaterThan(h0)
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `npx vitest run src/scene/primitives/__tests__/DistributionView.test.tsx`，Expected: FAIL。
- [ ] **Step 3: 写 DistributionView**

```tsx
// src/scene/primitives/DistributionView.tsx
import type { SceneCell } from '../types'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

interface Props { cells: SceneCell[] }
const MAX_H = 200

export default function DistributionView({ cells }: Props) {
  const bins = cells.filter(c => (c.meta as { kind?: string })?.kind === 'bin').sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const res = cells.filter(c => (c.meta as { kind?: string })?.kind === 'reservoir').sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const maxW = Math.max(1, ...bins.map(b => (b.meta as { weight?: number }).weight ?? 0))

  return (
    <g className="distribution-view">
      {bins.map(c => {
        const w = (c.meta as { weight?: number; label?: string })
        const h = ((w.weight ?? 0) / maxW) * MAX_H
        const bw = c.size?.width ?? 40
        const active = c.state?.pulse || c.state?.role === 'active'
        const fill = active ? SEMANTIC_COLORS.success.fill : SEMANTIC_COLORS.primary.fill
        const stroke = active ? SEMANTIC_COLORS.success.stroke : SEMANTIC_COLORS.primary.stroke
        const baseY = c.position.y
        return (
          <g key={c.id}>
            <rect x={c.position.x - bw / 2} y={baseY - h} width={bw} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={1.4} />
            <text x={c.position.x} y={baseY + 16} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={NEUTRALS.labelText}>{String(w.label ?? c.value ?? '')}</text>
            <text x={c.position.x} y={baseY - h - 6} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={NEUTRALS.mutedText}>{String(w.weight ?? '')}</text>
          </g>
        )
      })}
      {res.map(c => {
        const s = c.size?.width ?? 40
        const active = c.state?.pulse
        return (
          <g key={c.id}>
            <rect x={c.position.x - s / 2} y={c.position.y - s / 2} width={s} height={s} rx={6} fill={active ? SEMANTIC_COLORS.success.fill : NEUTRALS.surface} stroke={active ? SEMANTIC_COLORS.success.stroke : NEUTRALS.frameStroke} strokeWidth={1.4} />
            <text x={c.position.x} y={c.position.y + 4} textAnchor="middle" fontSize={13} fontFamily="monospace" fill={SEMANTIC_COLORS.primary.text}>{String(c.value ?? '')}</text>
          </g>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 4: 接入 SceneCanvas** — `import DistributionView from './primitives/DistributionView'`；在主渲染 `<g>` 内追加：

```tsx
{(() => {
  const probCells = entities.filter((e): e is import('./types').SceneCell => e.type === 'cell' && e.id.startsWith('prob_'))
  return probCells.length > 0 ? <DistributionView cells={probCells} /> : null
})()}
```

- [ ] **Step 5: 运行验证通过 + 场景回归** — Run: `npx vitest run src/scene`，Expected: PASS。
- [ ] **Step 6: 提交**

```bash
git add src/scene/primitives/DistributionView.tsx src/scene/SceneCanvas.tsx src/scene/primitives/__tests__/DistributionView.test.tsx && git commit -m "feat(prob): DistributionView 图元 + 接入"
```

---

### Task 4: builder 方法

**Files:** Modify `src/sandbox/builder.ts`；Test `src/sandbox/__tests__/builder.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
it('builder prob 方法产出 prob.* 事件', () => {
  const b = makeBuilder()
  b.probDist([{ label: 'a', weight: 1 }, { label: 'b', weight: 2 }])
  b.probSample(1)
  const evs = b.build().steps.flatMap(s => s.events ?? [])
  expect(evs.some(e => e.type === 'prob.dist')).toBe(true)
  expect(evs.some(e => e.type === 'prob.sample')).toBe(true)
})
```

> `makeBuilder()` 按 builder.test.ts 现有写法替换。

- [ ] **Step 2: 运行验证失败** — Expected: FAIL。
- [ ] **Step 3: 实现 builder 方法**

```ts
probDist(bins: Array<{ label: string; weight: number }>) { this.pushEvent({ type: 'prob.dist', bins }); return this }
probSample(index: number) { this.pushEvent({ type: 'prob.sample', index }); return this }
probReservoir(capacity: number, items: Array<number | string>) { this.pushEvent({ type: 'prob.reservoir', capacity, items }); return this }
probNote(text: string) { this.pushEvent({ type: 'prob.note', text }); return this }
```

> `pushEvent` 按 builder 真实 API 调整。

- [ ] **Step 4: 运行验证通过** — Expected: PASS。
- [ ] **Step 5: 提交**

```bash
git add src/sandbox/builder.ts src/sandbox/__tests__/builder.test.ts && git commit -m "feat(prob): builder 概率方法"
```

---

### Task 5: 水塘抽样演示预设 + 接线 + 端到端

**Files:**
- Create: `src/presets/reservoir.ts`
- Modify: `src/presets/generators.ts`、`src/store/algorithmStore.ts`
- Test: `src/presets/__tests__/reservoir.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/presets/__tests__/reservoir.test.ts
import { describe, it, expect } from 'vitest'
import { generateReservoir } from '../reservoir'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateReservoir', () => {
  it('走 prob.* 且首帧有水塘槽位', () => {
    const script = generateReservoir([10, 20, 30, 40, 50])
    expect(script.presentation?.module).toBe('prob')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'prob.reservoir')).toBe(true)
    const scene = deriveSceneState(script, 1)
    expect(Object.keys(scene.entities).some(k => k.startsWith('prob_res_'))).toBe(true)
  })
})
```

- [ ] **Step 2: 运行验证失败** — Expected: FAIL。
- [ ] **Step 3: 写预设**

```ts
// src/presets/reservoir.ts
import type { AnimationScript } from '@/types/animation'

// 水塘抽样 k=1：以确定性"伪随机"（这里用 i 的奇偶决定是否替换，保证演示可复现）展示替换逻辑。
export function generateReservoir(arr?: number[]): AnimationScript {
  const stream = (arr && arr.length > 0 ? arr : [10, 20, 30, 40, 50, 60])
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (zh: string, en: string, events: AnimationScript['steps'][number]['events']) =>
    steps.push({ stepId: sid++, codeLine: 0, description: { zh, en }, action: { type: 'highlight', targets: [], color: 'primary' }, events, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  let chosen = stream[0]
  push(`初始化：水塘容量 1，先放入第 1 个元素 ${chosen}`, `Init reservoir(1) with first element ${chosen}`, [
    { type: 'prob.reservoir', capacity: 1, items: [chosen] },
    { type: 'prob.note', text: '水塘抽样 k=1：第 i 个元素以 1/i 概率替换当前样本' },
  ])

  for (let i = 1; i < stream.length; i++) {
    const replace = (i % 2 === 1) // 演示用确定性规则
    if (replace) chosen = stream[i]
    push(
      `第 ${i + 1} 个元素 ${stream[i]}：以 1/${i + 1} 概率替换 → ${replace ? `替换为 ${chosen}` : '保留原样本'}`,
      `element ${i + 1} = ${stream[i]}: replace with prob 1/${i + 1} → ${replace ? 'replaced' : 'kept'}`,
      [
        { type: 'prob.reservoir', capacity: 1, items: [chosen] },
        { type: 'prob.note', text: replace ? `替换：当前样本 = ${chosen}` : `保留：当前样本 = ${chosen}` },
      ],
    )
  }
  push(`抽样结束，最终样本 = ${chosen}`, `Done, sample = ${chosen}`, [{ type: 'prob.note', text: `最终样本 ${chosen}` }])

  return {
    algorithm: 'reservoir_sampling',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    presentation: { engine: 'scene', module: 'prob' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
```

- [ ] **Step 4: 接线** — `generators.ts`：import + `const reservoirWrapper = (input: unknown) => generateReservoir(parseArr(input))`（沿用现有 `parseArr`），加入 id 映射 `reservoir_sampling: reservoirWrapper`。`algorithmStore.ts`：追加目录项 `{ id: 'reservoir_sampling', name: '水塘抽样', nameEn: 'Reservoir Sampling', category: 'data-structure', difficulty: 'medium', ... }`（字段对齐现有项）。
- [ ] **Step 5: 运行验证通过** — Run: `npx vitest run src/presets/__tests__/reservoir.test.ts`，Expected: PASS。
- [ ] **Step 6: 全量门禁 + 提交**

Run: `npx tsc --noEmit && npm run test && npm run lint`，Expected: 全绿。

```bash
git add src/presets/reservoir.ts src/presets/generators.ts src/store/algorithmStore.ts src/presets/__tests__/reservoir.test.ts && git commit -m "feat(prob): 水塘抽样演示 + 目录接线"
```

## 验收对照（spec §3.3 / §6）
- [x] prob.* 事件族 + compiler（Task 1-2）
- [x] DistributionView（直方图按权重 + 采样高亮 + 水塘槽）（Task 3）
- [x] builder 方法（Task 4）
- [x] 水塘抽样演示、目录可见、首帧非空（Task 5）
