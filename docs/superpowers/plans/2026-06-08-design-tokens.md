# 工作线 B：视觉设计令牌（精修学术浅色）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Scene 渲染层散落在 13 个文件、82 处的硬编码色值与各自为政的缓动时长，收敛成单一事实源 `src/scene/tokens.ts`，并把各 primitive 改为引用令牌，统一为「精修学术浅色」方向。

**Architecture:** 新增 `scene/tokens.ts` 导出语义色 / 形状 / 排版 / 动效令牌。第一个任务先定稳**导出签名骨架**（A 线依赖此契约），随后逐个 primitive 替换硬编码。不改场景结构，只改样式常量。

**Tech Stack:** TypeScript、React + SVG、Vitest。

**前置说明（给执行 agent）：** 本计划的 Task 1 产出的 `tokens.ts` 导出签名是工作线 A 的共享契约，**必须最先完成并提交**。完成 Task 1 后通知协调者，A 线方可基于此契约并行开工。

---

### Task 1: 定义 tokens.ts 导出签名骨架（共享契约）

**Files:**
- Create: `src/scene/tokens.ts`
- Test: `src/scene/__tests__/tokens.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/scene/__tests__/tokens.test.ts
import { describe, it, expect } from 'vitest'
import { SEMANTIC_COLORS, SHAPE, TYPO, MOTION, type SemanticColorName } from '../tokens'

describe('design tokens', () => {
  it('每个语义色都有 stroke/fill/text 三字段', () => {
    const names: SemanticColorName[] = ['idle', 'primary', 'compare', 'active', 'success', 'danger', 'window']
    for (const n of names) {
      expect(SEMANTIC_COLORS[n]).toBeDefined()
      expect(SEMANTIC_COLORS[n].stroke).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(SEMANTIC_COLORS[n].fill).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(SEMANTIC_COLORS[n].text).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('形状/排版/动效令牌存在且类型正确', () => {
    expect(SHAPE.cellRadius).toBeTypeOf('number')
    expect(SHAPE.strokeWidth.base).toBeTypeOf('number')
    expect(TYPO.mono).toContain('monospace')
    expect(MOTION.easing).toMatch(/cubic-bezier/)
    expect(MOTION.duration.base).toBeTypeOf('number')
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/__tests__/tokens.test.ts`
Expected: FAIL（`Cannot find module '../tokens'`）

- [ ] **Step 3: 写最小实现**

```ts
// src/scene/tokens.ts
export type SemanticColorName =
  | 'idle' | 'primary' | 'compare' | 'active' | 'success' | 'danger' | 'window'

export interface SemanticColor {
  stroke: string
  fill: string
  text: string
}

/** 精修学术浅色：克制配色、浅底深描边、状态一眼可辨。单一事实源。 */
export const SEMANTIC_COLORS: Record<SemanticColorName, SemanticColor> = {
  idle:    { stroke: '#E2E8F0', fill: '#F8FAFC', text: '#1E293B' },
  primary: { stroke: '#3B82F6', fill: '#EFF6FF', text: '#1E293B' },
  compare: { stroke: '#F59E0B', fill: '#FFFBEB', text: '#B45309' },
  active:  { stroke: '#3B82F6', fill: '#EFF6FF', text: '#1E293B' },
  success: { stroke: '#10B981', fill: '#ECFDF5', text: '#047857' },
  danger:  { stroke: '#EF4444', fill: '#FEF2F2', text: '#EF4444' },
  window:  { stroke: '#BFDBFE', fill: '#F8FBFF', text: '#1E293B' },
}

export const SHAPE = {
  cellRadius: 8,
  ringRadius: 10,
  strokeWidth: { thin: 1.15, base: 1.5, bold: 3.4 },
  shadow: {
    soft: 'drop-shadow(0 2px 6px rgba(15,23,42,0.06))',
    raised: 'drop-shadow(0 8px 14px rgba(15,23,42,0.12))',
  },
} as const

export const TYPO = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  size: { label: 10, index: 11, value: 14, title: 16 },
  weight: { normal: 400, medium: 500, bold: 600 },
} as const

export const MOTION = {
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  duration: { fast: 180, base: 320, slow: 480 },
} as const
```

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/scene/__tests__/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: 提交（这是 A 线的契约基线）**

```bash
git add src/scene/tokens.ts src/scene/__tests__/tokens.test.ts
git commit -m "feat(scene): 新增设计令牌 tokens.ts 作为视觉单一事实源(契约骨架)"
```

---

### Task 2: CellView 改用令牌

**Files:**
- Modify: `src/scene/primitives/CellView.tsx:4-15`（替换 `COLOR_MAP` / `WINDOW_CELL_MAP`）
- Test: `src/scene/__tests__/tokens.test.ts`（追加断言）

- [ ] **Step 1: 追加失败测试——CellView 不再含硬编码语义色**

```ts
// 追加到 src/scene/__tests__/tokens.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

it('CellView 不再内联定义 COLOR_MAP 硬编码色板', () => {
  const src = readFileSync(resolve(__dirname, '../primitives/CellView.tsx'), 'utf8')
  expect(src).not.toMatch(/const COLOR_MAP/)
  expect(src).toMatch(/from '\.\.\/tokens'/)
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/__tests__/tokens.test.ts`
Expected: FAIL（CellView 仍含 `const COLOR_MAP`）

- [ ] **Step 3: 改 CellView 引用令牌**

把 `src/scene/primitives/CellView.tsx` 顶部的 `COLOR_MAP` / `WINDOW_CELL_MAP` 常量删除，改为：

```ts
import { SEMANTIC_COLORS, type SemanticColorName } from '../tokens'

const ROLE_TO_COLOR = (color: string | undefined, role: string | undefined): SemanticColorName => {
  if (role === 'idle') return 'idle'
  if (color && color in SEMANTIC_COLORS) return color as SemanticColorName
  return 'idle'
}
```

把后续 `palette` 推导改为 `const palette = SEMANTIC_COLORS[ROLE_TO_COLOR(cell.state?.color, cell.state?.role)]`；窗口色改用 `SEMANTIC_COLORS.window`；`textColor` 用 `isDanger ? SEMANTIC_COLORS.danger.text : SEMANTIC_COLORS.idle.text`。圆角 `rx={8}` 改 `rx={SHAPE.cellRadius}`（并 `import { SHAPE }`）。

- [ ] **Step 4: 运行全量场景测试验证无回归**

Run: `npx vitest run src/scene`
Expected: PASS（含新断言与既有 CellView 相关测试）

- [ ] **Step 5: 提交**

```bash
git add src/scene/primitives/CellView.tsx src/scene/__tests__/tokens.test.ts
git commit -m "refactor(scene): CellView 改用设计令牌，移除内联色板"
```

---

### Task 3: 批量迁移其余 primitive 至令牌

**Files（逐个修改，每个一次提交）:**
- `src/scene/primitives/NodeView.tsx`
- `src/scene/primitives/EdgeView.tsx`
- `src/scene/primitives/PointerView.tsx`
- `src/scene/primitives/ContainerView.tsx`
- `src/scene/primitives/HashTableView.tsx`
- `src/scene/primitives/HeapView.tsx`
- `src/scene/primitives/SetView.tsx`
- `src/scene/primitives/StringView.tsx`
- `src/scene/primitives/BitsetView.tsx`
- `src/scene/primitives/VariablesView.tsx`
- `src/scene/primitives/RegionView.tsx`
- `src/scene/SceneCanvas.tsx`（window overlay 调色板 + 3 个 arrow marker 描边色）
- Test: `src/scene/__tests__/tokens.test.ts`

- [ ] **Step 1: 写守卫测试——除 tokens.ts 外，scene 下硬编码语义色总数收敛**

```ts
// 追加到 tokens.test.ts —— 量化迁移完成度
import { execSync } from 'node:child_process'
it('scene 目录(除 tokens.ts/overlays types)硬编码 #色值收敛到阈值内', () => {
  const root = resolve(__dirname, '..')
  // 仅统计 primitives 与 SceneCanvas；每个文件迁移后逐步下调阈值
  const files = [
    'primitives/NodeView.tsx','primitives/EdgeView.tsx','primitives/PointerView.tsx',
    'primitives/ContainerView.tsx','primitives/HashTableView.tsx','primitives/HeapView.tsx',
    'primitives/SetView.tsx','primitives/StringView.tsx','primitives/BitsetView.tsx',
    'primitives/VariablesView.tsx','primitives/RegionView.tsx','SceneCanvas.tsx',
  ]
  let total = 0
  for (const f of files) {
    const src = readFileSync(resolve(root, f), 'utf8')
    total += (src.match(/#[0-9A-Fa-f]{6}/g) ?? []).length
  }
  // 迁移目标：语义色全部走令牌，仅保留必要的非语义色(如纯白/阴影色)
  expect(total).toBeLessThanOrEqual(20)
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/__tests__/tokens.test.ts`
Expected: FAIL（当前 total ≈ 70+，超过阈值 20）

- [ ] **Step 3: 逐文件迁移**

对每个文件：把语义色（primary `#3B82F6`/`#EFF6FF`、success `#10B981`/`#ECFDF5`、warning→compare `#F59E0B`/`#FFFBEB`、danger `#EF4444`/`#FEF2F2`、muted→idle `#E2E8F0`/`#F8FAFC`）替换为 `SEMANTIC_COLORS.<name>.{stroke|fill|text}`。保留纯白 `#FFFFFF`、阴影 `floodColor` 等非语义色。每迁移完一个文件，单独提交：

```bash
git add src/scene/primitives/NodeView.tsx
git commit -m "refactor(scene): NodeView 改用设计令牌"
```

（其余文件同此模式，逐个提交。）

- [ ] **Step 4: 运行验证阈值达标 + 全量场景测试**

Run: `npx vitest run src/scene`
Expected: PASS（硬编码阈值断言通过，无场景回归）

- [ ] **Step 5: 最终提交**

```bash
git add src/scene/__tests__/tokens.test.ts
git commit -m "test(scene): 守卫硬编码色值收敛阈值"
```

---

### Task 4: 统一缓动 keyframes 到共享样式

**Files:**
- Create: `src/scene/primitives/sharedMotion.ts`（导出 keyframes 字符串常量）
- Modify: `CellView.tsx`、`SceneCanvas.tsx` 内联 `<style>` 改引用共享常量
- Test: `src/scene/__tests__/tokens.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
it('共享动效常量存在且时长引用 MOTION', async () => {
  const { CELL_KEYFRAMES, EDGE_FLOW_KEYFRAMES } = await import('../primitives/sharedMotion')
  expect(CELL_KEYFRAMES).toContain('@keyframes')
  expect(EDGE_FLOW_KEYFRAMES).toContain('scene-dash-flow')
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/__tests__/tokens.test.ts`
Expected: FAIL（无 sharedMotion 模块）

- [ ] **Step 3: 写实现**

```ts
// src/scene/primitives/sharedMotion.ts
import { MOTION } from '../tokens'

export const CELL_KEYFRAMES = `
  .cell-pulse { animation: cell-pop 0.5s ${MOTION.easing}; transform-box: fill-box; transform-origin: center; }
  .cell-current-ring { animation: cell-ring 0.9s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes cell-pop { 0% { transform: scale(0.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
  @keyframes cell-ring { from { opacity: 0.15; transform: scale(0.94); } to { opacity: 0.02; transform: scale(1.12); } }
`

export const EDGE_FLOW_KEYFRAMES = `
  .scene-edge-flow { animation: scene-dash-flow 0.7s linear infinite; }
  @keyframes scene-dash-flow { to { stroke-dashoffset: -22; } }
`
```

在 `CellView.tsx` 内 `<style>{...}</style>` 改为 `<style>{CELL_KEYFRAMES}</style>`；`SceneCanvas.tsx` 的 dash-flow `<style>` 改为 `<style>{EDGE_FLOW_KEYFRAMES}</style>`。

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/scene`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/scene/primitives/sharedMotion.ts src/scene/primitives/CellView.tsx src/scene/SceneCanvas.tsx
git commit -m "refactor(scene): 缓动 keyframes 收敛到 sharedMotion，时长引用 MOTION 令牌"
```

---

### Task 5: 全量回归与门禁

- [ ] **Step 1: 全量测试**

Run: `npm run test`
Expected: 全绿。

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 无新增错误。

- [ ] **Step 3: 通知协调者 B 线完成，等待按 B→A→C 顺序集成。**

## 验收对照（spec §4）
- [x] 全部语义色来自 tokens.ts（Task 2/3 grep 守卫）
- [x] 缓动收敛（Task 4）
- [x] 观感统一为方向 A（令牌取值即方向 A）
- [x] 关键状态辨识度（compare/active/success/danger 令牌区分明显）
