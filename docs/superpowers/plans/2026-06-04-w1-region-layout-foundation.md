# W1: 组合场景地基 — 区域自动布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans。Steps 用 checkbox。
> 上位设计见 `docs/superpowers/specs/2026-06-04-composite-scene-architecture.md`。

**Goal:** 让多个结构（图+距离数组+堆…）在画布上自动分区、不重叠。引入区域布局后处理 pass，由 `presentation.layout: 'composite'` 门控，不影响任何现有单结构脚本。

**Architecture:** 实体加可选 `group` 字段；`regionLayout.ts` 按 group（显式 `entity.group`，否则按 id 前缀启发式）把实体分区、竖直堆叠排布、整体平移到各自区域，并发出区域边框+标题。`deriveSceneState` 仅在 `layout==='composite'` 时调用，渐进不破坏现状。

**验证：** 单测 `regionLayout` + 一个手写"图+数组"组合脚本产生 2 个不重叠区域。完整 Dijkstra（加堆）留 W5。

**Tech Stack:** TypeScript, React 18 SVG, vitest。单 agent 顺序执行（动 SceneEngine 核心，不并行）。

---

## Task: 区域布局地基

**Files:**
- Modify: `src/scene/types.ts`（实体加 `group?`）
- Create: `src/scene/regionLayout.ts`
- Create: `src/scene/primitives/RegionView.tsx`
- Modify: `src/scene/SceneEngine.ts`（deriveSceneState 末尾门控接入）
- Modify: `src/scene/SceneCanvas.tsx`（渲染区域框）
- Modify: `src/types/animation.ts`（PresentationConfig 加 `layout`，如未有）
- Test: `src/scene/__tests__/regionLayout.test.ts`

---

- [ ] **Step 1: 实体加 `group?` 字段**

`src/scene/types.ts`：给 `SceneCell`、`SceneNode`、`SceneLabel` 各加一行可选字段（放在 `meta?`/`state?` 旁）：
```ts
  group?: string   // 组合场景中所属结构实例的区域 id；缺省按 id 前缀推断
```
（三个 interface 各加一次。）

- [ ] **Step 2: PresentationConfig 加 `layout`（若未有）**

先 Read `src/types/animation.ts` 找 `PresentationConfig`/`presentation` 类型。若无 `layout` 字段，追加：
```ts
  layout?: 'composite' | string
```
（若已存在 layout 字段则跳过。）

- [ ] **Step 3: 创建 `src/scene/regionLayout.ts`**

```ts
import type { SceneState, SceneEntity, SceneCell, SceneNode, SceneLabel, SceneGroup, Point } from './types'

const REGION_GAP_Y = 80      // 区域之间竖直间距
const REGION_PAD = 28        // 区域内边距
const REGION_TITLE_H = 24    // 标题占高
const START_X = 120
const START_Y = 120

interface Positioned { id: string; x: number; y: number; w: number; h: number }

/** 按 id 前缀推断结构分组（无显式 group 时的回退）。 */
export function structureOf(id: string): string {
  if (id.startsWith('arr_')) return 'array'
  if (id.startsWith('heap_')) return 'heap'
  if (id.startsWith('hashbucket_') || id.startsWith('hashentry_') || id === 'hashtable_loadfactor') return 'hashtable'
  if (id.startsWith('set_')) return 'set'
  if (id.startsWith('mathvar_')) return 'variables'
  if (id.startsWith('queue_')) return 'queue'
  if (id.startsWith('stack_')) return 'stack'
  if (id.startsWith('deque_')) return 'deque'
  if (id.startsWith('aux_')) return 'aux'
  if (/^s_\d+_\d+$/.test(id)) return 'string'
  return 'main' // 图/树节点等无前缀实体
}

function groupOf(entity: SceneEntity): string {
  if ('group' in entity && entity.group) return entity.group as string
  return structureOf(entity.id)
}

const REGION_TITLE: Record<string, string> = {
  array: '数组', heap: '堆', hashtable: '哈希表', set: '集合', variables: '变量',
  queue: '队列', stack: '栈', deque: '双端队列', aux: '辅助', string: '字符串', main: '主结构',
}

/** 收集有坐标的实体（cell/node/label）。 */
function positionedEntities(scene: SceneState): Array<SceneCell | SceneNode | SceneLabel> {
  const out: Array<SceneCell | SceneNode | SceneLabel> = []
  for (const e of Object.values(scene.entities)) {
    if (e.type === 'cell' || e.type === 'node') out.push(e)
  }
  for (const l of Object.values(scene.labels)) out.push(l)
  return out
}

function entityBox(e: SceneCell | SceneNode | SceneLabel): Positioned {
  const w = ('size' in e && e.size?.width) ? e.size.width : 80
  const h = ('size' in e && e.size?.height) ? e.size.height : 44
  return { id: e.id, x: e.position.x, y: e.position.y, w, h }
}

/**
 * 组合场景区域布局：把实体按组分区，竖直堆叠各区域使其互不重叠，
 * 整体平移组内实体，并写入每组的 SceneGroup（含 bounds + 标题）供 RegionView 渲染。
 * 纯函数，返回新 SceneState。
 */
export function applyRegionLayout(scene: SceneState): SceneState {
  const ents = positionedEntities(scene)
  if (ents.length === 0) return scene

  // 1. 分组
  const groups = new Map<string, Array<SceneCell | SceneNode | SceneLabel>>()
  for (const e of ents) {
    const g = groupOf(e)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(e)
  }
  if (groups.size <= 1) return scene // 单结构无需分区

  // 2. 每组局部 bbox + 竖直堆叠分配目标区域原点
  const offsets = new Map<string, { dx: number; dy: number; bounds: { position: Point; size: Size } }>()
  let cursorY = START_Y
  // 稳定顺序：main 优先，其余按字母
  const orderedKeys = [...groups.keys()].sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b)))
  for (const key of orderedKeys) {
    const list = groups.get(key)!
    const boxes = list.map(entityBox)
    const minX = Math.min(...boxes.map(b => b.x - b.w / 2))
    const minY = Math.min(...boxes.map(b => b.y - b.h / 2))
    const maxX = Math.max(...boxes.map(b => b.x + b.w / 2))
    const maxY = Math.max(...boxes.map(b => b.y + b.h / 2))
    const gw = maxX - minX
    const gh = maxY - minY
    // 目标：该组左上角对齐 (START_X, cursorY + 标题高)，平移量 = 目标 - 当前 min
    const targetTop = cursorY + REGION_TITLE_H
    const dx = START_X - minX
    const dy = targetTop - minY
    offsets.set(key, {
      dx, dy,
      bounds: { position: { x: START_X - REGION_PAD, y: cursorY - REGION_PAD + REGION_TITLE_H }, size: { width: gw + 2 * REGION_PAD, height: gh + 2 * REGION_PAD } },
    })
    cursorY = targetTop + gh + REGION_PAD + REGION_GAP_Y
  }

  // 3. 平移组内所有实体
  const entities = { ...scene.entities }
  const labels = { ...scene.labels }
  for (const [key, list] of groups) {
    const off = offsets.get(key)!
    for (const e of list) {
      const moved = { ...e, position: { x: e.position.x + off.dx, y: e.position.y + off.dy } }
      if (e.type === 'label') labels[e.id] = moved as SceneLabel
      else entities[e.id] = moved as SceneCell | SceneNode
    }
  }

  // 4. 写区域 SceneGroup（RegionView 读它画框+标题）
  const groupsOut: Record<string, SceneGroup> = { ...scene.groups }
  for (const [key, off] of offsets) {
    const gid = `region_${key}`
    groupsOut[gid] = {
      id: gid,
      type: 'group',
      label: REGION_TITLE[key] ?? key,
      entityIds: groups.get(key)!.map(e => e.id),
      bounds: off.bounds,
    }
  }

  return { ...scene, entities, labels, groups: groupsOut }
}

type Size = { width: number; height: number }
```
（注意：`Size` 若 types 已导出则 import，不要重复定义——先 Read types.ts 确认 `Size` 导出情况，已导出则从 './types' import 并删掉本文件末尾的局部 type。）

- [ ] **Step 4: 创建 `src/scene/primitives/RegionView.tsx`**

```tsx
import type { SceneGroup } from '../types'

interface RegionViewProps { region: SceneGroup }

/** 画组合场景中单个结构区域的边框 + 标题。实体本体由各自 View/CellView/NodeView 画。 */
export default function RegionView({ region }: RegionViewProps) {
  if (!region.bounds) return null
  const { position, size } = region.bounds
  return (
    <g>
      <rect
        x={position.x} y={position.y} width={size.width} height={size.height}
        rx={12} ry={12}
        fill="#FFFFFF" fillOpacity={0.35}
        stroke="#CBD5E1" strokeWidth={1.4} strokeDasharray="6 4"
      />
      {region.label && (
        <text x={position.x + 10} y={position.y - 8} fontSize="12" fontWeight={600}
          fill="#64748B" fontFamily="monospace">
          {region.label}
        </text>
      )}
    </g>
  )
}
```

- [ ] **Step 5: deriveSceneState 门控接入**

在 `src/scene/SceneEngine.ts` 的 `deriveSceneState` 末尾，`return scene` 之前，加：
```ts
  // 组合场景：仅当显式开启 layout==='composite' 时做区域自动布局（不影响现有脚本）
  if (script.presentation?.layout === 'composite') {
    scene = applyRegionLayout(scene)
  }

  return scene
```
并在文件顶部 import：`import { applyRegionLayout } from './regionLayout'`。

- [ ] **Step 6: SceneCanvas 渲染区域框**

`src/scene/SceneCanvas.tsx`：
1. import：`import RegionView from './primitives/RegionView'`
2. 在 `renderContainers(entities)` 之前（区域框要画在最底层）渲染所有 `region_` 开头的 group：
```tsx
        {Object.values(scene.groups).filter(g => g.id.startsWith('region_')).map(g => (
          <RegionView key={g.id} region={g} />
        ))}
        {renderContainers(entities)}
```
（确认 `scene.groups` 在该作用域可访问；`scene` 已在组件内。）
3. `computeViewBoxDimensions` 已按实体位置算包围盒；区域框在实体范围内，无需额外处理。若区域标题在实体上方被裁，可把 group bounds 也纳入 positioned 计算（可选，先不做）。

- [ ] **Step 7: 单测 `src/scene/__tests__/regionLayout.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { applyRegionLayout, structureOf } from '../regionLayout'
import { createEmptyScene } from '../types'
import type { SceneState, SceneCell, SceneNode } from '../types'

function cell(id: string, x: number, y: number): SceneCell {
  return { id, type: 'cell', position: { x, y }, size: { width: 44, height: 44 }, value: '' }
}
function node(id: string, x: number, y: number): SceneNode {
  return { id, type: 'node', variant: 'graph.default', position: { x, y }, size: { width: 48, height: 48 }, fields: [], ports: [] }
}

describe('structureOf', () => {
  it('按前缀分组', () => {
    expect(structureOf('arr_0')).toBe('array')
    expect(structureOf('heap_0')).toBe('heap')
    expect(structureOf('A')).toBe('main')
  })
})

describe('applyRegionLayout', () => {
  it('单组不分区，原样返回', () => {
    const s = createEmptyScene()
    s.entities['arr_0'] = cell('arr_0', 100, 100)
    s.entities['arr_1'] = cell('arr_1', 160, 100)
    const out = applyRegionLayout(s)
    expect(out.entities['arr_0'].position.y).toBe(100) // 未平移
    expect(Object.keys(out.groups).length).toBe(0)
  })

  it('两组（图+数组）分到两个不重叠区域', () => {
    const s: SceneState = createEmptyScene()
    // 图节点（main）与数组（array）初始重叠在同一片区域
    s.entities['A'] = node('A', 300, 300)
    s.entities['B'] = node('B', 360, 300)
    s.entities['arr_0'] = cell('arr_0', 300, 320)
    s.entities['arr_1'] = cell('arr_1', 360, 320)
    const out = applyRegionLayout(s)
    // 生成两个区域 group
    const regions = Object.values(out.groups).filter(g => g.id.startsWith('region_'))
    expect(regions.length).toBe(2)
    // 两区域竖直不重叠：array 区域顶 ≥ main 区域底
    const main = out.groups['region_main'].bounds!
    const array = out.groups['region_array'].bounds!
    expect(array.position.y).toBeGreaterThanOrEqual(main.position.y + main.size.height)
  })

  it('平移后组内相对关系不变', () => {
    const s = createEmptyScene()
    s.entities['A'] = node('A', 300, 300)
    s.entities['arr_0'] = cell('arr_0', 300, 320)
    s.entities['arr_1'] = cell('arr_1', 360, 320)
    const out = applyRegionLayout(s)
    // arr_0 与 arr_1 的相对 x 间距保持 60
    expect(out.entities['arr_1'].position.x - out.entities['arr_0'].position.x).toBe(60)
  })
})
```

- [ ] **Step 8: 验证**

```bash
npx tsc --noEmit && npm test && npx vite build
```
期望：0 类型错误；新增 regionLayout 测试通过；**现有 118 测试不破**（门控保证）；build 通过。

- [ ] **Step 9: 提交**

```bash
git add src/scene/types.ts src/scene/regionLayout.ts src/scene/primitives/RegionView.tsx src/scene/SceneEngine.ts src/scene/SceneCanvas.tsx src/types/animation.ts src/scene/__tests__/regionLayout.test.ts
git commit -m "feat(scene): W1 组合场景地基——区域自动布局（门控，不影响现有脚本）

实体加 group 字段；regionLayout 按结构分组、竖直堆叠分区、整体平移，
发出区域 SceneGroup 供 RegionView 画框+标题。deriveSceneState 仅在
presentation.layout==='composite' 时启用，现有单结构脚本完全不变。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 自检
- ✅ 区域布局机制（regionLayout + RegionView）
- ✅ 门控不破坏现有（layout!=='composite' 时不调用）
- ✅ 前缀启发式分组（array/heap/hashtable/set/queue/stack/deque/string/main）
- ✅ 单测覆盖：分组、双区域不重叠、平移保持相对关系
- 后续：多实例同类型（explicit group）→ W3 Builder v2；显式 ns/compiler 前缀化 → W3/W6；堆原语 → W2；完整 Dijkstra → W5
