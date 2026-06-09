import type { AnimationScript, AnimationStep, ActionColor, RendererType } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'
import type { AIValidationIssue, AIErrorSeverity } from './errors'

const VALID_ACTION_TYPES = new Set([
  'highlight', 'swap', 'compare', 'move', 'insert', 'delete', 'mark', 'annotate', 'edge',
])
const VALID_COLORS = new Set<ActionColor>(['primary', 'success', 'warning', 'danger', 'muted'])
const VALID_RENDERER_TYPES: Set<RendererType> = new Set(['array', 'graph', 'tree', 'matrix', 'linked_list'])
const VALID_PRESENTATION_ENGINES = new Set(['classic', 'scene'])
const VALID_EVENT_TYPES = new Set([
  'scene.note', 'scene.highlight', 'scene.clear_highlight', 'scene.link', 'scene.wait',
  'linked_list.create', 'linked_list.visit', 'linked_list.move_pointer', 'linked_list.insert_after', 'linked_list.insert_before', 'linked_list.delete', 'linked_list.reverse_link', 'linked_list.set_head', 'linked_list.set_tail',
  'tree.create', 'tree.visit', 'tree.compare', 'tree.insert', 'tree.delete', 'tree.rotate', 'tree.update_metadata',
  'array.create', 'array.compare', 'array.swap', 'array.move', 'array.set_value', 'array.mark_sorted', 'array.window', 'array.partition',
  'graph.create', 'graph.visit_node', 'graph.visit_edge', 'graph.relax_edge', 'graph.enqueue', 'graph.dequeue',
  'matrix.create', 'matrix.visit_cell', 'matrix.update_cell', 'matrix.mark_path', 'matrix.mark_conflict',
  'n_queens.try_place', 'n_queens.place', 'n_queens.conflict', 'n_queens.backtrack', 'n_queens.solution',
  'pointer.create', 'pointer.move', 'pointer.clear', 'pointer.highlight',
  'stack.create', 'stack.push', 'stack.pop', 'stack.peek',
  'queue.create', 'queue.enqueue', 'queue.dequeue', 'queue.peek_front',
  'deque.create', 'deque.push_front', 'deque.push_back', 'deque.pop_front', 'deque.pop_back', 'deque.peek_front', 'deque.peek_back',
  'string.create', 'string.create_double', 'string.compare', 'string.match', 'string.mismatch', 'string.mark_range', 'string.shift_pattern',
  'set.create', 'set.add', 'set.remove', 'set.contains',
  'map.create', 'map.put', 'map.get', 'map.remove',
  'hashtable.create', 'hashtable.put', 'hashtable.get', 'hashtable.remove', 'hashtable.highlight_bucket',
  'heap.create', 'heap.push', 'heap.pop', 'heap.sift', 'heap.peek',
  'bitset.create', 'bitset.set', 'bitset.highlight',
  'math.init', 'math.set', 'math.highlight', 'math.note',
])

function issue(path: string, code: string, message: string, suggestion?: string, severity: AIErrorSeverity = 'error', recoverable = false): AIValidationIssue {
  return { path, code, message, suggestion, severity, recoverable }
}

export function validateAnimationScript(raw: unknown): AIValidationIssue[] {
  const issues: AIValidationIssue[] = []
  if (!raw || typeof raw !== 'object') {
    issues.push(issue('', 'invalid_root', '根值必须是 JSON 对象'))
    return issues
  }
  const obj = raw as Record<string, unknown>

  // Top-level required
  if (typeof obj.algorithm !== 'string' || !obj.algorithm.trim()) {
    issues.push(issue('algorithm', 'required', 'algorithm 字段是必须的非空字符串'))
  }
  if (!obj.complexity || typeof obj.complexity !== 'object') {
    issues.push(issue('complexity', 'required', 'complexity 字段是必须的对象'))
  } else {
    issues.push(...validateComplexity(obj.complexity as Record<string, unknown>))
  }
  if (!obj.initialState || typeof obj.initialState !== 'object') {
    issues.push(issue('initialState', 'required', 'initialState 字段是必须的对象'))
  } else {
    issues.push(...validateInitialState(obj.initialState as Record<string, unknown>))
  }
  if (!Array.isArray(obj.steps)) {
    issues.push(issue('steps', 'required_array', 'steps 必须是数组'))
  } else if (obj.steps.length === 0) {
    issues.push(issue('steps', 'empty', 'steps 不能为空数组'))
  } else {
    issues.push(...validateSteps(obj.steps as unknown[], (obj.initialState as Record<string, unknown>)?.type as string | undefined))
  }
  if (obj.presentation !== undefined) {
    if (!obj.presentation || typeof obj.presentation !== 'object') {
      issues.push(issue('presentation', 'invalid_type', 'presentation 必须是对象', undefined, 'warning', true))
    } else {
      const presentation = obj.presentation as Record<string, unknown>
      if (presentation.engine !== undefined && !VALID_PRESENTATION_ENGINES.has(String(presentation.engine))) {
        issues.push(issue('presentation.engine', 'invalid_type', 'presentation.engine 必须是 classic 或 scene'))
      }
    }
  }

  return issues
}

function validateComplexity(c: Record<string, unknown>): AIValidationIssue[] {
  const issues: AIValidationIssue[] = []
  if (!c.time || typeof c.time !== 'object') {
    issues.push(issue('complexity.time', 'required', 'complexity.time 不能为空'))
  }
  if (typeof c.space !== 'string') {
    issues.push(issue('complexity.space', 'invalid', 'complexity.space 应为字符串', undefined, 'warning', true))
  }
  return issues
}

function validateInitialState(is: Record<string, unknown>): AIValidationIssue[] {
  const issues: AIValidationIssue[] = []
  const type = String(is.type ?? '')
  if (!type || !VALID_RENDERER_TYPES.has(type as RendererType)) {
    issues.push(issue('initialState.type', `invalid_type:${type}`, `initialState.type 必须是 ${[...VALID_RENDERER_TYPES].join('|')}`))
    return issues
  }

  // Type-specific validation
  if (type === 'graph') {
    const nodes = is.nodes as { id: unknown }[] | undefined
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      issues.push(issue('initialState.nodes', 'required', '图类型必须包含 nodes 数组（至少一个节点）'))
    } else {
      nodes.forEach((n, i) => {
        if (!n || typeof n !== 'object' || typeof (n as Record<string, unknown>).id !== 'string' || !(n as Record<string, unknown>).id) {
          issues.push(issue(`initialState.nodes[${i}].id`, 'invalid_type', `图节点 [${i}] 的 id 必须是非空字符串`))
        }
      })
      // Validate edge references
      const edges = is.edges as { source: string; target: string }[] | undefined
      if (edges && Array.isArray(edges)) {
        const nodeIds = new Set(nodes.map(n => (n as Record<string, string>).id))
        edges.forEach((e, i) => {
          if (!e || typeof e !== 'object') {
            issues.push(issue(`initialState.edges[${i}]`, 'invalid_type', `边 [${i}] 必须是对象`))
            return
          }
          if (typeof e.source !== 'string') {
            issues.push(issue(`initialState.edges[${i}].source`, 'invalid_type', `边 [${i}] 的 source 必须是字符串`))
            return
          }
          if (typeof e.target !== 'string') {
            issues.push(issue(`initialState.edges[${i}].target`, 'invalid_type', `边 [${i}] 的 target 必须是字符串`))
            return
          }
          if (!nodeIds.has(e.source)) {
            issues.push(issue(`initialState.edges[${i}].source`, 'invalid_ref', `边 [${i}] 的 source "${e.source}" 不在 nodes 中`))
          }
          if (!nodeIds.has(e.target)) {
            issues.push(issue(`initialState.edges[${i}].target`, 'invalid_ref', `边 [${i}] 的 target "${e.target}" 不在 nodes 中`))
          }
        })
      }
    }
  }

  if (type === 'tree') {
    if (is.root === undefined) {
      issues.push(issue('initialState.root', 'required', '树类型必须包含 root 字段'))
    }
    if (!is.children || typeof is.children !== 'object') {
      issues.push(issue('initialState.children', 'required', '树类型必须包含 children 对象'))
    }
  }

  if (type === 'matrix') {
    const matrixData = Array.isArray(is.matrix) ? is.matrix : is.data
    if (Array.isArray(matrixData) && matrixData.length > 0 && Array.isArray(matrixData[0])) {
      const cols = (matrixData[0] as unknown[]).length
      ;(matrixData as unknown[]).forEach((row, i) => {
        if (!Array.isArray(row) || row.length !== cols) {
          issues.push(issue(`initialState.${Array.isArray(is.matrix) ? 'matrix' : 'data'}[${i}]`, 'inconsistent', `矩阵第 ${i} 行长度不一致，应为 ${cols} 列`))
        }
      })
    }
  }

  return issues
}

function validateSteps(steps: unknown[], _rendererType?: string): AIValidationIssue[] {
  const issues: AIValidationIssue[] = []
  steps.forEach((s, i) => {
    if (!s || typeof s !== 'object') {
      issues.push(issue(`steps[${i}]`, 'invalid', `步骤 [${i}] 不是有效对象`))
      return
    }
    const step = s as Record<string, unknown>

    // description
    const desc = step.description as Record<string, string> | undefined
    if (!desc || typeof desc.zh !== 'string' || !desc.zh.trim()) {
      issues.push(issue(`steps[${i}].description.zh`, 'required', `步骤 [${i}] 缺少中文描述`, undefined, 'warning', true))
    }

    // action
    const action = step.action as Record<string, unknown> | undefined
    if (!action || typeof action !== 'object') {
      issues.push(issue(`steps[${i}].action`, 'required', `步骤 [${i}] 缺少 action`))
      return
    }
    if (!VALID_ACTION_TYPES.has(String(action.type))) {
      issues.push(issue(`steps[${i}].action.type`, 'invalid_type', `步骤 [${i}] 的 action.type "${String(action.type)}" 无效`, undefined, 'warning', true))
    }
    if (action.targets !== undefined && (!Array.isArray(action.targets) || action.targets.some(t => typeof t !== 'number'))) {
      issues.push(issue(`steps[${i}].action.targets`, 'invalid_type', `步骤 [${i}] 的 targets 必须是数字数组`))
    }

    if (step.events !== undefined) {
      if (!Array.isArray(step.events)) {
        issues.push(issue(`steps[${i}].events`, 'invalid_type', `步骤 [${i}] 的 events 必须是数组`))
      } else {
        step.events.forEach((event, eventIndex) => {
          issues.push(...validateEvent(event, `steps[${i}].events[${eventIndex}]`))
        })
      }
    }

    // stats monotonic check
    if (i > 0) {
      const prev = steps[i - 1] as Record<string, unknown>
      const prevStats = prev?.stats as Record<string, number> | undefined
      const curStats = step.stats as Record<string, number> | undefined
      if (prevStats && curStats) {
        if ((curStats.comparisons ?? 0) < (prevStats.comparisons ?? 0)) {
          issues.push(issue(`steps[${i}].stats.comparisons`, 'non_monotonic', `步骤 [${i}] 的 comparisons 应单调不减`, undefined, 'warning', true))
        }
        if ((curStats.swaps ?? 0) < (prevStats.swaps ?? 0)) {
          issues.push(issue(`steps[${i}].stats.swaps`, 'non_monotonic', `步骤 [${i}] 的 swaps 应单调不减`, undefined, 'warning', true))
        }
      }
    }
  })
  return issues
}

/**
 * Cross-step semantic consistency checks.
 * Catches contradictions like: visiting a deleted node, double-insert without delete,
 * tree rotation on non-existent node, use-after-delete.
 */
export function validateCrossStepConsistency(
  steps: AnimationStep[],
  rendererType: string
): AIValidationIssue[] {
  const issues: AIValidationIssue[] = []

  // Track lifecycle of every entity ID mentioned in events
  const entityLifecycle = new Map<string, { created: number; deleted: number | null }>()

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
              'warning',
              true
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
        }
      }

      // Check for visiting/using deleted entities
      const refs = extractReferencedIds(event, type)
      for (const refId of refs) {
        const lifecycle = entityLifecycle.get(refId)
        if (lifecycle && lifecycle.deleted !== null && lifecycle.deleted < i) {
          issues.push(issue(
            `steps[${i}].events[${ei}]`,
            'use_after_delete',
            `实体 "${refId}" 在第 ${lifecycle.deleted} 步已被删除，第 ${i} 步事件 "${type}" 仍引用它`,
            `删除引用或调整事件顺序`,
            'warning',
            true
          ))
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
              'warning',
              true
            ))
          }
        }
      }
    }
  }

  return issues
}

function extractCreatedIds(event: Record<string, unknown>, type: string): string[] {
  const ids: string[] = []
  if (type === 'linked_list.create' || type === 'graph.create') {
    const nodes = event.nodes as { id: string }[] | undefined
    if (nodes) ids.push(...nodes.map(n => n.id))
  }
  if (type === 'tree.create') {
    const nodes = event.nodes as { id: string }[] | undefined
    if (nodes) ids.push(...nodes.map(n => n.id))
  }
  if (type === 'array.create') {
    const count = event.count as number ?? 0
    for (let j = 0; j < count; j++) ids.push(`arr_${j}`)
  }
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

function extractDeletedId(event: Record<string, unknown>, type: string): string | null {
  if (type === 'linked_list.delete' || type === 'tree.delete') {
    return (event.nodeId as string) ?? null
  }
  return null
}

function extractReferencedIds(event: Record<string, unknown>, _type: string): string[] {
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

/** Normalize and sanitize: fill defaults, preserve Phase 2 fields */
export function normalizeAnimationScript(raw: unknown): AnimationScript | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const algorithm = String(obj.algorithm || 'unknown')
  const complexity = normalizeComplexity(obj.complexity as Record<string, unknown> | undefined)
  const initialState = normalizeInitialState(obj.initialState as Record<string, unknown> | undefined)
  if (!initialState) return null

  const steps = normalizeSteps(obj.steps as unknown[] | undefined, initialState.type)
  if (steps.length === 0) return null

  const presentation = normalizePresentation(obj.presentation as Record<string, unknown> | undefined)
  const result = normalizeResult(obj.result)
  return { algorithm, complexity, initialState, ...(result !== undefined && { result }), ...(presentation && { presentation }), steps }
}

function normalizeResult(value: unknown): AnimationScript['result'] | undefined {
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    const result = value.filter((item): item is number | string | boolean =>
      typeof item === 'number' || typeof item === 'string' || typeof item === 'boolean'
    )
    return result.length > 0 ? result : undefined
  }
  return undefined
}

function normalizePresentation(p?: Record<string, unknown>): AnimationScript['presentation'] | undefined {
  if (!p || typeof p !== 'object') return undefined
  const engine = VALID_PRESENTATION_ENGINES.has(String(p.engine)) ? String(p.engine) as 'classic' | 'scene' : undefined
  const module = typeof p.module === 'string' ? p.module : undefined
  const variant = typeof p.variant === 'string' ? p.variant : undefined
  const layout = typeof p.layout === 'string' ? p.layout : undefined
  if (!engine && !module && !variant && !layout) return undefined
  return { ...(engine && { engine }), ...(module && { module }), ...(variant && { variant }), ...(layout && { layout }) }
}

function normalizeComplexity(c?: Record<string, unknown>): AnimationScript['complexity'] {
  const time = (c?.time ?? {}) as Record<string, string>
  return {
    time: {
      best: time.best || 'O(?)',
      average: time.average || 'O(?)',
      worst: time.worst || 'O(?)',
    },
    space: typeof c?.space === 'string' ? c.space : 'O(?)',
  }
}

function normalizeInitialState(is?: Record<string, unknown>): AnimationScript['initialState'] | null {
  if (!is) return null
  const typeStr = String(is.type ?? 'array')
  const type: RendererType = (VALID_RENDERER_TYPES as Set<string>).has(typeStr) ? typeStr as RendererType : 'array'

  // Preserve data - support number[] or number[][] for matrix
  let data: number[] = []
  let matrix: number[][] | undefined
  if (Array.isArray(is.data)) {
    if (type === 'matrix' && is.data.length > 0 && Array.isArray(is.data[0])) {
      matrix = (is.data as unknown[]).map(row => Array.isArray(row) ? row.map(Number).filter(v => !isNaN(v)) : [])
      data = matrix.flat()
    } else {
      data = (is.data as unknown[]).map(v => typeof v === 'number' ? v : Number(v)).filter(v => !isNaN(v))
    }
  }
  if (type === 'matrix' && Array.isArray(is.matrix)) {
    matrix = (is.matrix as unknown[]).map(row => Array.isArray(row) ? row.map(Number).filter(v => !isNaN(v)) : [])
    data = matrix.flat()
  }
  // For graph/tree, empty data is OK
  if ((type === 'graph' || type === 'tree' || type === 'matrix') && data.length === 0) {
    data = []
  } else if (data.length === 0 && type === 'array') {
    return null
  }

  // Preserve Phase 2 fields
  const nodes = Array.isArray(is.nodes) ? (is.nodes as { id: string; label?: string; x?: number; y?: number }[]).filter(n => n && typeof n.id === 'string') : undefined
  const edges = Array.isArray(is.edges) ? (is.edges as { source: string; target: string; weight?: number }[]) : undefined
  const root = is.root !== undefined ? (is.root as number | string) : undefined
  const children = (is.children && typeof is.children === 'object') ? is.children as Record<string, string[]> : undefined
  const labels = Array.isArray(is.labels) ? is.labels as string[] : undefined
  let treeNodes = Array.isArray(is.treeNodes) ? is.treeNodes as AnimationScript['initialState']['treeNodes'] : undefined
  if (type === 'tree' && !treeNodes && children) {
    const ids = new Set<string>()
    if (root !== undefined) ids.add(String(root))
    Object.entries(children).forEach(([parent, childIds]) => {
      ids.add(String(parent))
      if (Array.isArray(childIds)) {
        childIds.forEach(childId => ids.add(String(childId)))
      }
    })
    treeNodes = [...ids].map(id => {
      const numericValue = Number(id)
      return { id, value: Number.isNaN(numericValue) ? id : numericValue }
    })
  }

  return { type, data, ...(matrix && { matrix }), ...(nodes && { nodes }), ...(edges && { edges }), ...(root !== undefined && { root }), ...(children && { children }), ...(labels && { labels }), ...(treeNodes && { treeNodes }) }
}

function normalizeSteps(rawSteps: unknown[] | undefined, _rendererType: RendererType): AnimationStep[] {
  if (!rawSteps || !Array.isArray(rawSteps)) return []
  return rawSteps
    .map((s, i) => normalizeStep(s, i + 1))
    .filter((s): s is AnimationStep => s !== null)
}

function normalizeStep(raw: unknown, fallbackId: number): AnimationStep | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>

  const stepId = typeof s.stepId === 'number' ? s.stepId : fallbackId
  const codeLine = typeof s.codeLine === 'number' ? Math.max(0, s.codeLine) : 0

  const desc = s.description as Record<string, string> | undefined
  const zh = desc?.zh || `步骤 ${stepId}`
  const en = desc?.en || zh

  const action = s.action as Record<string, unknown> | undefined
  if (!action) return null

  const actionType = VALID_ACTION_TYPES.has(String(action.type)) ? String(action.type) as AnimationStep['action']['type'] : 'highlight'
  const targets: number[] = Array.isArray(action.targets) ? (action.targets as unknown[]).map(Number).filter(n => !isNaN(n)) : []
  const colorStr = String(action.color ?? '')
  const color: ActionColor = (VALID_COLORS as Set<string>).has(colorStr) ? colorStr as ActionColor : 'primary'

  const stats = s.stats as Record<string, number> | undefined
  const comparisons = typeof stats?.comparisons === 'number' ? stats.comparisons : 0
  const swaps = typeof stats?.swaps === 'number' ? stats.swaps : 0
  const accesses = typeof stats?.accesses === 'number' ? stats.accesses : 0
  const value = typeof action.value === 'number' || typeof action.value === 'string' ? action.value : undefined

  const teachingState = (s.teachingState && typeof s.teachingState === 'object') ? s.teachingState as AnimationStep['teachingState'] : undefined
  const events = Array.isArray(s.events) ? normalizeEvents(s.events) : undefined

  return {
    stepId, codeLine, description: { zh, en },
    action: { type: actionType, targets, color, from: typeof action.from === 'number' ? action.from : undefined, to: typeof action.to === 'number' ? action.to : undefined, value },
    stats: { comparisons, swaps, accesses },
    ...(events && { events }),
    ...(teachingState && { teachingState }),
  }
}

function validateEvent(event: unknown, path: string): AIValidationIssue[] {
  const issues: AIValidationIssue[] = []
  if (!event || typeof event !== 'object') {
    issues.push(issue(path, 'invalid_type', 'event 必须是对象'))
    return issues
  }
  const e = event as Record<string, unknown>
  const type = String(e.type ?? '')
  if (!VALID_EVENT_TYPES.has(type)) {
    issues.push(issue(`${path}.type`, 'invalid_type', `event.type "${type}" 不在白名单中`))
    return issues
  }

  if (type === 'linked_list.create') {
    if (!['singly', 'doubly', 'circular'].includes(String(e.variant))) issues.push(issue(`${path}.variant`, 'required', 'linked_list.create 必须包含 variant'))
    if (!Array.isArray(e.nodes) || e.nodes.length === 0) issues.push(issue(`${path}.nodes`, 'required', 'linked_list.create 必须包含非空 nodes'))
  }
  if (type === 'linked_list.insert_after' || type === 'linked_list.insert_before') {
    if (typeof e.targetNodeId !== 'string') issues.push(issue(`${path}.targetNodeId`, 'required', `${type} 必须包含 targetNodeId`))
    if (!e.newNode || typeof e.newNode !== 'object') issues.push(issue(`${path}.newNode`, 'required', `${type} 必须包含 newNode`))
  }
  if (type === 'linked_list.delete' && typeof e.nodeId !== 'string') issues.push(issue(`${path}.nodeId`, 'required', 'linked_list.delete 必须包含 nodeId'))
  if (type === 'linked_list.move_pointer' && typeof e.pointerId !== 'string') issues.push(issue(`${path}.pointerId`, 'required', 'linked_list.move_pointer 必须包含 pointerId'))
  if (type === 'tree.rotate') {
    if (!['left', 'right', 'left-right', 'right-left'].includes(String(e.rotation))) issues.push(issue(`${path}.rotation`, 'required', 'tree.rotate 必须包含合法 rotation'))
    if (typeof e.pivotId !== 'string') issues.push(issue(`${path}.pivotId`, 'required', 'tree.rotate 必须包含 pivotId'))
  }
  if (type === 'array.swap' || type === 'array.compare') {
    if (!Array.isArray(e.indices) || e.indices.length !== 2) issues.push(issue(`${path}.indices`, 'required', `${type} 必须包含长度为 2 的 indices`))
  }
  if (type === 'array.window') {
    if (!Array.isArray(e.indices) || e.indices.some(index => typeof index !== 'number')) issues.push(issue(`${path}.indices`, 'required', 'array.window 必须包含数字 indices 数组'))
  }
  if (type === 'graph.create') {
    if (!Array.isArray(e.nodes) || e.nodes.length === 0) issues.push(issue(`${path}.nodes`, 'required', 'graph.create 必须包含非空 nodes'))
    if (!Array.isArray(e.edges)) issues.push(issue(`${path}.edges`, 'required', 'graph.create 必须包含 edges 数组'))
  }
  if (type === 'graph.visit_node' || type === 'graph.enqueue' || type === 'graph.dequeue') {
    if (typeof e.nodeId !== 'string') issues.push(issue(`${path}.nodeId`, 'required', `${type} 必须包含 nodeId`))
  }
  if (type === 'graph.visit_edge' || type === 'graph.relax_edge') {
    if (typeof e.source !== 'string') issues.push(issue(`${path}.source`, 'required', `${type} 必须包含 source`))
    if (typeof e.target !== 'string') issues.push(issue(`${path}.target`, 'required', `${type} 必须包含 target`))
  }
  if (type.startsWith('n_queens.') && (typeof e.row !== 'number' || typeof e.col !== 'number') && type !== 'n_queens.solution') {
    issues.push(issue(path, 'required', `${type} 必须包含 row 和 col`))
  }
  if (type === 'queue.create' && !Array.isArray(e.values)) {
    issues.push(issue(`${path}.values`, 'required', 'queue.create 必须包含 values 数组'))
  }
  if (type === 'queue.enqueue' && typeof e.value !== 'number' && typeof e.value !== 'string') {
    issues.push(issue(`${path}.value`, 'required', 'queue.enqueue 必须包含 value'))
  }
  return issues
}

function normalizeEvents(events: unknown[]): AlgorithmEvent[] {
  return events.filter((event): event is AlgorithmEvent => {
    if (!event || typeof event !== 'object') return false
    return VALID_EVENT_TYPES.has(String((event as Record<string, unknown>).type ?? ''))
  })
}
