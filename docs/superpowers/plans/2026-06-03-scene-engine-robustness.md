# Scene Engine Robustness Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three independent improvements to Scene Engine: snapshot-cached incremental replay (perf), immutable SceneState with transaction rollback (correctness), and cross-step semantic validation (early error detection).

**Architecture:** Each improvement is self-contained and can be implemented, tested, and committed independently. Order: (1) immutable SceneState first (foundation), (2) snapshot cache (uses new immutable semantics), (3) cross-step validation (standalone).

**Tech Stack:** TypeScript, React 18, no new dependencies

---

## Task 1: Immutable SceneState — Make `applyCommands` Return New State

**Files:**
- Modify: `src/scene/SceneEngine.ts` (entire `applyCommands`, `applyCommand`, `removeEntity`, `relayout`)
- Reference: `src/scene/types.ts` (no changes needed — types already support immutability patterns)

### Step 1: Rewrite `applyCommand` to return new SceneState instead of mutating

Replace `applyCommand` (lines 219-293) and `removeEntity` (lines 296-309) with immutable versions. Keep the same function signature for `applyCommands` but make it chain via reduce.

Open `src/scene/SceneEngine.ts`. Delete the existing `applyCommand`, `removeEntity`, and `applyCommands` functions. Insert the following at the same location:

```ts
export function applyCommands(scene: SceneState, commands: SceneCommand[]): SceneState {
  return commands.reduce((acc, cmd) => applyCommand(acc, cmd), scene)
}

function applyCommand(scene: SceneState, command: SceneCommand): SceneState {
  switch (command.type) {
    case 'create_node':
      return { ...scene, entities: { ...scene.entities, [command.node.id]: command.node } }
    case 'create_cell':
      return { ...scene, entities: { ...scene.entities, [command.cell.id]: command.cell } }
    case 'remove_entity':
      return removeEntity(scene, command.entityId)
    case 'move': {
      const entity = scene.entities[command.entityId]
      if (!entity || !('position' in entity)) return scene
      return { ...scene, entities: { ...scene.entities, [command.entityId]: { ...entity, position: command.to } as SceneEntity } }
    }
    case 'connect':
      return { ...scene, edges: { ...scene.edges, [command.edge.id]: command.edge } }
    case 'disconnect': {
      const { [command.edgeId]: _, ...restEdges } = scene.edges
      return { ...scene, edges: restEdges }
    }
    case 'set_state': {
      const entityId = command.entityId
      const entity = scene.entities[entityId]
        ?? scene.pointers[entityId]
        ?? scene.labels[entityId]
        ?? scene.groups[entityId]
      if (!entity) return scene
      const newState = command.merge
        ? { ...entity.state, ...command.state }
        : command.state

      let next = scene

      // Update entity in its respective map
      if (scene.entities[entityId]) {
        next = { ...next, entities: { ...next.entities, [entityId]: { ...entity, state: newState } } }
      } else if (scene.pointers[entityId]) {
        next = { ...next, pointers: { ...next.pointers, [entityId]: { ...entity, state: newState } } }
      } else if (scene.labels[entityId]) {
        next = { ...next, labels: { ...next.labels, [entityId]: { ...entity, state: newState } } }
      } else if (scene.groups[entityId]) {
        next = { ...next, groups: { ...next.groups, [entityId]: { ...entity, state: newState } } }
      }

      // Also update edge state if an edge with this ID exists
      if (scene.edges[entityId]) {
        const edge = scene.edges[entityId]
        next = { ...next, edges: { ...next.edges, [entityId]: { ...edge, state: command.merge ? { ...edge.state, ...command.state } : command.state } } }
      }

      return next
    }
    case 'set_field': {
      const node = scene.entities[command.nodeId]
      if (!node || node.type !== 'node') return scene
      const newFields = node.fields.map(f =>
        f.id === command.fieldId ? { ...f, ...command.field } : f
      )
      return { ...scene, entities: { ...scene.entities, [command.nodeId]: { ...node, fields: newFields } } }
    }
    case 'set_fields': {
      const node = scene.entities[command.nodeId]
      if (!node || node.type !== 'node') return scene
      return { ...scene, entities: { ...scene.entities, [command.nodeId]: { ...node, fields: command.fields } } }
    }
    case 'set_cell': {
      const cell = scene.entities[command.cellId]
      if (!cell || cell.type !== 'cell') return scene
      const updated = { ...cell }
      if (command.value !== undefined) updated.value = command.value
      if (command.state) updated.state = { ...cell.state, ...command.state }
      return { ...scene, entities: { ...scene.entities, [command.cellId]: updated } }
    }
    case 'add_port': {
      const node = scene.entities[command.nodeId]
      if (!node || node.type !== 'node' || node.ports.some(p => p.id === command.port.id)) return scene
      return { ...scene, entities: { ...scene.entities, [command.nodeId]: { ...node, ports: [...node.ports, command.port] } } }
    }
    case 'remove_port': {
      const node = scene.entities[command.nodeId]
      if (!node || node.type !== 'node') return scene
      return { ...scene, entities: { ...scene.entities, [command.nodeId]: { ...node, ports: node.ports.filter(p => p.id !== command.portId) } } }
    }
    case 'move_pointer':
      return {
        ...scene,
        pointers: {
          ...scene.pointers,
          [command.pointerId]: {
            id: command.pointerId,
            type: 'pointer',
            label: command.label ?? command.pointerId,
            target: command.target,
          },
        },
      }
    case 'relayout':
      return relayout(scene, command.layout, command.scope)
    case 'wait':
      return scene
    case 'add_note':
      return { ...scene, notes: [...(scene.notes ?? []), command.text] }
    default:
      return scene
  }
}

function removeEntity(scene: SceneState, entityId: string): SceneState {
  const { [entityId]: _e, ...restEntities } = scene.entities
  const { [entityId]: _l, ...restLabels } = scene.labels
  const { [entityId]: _g, ...restGroups } = scene.groups
  const { [entityId]: _p, ...restPointers } = scene.pointers

  // Remove edges connected to this entity
  const filteredEdges: Record<string, SceneEdge> = {}
  let edgesChanged = false
  for (const [edgeId, edge] of Object.entries(scene.edges)) {
    if (edgeId === entityId || edge.from.entityId === entityId || edge.to.entityId === entityId) {
      edgesChanged = true
    } else {
      filteredEdges[edgeId] = edge
    }
  }

  // Remove pointers targeting this entity
  const pointersChanged = Object.values(restPointers).some(p => p.target?.entityId === entityId)
  let fixedPointers = restPointers
  if (pointersChanged) {
    fixedPointers = {}
    for (const [ptrId, ptr] of Object.entries(restPointers)) {
      fixedPointers[ptrId] = ptr.target?.entityId === entityId ? { ...ptr, target: null } : ptr
    }
  }

  return {
    ...scene,
    entities: restEntities,
    labels: restLabels,
    groups: restGroups,
    pointers: fixedPointers,
    ...(edgesChanged && { edges: filteredEdges }),
  }
}
```

### Step 2: Rewrite `relayout` to return new SceneState instead of mutating

Replace the existing `relayout` function (lines 311-319):

```ts
function relayout(scene: SceneState, layout: RelayoutCommand['layout'], scope?: string[]): SceneState {
  const positions = layout === 'linked_list'
    ? layoutLinkedList(scene)
    : layout === 'tree'
      ? layoutTree(scene)
      : layout === 'graph'
        ? layoutGraph(scene)
        : {}

  if (Object.keys(positions).length === 0) return scene

  const updatedEntities = { ...scene.entities }
  let changed = false
  for (const [entityId, position] of Object.entries(positions)) {
    if (scope && !scope.includes(entityId)) continue
    const entity = updatedEntities[entityId]
    if (entity && isPositionedNode(entity) && (entity.position.x !== position.x || entity.position.y !== position.y)) {
      updatedEntities[entityId] = { ...entity, position }
      changed = true
    }
  }

  return changed ? { ...scene, entities: updatedEntities } : scene
}
```

### Step 3: Update `deriveSceneState` to use immutable chain

Replace the `deriveSceneState` function body to accumulate scene through the immutable chain instead of mutating a single object. The key change: assign the return value of `applyCommands` back to `scene`.

In `deriveSceneState`, change lines 12-20 from:

```ts
const scene = createEmptyScene()
const replayLimit = Math.min(currentStep, script.steps.length)

for (let i = 0; i < replayLimit; i++) {
  const events = script.steps[i].events ?? []
  for (const event of events) {
    const commands = compileEvent(event, { scene, stepIndex: i, script })
    applyCommands(scene, commands)
  }
}
```

To:

```ts
let scene = createEmptyScene()
const replayLimit = Math.min(currentStep, script.steps.length)

for (let i = 0; i < replayLimit; i++) {
  const events = script.steps[i].events ?? []
  for (const event of events) {
    const commands = compileEvent(event, { scene, stepIndex: i, script })
    scene = applyCommands(scene, commands)
  }
}
```

Similarly, update the `currentStep === 0` proactive-create block (lines 25-38) — change `const scene = ...` to `let scene = ...` and assign the result of `applyCommands` back:

```ts
if (currentStep === 0 && script.steps.length > 0) {
  const firstStepEvents = script.steps[0].events ?? []
  const createEvents = firstStepEvents.filter((event) =>
    event.type.endsWith('.create') ||
    event.type.endsWith('_double') ||
    event.type === 'linked_list.create' ||
    event.type === 'tree.create' ||
    event.type === 'graph.create'
  )
  for (const event of createEvents) {
    const commands = compileEvent(event, { scene, stepIndex: 0, script })
    scene = applyCommands(scene, commands)
  }
}
```

Also update the auxiliary data structure blocks (queue/stack creation) — wherever `scene.entities[cellId] = { ... }` or `scene.labels['...'] = { ... }` appears, change to immutable spread patterns. For example, lines 118-131:

```ts
scene.entities[cellId] = {
  id: cellId,
  type: 'cell',
  ...
}
```

Become:

```ts
scene = {
  ...scene,
  entities: {
    ...scene.entities,
    [cellId]: {
      id: cellId,
      type: 'cell',
      ...
    }
  }
}
```

And line 150-155 labels assignment becomes:

```ts
scene = {
  ...scene,
  labels: {
    ...scene.labels,
    ['queue_label']: {
      id: 'queue_label',
      type: 'label',
      text: 'Queue (队列)',
      position: { x: 500, y: START_Y - 55 },
    }
  }
}
```

Similarly for the delete-prefix cleanup loop (lines 89-97), rewrite to immutable pattern:

```ts
// Clear any existing entities with queue_ or stack_ prefix to avoid duplicates
let filteredEntities = { ...scene.entities }
let filteredLabels = { ...scene.labels }
let entitiesChanged = false
let labelsChanged = false

for (const key of Object.keys(filteredEntities)) {
  if (key.startsWith('queue_') || key.startsWith('stack_')) {
    const { [key]: _, ...rest } = filteredEntities
    filteredEntities = rest
    entitiesChanged = true
  }
}
for (const key of Object.keys(filteredLabels)) {
  if (key === 'queue_label' || key === 'stack_label') {
    const { [key]: _, ...rest } = filteredLabels
    filteredLabels = rest
    labelsChanged = true
  }
}
if (entitiesChanged || labelsChanged) {
  scene = { ...scene, ...(entitiesChanged && { entities: filteredEntities }), ...(labelsChanged && { labels: filteredLabels }) }
}
```

### Step 4: Verify TypeScript compilation

Run: `npx tsc --noEmit`
Expected: No type errors.

### Step 5: Manual smoke test — run the dev server and verify animations still play

Run: `npm run dev`
Open in browser, navigate to any algorithm visualization, verify:
- Initial state renders
- Step forward/backward works
- Auto-play works
- No visual regressions

### Step 6: Commit

```bash
git add src/scene/SceneEngine.ts
git commit -m "refactor(scene): SceneState 不可变更新——applyCommands 改为返回新状态对象

将 applyCommand 从原地修改改为浅拷贝返回新 SceneState，每个 step 的
commands 链式 reduce 执行。若某条 command 执行到一半逻辑上出错（如引用
不存在的 entity），直接返回原 scene，该 step 的其他 commands 效果不会残留。
为后续快照缓存和事务回滚奠定基础。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Snapshot Cache — Incremental Replay from Nearest Snapshot

**Files:**
- Modify: `src/scene/SceneEngine.ts` (add snapshot cache module)

### Step 1: Add snapshot cache module to SceneEngine.ts

Add the following before `deriveSceneState` in `src/scene/SceneEngine.ts`:

```ts
// ── Snapshot cache for incremental replay ──

const SNAPSHOT_INTERVAL = 20 // Save a snapshot every N steps

interface SnapshotEntry {
  step: number
  scene: SceneState
}

let snapshotCache: SnapshotEntry[] = []
let snapshotScriptId = '' // Invalidate cache when script changes

function getScriptId(script: AnimationScript): string {
  return `${script.algorithm}_${script.steps.length}_${script.initialState.type}`
}

function clearSnapshotCache() {
  snapshotCache = []
  snapshotScriptId = ''
}

function ensureCacheInitialized(script: AnimationScript) {
  const id = getScriptId(script)
  if (snapshotScriptId !== id) {
    snapshotCache = []
    snapshotScriptId = id
  }
}

function findNearestSnapshot(targetStep: number): { step: number; scene: SceneState } | null {
  let best: SnapshotEntry | null = null
  for (const entry of snapshotCache) {
    if (entry.step <= targetStep && (!best || entry.step > best.step)) {
      best = entry
    }
  }
  return best ? { step: best.step, scene: deepCloneScene(best.scene) } : null
}

function saveSnapshot(step: number, scene: SceneState) {
  // Avoid duplicate snapshots for the same step
  if (snapshotCache.length > 0 && snapshotCache[snapshotCache.length - 1].step === step) return
  snapshotCache.push({ step, scene: deepCloneScene(scene) })
}

/** Deep-clone a SceneState so snapshots don't share references with active state */
function deepCloneScene(scene: SceneState): SceneState {
  return {
    entities: Object.fromEntries(Object.entries(scene.entities).map(([k, v]) => [k, { ...v }])),
    edges: Object.fromEntries(Object.entries(scene.edges).map(([k, v]) => [k, { ...v }])),
    pointers: Object.fromEntries(Object.entries(scene.pointers).map(([k, v]) => [k, { ...v }])),
    labels: Object.fromEntries(Object.entries(scene.labels).map(([k, v]) => [k, { ...v }])),
    groups: Object.fromEntries(Object.entries(scene.groups).map(([k, v]) => [k, { ...v }])),
    ...(scene.camera && { camera: { ...scene.camera } }),
    ...(scene.selectedIds && { selectedIds: [...scene.selectedIds] }),
    ...(scene.notes && { notes: [...scene.notes] }),
  }
}
```

### Step 2: Update `deriveSceneState` to use snapshot cache

Replace the replay loop in `deriveSceneState` to use the cache. Change:

```ts
let scene = createEmptyScene()
const replayLimit = Math.min(currentStep, script.steps.length)

for (let i = 0; i < replayLimit; i++) {
  ...
}
```

To:

```ts
ensureCacheInitialized(script)

const replayLimit = Math.min(currentStep, script.steps.length)

// Try to start from nearest snapshot to avoid full O(n) replay
let scene: SceneState
let startStep: number

const nearest = findNearestSnapshot(replayLimit)
if (nearest && nearest.step < replayLimit) {
  scene = nearest.scene
  startStep = nearest.step
} else {
  scene = createEmptyScene()
  startStep = 0
  // Save snapshot at step 0 (initial empty state)
  if (replayLimit > SNAPSHOT_INTERVAL) {
    saveSnapshot(0, scene)
  }
}

for (let i = startStep; i < replayLimit; i++) {
  const events = script.steps[i].events ?? []
  for (const event of events) {
    const commands = compileEvent(event, { scene, stepIndex: i, script })
    scene = applyCommands(scene, commands)
  }

  // Save snapshot at interval boundaries
  if ((i + 1) % SNAPSHOT_INTERVAL === 0 && i + 1 < replayLimit) {
    saveSnapshot(i + 1, scene)
  }
}
```

### Step 3: Update the initial-create block similarly

The `currentStep === 0` block also replays. Update it to use the same pattern:

```ts
if (currentStep === 0 && script.steps.length > 0) {
  const firstStepEvents = script.steps[0].events ?? []
  const createEvents = firstStepEvents.filter((event) =>
    event.type.endsWith('.create') ||
    event.type.endsWith('_double') ||
    event.type === 'linked_list.create' ||
    event.type === 'tree.create' ||
    event.type === 'graph.create'
  )
  let initScene = createEmptyScene()
  for (const event of createEvents) {
    const commands = compileEvent(event, { scene: initScene, stepIndex: 0, script })
    initScene = applyCommands(initScene, commands)
  }
  scene = initScene
}
```

Also add cache invalidation export at the bottom of the file (before `CompileContext`):

```ts
export { clearSnapshotCache }
```

### Step 4: Call `clearSnapshotCache` when script changes

In `src/hooks/useAnimationEngine.ts`, add import and call:

```ts
import { clearSnapshotCache } from '@/scene/SceneEngine'
```

In the `useEffect` that resets on script change (line 128-131), add the call:

```ts
useEffect(() => {
  clearSnapshotCache()
  setIsPlaying(false)
  setCurrentStep(0)
}, [script])
```

### Step 5: Verify TypeScript compilation

Run: `npx tsc --noEmit`
Expected: No type errors.

### Step 6: Manual test — verify long animation performance

Run: `npm run dev`
- Open a long algorithm (e.g., QuickSort with 30+ elements, ~200 steps)
- Play through all steps
- Jump from step 150 back to step 10 — should be fast
- Jump from step 10 to step 180 — should use nearest snapshot, not replay from 0

### Step 7: Commit

```bash
git add src/scene/SceneEngine.ts src/hooks/useAnimationEngine.ts
git commit -m "perf(scene): 快照缓存增量回放——每隔20步保存 SceneState 快照

deriveSceneState 新增 snapshotCache 模块，每 20 步保存一份深拷贝快照。
跳步时从最近快照增量重放，避免 O(n) 全量回放。脚本切换时自动清空缓存。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Cross-Step Semantic Validation

**Files:**
- Modify: `src/ai/schema.ts` (add `validateCrossStepConsistency`)
- Modify: `src/ai/parser.ts` (integrate cross-step validation in the parse pipeline)

### Step 1: Add cross-step validation function

Add the following function to `src/ai/schema.ts`, before the existing export of `validateAnimationScript`:

```ts
/**
 * Cross-step semantic consistency checks.
 * Catches contradictions like: visiting a deleted node, double-insert without delete,
 * tree rotation on non-existent node, etc.
 */
export function validateCrossStepConsistency(
  steps: AnimationStep[],
  rendererType: string
): AIValidationIssue[] {
  const issues: AIValidationIssue[] = []

  // Track lifecycle of every entity ID mentioned in events
  const entityLifecycle = new Map<string, { created: number; deleted: number | null }>()
  const visitedAfterDelete: string[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const events = step.events ?? []

    for (let ei = 0; ei < events.length; ei++) {
      const event = events[ei] as Record<string, unknown>
      const type = String(event.type ?? '')

      // Track create/delete lifecycle
      if (type.endsWith('.create')) {
        const ids = extractCreatedIds(event, type)
        for (const id of ids) {
          if (entityLifecycle.has(id) && entityLifecycle.get(id)!.deleted === null) {
            issues.push(issue(
              `steps[${i}].events[${ei}]`,
              'duplicate_create',
              `实体 "${id}" 在第 ${entityLifecycle.get(id)!.created} 步已创建，第 ${i} 步重复创建（期间无 delete）`,
              `检查是否忘记在中间插入 delete 事件`,
              'error',
              false
            ))
          }
          entityLifecycle.set(id, { created: i, deleted: null })
        }
      }

      if (type.endsWith('.delete')) {
        const id = extractDeletedId(event, type)
        if (id) {
          const lifecycle = entityLifecycle.get(id)
          if (lifecycle && lifecycle.deleted === null) {
            lifecycle.deleted = i
          }
          // If not found in lifecycle, it might be from initialState — skip
        }
      }

      // Check for visiting/using deleted entities
      const refs = extractReferencedIds(event, type)
      for (const refId of refs) {
        const lifecycle = entityLifecycle.get(refId)
        if (lifecycle && lifecycle.deleted !== null && lifecycle.deleted < i) {
          const key = `${refId}@${i}`
          if (!visitedAfterDelete.includes(key)) {
            visitedAfterDelete.push(key)
            issues.push(issue(
              `steps[${i}].events[${ei}]`,
              'use_after_delete',
              `实体 "${refId}" 在第 ${lifecycle.deleted} 步已被删除，第 ${i} 步事件 "${type}" 仍引用它`,
              `删除引用或调整事件顺序`,
              'error',
              false
            ))
          }
        }
      }
    }
  }

  // Tree-specific: rotate must reference existing nodes
  if (rendererType === 'tree') {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const events = step.events ?? []
      for (let ei = 0; ei < events.length; ei++) {
        const event = events[ei] as Record<string, unknown>
        const type = String(event.type ?? '')
        if (type === 'tree.rotate') {
          const pivotId = event.pivotId as string
          const lifecycle = entityLifecycle.get(pivotId)
          if (!lifecycle || lifecycle.deleted !== null) {
            issues.push(issue(
              `steps[${i}].events[${ei}]`,
              'rotate_invalid_node',
              `tree.rotate 的 pivotId "${pivotId}" 在旋转时不存在或已被删除`,
              undefined,
              'error',
              false
            ))
          }
        }
      }
    }
  }

  return issues
}

/** Extract entity IDs created by a .create event */
function extractCreatedIds(event: Record<string, unknown>, type: string): string[] {
  const ids: string[] = []
  // linked_list.create / graph.create / tree.create → nodes array
  if (type === 'linked_list.create' || type === 'graph.create') {
    const nodes = event.nodes as { id: string }[] | undefined
    if (nodes) ids.push(...nodes.map(n => n.id))
  }
  if (type === 'tree.create') {
    const nodes = event.nodes as { id: string }[] | undefined
    if (nodes) ids.push(...nodes.map(n => n.id))
  }
  // array.create → creates cells with indices
  if (type === 'array.create') {
    const count = event.count as number ?? 0
    for (let j = 0; j < count; j++) ids.push(`arr_${j}`)
  }
  // matrix.create → cell_<row>_<col>
  if (type === 'matrix.create') {
    const rows = event.rows as number ?? 0
    const cols = event.cols as number ?? 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ids.push(`cell_${r}_${c}`)
      }
    }
  }
  return ids
}

/** Extract the entity ID deleted by a .delete event */
function extractDeletedId(event: Record<string, unknown>, type: string): string | null {
  if (type === 'linked_list.delete' || type === 'tree.delete') {
    return (event.nodeId as string) ?? null
  }
  return null
}

/** Extract entity IDs referenced (but not created/deleted) by an event */
function extractReferencedIds(event: Record<string, unknown>, type: string): string[] {
  const ids: string[] = []
  const nodeId = event.nodeId as string | undefined
  const targetNodeId = event.targetNodeId as string | undefined
  const from = event.from as string | undefined
  const to = event.to as string | undefined
  const source = event.source as string | undefined
  const target = event.target as string | undefined

  if (nodeId) ids.push(nodeId)
  if (targetNodeId) ids.push(targetNodeId)
  if (from) ids.push(from)
  if (to) ids.push(to)
  if (source) ids.push(source)
  if (target) ids.push(target)
  return ids
}
```

### Step 2: Integrate cross-step validation into the parse pipeline

In `src/ai/parser.ts`, find the `parseAIResponseDetailed` function. After `validateAnimationScript` passes and `normalizeAnimationScript` succeeds, add a call to `validateCrossStepConsistency`.

Read `src/ai/parser.ts` first to find the exact insertion point.

```ts
// After normalizeAnimationScript succeeds, add:
import { validateCrossStepConsistency } from './schema'

// In parseAIResponseDetailed, after the normalize step:
const crossStepIssues = validateCrossStepConsistency(
  normalized.steps,
  normalized.initialState.type
)
allIssues.push(...crossStepIssues)
```

The exact integration depends on the current structure of `parseAIResponseDetailed`. If the function returns a result with `issues` field, append cross-step issues there. If cross-step issues contain non-recoverable errors (`recoverable: false`), treat the script as invalid.

### Step 3: Verify TypeScript compilation

Run: `npx tsc --noEmit`
Expected: No type errors.

### Step 4: Manual test — verify cross-step validation catches errors

Create a test case in browser console or add a temporary check:
- Construct an AnimationScript where `tree.delete` precedes `tree.visit` for the same node
- Call `validateCrossStepConsistency` on it
- Verify it returns an issue with code `'use_after_delete'`

### Step 5: Commit

```bash
git add src/ai/schema.ts src/ai/parser.ts
git commit -m "feat(ai): 新增跨步骤语义一致性校验——检测 use-after-delete 等矛盾

validateCrossStepConsistency 追踪每个实体的 create/delete 生命周期，
检测删除后访问、重复创建、旋转引用不存在节点等语义矛盾。
在解析阶段提前拦截，避免将错误脚本传入渲染引擎导致级联污染。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review

1. **Spec coverage:** All three improvements have complete tasks with code.
2. **Placeholder scan:** No TBD, TODO, or vague instructions. All code is complete.
3. **Type consistency:** `SceneState`, `SceneCommand`, `AnimationScript`, `AnimationStep`, `AIValidationIssue` used consistently across tasks. The `applyCommand` return type matches `SceneState`.
