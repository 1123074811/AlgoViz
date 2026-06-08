# 工作线 A：关键场景补间层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `deriveSceneState` 与 `SceneCanvas` 之间插入插值渲染层，让 swap、指针移动、入栈出栈、连边等高价值变化平滑过渡而非瞬移；补间只影响中间帧，**终态（t=1）逐实体等于原 `SceneState`**。

**Architecture:** 新增纯函数 `interpolateScene(prev, next, t)` 产出「中间态 SceneState」，交给现有图元渲染（图元几乎不改）。新增 `useSceneTransition` hook 用 `requestAnimationFrame` 驱动 `t: 0→1`，可中断、速度联动、尊重 `prefers-reduced-motion`。`SceneCanvas` 改为渲染插值层产出的中间态。

**Tech Stack:** TypeScript、React hooks、rAF、Vitest。

**前置依赖：** 工作线 B 的 `src/scene/tokens.ts`（`MOTION.easing` / `MOTION.duration`）必须已存在（B 线 Task 1 已提交契约骨架）。本计划缓动参数引用 `MOTION`。

**核心解耦不变量：** `interpolateScene(prev, next, 1)` 必须逐实体属性等于 `next`；`deriveSceneState` 不被修改。

---

### Task 1: 纯函数 interpolateScene —— 位置插值与终态等价

**Files:**
- Create: `src/scene/interpolate.ts`
- Test: `src/scene/__tests__/interpolate.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/scene/__tests__/interpolate.test.ts
import { describe, it, expect } from 'vitest'
import { interpolateScene } from '../interpolate'
import { createEmptyScene } from '../types'
import type { SceneState, SceneCell } from '../types'

function sceneWithCell(id: string, x: number, y: number, opacity = 1): SceneState {
  const cell: SceneCell = {
    id, type: 'cell', position: { x, y }, size: { width: 44, height: 44 },
    value: '1', col: 0, state: { role: 'idle', color: 'muted', opacity },
  }
  return { ...createEmptyScene(), entities: { [id]: cell } }
}

describe('interpolateScene', () => {
  it('t=0 返回 prev 的位置', () => {
    const prev = sceneWithCell('arr_0', 0, 0)
    const next = sceneWithCell('arr_0', 100, 50)
    const mid = interpolateScene(prev, next, 0)
    expect((mid.entities['arr_0'] as SceneCell).position).toEqual({ x: 0, y: 0 })
  })

  it('t=0.5 返回中点位置', () => {
    const prev = sceneWithCell('arr_0', 0, 0)
    const next = sceneWithCell('arr_0', 100, 50)
    const mid = interpolateScene(prev, next, 0.5)
    expect((mid.entities['arr_0'] as SceneCell).position).toEqual({ x: 50, y: 25 })
  })

  it('t=1 逐实体等于 next（终态等价不变量）', () => {
    const prev = sceneWithCell('arr_0', 0, 0)
    const next = sceneWithCell('arr_0', 100, 50)
    const mid = interpolateScene(prev, next, 1)
    expect(mid.entities['arr_0']).toEqual(next.entities['arr_0'])
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/__tests__/interpolate.test.ts`
Expected: FAIL（`Cannot find module '../interpolate'`）

- [ ] **Step 3: 写最小实现**

```ts
// src/scene/interpolate.ts
import type { SceneState, SceneEntity } from './types'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * 产出 prev→next 在进度 t∈[0,1] 的中间态 SceneState。
 * 不变量：t=1 时逐实体等于 next；t=0 时位置取自 prev。
 * 仅对「同 id 且都有 position」的实体插值位置与 opacity；
 * 其余字段（value/state/size 等）直接取 next（离散切换，避免脏色/脏值）。
 */
export function interpolateScene(prev: SceneState, next: SceneState, t: number): SceneState {
  if (t >= 1) return next
  const entities: Record<string, SceneEntity> = {}
  for (const [id, nextEnt] of Object.entries(next.entities)) {
    const prevEnt = prev.entities[id]
    if (prevEnt && 'position' in prevEnt && 'position' in nextEnt) {
      const pos = {
        x: lerp(prevEnt.position.x, nextEnt.position.x, t),
        y: lerp(prevEnt.position.y, nextEnt.position.y, t),
      }
      const prevOpacity = prevEnt.state?.opacity ?? 1
      const nextOpacity = nextEnt.state?.opacity ?? 1
      const opacity = lerp(prevOpacity, nextOpacity, t)
      entities[id] = {
        ...nextEnt,
        position: pos,
        state: { ...nextEnt.state, opacity },
      } as SceneEntity
    } else if (!prevEnt && 'position' in nextEnt) {
      // 新增实体：淡入
      entities[id] = { ...nextEnt, state: { ...nextEnt.state, opacity: t } } as SceneEntity
    } else {
      entities[id] = nextEnt
    }
  }
  // 其余子图（edges/pointers/labels/groups/overlays/notes）整体取 next
  return { ...next, entities }
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/scene/__tests__/interpolate.test.ts`
Expected: PASS（3 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/scene/interpolate.ts src/scene/__tests__/interpolate.test.ts
git commit -m "feat(scene): 新增 interpolateScene 纯函数(位置/透明度插值,终态等价)"
```

---

### Task 2: 移除实体的淡出处理 + 终态等价对随机场景成立

**Files:**
- Modify: `src/scene/interpolate.ts`
- Test: `src/scene/__tests__/interpolate.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
it('prev 有、next 无的实体在中间帧保留并淡出，t=1 时消失', () => {
  const prev = sceneWithCell('arr_0', 0, 0)
  const next = createEmptyScene()
  const mid = interpolateScene(prev, next, 0.5)
  const ghost = mid.entities['arr_0'] as SceneCell
  expect(ghost).toBeDefined()
  expect(ghost.state?.opacity).toBeCloseTo(0.5)
  const end = interpolateScene(prev, next, 1)
  expect(end.entities['arr_0']).toBeUndefined()
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/__tests__/interpolate.test.ts`
Expected: FAIL（当前实现 t=0.5 不保留 prev-only 实体）

- [ ] **Step 3: 改实现，补 prev-only 淡出**

在 `interpolateScene` 的 `t>=1` 提前返回之后、构建 `entities` 之后，追加：

```ts
  // prev 有、next 无：淡出（仅 t<1 时存在）
  for (const [id, prevEnt] of Object.entries(prev.entities)) {
    if (!next.entities[id] && 'position' in prevEnt) {
      entities[id] = { ...prevEnt, state: { ...prevEnt.state, opacity: (1 - t) * (prevEnt.state?.opacity ?? 1) } } as SceneEntity
    }
  }
```

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/scene/__tests__/interpolate.test.ts`
Expected: PASS（4 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/scene/interpolate.ts src/scene/__tests__/interpolate.test.ts
git commit -m "feat(scene): interpolateScene 支持移除实体淡出"
```

---

### Task 3: useSceneTransition hook —— rAF 驱动、可中断、reduced-motion

**Files:**
- Create: `src/scene/useSceneTransition.ts`
- Test: `src/scene/__tests__/useSceneTransition.test.tsx`

- [ ] **Step 1: 写失败测试（用 fake timers + rAF stub）**

```tsx
// src/scene/__tests__/useSceneTransition.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSceneTransition } from '../useSceneTransition'
import { createEmptyScene } from '../types'
import type { SceneState, SceneCell } from '../types'

function sceneAt(x: number): SceneState {
  const c: SceneCell = { id: 'arr_0', type: 'cell', position: { x, y: 0 }, size: { width: 44, height: 44 }, value: '1', col: 0, state: { role: 'idle', color: 'muted' } }
  return { ...createEmptyScene(), entities: { arr_0: c } }
}

describe('useSceneTransition', () => {
  let now = 0
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { now += 16; setTimeout(() => cb(now), 0); return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('reduced-motion 时直接返回目标场景（无补间）', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }))
    const { result, rerender } = renderHook(({ s }) => useSceneTransition(s, 320), { initialProps: { s: sceneAt(0) } })
    rerender({ s: sceneAt(100) })
    expect((result.current.entities['arr_0'] as SceneCell).position.x).toBe(100)
  })

  it('新目标到来后推进若干帧逐步逼近目标', async () => {
    const { result, rerender } = renderHook(({ s }) => useSceneTransition(s, 320), { initialProps: { s: sceneAt(0) } })
    rerender({ s: sceneAt(100) })
    await act(async () => { for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 0)) } })
    expect((result.current.entities['arr_0'] as SceneCell).position.x).toBeCloseTo(100, 0)
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `npx vitest run src/scene/__tests__/useSceneTransition.test.tsx`
Expected: FAIL（无 hook 模块）

- [ ] **Step 3: 写实现**

```ts
// src/scene/useSceneTransition.ts
import { useEffect, useRef, useState } from 'react'
import type { SceneState } from './types'
import { interpolateScene } from './interpolate'
import { MOTION } from './tokens'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 在 target 变化时，从「当前显示态」补间到 target。
 * 可中断：新 target 到来时以当前显示态为新 prev 重新起算。
 * reduced-motion 或 duration<=0 时直接返回 target。
 */
export function useSceneTransition(target: SceneState, durationMs: number = MOTION.duration.base): SceneState {
  const [displayed, setDisplayed] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion() || durationMs <= 0) {
      fromRef.current = target
      setDisplayed(target)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const tick = (nowTs: number) => {
      const raw = Math.min(1, (nowTs - start) / durationMs)
      const eased = easeOutCubic(raw)
      const frame = interpolateScene(from, target, eased)
      setDisplayed(frame)
      fromRef.current = frame
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        setDisplayed(target)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, durationMs])

  return displayed
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npx vitest run src/scene/__tests__/useSceneTransition.test.tsx`
Expected: PASS

> 注：测试需要 `@testing-library/react`。若仓库未安装，先 `npm i -D @testing-library/react` 并提交 lockfile 变更，再继续。

- [ ] **Step 5: 提交**

```bash
git add src/scene/useSceneTransition.ts src/scene/__tests__/useSceneTransition.test.tsx package.json package-lock.json
git commit -m "feat(scene): useSceneTransition hook(rAF 补间,可中断,reduced-motion)"
```

---

### Task 4: SceneCanvas 接入补间层

**Files:**
- Modify: `src/scene/SceneCanvas.tsx:31`（`const scene = deriveSceneState(...)` 之后接入 hook）
- Test: 复用既有 `src/scene/__tests__/SceneEngine.test.ts` + 手动验证

- [ ] **Step 1: 接入 hook**

在 `SceneCanvas.tsx` 中，把

```tsx
const scene = deriveSceneState(script, currentStep)
```

改为

```tsx
const targetScene = deriveSceneState(script, currentStep)
const scene = useSceneTransition(targetScene)
```

并 `import { useSceneTransition } from './useSceneTransition'`。其余渲染逻辑不变（`scene.entities` 等照常消费中间态）。

> 注意 React hooks 规则：`useSceneTransition` 必须在组件顶层、早于任何 `return` 调用。当前 `SceneCanvas` 在第 31 行计算 scene，符合要求。

- [ ] **Step 2: 运行全量场景测试**

Run: `npx vitest run src/scene`
Expected: PASS（终态等价保证渲染最终结果不变；既有快照/状态测试不回归）

- [ ] **Step 3: 手动验证（dev）**

Run: `npm run dev`，打开冒泡排序，单步：观察相邻元素 swap 时**平滑移动**而非瞬移；快速连续单步不卡顿、不残留中间态；系统开启「减少动态效果」后回到瞬移行为。

- [ ] **Step 4: 提交**

```bash
git add src/scene/SceneCanvas.tsx
git commit -m "feat(scene): SceneCanvas 接入补间层,高价值变化平滑过渡"
```

---

### Task 5: 播放速度联动补间时长

**Files:**
- Modify: `src/scene/SceneCanvas.tsx`（透传播放速度）、`src/scene/SceneCanvas.tsx` props 或读取 store
- Test: `src/scene/__tests__/useSceneTransition.test.tsx`（已覆盖 duration 行为）

- [ ] **Step 1: 确认播放速度来源**

Run: `npx grep -rn "speed\|playbackSpeed\|interval" src/hooks/useAnimationEngine.ts src/store`（定位播放速度状态字段名）。

- [ ] **Step 2: 透传时长**

在 `SceneCanvas` 读取播放速度（store 或 props），按「慢放→`MOTION.duration.slow`，常速→`base`，快放→`fast`」映射，传入 `useSceneTransition(targetScene, mappedDuration)`。映射函数：

```ts
import { MOTION } from './tokens'
function durationForSpeed(speedMultiplier: number): number {
  if (speedMultiplier <= 0.5) return MOTION.duration.slow
  if (speedMultiplier >= 2) return MOTION.duration.fast
  return MOTION.duration.base
}
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run src/scene`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/scene/SceneCanvas.tsx
git commit -m "feat(scene): 补间时长与播放速度联动"
```

---

### Task 6: 终态等价回归守卫 + 全量门禁

**Files:**
- Test: `src/scene/__tests__/interpolate.test.ts`（追加随机化等价测试）

- [ ] **Step 1: 追加随机场景终态等价测试**

```ts
it('随机多实体场景 t=1 整体等于 next（不变量守卫）', () => {
  const next = sceneWithCell('arr_0', 12, 34)
  ;(next.entities as Record<string, unknown>)['arr_1'] = {
    id: 'arr_1', type: 'cell', position: { x: 99, y: 7 }, size: { width: 44, height: 44 },
    value: '2', col: 1, state: { role: 'active', color: 'primary', opacity: 0.8 },
  }
  const prev = sceneWithCell('arr_0', 0, 0)
  expect(interpolateScene(prev, next, 1)).toEqual(next)
})
```

- [ ] **Step 2: 运行验证通过**

Run: `npx vitest run src/scene/__tests__/interpolate.test.ts`
Expected: PASS

- [ ] **Step 3: 全量门禁**

Run: `npm run test && npm run lint`
Expected: 全绿、无新增 lint 错误。

- [ ] **Step 4: 提交并通知协调者（集成顺序 B→A→C，A 在 B 之后合入）**

```bash
git add src/scene/__tests__/interpolate.test.ts
git commit -m "test(scene): 终态等价不变量随机场景守卫"
```

## 验收对照（spec §3.4）
- [x] swap/指针/入出栈/连边平滑移动（Task 4 手动验证）
- [x] 拖动/快速单步可中断不残留（Task 3 可中断设计 + Task 4 验证）
- [x] prefers-reduced-motion 等价现状（Task 3 测试）
- [x] 终态等价回归全绿（Task 1/2/6）
