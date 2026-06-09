import type { AnimationScript, TeachingState } from '@/types/animation'
import type { RelayoutCommand, SceneCommand } from './commandTypes'
import type { AlgorithmEvent } from './eventTypes'
import type { SceneEdge, SceneEntity, SceneGroup, SceneLabel, SceneNode, ScenePointer, SceneState } from './types'
import { createEmptyScene } from './types'
import { compileEvent } from './eventCompiler'
import { layoutGraph } from './layouts/graphLayout'
import { layoutLinkedList } from './layouts/linkedListLayout'
import { layoutTree } from './layouts/treeLayout'
import { applyRegionLayout } from './regionLayout'
import { createAlgorithmOverlayState } from './overlays/overlayCompiler'

// ── Snapshot cache for incremental replay ──

const SNAPSHOT_INTERVAL = 20 // Save a snapshot every N steps
const MIN_AUX_CELL_W = 56
const MAX_AUX_CELL_W = 170
const AUX_CELL_GAP = 8

interface SnapshotEntry {
  step: number
  scene: SceneState
}

const scriptSnapshotCache = new WeakMap<AnimationScript, SnapshotEntry[]>()

function getOrCreateCache(script: AnimationScript): SnapshotEntry[] {
  if (!scriptSnapshotCache.has(script)) {
    scriptSnapshotCache.set(script, [])
  }
  return scriptSnapshotCache.get(script)!
}

function findNearestSnapshot(script: AnimationScript, targetStep: number): { step: number; scene: SceneState } | null {
  const cache = scriptSnapshotCache.get(script) ?? []
  let best: SnapshotEntry | null = null
  for (const entry of cache) {
    if (entry.step <= targetStep && (!best || entry.step > best.step)) {
      best = entry
    }
  }
  return best ? { step: best.step, scene: deepCloneScene(best.scene) } : null
}

function saveSnapshot(script: AnimationScript, step: number, scene: SceneState) {
  const cache = getOrCreateCache(script)
  // Avoid duplicate snapshots for the same step
  if (cache.length > 0 && cache[cache.length - 1].step === step) return
  cache.push({ step, scene: deepCloneScene(scene) })
}

/** Deep-clone a SceneState so snapshots don't share references with active state */
function deepCloneScene(scene: SceneState): SceneState {
  return {
    entities: Object.fromEntries(Object.entries(scene.entities).map(([k, v]) => {
      if (v.type === 'node') {
        return [k, { ...v, ports: [...v.ports], fields: v.fields.map(f => ({ ...f })) }]
      }
      return [k, { ...v }]
    })),
    edges: Object.fromEntries(Object.entries(scene.edges).map(([k, v]) => [k, { ...v }])),
    pointers: Object.fromEntries(Object.entries(scene.pointers).map(([k, v]) => [k, { ...v }])),
    labels: Object.fromEntries(Object.entries(scene.labels).map(([k, v]) => [k, { ...v }])),
    groups: Object.fromEntries(Object.entries(scene.groups).map(([k, v]) => [k, { ...v }])),
    ...(scene.camera && { camera: { ...scene.camera } }),
    ...(scene.selectedIds && { selectedIds: [...scene.selectedIds] }),
    ...(scene.notes && { notes: [...scene.notes] }),
    ...(scene.overlays && {
      overlays: {
        callStack: scene.overlays.callStack
          ? {
              ...scene.overlays.callStack,
              frames: scene.overlays.callStack.frames.map((frame) => ({ ...frame })),
              highlightedFrameIds: [...scene.overlays.callStack.highlightedFrameIds],
            }
          : undefined,
        dpTables: Object.fromEntries(
          Object.entries(scene.overlays.dpTables).map(([key, table]) => [
            key,
            {
              ...table,
              rowLabels: [...table.rowLabels],
              colLabels: [...table.colLabels],
              cells: table.cells.map((row) => row.map((cell) => ({ ...cell, highlights: [...cell.highlights] }))),
              dependencies: table.dependencies.map((dependency) => ({
                ...dependency,
                from: { ...dependency.from },
                to: { ...dependency.to },
              })),
              formulas: table.formulas.map((formula) => ({
                ...formula,
                target: { ...formula.target },
              })),
              traceback: table.traceback.map((coord) => ({ ...coord })),
              roll: table.roll
                ? {
                    ...table.roll,
                    window: table.roll.window ? { ...table.roll.window } : undefined,
                  }
                : undefined,
            },
          ]),
        ),
        grids: Object.fromEntries(
          Object.entries(scene.overlays.grids).map(([key, grid]) => [
            key,
            {
              ...grid,
              cells: Object.fromEntries(
                Object.entries(grid.cells).map(([cellKey, cell]) => [cellKey, { ...cell }]),
              ),
              frontier: grid.frontier.map(([row, col]) => [row, col]),
              path: grid.path.map(([row, col]) => [row, col]),
              arrows: grid.arrows.map((arrow) => ({
                ...arrow,
                from: [...arrow.from],
                to: [...arrow.to],
              })),
            },
          ]),
        ),
      },
    }),
  }
}

/**
 * Seed the scene with the initial data structure from `initialState`, so the
 * structure is always visible even when the script never emits an explicit
 * create event. Currently covers `array` (cells from initialState.data) — the
 * scene engine otherwise renders nothing for array scripts that lack an
 * `array.create` event. Explicit create events during replay overwrite these
 * seeded entities (same ids), so this is a safe no-harm fallback.
 */
function seedInitialStructures(scene: SceneState, script: AnimationScript): SceneState {
  const firstStepEvents = script.steps[0]?.events ?? []
  const hasVariableInit = script.presentation?.module === 'variables'
    || firstStepEvents.some(event => event.type === 'math.init')
  if (hasVariableInit) return scene

  // 仅在「数组模块」时把 initialState 当数组种入。容器/结构类模块
  // (queue/stack/deque/heap/set/map/hashtable 等)会用自己的 *.create 事件构建结构,
  // 若再按 initialState.data 种一排 arr_ 单元,会与结构单元重叠(如队列里多出一排带
  // 下标的方块)。module 缺省或为 'array' 时才种。
  const module = script.presentation?.module
  const arrayModule = module === undefined || module === 'array'

  if (arrayModule && script.initialState.type === 'array' && (script.initialState.data?.length ?? 0) > 0) {
    const commands = compileEvent(
      { type: 'array.create', values: script.initialState.data } as AlgorithmEvent,
      { scene, stepIndex: 0, script },
    )
    return applyCommands(scene, commands)
  }
  return scene
}

export function deriveSceneState(script: AnimationScript, currentStep: number): SceneState {
  const replayLimit = Math.min(currentStep, script.steps.length)

  // Try to start from nearest snapshot to avoid full O(n) replay
  let scene: SceneState
  let startStep: number

  const nearest = findNearestSnapshot(script, replayLimit)
  if (nearest && nearest.step < replayLimit) {
    scene = nearest.scene
    startStep = nearest.step
  } else {
    scene = createEmptyScene()
    scene = seedInitialStructures(scene, script)
    startStep = 0
    // Save snapshot at step 0 (initial seeded state)
    if (replayLimit > SNAPSHOT_INTERVAL) {
      saveSnapshot(script, 0, scene)
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
      saveSnapshot(script, i + 1, scene)
    }
  }

  // If currentStep is 0 (initial state), proactively compile and apply any 'create' events
  // from the first step so that the initial structure is immediately visible on load.
  if (currentStep === 0 && script.steps.length > 0) {
    const firstStepEvents = script.steps[0].events ?? []
    const createEvents = firstStepEvents.filter((event) =>
      event.type === 'math.init' ||
      event.type.endsWith('.create') ||
      event.type.endsWith('_double') ||
      event.type === 'linked_list.create' ||
      event.type === 'tree.create' ||
      event.type === 'graph.create' ||
      // 新模块的首步即「初始化整组结构」(平面+点、分布/水塘、自动机、图分析叠加),
      // 整步在第 0 帧就完整呈现,避免初始空白。
      event.type.startsWith('geometry.') ||
      event.type.startsWith('prob.') ||
      event.type.startsWith('automaton.') ||
      event.type.startsWith('graph_analysis.')
    )
    for (const event of createEvents) {
      const commands = compileEvent(event, { scene, stepIndex: 0, script })
      scene = applyCommands(scene, commands)
    }
  }

  // Render auxiliary data structures (Queue/Stack) from teachingState for graph/tree algorithms
  const activeStepIdx = currentStep > 0 ? currentStep - 1 : 0
  const activeStep = script.steps[activeStepIdx]
  const teachingState = activeStep?.teachingState

  const isBfsOrTopo = script.algorithm === 'bfs_graph' || script.algorithm === 'topological_sort' || script.algorithm.includes('bfs') || script.algorithm.includes('topological')
  const isDfs = script.algorithm === 'dfs_graph' || script.algorithm.includes('dfs')

  if (teachingState?.graph || teachingState?.queue || teachingState?.stack || isBfsOrTopo || isDfs) {
    let queue = stringifyAuxItems(teachingState?.queue) ?? teachingState?.graph?.queue
    let stack = stringifyAuxItems(teachingState?.stack) ?? teachingState?.graph?.stack

    // Fallback: Reconstruct queue state from event history if not explicitly provided in teachingState (e.g. custom operations)
    if (!queue && isBfsOrTopo) {
      let reconstructedQueue: string[] = []
      for (let i = 0; i < replayLimit; i++) {
        const events = script.steps[i].events ?? []
        for (const event of events) {
          if (event.type === 'graph.enqueue') {
            if (!reconstructedQueue.includes(event.nodeId)) {
              reconstructedQueue.push(event.nodeId)
            }
          } else if (event.type === 'graph.dequeue') {
            reconstructedQueue = reconstructedQueue.filter(id => id !== event.nodeId)
          }
        }
      }
      queue = reconstructedQueue
    }

    // Fallback: Reconstruct stack state from event history if not explicitly provided in teachingState
    if (!stack && isDfs) {
      let reconstructedStack: string[] = []
      for (let i = 0; i < replayLimit; i++) {
        const events = script.steps[i].events ?? []
        for (const event of events) {
          if (event.type === 'graph.enqueue') {
            if (!reconstructedStack.includes(event.nodeId)) {
              reconstructedStack.push(event.nodeId)
            }
          } else if (event.type === 'graph.dequeue') {
            reconstructedStack = reconstructedStack.filter(id => id !== event.nodeId)
          }
        }
      }
      stack = reconstructedStack
    }

    // Clear any existing entities with queue_ or stack_ prefix to avoid duplicates
    let filteredEntities: Record<string, SceneEntity> = {}
    let entitiesChanged = false
    for (const [key, val] of Object.entries(scene.entities)) {
      if (key.startsWith('queue_') || key.startsWith('stack_')) {
        entitiesChanged = true
      } else {
        filteredEntities[key] = val
      }
    }
    let filteredLabels: Record<string, SceneLabel> = {}
    let labelsChanged = false
    for (const [key, val] of Object.entries(scene.labels)) {
      if (key === 'queue_label' || key === 'stack_label') {
        labelsChanged = true
      } else {
        filteredLabels[key] = val
      }
    }
    if (entitiesChanged || labelsChanged) {
      scene = { ...scene, entities: entitiesChanged ? filteredEntities : scene.entities, labels: labelsChanged ? filteredLabels : scene.labels }
    }

    const getNodeLabel = (nodeId: string) => {
      const ent = scene.entities[nodeId]
      if (ent && 'label' in ent && ent.label) return ent.label
      const initNode = script.initialState.nodes?.find(n => n.id === nodeId)
      if (initNode && initNode.label) return initNode.label
      const treeNode = script.initialState.treeNodes?.find(n => String(n.id) === nodeId)
      if (treeNode) return treeNode.value
      return nodeId
    }

    // 1. Process Queue
    if (queue) {
      const CELL_GAP = 44
      const START_Y = 550 // Shift downward slightly to prevent overlap with graph

      if (queue.length > 0) {
        const START_X = 500 - (queue.length * CELL_GAP) / 2

        queue.forEach((nodeId, index) => {
          const value = getNodeLabel(nodeId)
          const cellId = `queue_${index}`
          scene = {
            ...scene,
            entities: {
              ...scene.entities,
              [cellId]: {
                id: cellId,
                type: 'cell',
                position: { x: START_X + index * CELL_GAP, y: START_Y },
                size: { width: 44, height: 44 },
                value,
                col: index,
                state: {
                  role: 'inserted',
                  color: 'primary',
                  pulse: index === queue.length - 1,
                },
              },
            },
          }
        })
      } else {
        // Create an empty placeholder cell so that ContainerView can render an empty Queue container
        const cellId = 'queue_0'
        scene = {
          ...scene,
          entities: {
            ...scene.entities,
            [cellId]: {
              id: cellId,
              type: 'cell',
              position: { x: 500, y: START_Y },
              size: { width: 44, height: 44 },
              value: '',
              col: 0,
              state: {
                role: 'empty_placeholder',
                color: 'muted',
              },
            },
          },
        }
      }

      scene = {
        ...scene,
        labels: {
          ...scene.labels,
          queue_label: {
            id: 'queue_label',
            type: 'label',
            text: 'Queue (队列)',
            position: { x: 500, y: START_Y - 55 }, // Higher up to avoid overlap with top container line
          },
        },
      }
    }

    // 2. Process Stack
    if (stack) {
      const CELL_GAP = 44
      const CX = 840 // On the right side of the canvas
      const BOTTOM_Y = 360 // Anchored bottom of the stack cup

      if (stack.length > 0) {
        stack.forEach((nodeId, index) => {
          const value = getNodeLabel(nodeId)
          const cellId = `stack_${index}`
          scene = {
            ...scene,
            entities: {
              ...scene.entities,
              [cellId]: {
                id: cellId,
                type: 'cell',
                position: { x: CX, y: BOTTOM_Y - index * CELL_GAP },
                size: { width: 44, height: 44 },
                value,
                col: index,
                state: {
                  role: 'inserted',
                  color: 'primary',
                  pulse: index === stack.length - 1,
                },
              },
            },
          }
        })
      } else {
        // Create an empty placeholder cell so that ContainerView can render an empty Stack container
        const cellId = 'stack_0'
        scene = {
          ...scene,
          entities: {
            ...scene.entities,
            [cellId]: {
              id: cellId,
              type: 'cell',
              position: { x: CX, y: BOTTOM_Y },
              size: { width: 44, height: 44 },
              value: '',
              col: 0,
              state: {
                role: 'empty_placeholder',
                color: 'muted',
              },
            },
          },
        }
      }

      scene = {
        ...scene,
        labels: {
          ...scene.labels,
          stack_label: {
            id: 'stack_label',
            type: 'label',
            text: 'Stack (递归调用栈)',
            position: { x: CX, y: BOTTOM_Y - 5 * CELL_GAP - 10 }, // Placed above the max-height stack cup
          },
        },
      }
    }

    // Trigger relayout to adjust graph/tree node centers dynamically based on active queue/stack.
    scene = relayout(scene, script.initialState.type === 'tree' ? 'tree' : 'graph')
  }

  // ── Render auxiliary arrays from teachingState (generic) ──
  scene = renderAuxiliaryArrays(scene, teachingState)

  // ── Decay transient variable annotations (delta / pulse) ──
  // A variable's "+x / -x / ->x" delta and its pulse highlight should only show on
  // the step that actually changed/read it — not linger across later steps (incl.
  // non-math steps), which misleads users into thinking it keeps changing.
  {
    const touched = new Set<string>()
    for (const ev of activeStep?.events ?? []) {
      if (ev.type === 'math.set' || ev.type === 'math.highlight') {
        touched.add('mathvar_' + (ev as { name: string }).name)
      }
    }
    let changed = false
    const nextEntities: Record<string, SceneEntity> = { ...scene.entities }
    for (const [id, ent] of Object.entries(scene.entities)) {
      if (!id.startsWith('mathvar_') || ent.type !== 'cell' || touched.has(id)) continue
      const meta = (ent.meta ?? {}) as Record<string, unknown>
      const hasDelta = meta.delta !== undefined
      if (!hasDelta && !ent.state?.pulse) continue
      const restMeta = { ...meta }
      delete restMeta.delta
      nextEntities[id] = { ...ent, meta: restMeta, state: { role: 'idle', color: 'muted', pulse: false } }
      changed = true
    }
    if (changed) scene = { ...scene, entities: nextEntities }
  }

  // 组合场景：仅当显式开启 layout==='composite' 时做区域自动布局（不影响现有脚本）
  if (script.presentation?.layout === 'composite') {
    scene = applyRegionLayout(scene)
  }

  return scene
}

/// Render auxiliary arrays from teachingState as horizontal cell rows below the main visualization
function renderAuxiliaryArrays(scene: SceneState, teachingState: TeachingState | undefined): SceneState {
  if (!teachingState?.auxiliaryArrays || teachingState.auxiliaryArrays.length === 0) return scene

  // Find the lowest existing cell Y of the main visualization to place auxiliary arrays below
  let maxY = 200
  for (const [id, entity] of Object.entries(scene.entities)) {
    if (id.startsWith('aux_') || id.startsWith('queue_') || id.startsWith('stack_')) continue
    if ('position' in entity && entity.position) {
      const bottom = entity.position.y + ('size' in entity && entity.size ? entity.size.height : 44)
      if (bottom > maxY) maxY = bottom
    }
  }
  // Check labels and pointers too
  for (const [id, label] of Object.entries(scene.labels)) {
    if (id.startsWith('aux_label_') || id === 'queue_label' || id === 'stack_label') continue
    if (label.position.y > maxY) maxY = label.position.y
  }

  const CELL_H = 38
  const LABEL_H = 26
  const ARRAY_GAP = 84  // gap between auxiliary arrays

  const auxArrays = teachingState.auxiliaryArrays
  // Clear previous auxiliary array entities
  let entities = { ...scene.entities }
  let labels = { ...scene.labels }
  for (const key of Object.keys(entities)) {
    if (key.startsWith('aux_')) {
      entities = { ...entities }
      delete entities[key]
    }
  }
  for (const key of Object.keys(labels)) {
    if (key.startsWith('aux_label_')) {
      labels = { ...labels }
      delete labels[key]
    }
  }

  scene = { ...scene, entities, labels }

  for (let ai = 0; ai < auxArrays.length; ai++) {
    const arr = auxArrays[ai]
    const startY = maxY + 60 + ai * ARRAY_GAP
    const count = arr.data.length
    const cellWidths = arr.data.map(estimateAuxiliaryCellWidth)
    // Center the row
    const totalWidth = cellWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, count - 1) * AUX_CELL_GAP
    const startX = 500 - totalWidth / 2

    // Label - perfectly centered over the array
    scene = {
      ...scene,
      labels: {
        ...scene.labels,
        [`aux_label_${arr.id}`]: {
          id: `aux_label_${arr.id}`,
          type: 'label',
          text: arr.label,
          position: { x: 500, y: startY - LABEL_H },
        },
      },
    }

    // Cells
    let cursorX = startX
    for (let ci = 0; ci < count; ci++) {
      const val = arr.data[ci]
      const isActive = arr.activeIndices?.includes(ci)
      const cellColor = arr.colorMap?.[ci]
      const cellId = `aux_${arr.id}_${ci}`
      const width = cellWidths[ci]

      scene = {
        ...scene,
        entities: {
          ...scene.entities,
          [cellId]: {
            id: cellId,
            type: 'cell',
            position: { x: cursorX + width / 2, y: startY },
            size: { width, height: CELL_H },
            value: val?.toString() ?? '',
            col: ci,
            state: {
              role: isActive ? 'active' : 'idle',
              color: cellColor ?? 'muted',
              ...(isActive && { pulse: true }),
            },
          },
        },
      }
      cursorX += width + AUX_CELL_GAP
    }
  }

  return scene
}

function estimateAuxiliaryCellWidth(value: number | string): number {
  const text = value?.toString() ?? ''
  const width = Array.from(text).reduce((sum, char) => {
    return sum + (char.charCodeAt(0) > 255 ? 15 : 8)
  }, 24)
  return Math.max(MIN_AUX_CELL_W, Math.min(MAX_AUX_CELL_W, Math.ceil(width)))
}

function stringifyAuxItems(items: Array<string | number> | undefined): string[] | undefined {
  return items?.map(item => String(item))
}

export function applyCommands(scene: SceneState, commands: SceneCommand[]): SceneState {
  return commands.reduce((acc, cmd) => applyCommand(acc, cmd), scene)
}

function applyCommand(scene: SceneState, command: SceneCommand): SceneState {
  switch (command.type) {
    case 'overlay.callstack.set':
    case 'overlay.callstack.patch':
      return {
        ...scene,
        overlays: {
          ...(scene.overlays ?? createAlgorithmOverlayState()),
          callStack: command.model,
        },
      }
    case 'dp-table.model': {
      const overlays = scene.overlays ?? createAlgorithmOverlayState()
      return {
        ...scene,
        overlays: {
          ...overlays,
          dpTables: {
            ...overlays.dpTables,
            [command.tableId]: command.model,
          },
        },
      }
    }
    case 'grid.model': {
      const overlays = scene.overlays ?? createAlgorithmOverlayState()
      return {
        ...scene,
        overlays: {
          ...overlays,
          grids: {
            ...overlays.grids,
            [command.gridId]: command.model,
          },
        },
      }
    }
    case 'create_node':
      return { ...scene, entities: { ...scene.entities, [command.node.id]: command.node } }
    case 'create_cell':
      return { ...scene, entities: { ...scene.entities, [command.cell.id]: command.cell } }
    case 'create_label':
      return { ...scene, labels: { ...scene.labels, [command.label.id]: command.label } }
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
      const restEdges = { ...scene.edges }
      delete restEdges[command.edgeId]
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
        next = { ...next, entities: { ...next.entities, [entityId]: { ...entity, state: newState } as SceneEntity } }
      } else if (scene.pointers[entityId]) {
        next = { ...next, pointers: { ...next.pointers, [entityId]: { ...entity, state: newState } as ScenePointer } }
      } else if (scene.labels[entityId]) {
        next = { ...next, labels: { ...next.labels, [entityId]: { ...entity, state: newState } as SceneLabel } }
      } else if (scene.groups[entityId]) {
        next = { ...next, groups: { ...next.groups, [entityId]: { ...entity, state: newState } as SceneGroup } }
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
  const restEntities = { ...scene.entities }
  delete restEntities[entityId]
  const restLabels = { ...scene.labels }
  delete restLabels[entityId]
  const restGroups = { ...scene.groups }
  delete restGroups[entityId]
  const restPointers = { ...scene.pointers }
  delete restPointers[entityId]

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
  let fixedPointers = restPointers
  let pointersChanged = false
  for (const [ptrId, ptr] of Object.entries(restPointers)) {
    if (ptr.target?.entityId === entityId) {
      fixedPointers = { ...fixedPointers, [ptrId]: { ...ptr, target: null } }
      pointersChanged = true
    }
  }

  return {
    ...scene,
    entities: restEntities,
    labels: restLabels,
    groups: restGroups,
    pointers: fixedPointers,
    ...((edgesChanged || pointersChanged) && { edges: filteredEdges }),
  }
}

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

function isPositionedNode(entity: unknown): entity is SceneNode {
  return typeof entity === 'object' && entity !== null && 'position' in entity
}

export interface CompileContext {
  scene: SceneState
  stepIndex: number
  script: AnimationScript
}

export interface EventCompiler {
  supports: (event: AlgorithmEvent) => boolean
  compile: (event: AlgorithmEvent, context: CompileContext) => SceneCommand[]
}

