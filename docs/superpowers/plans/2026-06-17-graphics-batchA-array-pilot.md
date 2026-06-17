# 公共图元库 · 批 A(array 域)试点 实施计划

> **For agentic workers:** 实现 [`docs/superpowers/specs/2026-06-17-graphics-library-design.md`](../specs/2026-06-17-graphics-library-design.md) 的批 A。**不写新测试**(用户要求);验收 = `npx tsc --noEmit` + 现有测试当回归网 + 用户人工验收。**不做 Playwright 截图**(用户偏好,见记忆 prefer-manual-verification)。

**Goal:** 建立 `src/scene/graphics/` 骨架,并把 array 域(cell 图元)按"builder(产 events)+ compile(events→commands)+ renderer(→SVG)+ catalog"范式迁入,确立后续 B~G 域复制的样板。

**Architecture:** `graphics/builders/`(语义 API 产 events,供 preset/AI)、`graphics/compile/`(迁原 compiler 的 events→SceneCommand)、`graphics/renderers/`(迁原 primitive 的 →SVG)、`graphics/catalog.ts`(图元目录)。批 A **纯架构搬迁,渲染逻辑与视觉零变化**(零回归即成功)。

**Tech Stack:** React 18, TS 6, Vitest 4(仅当回归网,不新增)。

## Global Constraints
- 不动 IR(`AnimationScript`)契约、`SceneEngine.deriveSceneState`、补间、AI 输入契约(events 类型集不变)。
- 事件类型仍来自 `src/scene/eventTypes.ts`(`ArrayAlgorithmEvent`),不改。
- 迁移=**保持渲染逻辑逐字不变**,只改文件位置 + import 相对路径 + 导出名;不借机改视觉(视觉已在批0/批1对齐 demo)。
- 子 agent 无法删文件;删除旧文件由主控收尾。
- 每个 task 末尾 `npx tsc --noEmit` 必须零错。

---

### Task 1: graphics/ 骨架 — catalog + index

**Files:**
- Create: `src/scene/graphics/catalog.ts`
- Create: `src/scene/graphics/index.ts`

**Interfaces:**
- Produces: `GraphicEntry` 类型、`GRAPHICS_CATALOG` 数组(后续每域追加条目)。

- [ ] **Step 1: 写 catalog.ts**

```ts
// 公共图元目录:枚举每个图元域的元信息,供发现 + (未来)AI 依据其生成脚本。
export interface GraphicEntry {
  /** 图元 id,形如 'array.cell'。 */
  id: string
  /** 图元域(对应 builder/compile 模块)。 */
  domain: string
  /** 该域消费的事件类型前缀(如 'array.')。 */
  eventPrefix: string
  /** 该域支持的具体事件类型。 */
  events: string[]
  /** 覆盖的 demo/生产算法 id。 */
  coversAlgorithms: string[]
}

/** 公共图元目录。批 A~G 逐域追加。 */
export const GRAPHICS_CATALOG: GraphicEntry[] = [
  {
    id: 'array.cell',
    domain: 'array',
    eventPrefix: 'array.',
    events: ['array.create', 'array.compare', 'array.swap', 'array.move', 'array.set_value', 'array.mark_sorted', 'array.window', 'array.partition'],
    coversAlgorithms: ['bubble_sort', 'selection_sort', 'insertion_sort', 'merge_sort', 'quick_sort', 'heap_sort', 'shell_sort', 'counting_sort', 'radix_sort', 'bucket_sort', 'binary_search', 'sliding_window', 'monotonic_stack', 'segment_tree'],
  },
]
```

- [ ] **Step 2: 写 index.ts**

```ts
export { GRAPHICS_CATALOG, type GraphicEntry } from './catalog'
export { arrayBuilder } from './builders/arrayBuilder'
```

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: 报 `./builders/arrayBuilder` 未找到(Task 2 创建)——本步先建 catalog,index 的 builder 导出可暂注释或与 Task 2 合并提交。为避免半截错误,**本 task 与 Task 2 连续完成后一起 tsc + 提交**。

- [ ] **Step 4: Commit(与 Task 2 合并)** — 见 Task 2 Step 4。

### Task 2: builders/arrayBuilder.ts

**Files:**
- Create: `src/scene/graphics/builders/arrayBuilder.ts`

**Interfaces:**
- Consumes: `ArrayAlgorithmEvent` from `../../eventTypes`。
- Produces: `arrayBuilder` 对象,方法产 `ArrayAlgorithmEvent`,供 preset/AI 调用替代手写。

- [ ] **Step 1: 写 arrayBuilder.ts**

```ts
import type { ArrayAlgorithmEvent } from '../../eventTypes'

/**
 * array 域图元构建器:语义方法 → ArrayAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const arrayBuilder = {
  create: (values: Array<number | string>): ArrayAlgorithmEvent => ({ type: 'array.create', values }),
  compare: (i: number, j: number): ArrayAlgorithmEvent => ({ type: 'array.compare', indices: [i, j] }),
  swap: (i: number, j: number): ArrayAlgorithmEvent => ({ type: 'array.swap', indices: [i, j] }),
  move: (from: number, to: number): ArrayAlgorithmEvent => ({ type: 'array.move', from, to }),
  setValue: (index: number, value: number | string): ArrayAlgorithmEvent => ({ type: 'array.set_value', index, value }),
  markSorted: (...indices: number[]): ArrayAlgorithmEvent => ({ type: 'array.mark_sorted', indices }),
  window: (indices: number[], opts: { entering?: number; leaving?: number; isNewMax?: boolean } = {}): ArrayAlgorithmEvent => ({ type: 'array.window', indices, ...opts }),
  partition: (pivotIndex: number, left: number, right: number): ArrayAlgorithmEvent => ({ type: 'array.partition', pivotIndex, left, right }),
}
```

- [ ] **Step 2: tsc**

Run: `npx tsc --noEmit`
Expected: 零错。

- [ ] **Step 3: Commit**

```bash
git add src/scene/graphics/catalog.ts src/scene/graphics/index.ts src/scene/graphics/builders/arrayBuilder.ts
git commit -m "feat(graphics): 图元库骨架 — catalog + arrayBuilder(产 array events)"
```

### Task 3: compile/arrayCompile.ts — 迁原 arrayCompiler + 接线

**Files:**
- Create: `src/scene/graphics/compile/arrayCompile.ts`
- Modify: `src/scene/compilerRegistry.ts`(import 改指向新路径)
- Delete(主控收尾): `src/scene/compilers/arrayCompiler.ts`

- [ ] **Step 1: 迁移** — 把 `src/scene/compilers/arrayCompiler.ts` 的**全部内容逐字复制**到 `src/scene/graphics/compile/arrayCompile.ts`,仅改顶部相对 import(`./` 路径多一层):
  - `'../commandTypes'` → `'../../commandTypes'`
  - `'../eventTypes'` → `'../../eventTypes'`
  - `'../SceneEngine'` → `'../../SceneEngine'`
  - `'../primitives/DataUnits'` → `'../../primitives/DataUnits'`
  - `'../textMetrics'` → `'../../textMetrics'`
  导出名 `arrayCompiler` 保持不变(下游按此名引用)。**渲染逻辑一字不改。**

- [ ] **Step 2: 接线** — `src/scene/compilerRegistry.ts`:把
  `import { arrayCompiler } from './compilers/arrayCompiler'`
  改为 `import { arrayCompiler } from './graphics/compile/arrayCompile'`。数组成员 `arrayCompiler` 不变。

- [ ] **Step 3: tsc + 现有测试**

Run: `npx tsc --noEmit` → 零错。
Run: `npx vitest run src/scene/compilers/__tests__/arrayCompiler` 及任何 import arrayCompiler 的测试。
Expected: 通过(逻辑未变)。若某测试从旧路径 `compilers/arrayCompiler` import,更新其 import 到新路径。

- [ ] **Step 4: Commit**(旧文件删除在主控收尾 Task 6)

```bash
git add src/scene/graphics/compile/arrayCompile.ts src/scene/compilerRegistry.ts
git commit -m "feat(graphics): array compile 迁入 graphics/compile(逻辑不变,接线改指向)"
```

### Task 4: renderers/CellRenderer.tsx — 迁原 CellView + 接线

**Files:**
- Create: `src/scene/graphics/renderers/CellRenderer.tsx`
- Modify: `src/scene/SceneCanvas.tsx`(import + 用法)
- Modify: `src/scene/__tests__/tokens.test.ts`(守卫文件路径)
- Delete(主控收尾): `src/scene/primitives/CellView.tsx`

- [ ] **Step 1: 迁移** — 把 `src/scene/primitives/CellView.tsx` 全部内容逐字复制到 `src/scene/graphics/renderers/CellRenderer.tsx`,改:
  - 相对 import 多一层:`'../types'`→`'../../types'`、`'../textMetrics'`→`'../../textMetrics'`、`'../tokens'`→`'../../tokens'`、`'./sharedMotion'`→`'../../primitives/sharedMotion'`。
  - 默认导出函数名 `CellView` → `CellRenderer`(`export default function CellRenderer`)。
  - **渲染逻辑一字不改**(已对齐 demo)。

- [ ] **Step 2: 接线 SceneCanvas** — `src/scene/SceneCanvas.tsx`:`import CellView from './primitives/CellView'` → `import CellRenderer from './graphics/renderers/CellRenderer'`;所有 `<CellView ` 用法改 `<CellRenderer `(通常 1 处)。

- [ ] **Step 3: 更新 tokens.test 守卫** — `src/scene/__tests__/tokens.test.ts`:
  - "CellView 不再内联 COLOR_MAP" 那个 it:`rawOf('primitives/CellView.tsx')` → `rawOf('renderers/CellRenderer.tsx')`。
  - 硬编码 hex 白名单数组 + serif 守卫数组里的 `'primitives/CellView.tsx'` → `'graphics/renderers/CellRenderer.tsx'`(注意 `rawOf` 按后缀匹配,用 `'renderers/CellRenderer.tsx'` 即可)。

- [ ] **Step 4: tsc + 现有测试**

Run: `npx tsc --noEmit` → 零错。
Run: `npx vitest run src/scene/__tests__/tokens.test.ts` 及 CellView 相关测试 → 通过(必要时把测试 import 从 `primitives/CellView` 改到新路径)。

- [ ] **Step 5: Commit**

```bash
git add src/scene/graphics/renderers/CellRenderer.tsx src/scene/SceneCanvas.tsx src/scene/__tests__/tokens.test.ts
git commit -m "feat(graphics): CellView 迁入 graphics/renderers/CellRenderer(逻辑不变,接线改指向)"
```

### Task 5: 验证 builder 可用 — bubbleSort 改调 arrayBuilder

**Files:**
- Modify: `src/presets/bubbleSort.ts`

- [ ] **Step 1: 改 bubbleSort 用 builder** — 读 `src/presets/bubbleSort.ts`,把手写的 array events(如 `{ type: 'array.compare', indices: [j, j+1] }`)改为调 `arrayBuilder.compare(j, j+1)` 等(`import { arrayBuilder } from '@/scene/graphics'`)。逐个替换 create/compare/swap/mark_sorted。**产出的 events 必须逐字等价**(只是构造方式变 builder)。

- [ ] **Step 2: tsc + 测试**

Run: `npx tsc --noEmit` → 零错。
Run: `npx vitest run src/presets/__tests__/outputCoverage.test.ts`(bubble_sort 仍产 result)+ 任何 bubbleSort 相关测试 → 通过。

- [ ] **Step 3: Commit**

```bash
git add src/presets/bubbleSort.ts
git commit -m "feat(graphics): bubbleSort 改调 arrayBuilder 验证脚本构建层可用"
```

### Task 6(主控收尾): 删旧文件 + 全量回归

- [ ] **Step 1: 删除已迁移的旧文件**

```bash
git rm src/scene/compilers/arrayCompiler.ts src/scene/primitives/CellView.tsx
```
(子 agent 无删除权限,此步由主控执行。)

- [ ] **Step 2: 全量回归 + tsc**

Run: `npx tsc --noEmit` → 零错。
Run: `npm run test` → 修订因迁移失效的断言(import 路径、文件后缀),回到全绿。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(graphics): 批A收尾 — 删旧 arrayCompiler/CellView,回归全绿"
```

- [ ] **Step 4: 交用户人工验收** — 告知用户:批 A 是纯架构搬迁,排序类算法(冒泡/快排等)视觉与功能应**与之前完全一致**(零回归即成功)。请用户在 app 里跑一个排序确认无异常,再决定是否继续批 B~G。

---

## Self-Review
- **Spec 覆盖**:批 A 对应 spec §3(graphics 模块 builders/compile/renderers/catalog)+ §5 批次 A(array+cell)。specs.ts 按 YAGNI 推迟到首个需要复杂规格的域(tree rbColor,批 B)引入,catalog 先承载图元目录。✓
- **占位扫描**:无 TBD;迁移类步骤给了精确的 import 改写清单 + 导出名,源代码已在 repo 无需重贴。✓
- **类型一致**:`arrayBuilder` 方法返回 `ArrayAlgorithmEvent`;compile 导出名 `arrayCompiler` 不变(compilerRegistry 引用一致);renderer 默认导出 `CellRenderer`(SceneCanvas 引用一致)。✓
- **不写新测试**:遵用户偏好;靠 tsc + 现有测试网 + 人工验收。✓
