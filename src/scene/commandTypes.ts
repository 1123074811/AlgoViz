import type { AnchorRef, NodeField, NodePort, Point, SceneCell, SceneEdge, SceneEntityState, SceneNode } from './types'

export type SceneCommand =
  | CreateNodeCommand
  | CreateCellCommand
  | RemoveEntityCommand
  | MoveEntityCommand
  | ConnectCommand
  | DisconnectCommand
  | SetStateCommand
  | SetFieldCommand
  | SetFieldsCommand
  | AddPortCommand
  | RemovePortCommand
  | MovePointerCommand
  | RelayoutCommand
  | WaitCommand
  | AddNoteCommand
  | SetCellCommand

export interface CreateNodeCommand {
  type: 'create_node'
  node: SceneNode
  animation?: 'fade' | 'scale' | 'drop' | 'none'
}

export interface CreateCellCommand {
  type: 'create_cell'
  cell: SceneCell
  animation?: 'fade' | 'scale' | 'drop' | 'none'
}

export interface RemoveEntityCommand {
  type: 'remove_entity'
  entityId: string
  animation?: 'fade' | 'shrink' | 'none'
}

export interface MoveEntityCommand {
  type: 'move'
  entityId: string
  to: Point
  duration?: number
  easing?: 'linear' | 'ease' | 'spring'
}

export interface ConnectCommand {
  type: 'connect'
  edge: SceneEdge
  animation?: 'draw' | 'fade' | 'none'
}

export interface DisconnectCommand {
  type: 'disconnect'
  edgeId: string
  animation?: 'fade' | 'cut' | 'none'
}

export interface SetStateCommand {
  type: 'set_state'
  entityId: string
  state: SceneEntityState
  merge?: boolean
}

export interface SetFieldCommand {
  type: 'set_field'
  nodeId: string
  fieldId: string
  field: Partial<NodeField>
  animation?: 'flash' | 'fade' | 'none'
}

export interface SetFieldsCommand {
  type: 'set_fields'
  nodeId: string
  fields: NodeField[]
  animation?: 'morph' | 'fade' | 'none'
}

export interface AddPortCommand {
  type: 'add_port'
  nodeId: string
  port: NodePort
  animation?: 'fade' | 'none'
}

export interface RemovePortCommand {
  type: 'remove_port'
  nodeId: string
  portId: string
  animation?: 'fade' | 'none'
}

export interface MovePointerCommand {
  type: 'move_pointer'
  pointerId: string
  target: AnchorRef | null
  label?: string
  duration?: number
}

export interface RelayoutCommand {
  type: 'relayout'
  layout: 'linked_list' | 'tree' | 'graph' | 'matrix' | 'array'
  scope?: string[]
  duration?: number
}

export interface WaitCommand {
  type: 'wait'
  duration: number
}

export interface AddNoteCommand {
  type: 'add_note'
  text: string
}

export interface SetCellCommand {
  type: 'set_cell'
  cellId: string
  value?: SceneCell['value']
  state?: SceneEntityState
}
