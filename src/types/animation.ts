/** AnimationScript — the structured JSON format returned by AI or presets */

export type RendererType = 'array' | 'graph' | 'tree' | 'matrix'

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

export interface InitialState {
  type: RendererType
  data: number[]
  labels?: string[]
  // For graph renderer
  nodes?: { id: string; label?: string; x?: number; y?: number }[]
  edges?: { source: string; target: string; weight?: number }[]
  // For tree renderer
  root?: number
  children?: Record<number, number[]>
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
  stats: StepStats
}

export interface AnimationScript {
  algorithm: string
  complexity: Complexity
  initialState: InitialState
  steps: AnimationStep[]
}
