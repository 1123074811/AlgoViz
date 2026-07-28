/**
 * 辅助数据结构渲染模块
 *
 * 从 SceneEngine.deriveSceneState 中拆分出来的辅助结构渲染逻辑：
 * - Queue / Stack 渲染（图/树算法的 BFS/DFS 辅助容器）
 * - 辅助数组渲染（计数排序的计数数组、输出数组等）
 * - 瞬态变量注解衰减（delta / pulse 只在本步显示）
 */

import type { AnimationScript, TeachingState } from '@/types/animation'
import type { AlgorithmEvent } from './eventTypes'
import type { SceneEntity, SceneLabel, SceneState } from './types'

// ── Constants ──

const MIN_AUX_CELL_W = 56
const MAX_AUX_CELL_W = 170
const AUX_CELL_GAP = 8

const QUEUE_W = 44
const QUEUE_GAP = 8
const QUEUE_PITCH = QUEUE_W + QUEUE_GAP
const QUEUE_MIN_SLOTS = 6
const QUEUE_START_Y = 550

const STACK_CELL_GAP = 44
const STACK_CX = 840
const STACK_BOTTOM_Y = 360

// ── Public API ──

export interface AuxiliaryRenderContext {
  scene: SceneState
  script: AnimationScript
  currentStep: number
  replayLimit: number
  relayout: (scene: SceneState, layout: 'graph' | 'tree' | 'linked_list', scope?: string[]) => SceneState
}

/**
 * 渲染辅助数据结构（Queue/Stack）+ 辅助数组 + 变量衰减。
 * 从 deriveSceneState 主循环结束后调用。
 */
export function renderAuxiliaryStructures(ctx: AuxiliaryRenderContext): SceneState {
  let { scene } = ctx
  const { script, currentStep, replayLimit } = ctx

  const activeStepIdx = currentStep > 0 ? currentStep - 1 : 0
  const activeStep = script.steps[activeStepIdx]
  const teachingState = activeStep?.teachingState

  const isBfsOrTopo = script.algorithm === 'bfs_graph' || script.algorithm === 'topological_sort' || script.algorithm.includes('bfs') || script.algorithm.includes('topological')
  const isDfs = script.algorithm === 'dfs_graph' || script.algorithm.includes('dfs')

  if (teachingState?.graph || teachingState?.queue || teachingState?.stack || isBfsOrTopo || isDfs) {
    scene = renderQueueStack(scene, script, teachingState, isBfsOrTopo, isDfs, replayLimit, ctx.relayout)
  }

  // ── Render auxiliary arrays from teachingState (generic) ──
  scene = renderAuxiliaryArrays(scene, teachingState)

  // ── Decay transient variable annotations (delta / pulse) ──
  scene = decayVariableAnnotations(scene, activeStep?.events)

  return scene
}

// ── Queue / Stack ──

function renderQueueStack(
  scene: SceneState,
  script: AnimationScript,
  teachingState: TeachingState | undefined,
  isBfsOrTopo: boolean,
  isDfs: boolean,
  replayLimit: number,
  relayout: AuxiliaryRenderContext['relayout'],
): SceneState {
  let queue = stringifyAuxItems(teachingState?.queue) ?? teachingState?.graph?.queue
  let stack = stringifyAuxItems(teachingState?.stack) ?? teachingState?.graph?.stack

  // Fallback: Reconstruct queue state from event history
  if (!queue && isBfsOrTopo) {
    queue = reconstructFromEvents(script, replayLimit, 'queue')
  }

  // Fallback: Reconstruct stack state from event history
  if (!stack && isDfs) {
    stack = reconstructFromEvents(script, replayLimit, 'stack')
  }

  // Clear any existing entities with queue_ or stack_ prefix to avoid duplicates
  scene = clearPrefixedEntities(scene, ['queue_', 'stack_'], ['queue_label', 'stack_label'])

  const getNodeLabel = buildNodeLabelResolver(scene, script)

  // 1. Process Queue
  if (queue) {
    scene = renderQueueCells(scene, queue, getNodeLabel)
  }

  // 2. Process Stack
  if (stack) {
    scene = renderStackCells(scene, stack, getNodeLabel)
  }

  // Trigger relayout to adjust graph/tree node centers dynamically
  scene = relayout(scene, script.initialState.type === 'tree' ? 'tree' : 'graph')

  return scene
}

function reconstructFromEvents(script: AnimationScript, replayLimit: number, _type: 'queue' | 'stack'): string[] {
  let reconstructed: string[] = []
  for (let i = 0; i < replayLimit; i++) {
    const events = script.steps[i].events ?? []
    for (const event of events) {
      if (event.type === 'graph.enqueue') {
        if (!reconstructed.includes(event.nodeId)) {
          reconstructed.push(event.nodeId)
        }
      } else if (event.type === 'graph.dequeue') {
        reconstructed = reconstructed.filter(id => id !== event.nodeId)
      }
    }
  }
  return reconstructed
}

function renderQueueCells(scene: SceneState, queue: string[], getNodeLabel: (id: string) => string | number): SceneState {
  const slotCount = Math.max(queue.length, QUEUE_MIN_SLOTS)
  const startX = 500 - ((slotCount - 1) * QUEUE_PITCH) / 2
  const frontIndex = queue.length > 0 ? 0 : -1
  const rearIndex = queue.length > 0 ? queue.length - 1 : -1

  for (let index = 0; index < slotCount; index++) {
    const cellId = `queue_${index}`
    const occupied = index < queue.length
    const value = occupied ? getNodeLabel(queue[index]) : ''
    const meta = index === 0 ? { queueFront: frontIndex, queueRear: rearIndex } : undefined
    scene = {
      ...scene,
      entities: {
        ...scene.entities,
        [cellId]: {
          id: cellId,
          type: 'cell',
          position: { x: startX + index * QUEUE_PITCH, y: QUEUE_START_Y },
          size: { width: QUEUE_W, height: QUEUE_W },
          value,
          col: index,
          ...(meta ? { meta } : {}),
          state: occupied
            ? { role: 'inserted', color: 'primary', pulse: index === rearIndex }
            : { role: 'empty_placeholder', color: 'muted' },
        },
      },
    }
  }
  return scene
}

function renderStackCells(scene: SceneState, stack: string[], getNodeLabel: (id: string) => string | number): SceneState {
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
            position: { x: STACK_CX, y: STACK_BOTTOM_Y - index * STACK_CELL_GAP },
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
    const cellId = 'stack_0'
    scene = {
      ...scene,
      entities: {
        ...scene.entities,
        [cellId]: {
          id: cellId,
          type: 'cell',
          position: { x: STACK_CX, y: STACK_BOTTOM_Y },
          size: { width: 44, height: 44 },
          value: '',
          col: 0,
          state: { role: 'empty_placeholder', color: 'muted' },
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
        position: { x: STACK_CX, y: STACK_BOTTOM_Y - 5 * STACK_CELL_GAP - 10 },
      },
    },
  }

  return scene
}

// ── Auxiliary Arrays ──

function renderAuxiliaryArrays(scene: SceneState, teachingState: TeachingState | undefined): SceneState {
  if (!teachingState?.auxiliaryArrays || teachingState.auxiliaryArrays.length === 0) return scene

  // Find the lowest existing cell Y of the main visualization
  let maxY = 200
  for (const [id, entity] of Object.entries(scene.entities)) {
    if (id.startsWith('aux_') || id.startsWith('queue_') || id.startsWith('stack_')) continue
    if ('position' in entity && entity.position) {
      const bottom = entity.position.y + ('size' in entity && entity.size ? entity.size.height : 44)
      if (bottom > maxY) maxY = bottom
    }
  }
  for (const [id, label] of Object.entries(scene.labels)) {
    if (id.startsWith('aux_label_') || id === 'queue_label' || id === 'stack_label') continue
    if (label.position.y > maxY) maxY = label.position.y
  }

  const CELL_H = 38
  const LABEL_H = 26
  const ARRAY_GAP = 84

  const auxArrays = teachingState.auxiliaryArrays

  // Clear previous auxiliary array entities
  scene = clearPrefixedEntities(scene, ['aux_'], ['aux_label_'])

  // 主数组(arr_*)的左边缘对齐
  let mainMinX = Infinity
  for (const [id, e] of Object.entries(scene.entities)) {
    if (!/^arr_\d+$/.test(id)) continue
    if ('position' in e && e.position) {
      const w = ('size' in e && e.size ? e.size.width : 44)
      mainMinX = Math.min(mainMinX, e.position.x - w / 2)
    }
  }
  const rowLeftX = Number.isFinite(mainMinX) ? mainMinX : 140

  for (let ai = 0; ai < auxArrays.length; ai++) {
    const arr = auxArrays[ai]
    const startY = maxY + 60 + ai * ARRAY_GAP
    const count = arr.data.length
    const cellWidths = arr.data.map(estimateAuxiliaryCellWidth)
    const totalWidth = cellWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, count - 1) * AUX_CELL_GAP
    const startX = rowLeftX

    // Label
    scene = {
      ...scene,
      labels: {
        ...scene.labels,
        [`aux_label_${arr.id}`]: {
          id: `aux_label_${arr.id}`,
          type: 'label',
          text: arr.label,
          position: { x: startX + totalWidth / 2, y: startY - LABEL_H },
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

// ── Variable Annotation Decay ──

function decayVariableAnnotations(scene: SceneState, events: AlgorithmEvent[] | undefined): SceneState {
  const touched = new Set<string>()
  for (const ev of events ?? []) {
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

  return changed ? { ...scene, entities: nextEntities } : scene
}

// ── Shared Utilities ──

function clearPrefixedEntities(
  scene: SceneState,
  entityPrefixes: string[],
  labelIds: string[],
): SceneState {
  let filteredEntities: Record<string, SceneEntity> = {}
  let entitiesChanged = false
  for (const [key, val] of Object.entries(scene.entities)) {
    if (entityPrefixes.some(p => key.startsWith(p))) {
      entitiesChanged = true
    } else {
      filteredEntities[key] = val
    }
  }

  let filteredLabels: Record<string, SceneLabel> = {}
  let labelsChanged = false
  for (const [key, val] of Object.entries(scene.labels)) {
    if (labelIds.includes(key) || labelIds.some(p => key.startsWith(p))) {
      labelsChanged = true
    } else {
      filteredLabels[key] = val
    }
  }

  if (entitiesChanged || labelsChanged) {
    scene = {
      ...scene,
      entities: entitiesChanged ? filteredEntities : scene.entities,
      labels: labelsChanged ? filteredLabels : scene.labels,
    }
  }
  return scene
}

function buildNodeLabelResolver(scene: SceneState, script: AnimationScript): (nodeId: string) => string | number {
  return (nodeId: string) => {
    const ent = scene.entities[nodeId]
    if (ent && 'label' in ent && ent.label) return ent.label as string
    const initNode = script.initialState.nodes?.find(n => n.id === nodeId)
    if (initNode && initNode.label) return initNode.label
    const treeNode = script.initialState.treeNodes?.find(n => String(n.id) === nodeId)
    if (treeNode) return treeNode.value
    return nodeId
  }
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
