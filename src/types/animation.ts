/** AnimationScript - the structured JSON format returned by AI or presets */

import type { AlgorithmEvent, PresentationConfig } from '@/scene'

export type RendererType = 'array' | 'graph' | 'tree' | 'matrix' | 'linked_list' | 'union_find'

export type ActionType = 'highlight' | 'swap' | 'compare' | 'move' | 'insert' | 'delete' | 'mark' | 'annotate' | 'edge'

export type ActionColor = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

export interface Complexity {
  time: {
    best: string
    average: string
    worst: string
  }
  space: string
}

// ─── Phase 2 teaching state types ────────────────────────────────────────

export type VisualRole =
  | 'current'
  | 'compare'
  | 'swap'
  | 'sorted'
  | 'unsorted'
  | 'pivot'
  | 'min'
  | 'key'
  | 'visited'
  | 'queued'
  | 'stacked'
  | 'relaxed'
  | 'candidate'
  | 'selected'
  | 'discarded'
  | 'path'
  | 'root'
  | 'parent'
  | 'child'
  | 'rotating'
  | 'balanced'
  | 'conflict'

export interface VisualAnnotation {
  id: string
  label: string
  value?: string | number
  target?: number | string
  color?: ActionColor
}

export interface RangeState {
  id: string
  label: string
  start: number
  end: number
  role: VisualRole
  color?: ActionColor
}

export interface AuxiliaryArrayState {
  id: string
  label: string
  data: Array<number | string>
  activeIndices?: number[]
  colorMap?: Record<number, ActionColor>
}

export interface GraphNodeState {
  id: string
  role: VisualRole
  color?: ActionColor
  distance?: number | string
  predecessor?: string | null
  metadata?: Record<string, string | number | boolean | null>
}

export interface GraphEdgeState {
  id?: string
  source: string
  target: string
  role: VisualRole
  color?: ActionColor
  weight?: number
  directed?: boolean
  metadata?: Record<string, string | number | boolean | null>
}

export interface TreeNodeState {
  id: string | number
  role: VisualRole
  color?: ActionColor
  height?: number
  balanceFactor?: number
  rbColor?: 'red' | 'black'
  metadata?: Record<string, string | number | boolean | null>
}

export interface TreeInitialNode {
  id: string | number
  value: string | number
  label?: string
  x?: number
  y?: number
  metadata?: Record<string, string | number | boolean | null>
}

export interface TeachingState {
  variables?: Record<string, string | number | boolean | null>
  queue?: Array<string | number>
  stack?: Array<string | number>
  ranges?: RangeState[]
  auxiliaryArrays?: AuxiliaryArrayState[]
  graph?: {
    nodeStates?: GraphNodeState[]
    edgeStates?: GraphEdgeState[]
    queue?: string[]
    stack?: string[]
    distances?: Record<string, number | string>
    predecessors?: Record<string, string | null>
    output?: string[]
    sets?: Record<string, string[]>
  }
  tree?: {
    nodeStates?: TreeNodeState[]
    edgeStates?: GraphEdgeState[]
    traversalPath?: Array<string | number>
    rotation?: {
      type: 'left' | 'right' | 'left-right' | 'right-left'
      pivot: string | number
      child?: string | number
    }
  }
  annotations?: VisualAnnotation[]
}

// ─── Core animation types ─────────────────────────────────────────────────

export interface InitialState {
  type: RendererType
  data: number[]
  matrix?: number[][]
  labels?: string[]
  // For graph renderer
  nodes?: { id: string; label?: string; x?: number; y?: number }[]
  edges?: { source: string; target: string; weight?: number }[]
  // For tree renderer
  root?: number | string
  children?: Record<string, Array<string | number>>
  treeNodes?: TreeInitialNode[]
}

export interface StepDescription {
  zh: string
  en: string
}

export interface StepAction {
  type: ActionType
  targets: number[]
  color: ActionColor
  from?: number
  to?: number
  value?: number | string
}

export interface StepStats {
  comparisons: number
  swaps: number
  accesses: number
}

export interface AnimationStep {
  stepId: number
  codeLine: number
  description: StepDescription
  action: StepAction
  events?: AlgorithmEvent[]
  stats: StepStats
  teachingState?: TeachingState
  /** 阶段标记：该步开启算法的一个新阶段，UI 据此分段展示长动画。 */
  phase?: { zh: string; en: string }
}

export interface AnimationScript {
  algorithm: string
  complexity: Complexity
  initialState: InitialState
  result?: number | string | boolean | Array<number | string | boolean>
  /** AI 生成动画的语义一致性校验结果(见 src/ai/verify.ts)。内置生成器无此字段。 */
  verification?: {
    status: 'pass' | 'fail' | 'skipped'
    source?: 'expect' | 'js-exec' | 'py-exec'
    expected?: string
    actual?: string
    message?: string
    /** 本可真实执行(JS/Python)但执行失败,降级到 @expect 自证——校验强度被削弱。 */
    degraded?: boolean
  }
  /** 执行期对 AI 生成器代码的修补记录(如把未声明变量按 0 注入的变量名),
   *  用于 UI 降低可信度提示——动画建立在被修补的代码上,可能不准确。内置预设无此字段。 */
  generatorWarnings?: string[]
  presentation?: PresentationConfig
  steps: AnimationStep[]
}
