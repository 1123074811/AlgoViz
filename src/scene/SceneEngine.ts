import type { AnimationScript } from '@/types/animation'
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
import { renderAuxiliaryStructures } from './auxiliaryStructures'

// ── Snapshot cache for incremental replay ──

const SNAPSHOT_INTERVAL = 20 // Save a snapshot every N steps

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
  return best ? { step: best.step, scene: cloneScene(best.scene) } : null
}

function saveSnapshot(script: AnimationScript, step: number, scene: SceneState) {
  const cache = getOrCreateCache(script)
  // Avoid duplicate snapshots for the same step
  if (cache.length > 0 && cache[cache.length - 1].step === step) return
  cache.push({ step, scene: cloneScene(scene) })
}

/** Deep-clone a SceneState so snapshots don't share references with active state.
 *  SceneState is plain JSON-serializable data (see types.ts — all interfaces, no
 *  class/Map/Set/function), so structuredClone is correct and far less fragile
 *  than the previous hand-maintained recursive copy. */
export function cloneScene(scene: SceneState): SceneState {
  return structuredClone(scene)
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

  // ── Render auxiliary structures (Queue/Stack/AuxArrays/Variable decay) ──
  scene = renderAuxiliaryStructures({ scene, script, currentStep, replayLimit, relayout })

  // 组合场景：仅当显式开启 layout==='composite' 时做区域自动布局（不影响现有脚本）
  if (script.presentation?.layout === 'composite') {
    scene = applyRegionLayout(scene)
  }

  return scene
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

