import type { AnimationScript, AnimationStep, ActionColor, RendererType } from '@/types/animation'
import type { AIValidationIssue, AIErrorSeverity } from './errors'

const VALID_ACTION_TYPES = new Set([
  'highlight', 'swap', 'compare', 'move', 'insert', 'delete', 'mark', 'annotate', 'edge',
])
const VALID_COLORS = new Set<ActionColor>(['primary', 'success', 'warning', 'danger', 'muted'])
const VALID_RENDERER_TYPES: Set<RendererType> = new Set(['array', 'graph', 'tree', 'matrix', 'linked_list'])

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

function validateSteps(steps: unknown[], rendererType?: string): AIValidationIssue[] {
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

  return { algorithm, complexity, initialState, steps }
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

function normalizeSteps(rawSteps: unknown[] | undefined, rendererType: RendererType): AnimationStep[] {
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

  return {
    stepId, codeLine, description: { zh, en },
    action: { type: actionType, targets, color, from: typeof action.from === 'number' ? action.from : undefined, to: typeof action.to === 'number' ? action.to : undefined, value },
    stats: { comparisons, swaps, accesses },
    ...(teachingState && { teachingState }),
  }
}
