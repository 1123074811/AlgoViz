import type { AnimationScript, InitialState, TeachingState } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'
import type { VisualState } from '@/hooks/useAnimationEngine'

export interface DataDisplayItem {
  label: string
  value: string
}

export interface OutputDisplay {
  status: 'idle' | 'running' | 'ready' | 'missing'
  label: string
  value: string
  source: 'script' | 'array' | 'matrix' | 'variable' | 'event' | 'none'
}

const RESULT_VARIABLE_NAMES = [
  'result',
  'ans',
  'answer',
  'ret',
  'return',
  'found',
  'index',
  'idx',
  'count',
  'cnt',
  'gcd',
  'max',
  'min',
  'sum',
  'length',
  'len',
  'res',
]

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function isResultLikeName(name: string): boolean {
  const normalized = normalizeName(name)
  return RESULT_VARIABLE_NAMES.some(candidate => normalizeName(candidate) === normalized)
}

export function formatDisplayValue(value: unknown): string {
  if (value === undefined) return '未声明'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.every(item => !Array.isArray(item) && (typeof item !== 'object' || item === null))) {
      return `[${value.map(formatDisplayValue).join(', ')}]`
    }
    return JSON.stringify(value)
  }
  return JSON.stringify(value)
}

function summarizeMatrix(matrix: InitialState['matrix']): string | null {
  if (!matrix || matrix.length === 0) return null
  const cols = matrix[0]?.length ?? 0
  return `${matrix.length} x ${cols} 矩阵`
}

export function summarizeInitialState(script: AnimationScript | null | undefined): DataDisplayItem[] {
  if (!script) return []

  const initial = script.initialState
  const items: DataDisplayItem[] = [
    { label: '类型', value: initial.type },
  ]

  if (initial.data.length > 0) {
    items.push({ label: '数据', value: formatDisplayValue(initial.data) })
  }

  const matrixSummary = summarizeMatrix(initial.matrix)
  if (matrixSummary) {
    items.push({ label: '矩阵', value: matrixSummary })
  }

  if (initial.labels?.length) {
    items.push({ label: '标签', value: formatDisplayValue(initial.labels) })
  }

  if (initial.nodes?.length) {
    items.push({ label: '节点', value: `${initial.nodes.length} 个` })
  }

  if (initial.edges?.length) {
    items.push({ label: '边', value: `${initial.edges.length} 条` })
  }

  if (initial.root !== undefined) {
    items.push({ label: '根节点', value: formatDisplayValue(initial.root) })
  }

  if (initial.treeNodes?.length) {
    items.push({ label: '树节点', value: `${initial.treeNodes.length} 个` })
  } else if (initial.children) {
    items.push({ label: '树节点', value: `${Object.keys(initial.children).length} 个` })
  }

  if (items.length === 1 && initial.data.length === 0) {
    items.push({ label: '数据', value: '空结构' })
  }

  return items
}

function extractVariableResult(teachingState?: TeachingState): DataDisplayItem | null {
  if (!teachingState?.variables) return null

  for (const [name, value] of Object.entries(teachingState.variables)) {
    if (isResultLikeName(name)) {
      return { label: name, value: formatDisplayValue(value) }
    }
  }

  return null
}

function extractEventResult(script: AnimationScript): DataDisplayItem | null {
  const variables = new Map<string, string | number>()

  for (const step of script.steps) {
    for (const event of step.events ?? []) {
      collectEventVariable(event, variables)
    }
  }

  for (const [name, value] of variables) {
    if (isResultLikeName(name)) {
      return { label: name, value: formatDisplayValue(value) }
    }
  }

  return null
}

function collectEventVariable(event: AlgorithmEvent, variables: Map<string, string | number>): void {
  if (event.type === 'math.init') {
    for (const variable of event.vars) {
      variables.set(variable.name, variable.value)
    }
    return
  }

  if (event.type === 'math.set') {
    variables.set(event.name, event.value)
  }
}

function shouldUseFinalArray(script: AnimationScript, visualState?: Pick<VisualState, 'arrayData'>): boolean {
  if (!visualState?.arrayData.length) return false
  const algorithm = script.algorithm.toLowerCase()
  const module = script.presentation?.module
  return (
    module === 'array' ||
    script.initialState.type === 'array' ||
    algorithm.includes('sort') ||
    algorithm.includes('array')
  )
}

function finalMatrixValue(script: AnimationScript, visualState?: Pick<VisualState, 'matrix'>): string | null {
  const matrix = visualState?.matrix ?? script.initialState.matrix
  if (!matrix || matrix.length === 0) return null

  const algorithm = script.algorithm.toLowerCase()
  const shouldExposeMatrix =
    script.initialState.type === 'matrix' ||
    script.presentation?.module === 'matrix' ||
    algorithm.includes('dp') ||
    algorithm.includes('knapsack') ||
    algorithm.includes('distance') ||
    algorithm.includes('lcs')

  return shouldExposeMatrix ? formatDisplayValue(matrix) : null
}

export function inferOutputDisplay(
  script: AnimationScript | null | undefined,
  visualState: Pick<VisualState, 'arrayData' | 'matrix' | 'teachingState'> | undefined,
  currentStep: number,
  totalSteps: number,
): OutputDisplay {
  if (!script) {
    return { status: 'idle', label: '输出结果', value: '等待生成动画', source: 'none' }
  }

  const finished = totalSteps === 0 || currentStep >= totalSteps
  if (!finished) {
    return { status: 'running', label: '输出结果', value: `运行中 ${currentStep}/${totalSteps}`, source: 'none' }
  }

  if (script.result !== undefined) {
    return { status: 'ready', label: '输出结果', value: formatDisplayValue(script.result), source: 'script' }
  }

  const liveVariable = extractVariableResult(visualState?.teachingState)
  if (liveVariable) {
    return { status: 'ready', label: liveVariable.label, value: liveVariable.value, source: 'variable' }
  }

  const eventVariable = extractEventResult(script)
  if (eventVariable) {
    return { status: 'ready', label: eventVariable.label, value: eventVariable.value, source: 'event' }
  }

  if (shouldUseFinalArray(script, visualState)) {
    return { status: 'ready', label: '最终数组', value: formatDisplayValue(visualState?.arrayData ?? []), source: 'array' }
  }

  const matrix = finalMatrixValue(script, visualState)
  if (matrix) {
    return { status: 'ready', label: '最终状态', value: matrix, source: 'matrix' }
  }

  return { status: 'missing', label: '输出结果', value: '未声明输出', source: 'none' }
}
