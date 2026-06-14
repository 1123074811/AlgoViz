# 架构优化（第一批）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理三处确诊的架构债——把脆弱的手写深拷贝换成 `structuredClone`、把编译器注册收口到单一来源并删除死代码 `registry.ts`、给打包加 `manualChunks` 拆分重型依赖——在不改变任何渲染行为的前提下提升健壮性、可扩展性与加载性能。

**Architecture:** 三项任务**文件互不重叠**，可由三个 agent 在各自 git worktree 内并行实现，最后顺序合并。任务 A 只动 `src/scene/SceneEngine.ts`；任务 B 动 `src/scene/eventCompiler.ts` + 新增 `src/scene/compilerRegistry.ts` + 删除 `src/scene/registry.ts`；任务 C 只动 `vite.config.ts`。三者都以「测试先行 + 现有全量测试保持绿」为验收。

**Tech Stack:** React 18 / Vite 8 / TypeScript 6 / Vitest 4 / Zustand。运行环境 Node v25（`structuredClone` 全局可用）。测试命令：`npx vitest run <file>`；全量：`npm run test`。

---

## 背景：为什么是这三项（来自架构评审）

评审结论是"**不重写，做外科手术式重构**"。本批选取**高杠杆、低风险、相互独立**的三项先落地，换肤（Observable，见 [`docs/observable-restyle-migration-plan.md`](../../observable-restyle-migration-plan.md)）在架构清理之后再做。

| 任务 | 问题 | 证据 | 风险 |
|---|---|---|---|
| A | `SceneEngine.ts` 的 `deepCloneScene` 是 70 行手写深拷贝，scene 结构一改就要同步改、漏字段会静默串引用 | `SceneEngine.ts:53-125` | 低（`types.ts` 全为 interface/type，无 class/Map/函数 → 纯 JSON 数据，`structuredClone` 安全） |
| B | 编译器注册分散：死代码 `registry.ts`（`sceneCompilers` 零非测试引用）与 `eventCompiler.ts` 内硬编码 21 元素数组并存 | `registry.ts` 无人 import；`eventCompiler.ts:28` | 低（registry.ts 确认无任何引用，含测试） |
| C | 无 `manualChunks`，monaco/d3/framer-motion 全挤主 vendor chunk | `vite.config.ts` 无 `build` 段 | 极低（仅打包配置，零运行时行为变更） |

**不在本批**（评审中其余项，文档记录、后续再排）：AI 边界改 zod、`codeTemplates.ts`(4975 行) 拆分与懒加载、IR 过度可选的规范化。

---

## File Structure

| 文件 | 任务 | 职责 |
|---|---|---|
| `src/scene/SceneEngine.ts` | A | 把 `deepCloneScene` 实现替换为导出的 `cloneScene = structuredClone` |
| `src/scene/__tests__/cloneScene.test.ts` | A | 新增：深拷贝独立性回归测试 |
| `src/scene/compilerRegistry.ts` | B | 新增：单一来源的事件编译器有序列表（含顺序约定说明） |
| `src/scene/eventCompiler.ts` | B | 改为从 `compilerRegistry` 引入编译器数组，删除本地数组与 21 条 import |
| `src/scene/registry.ts` | B | **删除**（死代码） |
| `src/scene/__tests__/compilerRegistry.test.ts` | B | 新增：注册表完整性与顺序不变量测试 |
| `vite.config.ts` | C | 导出可单测的 `manualChunks(id)` 并接入 `build.rollupOptions.output` |
| `vite.config.ts` 对应测试 | C | 在现有 vite 配置测试中新增 `manualChunks` 单测 |

---

## Task A：用 structuredClone 替换手写深拷贝（健壮性）

**Files:**
- Modify: `src/scene/SceneEngine.ts`（新增导出 `cloneScene`；替换 `deepCloneScene` 的两个调用点；删除旧函数体 `:53-125`）
- Test: `src/scene/__tests__/cloneScene.test.ts`（新建）

- [ ] **Step 1: 写失败测试**

新建 `src/scene/__tests__/cloneScene.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { cloneScene } from '../SceneEngine'
import { createEmptyScene } from '../types'
import type { SceneState } from '../types'

function sampleScene(): SceneState {
  const scene = createEmptyScene()
  scene.entities['n1'] = {
    type: 'node', id: 'n1', variant: 'graph.node',
    position: { x: 1, y: 2 }, size: { width: 48, height: 48 },
    ports: [{ id: 'c', side: 'top' }],
    fields: [{ id: 'f', value: 7 }],
    state: { role: 'active', color: 'primary' },
  } as SceneState['entities'][string]
  scene.edges['e1'] = {
    type: 'edge', id: 'e1',
    from: { entityId: 'n1' }, to: { entityId: 'n1' },
    variant: 'tree', directed: false,
  } as SceneState['edges'][string]
  scene.notes = ['hello']
  return scene
}

describe('cloneScene', () => {
  it('深拷贝：改克隆不影响原对象', () => {
    const orig = sampleScene()
    const copy = cloneScene(orig)
    ;(copy.entities['n1'] as { position: { x: number } }).position.x = 999
    ;(copy.entities['n1'] as { fields: { value: number }[] }).fields[0].value = -1
    copy.notes!.push('mutated')
    expect((orig.entities['n1'] as { position: { x: number } }).position.x).toBe(1)
    expect((orig.entities['n1'] as { fields: { value: number }[] }).fields[0].value).toBe(7)
    expect(orig.notes).toEqual(['hello'])
  })

  it('结构等价：克隆与原对象深相等', () => {
    const orig = sampleScene()
    expect(cloneScene(orig)).toEqual(orig)
  })

  it('嵌套引用断开：克隆的内层对象不是同一引用', () => {
    const orig = sampleScene()
    const copy = cloneScene(orig)
    expect(copy.entities['n1']).not.toBe(orig.entities['n1'])
    expect((copy.entities['n1'] as { ports: unknown[] }).ports)
      .not.toBe((orig.entities['n1'] as { ports: unknown[] }).ports)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/scene/__tests__/cloneScene.test.ts`
Expected: FAIL —— `cloneScene` is not exported by `../SceneEngine`。

- [ ] **Step 3: 实现替换**

在 `src/scene/SceneEngine.ts` 中，把现有 `function deepCloneScene(scene: SceneState): SceneState { ... }`（约 `:53-125` 整个函数体）替换为：

```ts
/** Deep-clone a SceneState so snapshots don't share references with active state.
 *  SceneState is plain JSON-serializable data (see types.ts — all interfaces, no
 *  class/Map/Set/function), so structuredClone is correct and far less fragile
 *  than the previous hand-maintained recursive copy. */
export function cloneScene(scene: SceneState): SceneState {
  return structuredClone(scene)
}
```

并把两个调用点改名：
- `:42` `scene: deepCloneScene(best.scene)` → `scene: cloneScene(best.scene)`
- `:49` `cache.push({ step, scene: deepCloneScene(scene) })` → `cache.push({ step, scene: cloneScene(scene) })`

确认文件内不再有 `deepCloneScene` 残留：`grep -n deepCloneScene src/scene/SceneEngine.ts` 应无输出。

- [ ] **Step 4: 运行确认通过 + 全量回归**

Run: `npx vitest run src/scene/__tests__/cloneScene.test.ts`
Expected: PASS（3 个用例全过）

Run: `npx vitest run src/scene/__tests__/SceneEngine.test.ts src/scene/__tests__/deriveSceneState.test.ts src/scene/__tests__/applyCommandsBranches.test.ts`
Expected: PASS（快照重放/派生不受影响）

- [ ] **Step 5: 提交**

```bash
git add src/scene/SceneEngine.ts src/scene/__tests__/cloneScene.test.ts
git commit -m "refactor(scene): 用 structuredClone 替换手写 deepCloneScene"
```

---

## Task B：编译器注册收口到单一来源 + 删除死代码 registry.ts（可扩展性）

**Files:**
- Create: `src/scene/compilerRegistry.ts`
- Modify: `src/scene/eventCompiler.ts`（删除本地 `compilers` 数组与 21 条 compiler import，改为引入注册表）
- Delete: `src/scene/registry.ts`
- Test: `src/scene/__tests__/compilerRegistry.test.ts`（新建）

> ⚠️ **顺序即契约**：`eventCompiler` 用 `compilers.find(c => c.supports(event))`，**先匹配先生效**。`compilerRegistry.ts` 必须 1:1 保留 `eventCompiler.ts:28` 的现有顺序，不得重排。

- [ ] **Step 1: 写失败测试**

新建 `src/scene/__tests__/compilerRegistry.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { sceneEventCompilers } from '../compilerRegistry'
import { pointerCompiler } from '../compilers/pointerCompiler'
import { linkedListCompiler } from '../compilers/linkedListCompiler'
import { treeCompiler } from '../compilers/treeCompiler'
import { unionFindCompiler } from '../compilers/unionFindCompiler'
import { arrayCompiler } from '../compilers/arrayCompiler'
import { graphAnalysisCompiler } from '../compilers/graphAnalysisCompiler'

describe('sceneEventCompilers 注册表', () => {
  it('包含全部 21 个编译器', () => {
    expect(sceneEventCompilers).toHaveLength(21)
  })

  it('每个编译器都实现 supports() 与 compile()', () => {
    for (const c of sceneEventCompilers) {
      expect(typeof c.supports).toBe('function')
      expect(typeof c.compile).toBe('function')
    }
  })

  it('保留关键匹配顺序（窄匹配在前）', () => {
    const idx = (c: unknown) => sceneEventCompilers.indexOf(c as never)
    // pointer/linkedList/tree/unionFind 必须排在通用的 array 之前
    expect(idx(pointerCompiler)).toBeLessThan(idx(arrayCompiler))
    expect(idx(linkedListCompiler)).toBeLessThan(idx(arrayCompiler))
    expect(idx(treeCompiler)).toBeLessThan(idx(arrayCompiler))
    expect(idx(unionFindCompiler)).toBeLessThan(idx(arrayCompiler))
    // graphAnalysis 是最后一个
    expect(idx(graphAnalysisCompiler)).toBe(sceneEventCompilers.length - 1)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/scene/__tests__/compilerRegistry.test.ts`
Expected: FAIL —— Cannot find module `../compilerRegistry`。

- [ ] **Step 3: 新建注册表文件**

新建 `src/scene/compilerRegistry.ts`（import 与顺序与 `eventCompiler.ts:1-28` 完全一致）：

```ts
import { arrayCompiler } from './compilers/arrayCompiler'
import { automatonCompiler } from './compilers/automatonCompiler'
import { bitsetCompiler } from './compilers/bitsetCompiler'
import { dequeCompiler } from './compilers/dequeCompiler'
import { geometryCompiler } from './compilers/geometryCompiler'
import { graphAnalysisCompiler } from './compilers/graphAnalysisCompiler'
import { graphCompiler } from './compilers/graphCompiler'
import { hashTableCompiler } from './compilers/hashTableCompiler'
import { heapCompiler } from './compilers/heapCompiler'
import { linkedListCompiler } from './compilers/linkedListCompiler'
import { mapCompiler } from './compilers/mapCompiler'
import { mathCompiler } from './compilers/mathCompiler'
import { matrixCompiler } from './compilers/matrixCompiler'
import { pointerCompiler } from './compilers/pointerCompiler'
import { probCompiler } from './compilers/probCompiler'
import { queueCompiler } from './compilers/queueCompiler'
import { setCompiler } from './compilers/setCompiler'
import { stackCompiler } from './compilers/stackCompiler'
import { stringCompiler } from './compilers/stringCompiler'
import { treeCompiler } from './compilers/treeCompiler'
import { unionFindCompiler } from './compilers/unionFindCompiler'

/**
 * 事件编译器的唯一注册表与匹配顺序的单一事实源。
 *
 * `compileEvent` 用 `find(c => c.supports(event))` 派发——**先匹配先生效**，
 * 因此顺序是契约：窄匹配的结构编译器（pointer/linkedList/tree/unionFind）
 * 必须排在通用的 array 之前。新增一个结构 = 实现一个 compiler（含 supports/compile）
 * 后按合适位置加入本数组即可，无需改动 eventCompiler.ts。
 */
export const sceneEventCompilers = [
  pointerCompiler, linkedListCompiler, treeCompiler, unionFindCompiler,
  arrayCompiler, matrixCompiler, graphCompiler, stackCompiler, queueCompiler,
  stringCompiler, setCompiler, mapCompiler, dequeCompiler, hashTableCompiler,
  heapCompiler, bitsetCompiler, mathCompiler, geometryCompiler,
  automatonCompiler, probCompiler, graphAnalysisCompiler,
]
```

- [ ] **Step 4: 改 eventCompiler.ts 引用注册表**

在 `src/scene/eventCompiler.ts`：
1. 删除第 4-24 行那 21 条 `import { xxxCompiler } from './compilers/xxx'`（这些已迁到 compilerRegistry.ts）。
2. 删除第 28 行 `const compilers = [ ... ]` 整行。
3. 在文件顶部 import 区新增一行：

```ts
import { sceneEventCompilers as compilers } from './compilerRegistry'
```

> 保留 `overlayCompiler`、`AuxiliaryUnit` 等其它 import 不动；`compileEvent` 函数体（用到 `compilers.find(...)`）完全不变。

- [ ] **Step 5: 删除死代码 registry.ts**

```bash
git rm src/scene/registry.ts
```

（已确认：`scene/index.ts` 未导出它；全仓库含测试无任何 import —— 删除安全。）

- [ ] **Step 6: 运行确认通过 + 全量回归**

Run: `npx vitest run src/scene/__tests__/compilerRegistry.test.ts`
Expected: PASS（3 个用例全过）

Run: `npx vitest run src/scene/`
Expected: PASS（所有 compiler 测试与场景测试不受影响）

Run: `npm run lint`
Expected: 无新增报错（确认 eventCompiler.ts 无未使用 import 残留）

- [ ] **Step 7: 提交**

```bash
git add src/scene/compilerRegistry.ts src/scene/eventCompiler.ts src/scene/__tests__/compilerRegistry.test.ts
git rm src/scene/registry.ts
git commit -m "refactor(scene): 编译器注册收口到 compilerRegistry，删除死代码 registry.ts"
```

---

## Task C：打包按重型依赖拆分 manualChunks（加载性能）

**Files:**
- Modify: `vite.config.ts`（导出 `manualChunks` 函数并接入 `defineConfig` 的 `build.rollupOptions.output`）
- Test: `vite.config.ts` 的现有测试（若存在 `vite.config.test.ts` 则加用例；否则新建 `src/__tests__/viteManualChunks.test.ts`）

> `vite.config.ts` 已导出多个纯函数供测试（如 `normalizeBaseUrl`），沿用同模式把 `manualChunks` 也导出便于单测。

- [ ] **Step 1: 写失败测试**

新建 `src/__tests__/viteManualChunks.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { manualChunks } from '../../vite.config'

const nm = (pkg: string) => `/project/node_modules/${pkg}/dist/index.js`

describe('manualChunks', () => {
  it('重型依赖各自独立 chunk', () => {
    expect(manualChunks(nm('@monaco-editor/react'))).toBe('vendor-monaco')
    expect(manualChunks(nm('monaco-editor'))).toBe('vendor-monaco')
    expect(manualChunks(nm('d3'))).toBe('vendor-d3')
    expect(manualChunks(nm('d3-scale'))).toBe('vendor-d3')
    expect(manualChunks(nm('framer-motion'))).toBe('vendor-motion')
    expect(manualChunks(nm('react-dom'))).toBe('vendor-react')
    expect(manualChunks(nm('react'))).toBe('vendor-react')
  })

  it('应用代码与其它依赖不强制分块（返回 undefined）', () => {
    expect(manualChunks('/project/src/scene/SceneEngine.ts')).toBeUndefined()
    expect(manualChunks(nm('zustand'))).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/__tests__/viteManualChunks.test.ts`
Expected: FAIL —— `manualChunks` is not exported by `vite.config`。

- [ ] **Step 3: 实现并接入**

在 `vite.config.ts` 中，`export default defineConfig(...)` **之前**新增导出函数：

```ts
/** 把重型第三方依赖拆到独立 chunk，改善首屏并行加载与浏览器缓存命中。
 *  返回 undefined 表示交给 Rollup 默认分块。导出以便单测。 */
export function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined
  if (/[\\/]node_modules[\\/](@monaco-editor[\\/]react|monaco-editor)[\\/]/.test(id)) return 'vendor-monaco'
  if (/[\\/]node_modules[\\/]d3(-[a-z]+)?[\\/]/.test(id)) return 'vendor-d3'
  if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return 'vendor-motion'
  if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
  return undefined
}
```

把 `export default defineConfig({ ... })` 改为带 `build` 段：

```ts
export default defineConfig({
  plugins: [react(), apiProxyMiddleware()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
```

- [ ] **Step 4: 运行确认通过 + 构建验证**

Run: `npx vitest run src/__tests__/viteManualChunks.test.ts`
Expected: PASS（2 个用例全过）

Run: `npm run build`
Expected: 构建成功；`dist/assets/` 下出现 `vendor-monaco-*.js`、`vendor-d3-*.js`、`vendor-motion-*.js`、`vendor-react-*.js` 等独立文件。可用 `ls dist/assets | grep vendor-` 确认。

- [ ] **Step 5: 提交**

```bash
git add vite.config.ts src/__tests__/viteManualChunks.test.ts
git commit -m "perf(build): 按重型依赖拆分 manualChunks（monaco/d3/motion/react）"
```

---

## 并行执行说明（多 agent）

三项**文件集互不相交**，可三个 agent 各占一个 git worktree 并行：

- Agent-A → Task A（`src/scene/SceneEngine.ts`）
- Agent-B → Task B（`src/scene/eventCompiler.ts` + `compilerRegistry.ts` + 删 `registry.ts`）
- Agent-C → Task C（`vite.config.ts`）

每个 agent 完成后跑 `npm run test` 全量确认绿，再各自提交。合并顺序无依赖，建议 A→B→C 顺序合并、每次合并后再跑一次全量测试兜底。

## 自检（spec 覆盖 / 占位符 / 类型一致）

- **覆盖**：评审三项高优先项 A/B/C 均有对应任务；其余项已在"不在本批"显式登记。✓
- **占位符**：每个代码步骤均含完整可运行代码与确切命令/预期；无 TODO/TBD。✓
- **类型一致**：`cloneScene`（A）、`sceneEventCompilers`（B）、`manualChunks`（C）三个新符号在测试与实现中命名一致。✓
