# Missing Algorithms + Phase 3 Serif — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 5 algorithms the demo (`design-demos/algoviz-gallery.html`) shows but production lacks — red-black tree, singly-linked-list reversal, grid pathfinding + grid DP, Huffman tree, skip list — and complete the deferred Phase 3 serif typography reskin from `docs/observable-restyle-migration-plan.md`.

**Architecture:** Two **file-disjoint** workstreams that run as two parallel agents (per the documented worktree gotcha: agents share the main tree, so collision-avoidance = strict file ownership).
- **Workstream A — Serif reskin.** Owns ONLY `src/scene/primitives/*.tsx`, `src/scene/SceneCanvas.tsx`, `src/scene/__tests__/tokens.test.ts`.
- **Workstream B — 5 algorithms.** Owns ONLY `src/data/*`, `src/presets/*` (new files + `generators.ts`), `src/scene/eventTypes.ts`, `src/scene/compilerRegistry.ts`, `src/scene/compilers/*` (new file). Its 5 tasks run **sequentially inside the one agent** because they all touch the same 4 shared registration files (`algorithmCatalog.ts`, `generators.ts`, `codeTemplates.ts`, `algorithmMetadata.ts`).

**Tech Stack:** React 18, TypeScript 6, Vitest 4. Event-based scene pipeline: `AnimationScript` (steps with `events: AlgorithmEvent[]`) → `compileEvent` dispatches to the first compiler in `sceneEventCompilers` whose `supports()` matches → `SceneCommand[]` → `deriveSceneState` → primitives. Preset generators are registered in `GENERATORS` (`src/presets/generators.ts`) and resolved via `resolveScript` → `generatePreset`.

---

## Shared constraints (BOTH workstreams must respect)

These are enforced by existing tests. Violating them breaks the suite.

1. **4-language code templates (HARD).** `src/data/__tests__/algorithmCatalog.test.ts` iterates **every** key in `CODE_TEMPLATES` and asserts all four of `python / javascript / cpp / java` are non-empty. Any new `CODE_TEMPLATES` entry MUST supply all four.
2. **Preset must produce a `result` (HARD).** `src/presets/__tests__/outputCoverage.test.ts` iterates `PRESET_IDS` (= `Object.keys(GENERATORS)`) and asserts each generator yields a non-empty `script.result` for at least one of the sample inputs `['', 'nums = [5, 3, 8, 1, 9, 2]', '[4, 2, 7, 1]']`. The default `inferPresetResult` fallback is `scriptVisitOrder(script) ?? finalMatrixFromScript(script) ?? genericResultFromScene(script)` — so a generator that emits visit-order events (`tree.visit`, `grid.visit`, `graph.visit_node`, `linked_list.visit`) generally gets a result for free. If a new generator does NOT, add it to the `NO_SINGLE_RETURN` exemption set in that test, OR set `script.result` explicitly in the generator.
3. **Catalog entry shape.** `algorithmCatalog.test.ts` requires: `id` matches `/^[a-z0-9_]+$/`, non-empty `name`/`nameEn`, `category` ∈ `{sorting,graph,data-structure,dp,search-backtrack,advanced,interview,contest}`, `difficulty` ∈ `{easy,medium,hard}`, `hasPreset` boolean, ids unique.
4. **No hardcoded hex in primitives (Workstream A).** `tokens.test.ts` caps total `#RRGGBB` literals across the listed primitive files at **≤ 20** (currently ~11). Serif work adds NO colors — it only swaps `fontFamily`. Do not introduce hex.
5. **Baseline green first.** Before any change run `npm run test` once to confirm the tree is green, so regressions are attributable.

---

# WORKSTREAM A — Phase 3 Serif Typography

**Goal:** Label / index / annotation / title text in the scene primitives renders in `TYPO.serif` (Georgia-family, the Observable "explanatory chart" voice). **Data values stay `TYPO.mono`** (tabular alignment for numbers).

**`TYPO.serif` already exists** in `src/scene/tokens.ts` (`'Georgia, "Times New Roman", "Songti SC", serif'`). This workstream only changes `fontFamily="monospace"` → `fontFamily={TYPO.serif}` on the *label-class* `<text>` elements, importing `TYPO` where not already imported.

**The rule for every `<text>`:**
- It renders a **data value** the algorithm manipulates (cell contents, node values, the automaton/distribution datum) → **keep `monospace`**.
- It renders **chrome** (section labels, axis indices, row/col coordinates, captions like "栈顶"/"队首", titles, frequency/weight annotations) → **change to `TYPO.serif`**.

### Task A1: Serif — CellView

**Files:**
- Modify: `src/scene/primitives/CellView.tsx` (already imports `TYPO`? No — imports `SEMANTIC_COLORS, NEUTRALS, SHAPE`. Add `TYPO`.)
- Test: `src/scene/__tests__/tokens.test.ts`

- [ ] **Step 1: Add a guard test** in `tokens.test.ts` (new `describe` block at end of file):

```ts
describe('Phase 3 serif typography', () => {
  it('label/index/title text uses TYPO.serif, not monospace', () => {
    // These files must reference TYPO.serif for their chrome text.
    const serifFiles = [
      'primitives/CellView.tsx', 'primitives/NodeView.tsx',
      'primitives/HeapView.tsx', 'primitives/HashTableView.tsx',
      'primitives/StringView.tsx', 'primitives/SetView.tsx',
      'primitives/ContainerView.tsx', 'primitives/BitsetView.tsx',
      'primitives/RegionView.tsx', 'primitives/GraphAnalysisView.tsx',
      'primitives/GeometryView.tsx', 'primitives/DistributionView.tsx',
      'SceneCanvas.tsx',
    ]
    for (const f of serifFiles) {
      const src = rawOf(f)
      expect(src, `${f} 应引用 TYPO.serif`).toMatch(/TYPO\.serif/)
    }
  })

  it('numeric value text stays monospace in CellView/NodeView', () => {
    // The primary data-value <text> must remain tabular monospace.
    expect(rawOf('primitives/CellView.tsx')).toMatch(/fontFamily="monospace"/)
    expect(rawOf('primitives/NodeView.tsx')).toMatch(/fontFamily="monospace"/)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npm run test -- tokens.test`
Expected: FAIL — "应引用 TYPO.serif" (no primitive references `TYPO.serif` yet).

- [ ] **Step 3: Edit `CellView.tsx`.** Change import line 3 to add `TYPO`:

```ts
import { SEMANTIC_COLORS, NEUTRALS, SHAPE, TYPO, type SemanticColorName } from '../tokens'
```

Line 46 (matrix **header** index label) — change `fontFamily="monospace"` → `fontFamily={TYPO.serif}`.
Line 81 (the cell **value**) — **leave `monospace`**.
Line 88 (row,col **coordinate** label) — change `fontFamily="monospace"` → `fontFamily={TYPO.serif}`.

- [ ] **Step 4: Run test (CellView portion will still fail until all files done — proceed; final run is Step A-final).** This is fine; commit per-file at the end of the workstream is acceptable, but prefer one commit at A-final.

### Task A2–A12: Serif — remaining primitives

Apply the same rule to each file. **Add `import { TYPO } from '../tokens'`** (or extend the existing tokens import) where missing, then swap `fontFamily="monospace"` → `fontFamily={TYPO.serif}` on the lines below. Lines are from the current tree (verify by reading; do not blindly trust line numbers).

- [ ] **A2 `NodeView.tsx`** — line 53 is the node **value** → keep `monospace`. Line 106 is the **field label** → `TYPO.serif`. (NodeView already imports from `../tokens`; add `TYPO`.)
- [ ] **A3 `HeapView.tsx`** — lines 55 (panel label), 64 (sub caption), 89 (index) → `TYPO.serif`. Line 82 (array **value**, fontWeight 600) → keep `monospace`.
- [ ] **A4 `HashTableView.tsx`** — lines 65 (label), 76 (index), 112 (small caption) → `TYPO.serif`. Line 115 (bucket **value**, fontWeight 600) → keep `monospace`.
- [ ] **A5 `StringView.tsx`** — lines 59, 86 (labels), 97 (index) → all `TYPO.serif` (string char cells themselves are drawn by CellView; these three are labels/indices).
- [ ] **A6 `SetView.tsx`** — line 76 (label) → `TYPO.serif`.
- [ ] **A7 `ContainerView.tsx`** — lines 32, 96 (container labels), 99 ("栈顶 ➔"), 120 ("队首"), 121 ("队尾") → all `TYPO.serif`.
- [ ] **A8 `BitsetView.tsx`** — lines 50 (label), 61 (index) → `TYPO.serif`.
- [ ] **A9 `RegionView.tsx`** — line 20 (region label) → `TYPO.serif`.
- [ ] **A10 `GraphAnalysisView.tsx`** — line 34 (node caption above node) → `TYPO.serif`.
- [ ] **A11 `GeometryView.tsx`** — line 49 (point label) → `TYPO.serif`.
- [ ] **A12 `DistributionView.tsx`** — lines 25 (bin label), 26 (weight annotation) → `TYPO.serif`. Line 36 (sample **value**) → keep `monospace`.
- [ ] **A13 `SceneCanvas.tsx`** — line 415 is inside `renderArrayIndexAxis` (the index axis) → `TYPO.serif`. SceneCanvas must import `TYPO` from `./tokens` if not already.
- [ ] **A14 `AutomatonView.tsx`** — line 22 renders the state **value/identifier** (`c.value`). This is the datum, but automaton state ids ("q0") read as labels. **Decision: keep `monospace`** (it is the cell's primary value, consistent with the "data value stays mono" rule). No change. (Not in the serif guard list above, so no test pressure.)

- [ ] **A-final Step: Run full serif test + typecheck**

Run: `npm run test -- tokens.test`
Expected: PASS (both new `it` blocks green).
Run: `npm run typecheck` (or `npx tsc --noEmit -p tsconfig.json` if no script) — expect no new errors.

- [ ] **A-final commit**

```bash
git add src/scene/primitives/*.tsx src/scene/SceneCanvas.tsx src/scene/__tests__/tokens.test.ts
git commit -m "feat(scene): Phase 3 衬线注解 — 标签/下标/标题接 TYPO.serif，数值保留 mono"
```

> After commit, start a dev server and screenshot one sorting + one tree algorithm; confirm labels read serif and numbers stay tabular. Screenshot howto: `design-demos`/migration-plan §8 (Playwright file:// — preview MCP times out on this repo's HMR).

---

# WORKSTREAM B — 5 Algorithms

Run these **sequentially** (shared files). Order is by ascending risk so the easy wins land first.

## Task B1: red_black_tree (wire the existing generator)

The generator `generateRedBlackTree()` **already exists** at `src/presets/redBlackTree.ts` and the 4-language code template **already exists** at `CODE_TEMPLATES.red_black_tree`. It is simply not wired: no catalog entry, not in `GENERATORS`. This task is pure wiring.

**Files:**
- Modify: `src/presets/generators.ts` (import + wrapper + `GENERATORS` entry)
- Modify: `src/data/algorithmCatalog.ts` (catalog entry)
- Modify: `src/data/algorithmMetadata.ts` (description + default input)
- Test: `src/presets/__tests__/redBlackWiring.test.ts` (new)

- [ ] **Step 1: Write the failing test** — `src/presets/__tests__/redBlackWiring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hasGenerator, generatePreset } from '@/presets'
import { DEFAULT_ALGORITHMS } from '@/data/algorithmCatalog'

describe('red_black_tree wiring', () => {
  it('is registered as a generator', () => {
    expect(hasGenerator('red_black_tree')).toBe(true)
  })
  it('appears in the catalog as a data-structure', () => {
    const e = DEFAULT_ALGORITHMS.find(a => a.id === 'red_black_tree')
    expect(e).toBeDefined()
    expect(e!.hasPreset).toBe(true)
  })
  it('produces a tree.create script', () => {
    const s = generatePreset('red_black_tree', '')
    expect(s).toBeDefined()
    const hasCreate = s!.steps.some(st => st.events?.some(e => e.type === 'tree.create'))
    expect(hasCreate).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npm run test -- redBlackWiring` → FAIL (`hasGenerator` false).

- [ ] **Step 3: Wire the generator.** In `src/presets/generators.ts`:
  - Add import near the other tree imports (e.g. after the `segmentTree` import ~line 869):
    ```ts
    import { generateRedBlackTree } from './redBlackTree'
    ```
  - Add wrapper near `segmentTreeWrapper` (~line 1236). `generateRedBlackTree()` takes no args:
    ```ts
    const redBlackTreeWrapper = (_input: unknown) => generateRedBlackTree()
    ```
  - Add to the `GENERATORS` map (near `avl_insert: avlTreeWrapper`):
    ```ts
    red_black_tree: redBlackTreeWrapper,
    ```

- [ ] **Step 4: Add catalog entry.** In `src/data/algorithmCatalog.ts`, insert after the `avl_tree` (or other tree) entry, in the data-structure section:

```ts
  {
    id: 'red_black_tree',
    name: '红黑树',
    nameEn: 'Red-Black Tree',
    category: 'data-structure',
    difficulty: 'hard',
    hasPreset: true,
  },
```

- [ ] **Step 5: Add metadata.** In `src/data/algorithmMetadata.ts`:
  - `ALGORITHM_DESCRIPTIONS.zh`: `red_black_tree: '自平衡二叉搜索树，节点染红/黑，靠 5 条性质与旋转+变色保持近似平衡，最坏 O(log n)。',`
  - `ALGORITHM_DESCRIPTIONS.en`: `red_black_tree: 'Self-balancing BST; nodes colored red/black, kept near-balanced via 5 invariants plus rotations/recoloring, O(log n) worst case.',`
  - `ALGORITHM_DEFAULT_INPUTS`: `red_black_tree: { value: '[13, 8, 17, 1, 11, 15, 25]', hint: '插入序列，演示红黑树插入后的变色与旋转' },`

- [ ] **Step 6: Run, expect PASS** — `npm run test -- redBlackWiring outputCoverage algorithmCatalog` → PASS. (`outputCoverage` now includes `red_black_tree`; it yields a result via `scriptVisitOrder` default because the generator emits `tree.visit` in its last step. If it fails, set `result` in `generateRedBlackTree` — e.g. `result: 'balanced'` — or exempt it in `NO_SINGLE_RETURN`.)

- [ ] **Step 7: Commit**

```bash
git add src/presets/generators.ts src/data/algorithmCatalog.ts src/data/algorithmMetadata.ts src/presets/__tests__/redBlackWiring.test.ts
git commit -m "feat(algo): 接入红黑树预设 — 注册生成器+catalog+metadata"
```

## Task B2: linked_list_reversal

New generator using the existing `linkedListCompiler` (it already supports `linked_list.create`, `linked_list.move_pointer`, `linked_list.reverse_link`, `linked_list.set_head`).

**Files:**
- Create: `src/presets/linkedListReverse.ts`
- Modify: `src/presets/generators.ts`
- Modify: `src/data/algorithmCatalog.ts`, `src/data/algorithmMetadata.ts`
- Modify: `src/data/codeTemplates.ts` (4-lang)
- Test: `src/presets/__tests__/linkedListReverse.test.ts`

- [ ] **Step 1: Write failing test** — `src/presets/__tests__/linkedListReverse.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateLinkedListReverse } from '../linkedListReverse'

describe('generateLinkedListReverse', () => {
  it('creates a singly list then reverses every link', () => {
    const s = generateLinkedListReverse([1, 2, 3, 4])
    expect(s.algorithm).toBe('linked_list_reversal')
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('linked_list.create')
    expect(types.filter(t => t === 'linked_list.reverse_link').length).toBeGreaterThanOrEqual(3)
    expect(types).toContain('linked_list.set_head')
  })
  it('defaults when given empty input', () => {
    const s = generateLinkedListReverse([])
    expect(s.steps.length).toBeGreaterThan(2)
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — module not found.

- [ ] **Step 3: Implement** — `src/presets/linkedListReverse.ts`:

```ts
import type { AnimationScript, AnimationStep } from '@/types/animation'

/** Iterative singly-linked-list reversal (prev/cur/next pointer walk). */
export function generateLinkedListReverse(arr?: number[]): AnimationScript {
  const vals = arr && arr.length > 0 ? [...arr] : [1, 2, 3, 4, 5]
  const ids = vals.map(v => `n${v}`)
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `单链表 [${vals.join('→')}]，目标：原地反转`, en: `Singly list [${vals.join('→')}], goal: reverse in place` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'linked_list.create', variant: 'singly', nodes: vals.map((v, i) => ({ id: ids[i], value: v })), headId: ids[0], tailId: ids[ids.length - 1] }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  steps.push({
    stepId: sid++, codeLine: 1,
    description: { zh: 'prev = null，cur = head。逐节点把 cur.next 指回 prev', en: 'prev = null, cur = head. Point cur.next back to prev, node by node' },
    action: { type: 'highlight', targets: [0], color: 'warning' },
    events: [{ type: 'linked_list.move_pointer', pointerId: 'cur', toNodeId: ids[0] }],
    stats: { comparisons: 0, swaps: 0, accesses: 1 },
  })

  // Reverse each forward link: node i should now point to node i-1 (null for i=0).
  for (let i = 0; i < ids.length; i++) {
    const prevId = i === 0 ? null : ids[i - 1]
    steps.push({
      stepId: sid++, codeLine: 3,
      description: {
        zh: `反转 ${vals[i]} 的指针 → ${prevId ? vals[i - 1] : 'null'}；cur 前移`,
        en: `Reverse ${vals[i]}.next → ${prevId ? vals[i - 1] : 'null'}; advance cur`,
      },
      action: { type: 'swap', targets: [i], color: 'warning' },
      events: [
        { type: 'linked_list.reverse_link', fromNodeId: ids[i], toNodeId: prevId },
        ...(i + 1 < ids.length ? [{ type: 'linked_list.move_pointer' as const, pointerId: 'cur', toNodeId: ids[i + 1] }] : []),
      ],
      stats: { comparisons: 0, swaps: i + 1, accesses: i + 1 },
    })
  }

  steps.push({
    stepId: sid++, codeLine: 6,
    description: { zh: `反转完成：新表头是 ${vals[vals.length - 1]}，链表变为 [${[...vals].reverse().join('→')}]`, en: `Done: new head ${vals[vals.length - 1]}, list is [${[...vals].reverse().join('→')}]` },
    action: { type: 'mark', targets: vals.map((_, i) => i), color: 'success' },
    events: [
      { type: 'linked_list.set_head', nodeId: ids[ids.length - 1] },
      ...ids.slice().reverse().map(id => ({ type: 'linked_list.visit' as const, nodeId: id, pointerId: 'cur' })),
    ],
    stats: { comparisons: 0, swaps: vals.length, accesses: vals.length },
  })

  return {
    algorithm: 'linked_list_reversal',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
    initialState: { type: 'linked_list', data: [...vals] },
    result: [...vals].reverse(),
    steps: steps as AnimationScript['steps'],
  }
}
```

- [ ] **Step 4: Run, expect PASS** — `npm run test -- linkedListReverse`.

- [ ] **Step 5: Wire generator.** In `generators.ts`: import; add wrapper using the existing `parseArr` helper:
```ts
import { generateLinkedListReverse } from './linkedListReverse'
// ...
const linkedListReverseWrapper = (input: unknown) => generateLinkedListReverse(parseArr(input))
// in GENERATORS:
linked_list_reversal: linkedListReverseWrapper,
```

- [ ] **Step 6: Catalog + metadata.** Catalog entry (data-structure, easy):
```ts
  { id: 'linked_list_reversal', name: '链表反转', nameEn: 'Linked List Reversal', category: 'data-structure', difficulty: 'easy', hasPreset: true },
```
Metadata: zh `'三指针(prev/cur/next)迭代反转单链表，每步把当前节点的 next 指回前驱，O(n) 时间 O(1) 空间。'`; en `'Iterative three-pointer (prev/cur/next) reversal of a singly list; redirect each next pointer to its predecessor. O(n) time, O(1) space.'`; default input `{ value: '[1, 2, 3, 4, 5]', hint: '单链表节点值序列，观察指针逐个反转' }`.

- [ ] **Step 7: Code template (4-lang).** Add `linked_list_reversal` to `CODE_TEMPLATES` in `src/data/codeTemplates.ts`. Python below is complete; port faithfully to `javascript`, `cpp`, `java` (mechanical translation — the test only checks all four are non-empty, but write real idiomatic code):

```python
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def reverse_list(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next   # save next
        cur.next = prev  # reverse pointer
        prev = cur       # advance prev
        cur = nxt        # advance cur
    return prev          # new head
```

- [ ] **Step 8: Run, expect PASS** — `npm run test -- linkedListReverse outputCoverage algorithmCatalog`.

- [ ] **Step 9: Commit**

```bash
git add src/presets/linkedListReverse.ts src/presets/generators.ts src/data/algorithmCatalog.ts src/data/algorithmMetadata.ts src/data/codeTemplates.ts src/presets/__tests__/linkedListReverse.test.ts
git commit -m "feat(algo): 链表反转预设 — 三指针迭代反转(复用 linkedListCompiler)"
```

## Task B3: grid_pathfinding + grid_dp

Two generators using the existing `gridCompiler` overlay (supports `grid.create`, `grid.set_cell`, `grid.visit`, `grid.frontier`, `grid.path`, `grid.wall`, `grid.arrow`).

**Files:**
- Create: `src/presets/gridPath.ts` (both generators)
- Modify: `generators.ts`, `algorithmCatalog.ts`, `algorithmMetadata.ts`, `codeTemplates.ts`
- Test: `src/presets/__tests__/gridPath.test.ts`

- [ ] **Step 1: Failing test** — `src/presets/__tests__/gridPath.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateGridPathfinding, generateGridDP } from '../gridPath'

describe('grid generators', () => {
  it('BFS pathfinding emits create/visit/path', () => {
    const s = generateGridPathfinding()
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('grid.create')
    expect(types).toContain('grid.visit')
    expect(types).toContain('grid.path')
    expect(s.result).toBeDefined()
  })
  it('grid DP emits create + set_cell + arrow path', () => {
    const s = generateGridDP([[1, 3, 1], [1, 5, 1], [4, 2, 1]])
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('grid.create')
    expect(types).toContain('grid.set_cell')
    expect(s.result).toBe(7) // classic min path sum
  })
})
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** — `src/presets/gridPath.ts`:

```ts
import type { AnimationScript, AnimationStep } from '@/types/animation'

type Coord = [number, number]

/** BFS shortest path on a 4×5 grid with a few walls. start=(0,0) target=(3,4). */
export function generateGridPathfinding(): AnimationScript {
  const rows = 4, cols = 5
  const walls = new Set(['1,1', '1,2', '2,3'])
  const start: Coord = [0, 0], target: Coord = [3, 4]
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `${rows}×${cols} 网格，起点(0,0) 终点(3,4)，黑格为墙，BFS 找最短路`, en: `${rows}×${cols} grid, start(0,0) target(3,4), walls in black, BFS shortest path` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [
      { type: 'grid.create', rows, cols },
      ...[...walls].map(w => { const [r, c] = w.split(',').map(Number); return { type: 'grid.wall' as const, row: r, col: c, enabled: true } }),
      { type: 'grid.set_cell', row: start[0], col: start[1], state: 'start' },
      { type: 'grid.set_cell', row: target[0], col: target[1], state: 'target' },
    ],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // BFS
  const key = (r: number, c: number) => `${r},${c}`
  const prev = new Map<string, string | null>()
  const visited = new Set<string>([key(...start)])
  prev.set(key(...start), null)
  let frontier: Coord[] = [start]
  let order = 0
  const dirs: Coord[] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  let reached = false

  while (frontier.length && !reached) {
    const next: Coord[] = []
    for (const [r, c] of frontier) {
      order++
      steps.push({
        stepId: sid++, codeLine: 4,
        description: { zh: `访问 (${r},${c})`, en: `Visit (${r},${c})` },
        action: { type: 'highlight', targets: [], color: 'warning' },
        events: [{ type: 'grid.visit', row: r, col: c, order }],
        stats: { comparisons: order, swaps: 0, accesses: order },
      })
      if (r === target[0] && c === target[1]) { reached = true; break }
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (walls.has(key(nr, nc)) || visited.has(key(nr, nc))) continue
        visited.add(key(nr, nc))
        prev.set(key(nr, nc), key(r, c))
        next.push([nr, nc])
      }
    }
    if (next.length && !reached) {
      steps.push({
        stepId: sid++, codeLine: 7,
        description: { zh: `下一层前沿 ${next.length} 个格子入队`, en: `Frontier: ${next.length} cells enqueued` },
        action: { type: 'highlight', targets: [], color: 'primary' },
        events: [{ type: 'grid.frontier', cells: next }],
        stats: { comparisons: order, swaps: 0, accesses: order },
      })
    }
    frontier = next
  }

  // reconstruct path
  const path: Coord[] = []
  let curK: string | null = key(...target)
  while (curK) { const [r, c] = curK.split(',').map(Number); path.unshift([r, c]); curK = prev.get(curK) ?? null }
  steps.push({
    stepId: sid++, codeLine: 10,
    description: { zh: `最短路长度 ${path.length - 1}：${path.map(p => `(${p[0]},${p[1]})`).join(' → ')}`, en: `Shortest path length ${path.length - 1}` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'grid.path', cells: path }],
    stats: { comparisons: order, swaps: 0, accesses: order },
  })

  return {
    algorithm: 'grid_pathfinding',
    complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
    presentation: { engine: 'scene', module: 'grid' },
    initialState: { type: 'array', data: [] },
    result: path.length - 1,
    steps: steps as AnimationScript['steps'],
  }
}

/** Minimum path sum DP — only move right/down. Fills a dp grid and backtracks. */
export function generateGridDP(grid?: number[][]): AnimationScript {
  const g = grid && grid.length ? grid : [[1, 3, 1], [1, 5, 1], [4, 2, 1]]
  const rows = g.length, cols = g[0].length
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0))
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `代价网格，dp[i][j]=到(i,j)的最小路径和(只能右/下)`, en: `Cost grid; dp[i][j]=min path sum to (i,j), moving right/down only` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'grid.create', rows, cols, values: g }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (i === 0 && j === 0) dp[i][j] = g[0][0]
      else if (i === 0) dp[i][j] = dp[i][j - 1] + g[i][j]
      else if (j === 0) dp[i][j] = dp[i - 1][j] + g[i][j]
      else dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + g[i][j]
      steps.push({
        stepId: sid++, codeLine: 4,
        description: { zh: `dp[${i}][${j}] = ${dp[i][j]}`, en: `dp[${i}][${j}] = ${dp[i][j]}` },
        action: { type: 'compare', targets: [], color: 'warning' },
        events: [{ type: 'grid.set_cell', row: i, col: j, value: dp[i][j], state: 'visited' }],
        stats: { comparisons: sid, swaps: 0, accesses: sid },
      })
    }
  }

  // backtrack from bottom-right
  const path: Coord[] = []
  let i = rows - 1, j = cols - 1
  path.unshift([i, j])
  while (i > 0 || j > 0) {
    if (i === 0) j--
    else if (j === 0) i--
    else if (dp[i - 1][j] <= dp[i][j - 1]) i--
    else j--
    path.unshift([i, j])
  }
  const arrows = path.slice(1).map((to, idx) => ({ type: 'grid.arrow' as const, from: path[idx], to }))
  steps.push({
    stepId: sid++, codeLine: 9,
    description: { zh: `最小路径和 = ${dp[rows - 1][cols - 1]}，回溯路径已标注`, en: `Min path sum = ${dp[rows - 1][cols - 1]}; path traced` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'grid.path', cells: path }, ...arrows],
    stats: { comparisons: sid, swaps: 0, accesses: sid },
  })

  return {
    algorithm: 'grid_dp',
    complexity: { time: { best: 'O(mn)', average: 'O(mn)', worst: 'O(mn)' }, space: 'O(mn)' },
    presentation: { engine: 'scene', module: 'grid' },
    initialState: { type: 'matrix', data: g },
    result: dp[rows - 1][cols - 1],
    steps: steps as AnimationScript['steps'],
  }
}
```

> Note: both set `result` explicitly, so `outputCoverage` is satisfied regardless of `inferPresetResult`.

- [ ] **Step 4: Run, expect PASS** — `npm run test -- gridPath`.

- [ ] **Step 5: Wire.** `generators.ts`:
```ts
import { generateGridPathfinding, generateGridDP } from './gridPath'
const gridPathWrapper = (_input: unknown) => generateGridPathfinding()
const parseGrid = (input: unknown): number[][] | undefined => {
  const v = Array.isArray(input) ? input : (input && typeof input === 'object' ? (input as { data?: unknown }).data : undefined)
  return Array.isArray(v) && v.every(r => Array.isArray(r)) ? v as number[][] : undefined
}
const gridDPWrapper = (input: unknown) => generateGridDP(parseGrid(input))
// GENERATORS:
grid_pathfinding: gridPathWrapper,
grid_dp: gridDPWrapper,
```

- [ ] **Step 6: Catalog + metadata.** Two catalog entries:
```ts
  { id: 'grid_pathfinding', name: '网格寻路(BFS)', nameEn: 'Grid Pathfinding (BFS)', category: 'graph', difficulty: 'medium', hasPreset: true },
  { id: 'grid_dp', name: '网格DP(最小路径和)', nameEn: 'Grid DP (Min Path Sum)', category: 'dp', difficulty: 'medium', hasPreset: true },
```
Metadata descriptions + default inputs:
- `grid_pathfinding`: zh `'在带墙网格上用 BFS 逐层扩展前沿，找起点到终点的最短路并回溯路径。'`, en `'BFS expands the frontier layer by layer on a walled grid to find and trace the shortest start→target path.'`, default `{ value: '(内置 4×5 网格演示)', hint: '内置网格示例，演示 BFS 前沿扩展与最短路回溯' }`.
- `grid_dp`: zh `'网格最小路径和：只能向右/下移动，dp[i][j]=min(上,左)+代价，再回溯最优路径。'`, en `'Grid min path sum: move right/down only, dp[i][j]=min(up,left)+cost, then backtrack the optimal path.'`, default `{ value: '[[1,3,1],[1,5,1],[4,2,1]]', hint: '代价矩阵(行优先)，求左上到右下最小路径和' }`.

- [ ] **Step 7: Code templates (4-lang each).** Add `grid_pathfinding` and `grid_dp` to `CODE_TEMPLATES`. Complete Python references (port to js/cpp/java):

```python
# grid_pathfinding (BFS)
from collections import deque
def bfs(grid, start, target):
    rows, cols = len(grid), len(grid[0])
    q = deque([start]); prev = {start: None}
    while q:
        r, c = q.popleft()
        if (r, c) == target: break
        for dr, dc in ((-1,0),(1,0),(0,-1),(0,1)):
            nr, nc = r+dr, c+dc
            if 0<=nr<rows and 0<=nc<cols and grid[nr][nc]==0 and (nr,nc) not in prev:
                prev[(nr,nc)] = (r,c); q.append((nr,nc))
    path, cur = [], target
    while cur: path.append(cur); cur = prev.get(cur)
    return path[::-1]
```

```python
# grid_dp (min path sum)
def min_path_sum(grid):
    rows, cols = len(grid), len(grid[0])
    dp = [[0]*cols for _ in range(rows)]
    for i in range(rows):
        for j in range(cols):
            if i==0 and j==0: dp[i][j] = grid[0][0]
            elif i==0: dp[i][j] = dp[i][j-1] + grid[i][j]
            elif j==0: dp[i][j] = dp[i-1][j] + grid[i][j]
            else: dp[i][j] = min(dp[i-1][j], dp[i][j-1]) + grid[i][j]
    return dp[-1][-1]
```

- [ ] **Step 8: Run, expect PASS** — `npm run test -- gridPath outputCoverage algorithmCatalog`.

- [ ] **Step 9: Commit**

```bash
git add src/presets/gridPath.ts src/presets/generators.ts src/data/algorithmCatalog.ts src/data/algorithmMetadata.ts src/data/codeTemplates.ts src/presets/__tests__/gridPath.test.ts
git commit -m "feat(algo): 网格寻路(BFS)+网格DP预设(复用 gridCompiler overlay)"
```

## Task B4: huffman

New generator. Reuses the existing `treeCompiler` (`tree.create` auto-layouts via `relayout 'tree'`). Build the Huffman tree from char frequencies, emit the **final tree** once, then highlight nodes in merge order to convey bottom-up construction.

**Files:**
- Create: `src/presets/huffman.ts`
- Modify: `generators.ts`, `algorithmCatalog.ts`, `algorithmMetadata.ts`, `codeTemplates.ts`
- Test: `src/presets/__tests__/huffman.test.ts`

- [ ] **Step 1: Failing test** — `src/presets/__tests__/huffman.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateHuffman } from '../huffman'

describe('generateHuffman', () => {
  it('builds a binary tree and reports codes as result', () => {
    const s = generateHuffman([['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]])
    const create = s.steps.flatMap(st => st.events ?? []).find(e => e.type === 'tree.create')
    expect(create).toBeDefined()
    // n leaves + (n-1) internal = 2n-1 nodes
    expect((create as { nodes: unknown[] }).nodes.length).toBe(11)
    expect(s.result).toBeTruthy()
  })
  it('handles default input', () => {
    const s = generateHuffman()
    expect(s.steps.length).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** — `src/presets/huffman.ts`:

```ts
import type { AnimationScript, AnimationStep } from '@/types/animation'

interface HNode { id: string; freq: number; char?: string; left?: HNode; right?: HNode }

/** Build a Huffman tree from [char, freq] pairs; emit final tree + ordered merge highlights. */
export function generateHuffman(pairs?: Array<[string, number]>): AnimationScript {
  const input = pairs && pairs.length > 0 ? pairs : [['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]] as Array<[string, number]>
  let counter = 0
  const heap: HNode[] = input.map(([char, freq]) => ({ id: `L${counter++}`, freq, char }))
  const mergeLog: Array<{ id: string; a: HNode; b: HNode }> = []

  // Repeatedly merge the two smallest.
  while (heap.length > 1) {
    heap.sort((x, y) => x.freq - y.freq)
    const a = heap.shift()!, b = heap.shift()!
    const parent: HNode = { id: `I${counter++}`, freq: a.freq + b.freq, left: a, right: b }
    mergeLog.push({ id: parent.id, a, b })
    heap.push(parent)
  }
  const root = heap[0]

  // Flatten to nodes + edges for tree.create.
  const nodes: Array<{ id: string; value: number | string }> = []
  const edges: Array<{ parentId: string; childId: string; port: 'left' | 'right' }> = []
  const codes: Record<string, string> = {}
  ;(function walk(n: HNode, code: string) {
    nodes.push({ id: n.id, value: n.char ? `${n.char}:${n.freq}` : n.freq })
    if (n.char !== undefined) codes[n.char] = code || '0'
    if (n.left) { edges.push({ parentId: n.id, childId: n.left.id, port: 'left' }); walk(n.left, code + '0') }
    if (n.right) { edges.push({ parentId: n.id, childId: n.right.id, port: 'right' }); walk(n.right, code + '1') }
  })(root, '')

  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `频率：${input.map(([c, f]) => `${c}=${f}`).join('、')}。哈夫曼：每次合并两个最小频率节点`, en: `Frequencies: ${input.map(([c, f]) => `${c}=${f}`).join(', ')}. Huffman: repeatedly merge the two smallest` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'tree.create', variant: 'binary', rootId: root.id, nodes, edges }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  mergeLog.forEach((m, idx) => {
    steps.push({
      stepId: sid++, codeLine: 3,
      description: { zh: `合并 ${label(m.a)} + ${label(m.b)} → 频率 ${m.a.freq + m.b.freq} 的内部节点`, en: `Merge ${label(m.a)} + ${label(m.b)} → internal node freq ${m.a.freq + m.b.freq}` },
      action: { type: 'compare', targets: [], color: 'warning' },
      events: [
        { type: 'tree.visit', nodeId: m.a.id },
        { type: 'tree.visit', nodeId: m.b.id },
        { type: 'tree.visit', nodeId: m.id },
      ],
      stats: { comparisons: idx + 1, swaps: 0, accesses: idx + 1 },
    })
  })

  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: `编码完成：${Object.entries(codes).map(([c, code]) => `${c}=${code}`).join('、')}`, en: `Codes: ${Object.entries(codes).map(([c, code]) => `${c}=${code}`).join(', ')}` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'tree.visit', nodeId: root.id }],
    stats: { comparisons: mergeLog.length, swaps: 0, accesses: mergeLog.length },
  })

  return {
    algorithm: 'huffman',
    complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'binary' },
    initialState: { type: 'tree', data: nodes.map(n => (typeof n.value === 'number' ? n.value : 0)) },
    result: Object.entries(codes).map(([c, code]) => `${c}=${code}`),
    steps: steps as AnimationScript['steps'],
  }
}

function label(n: HNode): string { return n.char ? `${n.char}(${n.freq})` : `[${n.freq}]` }
```

- [ ] **Step 4: Run, expect PASS** — `npm run test -- huffman`.

- [ ] **Step 5: Wire.** `generators.ts`:
```ts
import { generateHuffman } from './huffman'
const huffmanWrapper = (input: unknown) => {
  // Accept [["a",5],...] pairs; otherwise build pairs from a number array (a,b,c... labels).
  if (Array.isArray(input) && input.every(p => Array.isArray(p) && p.length === 2)) return generateHuffman(input as Array<[string, number]>)
  const nums = parseArr(input)
  const pairs = nums.length ? nums.map((f, i) => [String.fromCharCode(97 + i), Math.max(1, f)] as [string, number]) : undefined
  return generateHuffman(pairs)
}
// GENERATORS:
huffman: huffmanWrapper,
```

- [ ] **Step 6: Catalog + metadata.** Catalog (advanced, medium):
```ts
  { id: 'huffman', name: '哈夫曼树', nameEn: 'Huffman Coding', category: 'advanced', difficulty: 'medium', hasPreset: true },
```
Metadata: zh `'贪心构造最优前缀码：反复取两个最小频率节点合并为父节点，直到只剩一棵树；左 0 右 1 即为编码。'`; en `'Greedy optimal prefix coding: repeatedly merge the two lowest-frequency nodes into a parent until one tree remains; left=0 right=1 yields each code.'`; default `{ value: '[5, 9, 12, 13, 16, 45]', hint: '字符频率数组(自动配 a,b,c… 标签)，构建哈夫曼编码' }`.

- [ ] **Step 7: Code template (4-lang).** Complete Python reference (port the rest):

```python
import heapq
def huffman(freqs):  # freqs: dict char->count
    heap = [[w, c, ""] for c, w in freqs.items()]
    heapq.heapify(heap)
    while len(heap) > 1:
        lo = heapq.heappop(heap)
        hi = heapq.heappop(heap)
        for pair in lo[2:]: pass
        merged = [lo[0] + hi[0], None]
        heapq.heappush(heap, [lo[0] + hi[0], None, ("L", lo), ("R", hi)])
    # walk tree assigning 0/1 prefixes -> returns {char: code}
```

> (Provide a clean, fully-working 4-language template; the snippet above is a sketch — write a complete correct version in each language. The test only checks non-empty, but quality matters for the editor view.)

- [ ] **Step 8: Run, expect PASS** — `npm run test -- huffman outputCoverage algorithmCatalog`.

- [ ] **Step 9: Commit**

```bash
git add src/presets/huffman.ts src/presets/generators.ts src/data/algorithmCatalog.ts src/data/algorithmMetadata.ts src/data/codeTemplates.ts src/presets/__tests__/huffman.test.ts
git commit -m "feat(algo): 哈夫曼树预设 — 贪心合并+最终树高亮(复用 treeCompiler)"
```

## Task B5: skip_list (new event type + compiler, NO new primitive)

A skip list is a layered linked list. Render it as generic positioned `cell` entities (one per node-cell occurrence across levels) plus `arrow` edges — exactly how `bitsetCompiler` emits cells for `CellView` and `linkedListCompiler` draws arrows between cells. **No new primitive, no `types.ts` change, no `SceneCanvas` change.** Only: a new `SkipListAlgorithmEvent` type added to the `AlgorithmEvent` union, a new `skipListCompiler`, registration in `compilerRegistry`, and a generator.

**Files:**
- Modify: `src/scene/eventTypes.ts` (add event type + union member)
- Create: `src/scene/compilers/skipListCompiler.ts`
- Modify: `src/scene/compilerRegistry.ts` (import + add to array)
- Create: `src/presets/skipList.ts`
- Modify: `generators.ts`, `algorithmCatalog.ts`, `algorithmMetadata.ts`, `codeTemplates.ts`
- Test: `src/scene/compilers/__tests__/skipListCompiler.test.ts`, `src/presets/__tests__/skipList.test.ts`

- [ ] **Step 1: Add the event type.** In `src/scene/eventTypes.ts`, add after `BitsetAlgorithmEvent` (before `UnionFindAlgorithmEvent`):

```ts
export type SkipListAlgorithmEvent =
  | { type: 'skip_list.create'; values: number[]; heights: number[] }
  | { type: 'skip_list.search'; target: number; path: Array<[node: number, level: number]>; found: boolean }
```

And extend the `AlgorithmEvent` union (line ~172) by inserting `| SkipListAlgorithmEvent` (e.g. right after `BitsetAlgorithmEvent`).

- [ ] **Step 2: Write the compiler test** — `src/scene/compilers/__tests__/skipListCompiler.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { skipListCompiler } from '../skipListCompiler'
import type { CompileContext } from '../../SceneEngine'

const ctx = (): CompileContext => ({ scene: { entities: {}, edges: {} } } as unknown as CompileContext)

describe('skipListCompiler', () => {
  it('supports skip_list.* events', () => {
    expect(skipListCompiler.supports({ type: 'skip_list.create', values: [1], heights: [1] } as never)).toBe(true)
    expect(skipListCompiler.supports({ type: 'array.create', values: [] } as never)).toBe(false)
  })
  it('create emits one cell per (node, level) occurrence', () => {
    // values [1,2,3], heights [1,2,1] -> 1 + 2 + 1 = 4 node cells + head cells
    const cmds = skipListCompiler.compile({ type: 'skip_list.create', values: [1, 2, 3], heights: [1, 2, 1] } as never, ctx())
    const cells = cmds.filter(c => c.type === 'create_cell')
    expect(cells.length).toBeGreaterThanOrEqual(4)
    const arrows = cmds.filter(c => c.type === 'connect')
    expect(arrows.length).toBeGreaterThan(0)
  })
  it('search highlights the path cells', () => {
    const cmds = skipListCompiler.compile({ type: 'skip_list.search', target: 2, path: [[1, 1], [1, 0]], found: true } as never, ctx())
    expect(cmds.some(c => c.type === 'set_state')).toBe(true)
  })
})
```

- [ ] **Step 3: Run, expect FAIL** — module not found.

- [ ] **Step 4: Implement** — `src/scene/compilers/skipListCompiler.ts`:

```ts
import type { SceneCommand } from '../commandTypes'
import type { SkipListAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'
import { AuxiliaryUnit } from '../primitives/DataUnits'

const COL_W = 76
const ROW_H = 60
const BASE_X = 200
const BASE_Y = 360 // level 0 baseline; higher levels go up

export const skipListCompiler: EventCompiler = {
  supports: (event): event is SkipListAlgorithmEvent => event.type.startsWith('skip_list.'),
  compile: (event, context) => compile(event as SkipListAlgorithmEvent, context),
}

const cellId = (col: number, level: number) => `sl_${col}_${level}`
const xOf = (col: number) => BASE_X + col * COL_W
const yOf = (level: number) => BASE_Y - level * ROW_H

function cell(col: number, level: number, value: number | string, head = false): SceneCell {
  return {
    id: cellId(col, level),
    type: 'cell',
    position: { x: xOf(col), y: yOf(level) },
    size: { width: 48, height: 40 },
    value,
    col,
    state: { role: head ? 'header' : 'idle', color: head ? 'primary' : 'muted' },
    meta: { level },
  }
}

function compile(event: SkipListAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'skip_list.create': {
      const { values, heights } = event
      const maxLevel = Math.max(1, ...heights)
      const cmds: SceneCommand[] = []
      // Head tower at col 0; data nodes start at col 1.
      for (let lvl = 0; lvl < maxLevel; lvl++) cmds.push({ type: 'create_cell', cell: cell(0, lvl, 'H', true) })
      values.forEach((v, i) => {
        const col = i + 1
        for (let lvl = 0; lvl < heights[i]; lvl++) cmds.push({ type: 'create_cell', cell: cell(col, lvl, v) })
      })
      // Horizontal arrows per level between consecutive present cells (incl. head).
      for (let lvl = 0; lvl < maxLevel; lvl++) {
        const cols: number[] = [0, ...values.map((_, i) => i + 1).filter(i => heights[i - 1] > lvl)]
        for (let k = 0; k < cols.length - 1; k++) {
          cmds.push({ type: 'connect', edge: AuxiliaryUnit.arrow({
            id: `sle_${cols[k]}_${cols[k + 1]}_${lvl}`,
            fromEntity: cellId(cols[k], lvl), toEntity: cellId(cols[k + 1], lvl),
            curved: false, thickness: lvl === 0 ? 1.2 : 2, color: lvl === 0 ? 'muted' : 'primary',
          }) })
        }
      }
      cmds.push({ type: 'add_note', text: `跳表：${maxLevel} 层，上层稀疏索引加速查找` })
      return cmds
    }
    case 'skip_list.search': {
      const cmds: SceneCommand[] = []
      event.path.forEach(([node, level], idx) => {
        const col = node + 1
        cmds.push({ type: 'set_state', entityId: cellId(col, level), state: { role: 'current', color: 'warning', pulse: true }, merge: true })
        void idx
      })
      const last = event.path[event.path.length - 1]
      if (last) {
        cmds.push({ type: 'set_state', entityId: cellId(last[0] + 1, last[1]), state: { role: event.found ? 'visited' : 'conflict', color: event.found ? 'success' : 'danger', pulse: true }, merge: true })
      }
      cmds.push({ type: 'add_note', text: event.found ? `命中 ${event.target}` : `未找到 ${event.target}` })
      return cmds
    }
  }
}
```

- [ ] **Step 5: Register the compiler.** In `src/scene/compilerRegistry.ts`: add import `import { skipListCompiler } from './compilers/skipListCompiler'` and insert `skipListCompiler` into the `sceneEventCompilers` array. Place it near `linkedListCompiler` (narrow `skip_list.` prefix; order vs others is irrelevant since the prefix is unique, but keep structural compilers grouped):

```ts
export const sceneEventCompilers = [
  pointerCompiler, linkedListCompiler, skipListCompiler, treeCompiler, unionFindCompiler,
  // ...rest unchanged
]
```

- [ ] **Step 6: Run compiler test, expect PASS** — `npm run test -- skipListCompiler`.

- [ ] **Step 7: Generator test** — `src/presets/__tests__/skipList.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateSkipList } from '../skipList'

describe('generateSkipList', () => {
  it('emits create then search events', () => {
    const s = generateSkipList([1, 3, 4, 7, 9, 12], 9)
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('skip_list.create')
    expect(types).toContain('skip_list.search')
    expect(s.result).toBeDefined()
  })
})
```

- [ ] **Step 8: Run, expect FAIL.**

- [ ] **Step 9: Implement** — `src/presets/skipList.ts`:

```ts
import type { AnimationScript, AnimationStep } from '@/types/animation'

/** Build a deterministic skip list over sorted values, then search `target`. */
export function generateSkipList(arr?: number[], target?: number): AnimationScript {
  const values = (arr && arr.length ? [...arr] : [1, 3, 4, 7, 9, 12, 15, 19]).sort((a, b) => a - b)
  // Deterministic tower heights: every 2nd node gets +1 level, every 4th +1 more (max 3).
  const heights = values.map((_, i) => 1 + (i % 2 === 1 ? 1 : 0) + (i % 4 === 3 ? 1 : 0))
  const maxLevel = Math.max(...heights)
  const tgt = target ?? values[Math.floor(values.length / 2)]
  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `跳表(有序 ${values.length} 节点，${maxLevel} 层索引)`, en: `Skip list (${values.length} sorted nodes, ${maxLevel} index levels)` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'skip_list.create', values, heights }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  // Search from top-left head, drop down levels, walk right while next <= target.
  const path: Array<[number, number]> = []
  let comparisons = 0
  let foundCol = -1
  for (let lvl = maxLevel - 1; lvl >= 0; lvl--) {
    for (let i = 0; i < values.length; i++) {
      if (heights[i] <= lvl) continue
      comparisons++
      if (values[i] <= tgt) {
        path.push([i, lvl])
        if (values[i] === tgt) { foundCol = i; break }
      }
    }
    if (foundCol >= 0) break
  }
  const found = foundCol >= 0

  steps.push({
    stepId: sid++, codeLine: 4,
    description: { zh: found ? `从高层索引逐层下降，命中 ${tgt}（比较 ${comparisons} 次）` : `查找 ${tgt}：逐层下降未命中`, en: found ? `Drop down levels, found ${tgt} (${comparisons} comparisons)` : `Search ${tgt}: not found` },
    action: { type: found ? 'mark' : 'highlight', targets: [], color: found ? 'success' : 'danger' },
    events: [{ type: 'skip_list.search', target: tgt, path, found }],
    stats: { comparisons, swaps: 0, accesses: comparisons },
  })

  return {
    algorithm: 'skip_list',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: values },
    result: found ? values.indexOf(tgt) : -1,
    steps: steps as AnimationScript['steps'],
  }
}
```

- [ ] **Step 10: Run, expect PASS** — `npm run test -- skipList`.

- [ ] **Step 11: Wire.** `generators.ts`:
```ts
import { generateSkipList } from './skipList'
const skipListWrapper = (input: unknown) => {
  const obj = (input && typeof input === 'object' && !Array.isArray(input)) ? input as Record<string, unknown> : undefined
  const arr = Array.isArray(obj?.data) ? obj!.data as number[] : parseArr(input)
  const target = typeof obj?.target === 'number' ? obj.target as number : undefined
  return generateSkipList(arr, target)
}
// GENERATORS:
skip_list: skipListWrapper,
```

- [ ] **Step 12: Catalog + metadata.** Catalog (data-structure, hard):
```ts
  { id: 'skip_list', name: '跳表', nameEn: 'Skip List', category: 'data-structure', difficulty: 'hard', hasPreset: true },
```
Metadata: zh `'有序链表+多层稀疏索引：高层"跳过"大段元素，期望 O(log n) 查找，是平衡树的概率化替代。'`; en `'Sorted linked list with multiple sparse index levels; upper levels skip large spans for expected O(log n) search — a probabilistic balanced-tree alternative.'`; default `{ value: '{\n  "data": [1, 3, 4, 7, 9, 12, 15, 19],\n  "target": 9\n}', hint: '有序数组 data 与查找目标 target' }`.

- [ ] **Step 13: Code template (4-lang).** Complete Python reference (port to js/cpp/java):

```python
import random
class SkipNode:
    def __init__(self, val, level):
        self.val = val
        self.forward = [None] * (level + 1)

class SkipList:
    MAX = 4
    def __init__(self):
        self.head = SkipNode(-1, self.MAX)
        self.level = 0
    def _rand_level(self):
        lvl = 0
        while random.random() < 0.5 and lvl < self.MAX: lvl += 1
        return lvl
    def search(self, target):
        cur = self.head
        for i in range(self.level, -1, -1):
            while cur.forward[i] and cur.forward[i].val < target:
                cur = cur.forward[i]
        cur = cur.forward[0]
        return cur is not None and cur.val == target
```

- [ ] **Step 14: Run, expect PASS** — `npm run test -- skipList skipListCompiler outputCoverage algorithmCatalog`.

- [ ] **Step 15: Commit**

```bash
git add src/scene/eventTypes.ts src/scene/compilers/skipListCompiler.ts src/scene/compilerRegistry.ts src/scene/compilers/__tests__/skipListCompiler.test.ts src/presets/skipList.ts src/presets/__tests__/skipList.test.ts src/presets/generators.ts src/data/algorithmCatalog.ts src/data/algorithmMetadata.ts src/data/codeTemplates.ts
git commit -m "feat(algo): 跳表预设 — 新增 skip_list 事件+compiler(复用 CellView/EdgeView)+生成器"
```

## Task B-final: full-suite verification

- [ ] **Step 1: Run the entire suite** — `npm run test`. Expected: all green (was ~1858; now +new tests). Fix any regression in `outputCoverage` (missing `result`) or `algorithmCatalog` (malformed entry) before proceeding.
- [ ] **Step 2: Typecheck** — `npm run typecheck` (or `npx tsc --noEmit`). Expected: no new errors. The new `SkipListAlgorithmEvent` union member must compile against `compileEvent` exhaustiveness — if `eventCompiler.ts` has a `never` exhaustiveness check, ensure skip_list is handled (it is, via `skipListCompiler.supports`).
- [ ] **Step 3: Visual smoke** — dev server; select each new algorithm from the catalog; confirm it renders without console errors (red-black tree, linked list reversal, grid pathfinding, grid DP, huffman, skip list). Screenshot per migration-plan §8.

---

## Agent dispatch (how to execute "开多 agent")

Two background agents, **strict file ownership** (the worktree-isolation gotcha means they share `E:/code/AlgoViz` — only file-disjoint work is collision-safe):

- **Agent A → Workstream A (serif).** Owns `src/scene/primitives/*.tsx`, `src/scene/SceneCanvas.tsx`, `src/scene/__tests__/tokens.test.ts`. Embed the full Workstream A spec in the prompt (do NOT just reference this file path — the agent's baseline may not contain it). One commit at A-final.
- **Agent B → Workstream B (algorithms), tasks B1→B5 sequential.** Owns `src/data/*`, `src/presets/*`, `src/scene/eventTypes.ts`, `src/scene/compilerRegistry.ts`, `src/scene/compilers/skipListCompiler.ts` (+ its test). Embed the full Workstream B spec. Five commits (one per task) + B-final verification.

A and B touch **disjoint** files → safe in parallel. Subagents cannot delete files; neither workstream deletes anything, so this is fine. If an agent stalls on a missing baseline file, re-send the spec inline.

---

## Self-Review (done by plan author)

**Spec coverage:** all 5 demo-gap algorithms (red_black ✓B1, linked_list_reversal ✓B2, grid pathfinding + grid DP ✓B3, huffman ✓B4, skip_list ✓B5) + Phase 3 serif (✓A1–A14). ✓
**Shared-test gates addressed:** 4-lang templates (B2/B3/B4/B5 Step 7/13; B1 reuses existing), `outputCoverage` result (B2/B3/B4/B5 set `result` explicitly; B1 via visit-order default with fallback note), catalog shape (each B task adds a conforming entry), hardcoded-hex budget (A adds no colors). ✓
**Type consistency:** event type names match the existing unions verified by reading `eventTypes.ts`/`gridTypes.ts` (`linked_list.reverse_link`, `linked_list.set_head`, `grid.create/visit/frontier/path/wall/arrow`, `tree.create/visit`). New `skip_list.create/search` defined in B5 Step 1 and consumed consistently in compiler (Step 4) + generator (Step 9). Generator function names match their test imports (`generateLinkedListReverse`, `generateGridPathfinding`/`generateGridDP`, `generateHuffman`, `generateSkipList`). ✓
**Placeholders:** code templates for new algos give a complete Python reference + explicit instruction to port to the other 3 languages (the only "fill-in" — flagged because they are mechanical translations, not design decisions; the test enforces presence). ✓
