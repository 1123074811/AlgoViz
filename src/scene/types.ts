import type { ActionColor } from '@/types/animation'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface SceneCamera {
  x: number
  y: number
  zoom: number
}

export interface SceneState {
  entities: Record<string, SceneEntity>
  edges: Record<string, SceneEdge>
  pointers: Record<string, ScenePointer>
  labels: Record<string, SceneLabel>
  groups: Record<string, SceneGroup>
  camera?: SceneCamera
  selectedIds?: string[]
  notes?: string[]
}

export type SceneEntity = SceneNode | SceneCell | SceneLabel | SceneGroup | ScenePointer

export type SceneEntityRole =
  | 'idle'
  | 'active'
  | 'visited'
  | 'comparing'
  | 'swapping'
  | 'inserted'
  | 'deleted'
  | 'conflict'
  | 'safe'
  | 'sorted'
  | 'candidate'
  | 'current'
  | 'empty_placeholder'
  | 'header'

export interface SceneEntityState {
  role?: SceneEntityRole
  color?: ActionColor
  opacity?: number
  pulse?: boolean
  disabled?: boolean
  badge?: string
  note?: string
}

export type NodeFieldRole = 'data' | 'key' | 'value' | 'index' | 'metadata' | 'pointer_slot' | 'custom'

export interface NodeField {
  id: string
  label?: string
  value?: string | number | boolean | null
  role?: NodeFieldRole
  width?: number
  color?: ActionColor
  state?: SceneEntityState
}

export type NodePortSide = 'top' | 'right' | 'bottom' | 'left' | 'center' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

export type NodePortRole = 'input' | 'output' | 'next' | 'prev' | 'left' | 'right' | 'parent' | 'child' | 'forward' | 'backward' | 'custom'

export interface NodePort {
  id: string
  side: NodePortSide
  role: NodePortRole
  label?: string
  index?: number
  offset?: Point
  visible?: boolean
}

export interface SceneNode {
  id: string
  type: 'node'
  variant: string
  position: Point
  size?: Size
  fields: NodeField[]
  ports: NodePort[]
  state?: SceneEntityState
  meta?: Record<string, unknown>
  group?: string   // 组合场景中所属结构实例的区域 id；缺省按 id 前缀推断
}

export interface SceneCell {
  id: string
  type: 'cell'
  position: Point
  size?: Size
  value?: string | number | boolean | null
  row?: number
  col?: number
  state?: SceneEntityState
  meta?: Record<string, unknown>
  group?: string   // 组合场景中所属结构实例的区域 id；缺省按 id 前缀推断
}

export interface SceneLabel {
  id: string
  type: 'label'
  text: string
  position: Point
  target?: AnchorRef
  state?: SceneEntityState
  group?: string   // 组合场景中所属结构实例的区域 id；缺省按 id 前缀推断
}

export interface SceneGroup {
  id: string
  type: 'group'
  label?: string
  entityIds: string[]
  bounds?: { position: Point; size: Size }
  state?: SceneEntityState
}

export interface AnchorRef {
  entityId: string
  portId?: string
}

export interface EdgeStyle {
  dashed?: boolean
  curved?: boolean
  thickness?: number
  color?: ActionColor
}

export interface SceneEdge {
  id: string
  type: 'edge'
  from: AnchorRef
  to: AnchorRef
  directed?: boolean
  label?: string
  variant?: string
  state?: SceneEntityState
  style?: EdgeStyle
  meta?: Record<string, unknown>
}

export interface ScenePointer {
  id: string
  type: 'pointer'
  label: string
  target: AnchorRef | null
  position?: Point
  variant?: string
  state?: SceneEntityState
}

export interface PresentationConfig {
  engine?: 'classic' | 'scene'
  module?: string
  variant?: string
  layout?: string
}

export function createEmptyScene(): SceneState {
  return { entities: {}, edges: {}, pointers: {}, labels: {}, groups: {}, notes: [] }
}
