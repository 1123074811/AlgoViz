import type {
  ActionColor,
  AnimationScript,
  AnimationStep,
  InitialState,
  RendererType,
} from '@/types/animation'
import { applyCommands } from '@/scene/SceneEngine'
import { createEmptyScene, type SceneState } from '@/scene/types'
import { isAlgorithmEvent, type AlgorithmEvent } from '@/scene/eventTypes'
import { compileEvent } from '@/scene/eventCompiler'

const TRACE_VERSION = 1
const MAX_TRACE_STEPS = 5000
const MAX_EVENTS_PER_STEP = 100
const RENDERER_TYPES = new Set<RendererType>([
  'array', 'graph', 'tree', 'matrix', 'linked_list', 'union_find',
])
const ACTION_TYPES = new Set<AnimationStep['action']['type']>([
  'highlight', 'swap', 'compare', 'move', 'insert', 'delete', 'mark', 'annotate', 'edge',
])
const ACTION_COLORS = new Set<ActionColor>([
  'primary', 'success', 'warning', 'danger', 'muted',
])

export interface RuntimeTraceDiagnostic {
  code: string
  message: string
  traceIndex: number
}

export interface RuntimeTraceCompilation {
  script?: AnimationScript
  diagnostics: RuntimeTraceDiagnostic[]
  seen: number
  scene: SceneState
}

export function createRuntimeTraceCompilation(): RuntimeTraceCompilation {
  return { diagnostics: [], seen: 0, scene: createEmptyScene() }
}

function reject(
  state: RuntimeTraceCompilation,
  code: string,
  message: string,
): RuntimeTraceCompilation {
  return {
    ...state,
    seen: state.seen + 1,
    diagnostics: [...state.diagnostics, { code, message, traceIndex: state.seen }],
  }
}

function normalizeInitialState(value: unknown): InitialState | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (!RENDERER_TYPES.has(raw.type as RendererType) || !Array.isArray(raw.data)) return null
  if (raw.data.some(item => typeof item !== 'number' || !Number.isFinite(item))) return null
  return structuredClone(raw) as unknown as InitialState
}

function normalizeDescription(value: unknown, stepId: number): AnimationStep['description'] {
  if (typeof value === 'string' && value.trim()) {
    const text = value.trim().slice(0, 500)
    return { zh: text, en: text }
  }
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>
    const zh = typeof raw.zh === 'string' && raw.zh.trim() ? raw.zh.trim().slice(0, 500) : ''
    const en = typeof raw.en === 'string' && raw.en.trim() ? raw.en.trim().slice(0, 500) : zh
    if (zh || en) return { zh: zh || en, en: en || zh }
  }
  return { zh: `步骤 ${stepId}`, en: `Step ${stepId}` }
}

function defaultAction(events: AlgorithmEvent[]): AnimationStep['action'] {
  const first = events[0]
  if (first?.type === 'array.swap') {
    return { type: 'swap', targets: [...first.indices], color: 'warning' }
  }
  if (first?.type === 'array.compare') {
    return { type: 'compare', targets: [...first.indices], color: 'primary' }
  }
  if (first?.type === 'array.mark_sorted') {
    return { type: 'mark', targets: [...first.indices], color: 'success' }
  }
  return { type: 'highlight', targets: [], color: 'primary' }
}

function normalizeAction(
  value: unknown,
  events: AlgorithmEvent[],
): AnimationStep['action'] | null {
  if (value === undefined) return defaultAction(events)
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (!ACTION_TYPES.has(raw.type as AnimationStep['action']['type'])) return null
  if (!Array.isArray(raw.targets) || raw.targets.some(target => !Number.isInteger(target))) return null
  const color = raw.color === undefined ? 'primary' : raw.color
  if (!ACTION_COLORS.has(color as ActionColor)) return null
  return {
    type: raw.type as AnimationStep['action']['type'],
    targets: [...raw.targets] as number[],
    color: color as ActionColor,
    ...(typeof raw.from === 'number' && { from: raw.from }),
    ...(typeof raw.to === 'number' && { to: raw.to }),
    ...((typeof raw.value === 'number' || typeof raw.value === 'string') && { value: raw.value }),
  }
}

function normalizeStats(
  value: unknown,
  previous: AnimationStep['stats'],
): AnimationStep['stats'] | null {
  if (value === undefined) return { ...previous }
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const comparisons = raw.comparisons ?? previous.comparisons
  const swaps = raw.swaps ?? previous.swaps
  const accesses = raw.accesses ?? previous.accesses
  if (
    typeof comparisons !== 'number'
    || typeof swaps !== 'number'
    || typeof accesses !== 'number'
    || !Number.isFinite(comparisons)
    || !Number.isFinite(swaps)
    || !Number.isFinite(accesses)
    || comparisons < previous.comparisons
    || swaps < previous.swaps
    || accesses < previous.accesses
  ) {
    return null
  }
  return { comparisons, swaps, accesses }
}

export function reduceRuntimeTrace(
  state: RuntimeTraceCompilation,
  value: unknown,
  algorithm: string,
): RuntimeTraceCompilation {
  if (!value || typeof value !== 'object') {
    return reject(state, 'E_TRACE_SHAPE', 'trace 必须是对象')
  }
  const raw = value as Record<string, unknown>
  if (raw.version !== TRACE_VERSION) {
    return reject(state, 'E_TRACE_VERSION', `trace.version 必须为 ${TRACE_VERSION}`)
  }

  if (raw.kind === 'init') {
    if (state.script) return reject(state, 'E_TRACE_DUP_INIT', 'trace init 只能发送一次')
    const initialState = normalizeInitialState(raw.initialState)
    if (!initialState) {
      return reject(state, 'E_TRACE_INITIAL_STATE', 'init.initialState 必须包含合法 type 和有限数值 data')
    }
    const presentation = raw.presentation && typeof raw.presentation === 'object'
      ? structuredClone(raw.presentation) as AnimationScript['presentation']
      : { engine: 'scene' as const }
    const complexity = raw.complexity && typeof raw.complexity === 'object'
      ? structuredClone(raw.complexity) as AnimationScript['complexity']
      : {
          time: { best: 'O(?)', average: 'O(?)', worst: 'O(?)' },
          space: 'O(?)',
        }
    const script: AnimationScript = {
      algorithm,
      complexity,
      initialState,
      presentation: { engine: 'scene', ...presentation },
      steps: [],
    }
    return {
      ...state,
      script,
      seen: state.seen + 1,
      scene: createEmptyScene(),
    }
  }

  if (raw.kind !== 'step') {
    return reject(state, 'E_TRACE_KIND', 'trace.kind 必须是 init 或 step')
  }
  if (!state.script) {
    return reject(state, 'E_TRACE_INIT_REQUIRED', '发送 step 前必须先发送 init')
  }
  if (state.script.steps.length >= MAX_TRACE_STEPS) {
    return reject(state, 'E_TRACE_LIMIT', `trace step 不能超过 ${MAX_TRACE_STEPS} 步`)
  }
  if (
    !Array.isArray(raw.events)
    || raw.events.length === 0
    || raw.events.length > MAX_EVENTS_PER_STEP
  ) {
    return reject(state, 'E_TRACE_EVENTS', `step.events 必须包含 1-${MAX_EVENTS_PER_STEP} 个事件`)
  }
  if (!raw.events.every(isAlgorithmEvent)) {
    return reject(state, 'E_TRACE_EVENT_TYPE', 'step.events 包含 Scene Engine 不支持的事件类型')
  }

  let events: AlgorithmEvent[]
  let action: AnimationStep['action'] | null
  try {
    events = structuredClone(raw.events) as AlgorithmEvent[]
    action = normalizeAction(raw.action, events)
  } catch {
    return reject(state, 'E_TRACE_EVENT_SHAPE', 'step.events 字段格式无效')
  }
  if (!action) return reject(state, 'E_TRACE_ACTION', 'step.action 格式无效')
  const previousStats = state.script.steps[state.script.steps.length - 1]?.stats
    ?? { comparisons: 0, swaps: 0, accesses: 0 }
  const stats = normalizeStats(raw.stats, previousStats)
  if (!stats) return reject(state, 'E_TRACE_STATS', 'step.stats 必须是单调不减的非负有限数值')

  const stepId = state.script.steps.length + 1
  const step: AnimationStep = {
    stepId,
    codeLine: typeof raw.codeLine === 'number' && raw.codeLine >= 0 ? Math.floor(raw.codeLine) : 0,
    description: normalizeDescription(raw.description, stepId),
    action,
    events,
    stats,
    ...(raw.phase && typeof raw.phase === 'object'
      ? { phase: structuredClone(raw.phase) as AnimationStep['phase'] }
      : {}),
  }
  const script = { ...state.script, steps: [...state.script.steps, step] }

  try {
    let scene = structuredClone(state.scene)
    for (const event of events) {
      scene = applyCommands(scene, compileEvent(event, {
        scene,
        stepIndex: stepId - 1,
        script,
      }))
    }
    return { ...state, script, scene, seen: state.seen + 1 }
  } catch (error) {
    return reject(
      state,
      'E_TRACE_COMPILE',
      `trace 无法编译为场景: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
