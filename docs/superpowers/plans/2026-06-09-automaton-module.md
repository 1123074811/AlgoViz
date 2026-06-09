# 状态机可视化模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `automaton.*` 事件族 + `AutomatonView`，可视化有限状态机（状态圆 + 带标签有向转移 + 起始/接受态标记 + 当前态高亮 + 输入消耗），并提供 KMP 自动机匹配演示。

**Architecture:** 状态以 `auto_<id>` cell 表示（横向链式布局，meta 携带 accepting/start/active）；转移用 `autoedge_<id>` 边（复用 EdgeView，支持自环）。当前态与已消耗输入由 set_state 高亮。

**Tech Stack:** TypeScript、React + SVG、Vitest。

**前置阅读：** `src/scene/eventTypes.ts`、`src/scene/eventCompiler.ts`、`src/scene/compilers/heapCompiler.ts`（compiler 范式）、`src/scene/primitives/HeapView.tsx`（圆形结点渲染范式）、`src/scene/primitives/EdgeView.tsx`（边/自环）、`src/scene/SceneCanvas.tsx`、`src/scene/types.ts`。

**共享文件（追加式）：** eventTypes.ts、eventCompiler.ts、SceneCanvas.tsx、store/algorithmStore.ts、presets/generators.ts。

---

### Task 1: 事件族类型

**Files:** Modify `src/scene/eventTypes.ts`

- [ ] **Step 1: 追加类型并入联合**

```ts
export type AutomatonAlgorithmEvent =
  | { type: 'automaton.create'; states: Array<{ id: string; label?: string; accepting?: boolean; start?: boolean }> }
  | { type: 'automaton.transition'; id: string; from: string; to: string; label: string }
  | { type: 'automaton.activate'; stateId: string }
  | { type: 'automaton.consume'; symbol: string; index: number }
  | { type: 'automaton.clear' }
```

把 `| AutomatonAlgorithmEvent` 加入 `AlgorithmEvent` 联合。

- [ ] **Step 2: 验证编译** — Run: `npx tsc --noEmit`，Expected: exit 0。
- [ ] **Step 3: 提交**

```bash
git add src/scene/eventTypes.ts && git commit -m "feat(automaton): 新增 automaton.* 事件族类型"
```

---

### Task 2: automatonCompiler + 注册

**Files:**
- Create: `src/scene/compilers/automatonCompiler.ts`
- Modify: `src/scene/eventCompiler.ts`
- Test: `src/scene/compilers/__tests__/automatonCompiler.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/scene/compilers/__tests__/automatonCompiler.test.ts
import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'auto', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'array', data: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('automatonCompiler', () => {
  it('create 产出 auto_<id> 状态,横向排列,start/accepting 写入 meta', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'automaton.create', states: [{ id: 's0', start: true }, { id: 's1', accepting: true }] })
    const s0 = scene.entities['auto_s0'] as SceneCell
    const s1 = scene.entities['auto_s1'] as SceneCell
    expect(s0?.type).toBe('cell')
    expect((s0.meta as { start?: boolean }).start).toBe(true)
    expect((s1.meta as { accepting?: boolean }).accepting).toBe(true)
    expect(s1.position.x).toBeGreaterThan(s0.position.x) // 横向链式
  })

  it('transition 产出 autoedge_ 边;activate 高亮当前态', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'automaton.create', states: [{ id: 's0' }, { id: 's1' }] })
    scene = step(scene, { type: 'automaton.transition', id: 't0', from: 's0', to: 's1', label: 'a' })
    expect(scene.edges['autoedge_t0']?.from.entityId).toBe('auto_s0')
    expect(scene.edges['autoedge_t0']?.to.entityId).toBe('auto_s1')
    scene = step(scene, { type: 'automaton.activate', stateId: 's1' })
    expect((scene.entities['auto_s1'] as SceneCell).state?.pulse).toBe(true)
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `npx vitest run src/scene/compilers/__tests__/automatonCompiler.test.ts`，Expected: FAIL。
- [ ] **Step 3: 写 compiler**

```ts
// src/scene/compilers/automatonCompiler.ts
import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { AutomatonAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell, SceneEdge } from '../types'

const START_X = 140, START_Y = 240, GAP = 130, R = 26

export const automatonCompiler: EventCompiler = {
  supports: (e): e is AutomatonAlgorithmEvent => e.type.startsWith('automaton.'),
  compile: (e, ctx) => compile(e as AutomatonAlgorithmEvent, ctx),
}

const stateId = (id: string) => `auto_${id}`
const edgeId = (id: string) => `autoedge_${id}`

function stateCell(id: string, slot: number, label: string | undefined, accepting: boolean, start: boolean, color: ActionColor, pulse: boolean): SceneCell {
  return {
    id: stateId(id), type: 'cell',
    position: { x: START_X + slot * GAP, y: START_Y },
    size: { width: R * 2, height: R * 2 },
    value: label ?? id, col: slot,
    state: { role: pulse ? 'active' : 'idle', color, pulse },
    meta: { kind: 'state', accepting, start, name: id },
  }
}

function compile(event: AutomatonAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'automaton.create':
      return event.states.map((s, i) => ({ type: 'create_cell' as const, cell: stateCell(s.id, i, s.label, !!s.accepting, !!s.start, 'primary', false) }))
    case 'automaton.transition': {
      const edge: SceneEdge = {
        id: edgeId(event.id), type: 'edge',
        from: { entityId: stateId(event.from) }, to: { entityId: stateId(event.to) },
        label: event.label, directed: true,
        style: { curved: event.from === event.to, color: 'muted' },
      }
      return [{ type: 'connect', edge }]
    }
    case 'automaton.activate': {
      const cleanup = Object.keys(context.scene.entities)
        .filter(k => k.startsWith('auto_') && context.scene.entities[k]?.state?.pulse)
        .map(k => ({ type: 'set_state' as const, entityId: k, state: { pulse: false, role: 'idle' as const, color: 'primary' as const }, merge: true }))
      return [...cleanup, { type: 'set_state', entityId: stateId(event.stateId), state: { role: 'active', color: 'success', pulse: true }, merge: true }]
    }
    case 'automaton.consume':
      return [{ type: 'add_note', text: `读入 '${event.symbol}'（位置 ${event.index}）` }]
    case 'automaton.clear':
      return [
        ...Object.keys(context.scene.entities).filter(k => k.startsWith('auto_')).map(id => ({ type: 'remove_entity' as const, entityId: id })),
        ...Object.keys(context.scene.edges).filter(k => k.startsWith('autoedge_')).map(id => ({ type: 'disconnect' as const, edgeId: id })),
      ]
  }
}
```

- [ ] **Step 4: 注册** — 在 `eventCompiler.ts` import 并加入 `compilers` 数组。
- [ ] **Step 5: 运行验证通过** — Run: `npx vitest run src/scene/compilers/__tests__/automatonCompiler.test.ts`，Expected: PASS。
- [ ] **Step 6: 提交**

```bash
git add src/scene/compilers/automatonCompiler.ts src/scene/eventCompiler.ts src/scene/compilers/__tests__/automatonCompiler.test.ts && git commit -m "feat(automaton): automatonCompiler + 注册"
```

---

### Task 3: AutomatonView 图元 + 接入 SceneCanvas

**Files:**
- Create: `src/scene/primitives/AutomatonView.tsx`
- Modify: `src/scene/SceneCanvas.tsx`
- Test: `src/scene/primitives/__tests__/AutomatonView.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
// src/scene/primitives/__tests__/AutomatonView.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AutomatonView from '../AutomatonView'
import type { SceneCell } from '../../types'

function st(id: string, x: number, meta: Record<string, unknown>): SceneCell {
  return { id, type: 'cell', position: { x, y: 100 }, size: { width: 52, height: 52 }, value: id, meta, state: { role: 'idle', color: 'primary' } } as SceneCell
}

describe('AutomatonView', () => {
  it('为每个状态渲染圆;接受态渲染双圈', () => {
    const cells = [st('auto_s0', 100, { kind: 'state', start: true }), st('auto_s1', 200, { kind: 'state', accepting: true })]
    const { container } = render(<svg><AutomatonView cells={cells} /></svg>)
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(3) // s0 一圈 + s1 双圈
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `npx vitest run src/scene/primitives/__tests__/AutomatonView.test.tsx`，Expected: FAIL。
- [ ] **Step 3: 写 AutomatonView**

```tsx
// src/scene/primitives/AutomatonView.tsx
import type { SceneCell } from '../types'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

interface Props { cells: SceneCell[] }

export default function AutomatonView({ cells }: Props) {
  return (
    <g className="automaton-view">
      {cells.map(c => {
        const m = c.meta as { accepting?: boolean; start?: boolean }
        const active = c.state?.pulse || c.state?.role === 'active'
        const stroke = active ? SEMANTIC_COLORS.success.stroke : SEMANTIC_COLORS.primary.stroke
        const fill = active ? SEMANTIC_COLORS.success.fill : SEMANTIC_COLORS.primary.fill
        const r = (c.size?.width ?? 52) / 2
        return (
          <g key={c.id}>
            {m.start && (
              <line x1={c.position.x - r - 22} y1={c.position.y} x2={c.position.x - r - 2} y2={c.position.y} stroke={NEUTRALS.mutedText} strokeWidth={1.4} markerEnd="url(#sceneArrow)" />
            )}
            <circle cx={c.position.x} cy={c.position.y} r={r} fill={fill} stroke={stroke} strokeWidth={1.6} />
            {m.accepting && <circle cx={c.position.x} cy={c.position.y} r={r - 4} fill="none" stroke={stroke} strokeWidth={1.2} />}
            <text x={c.position.x} y={c.position.y + 4} textAnchor="middle" fontSize={13} fontFamily="monospace" fill={SEMANTIC_COLORS.primary.text}>{String(c.value ?? '')}</text>
          </g>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 4: 接入 SceneCanvas** — `import AutomatonView from './primitives/AutomatonView'`；在主渲染 `<g>` 内追加（边由现有 `edges.map(EdgeView)` 自动渲染，因为 autoedge_ 是标准边）：

```tsx
{(() => {
  const autoCells = entities.filter((e): e is import('./types').SceneCell => e.type === 'cell' && e.id.startsWith('auto_'))
  return autoCells.length > 0 ? <AutomatonView cells={autoCells} /> : null
})()}
```

> 注意：`auto_` 状态是 cell，但 CellView 会默认渲染为方块。需让 CellView 跳过 `auto_` 前缀（与它跳过 `mathvar_` 同理）。在 `src/scene/primitives/CellView.tsx` 顶部的早返回处追加：`if (cell.id.startsWith('auto_') || cell.id.startsWith('geo_') || cell.id.startsWith('prob_')) return null`（仅追加 auto_ 这一条即可，其它模块各自负责；为避免与其它 agent 冲突，本计划只加 `auto_`）。

- [ ] **Step 5: 运行验证通过 + 场景回归** — Run: `npx vitest run src/scene`，Expected: PASS。
- [ ] **Step 6: 提交**

```bash
git add src/scene/primitives/AutomatonView.tsx src/scene/SceneCanvas.tsx src/scene/primitives/CellView.tsx src/scene/primitives/__tests__/AutomatonView.test.tsx && git commit -m "feat(automaton): AutomatonView 图元 + 接入"
```

---

### Task 4: builder 方法

**Files:** Modify `src/sandbox/builder.ts`；Test `src/sandbox/__tests__/builder.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
it('builder automaton 方法产出 automaton.* 事件', () => {
  const b = makeBuilder()
  b.autoCreate([{ id: 's0', start: true }, { id: 's1', accepting: true }])
  b.autoTransition('t0', 's0', 's1', 'a')
  b.autoActivate('s1')
  const evs = b.build().steps.flatMap(s => s.events ?? [])
  expect(evs.some(e => e.type === 'automaton.create')).toBe(true)
  expect(evs.some(e => e.type === 'automaton.transition')).toBe(true)
})
```

> `makeBuilder()` 按 builder.test.ts 现有写法替换。

- [ ] **Step 2: 运行验证失败** — Expected: FAIL。
- [ ] **Step 3: 实现 builder 方法**（仿现有结构方法）

```ts
autoCreate(states: Array<{ id: string; label?: string; accepting?: boolean; start?: boolean }>) { this.pushEvent({ type: 'automaton.create', states }); return this }
autoTransition(id: string, from: string, to: string, label: string) { this.pushEvent({ type: 'automaton.transition', id, from, to, label }); return this }
autoActivate(stateId: string) { this.pushEvent({ type: 'automaton.activate', stateId }); return this }
autoConsume(symbol: string, index: number) { this.pushEvent({ type: 'automaton.consume', symbol, index }); return this }
```

> `pushEvent` 按 builder 真实 API 调整。

- [ ] **Step 4: 运行验证通过** — Expected: PASS。
- [ ] **Step 5: 提交**

```bash
git add src/sandbox/builder.ts src/sandbox/__tests__/builder.test.ts && git commit -m "feat(automaton): builder 状态机方法"
```

---

### Task 5: KMP 自动机演示预设 + 接线 + 端到端

**Files:**
- Create: `src/presets/kmpAutomaton.ts`
- Modify: `src/presets/generators.ts`、`src/store/algorithmStore.ts`
- Test: `src/presets/__tests__/kmpAutomaton.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/presets/__tests__/kmpAutomaton.test.ts
import { describe, it, expect } from 'vitest'
import { generateKmpAutomaton } from '../kmpAutomaton'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateKmpAutomaton', () => {
  it('走 automaton.* 且首帧有状态', () => {
    const script = generateKmpAutomaton('aba', 'ababa')
    expect(script.presentation?.module).toBe('automaton')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'automaton.create')).toBe(true)
    expect(evs.some(e => e.type === 'automaton.activate')).toBe(true)
    const scene = deriveSceneState(script, 1)
    expect(Object.keys(scene.entities).some(k => k.startsWith('auto_'))).toBe(true)
  })
})
```

- [ ] **Step 2: 运行验证失败** — Expected: FAIL。
- [ ] **Step 3: 写预设**

```ts
// src/presets/kmpAutomaton.ts
import type { AnimationScript } from '@/types/animation'

export function generateKmpAutomaton(patternIn?: string, textIn?: string): AnimationScript {
  const pattern = (patternIn && patternIn.length > 0 ? patternIn : 'aba')
  const text = (textIn && textIn.length > 0 ? textIn : 'ababaab')
  const m = pattern.length
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (zh: string, en: string, events: AnimationScript['steps'][number]['events']) =>
    steps.push({ stepId: sid++, codeLine: 0, description: { zh, en }, action: { type: 'highlight', targets: [], color: 'primary' }, events, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  // 状态 0..m, m 为接受态
  const states = Array.from({ length: m + 1 }, (_, i) => ({ id: `q${i}`, label: String(i), start: i === 0, accepting: i === m }))
  push(`构建模式 "${pattern}" 的匹配自动机`, `Build automaton for "${pattern}"`, [
    { type: 'automaton.create', states },
    ...Array.from({ length: m }, (_, i) => ({ type: 'automaton.transition' as const, id: `t${i}`, from: `q${i}`, to: `q${i + 1}`, label: pattern[i] })),
    { type: 'automaton.activate', stateId: 'q0' },
  ])

  // 失败函数
  const fail = new Array(m).fill(0)
  for (let i = 1, k = 0; i < m; i++) {
    while (k > 0 && pattern[i] !== pattern[k]) k = fail[k - 1]
    if (pattern[i] === pattern[k]) k++
    fail[i] = k
  }

  // 在 text 上跑
  let state = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    while (state > 0 && ch !== pattern[state]) state = fail[state - 1]
    if (ch === pattern[state]) state++
    push(`读入 '${ch}' → 状态 ${state}${state === m ? '（匹配成功!）' : ''}`, `read '${ch}' → state ${state}`, [
      { type: 'automaton.consume', symbol: ch, index: i },
      { type: 'automaton.activate', stateId: `q${state}` },
    ])
    if (state === m) state = fail[state - 1]
  }

  return {
    algorithm: 'kmp_automaton',
    complexity: { time: { best: 'O(n+m)', average: 'O(n+m)', worst: 'O(n+m)' }, space: 'O(m)' },
    presentation: { engine: 'scene', module: 'automaton' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
```

- [ ] **Step 4: 接线** — `generators.ts`：import + `const kmpAutomatonWrapper = (input: unknown) => generateKmpAutomaton(...)`（输入解析可先固定默认：`() => generateKmpAutomaton()`），加入 id 映射 `kmp_automaton: kmpAutomatonWrapper`。`algorithmStore.ts`：追加目录项 `{ id: 'kmp_automaton', name: 'KMP 匹配自动机', nameEn: 'KMP Automaton', category: 'string', difficulty: 'medium', ... }`（字段对齐现有项；category 用现有合法值）。
- [ ] **Step 5: 运行验证通过** — Run: `npx vitest run src/presets/__tests__/kmpAutomaton.test.ts`，Expected: PASS。
- [ ] **Step 6: 全量门禁 + 提交**

Run: `npx tsc --noEmit && npm run test && npm run lint`，Expected: 全绿。

```bash
git add src/presets/kmpAutomaton.ts src/presets/generators.ts src/store/algorithmStore.ts src/presets/__tests__/kmpAutomaton.test.ts && git commit -m "feat(automaton): KMP 自动机演示 + 目录接线"
```

## 验收对照（spec §3.2 / §6）
- [x] automaton.* 事件族 + compiler（Task 1-2）
- [x] AutomatonView（状态圆/双圈接受态/起始箭头/当前态高亮）+ 转移边（Task 3）
- [x] builder 方法（Task 4）
- [x] KMP 自动机演示、目录可见、首帧非空（Task 5）
