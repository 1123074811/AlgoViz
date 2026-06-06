export type GridCoord = [row: number, col: number]

export type GridCellRole =
  | 'default'
  | 'active'
  | 'visited'
  | 'frontier'
  | 'path'
  | 'wall'
  | 'start'
  | 'target'
  | 'weighted'
  | 'warning'
  | 'error'

export interface GridCellModel {
  row: number
  col: number
  value?: unknown
  state: GridCellRole
  color?: string
  wall?: boolean
  weight?: number
  visited?: boolean
  visitOrder?: number
}

export interface GridArrowModel {
  id: string
  from: GridCoord
  to: GridCoord
  label?: string
}

export interface GridModel {
  gridId: string
  title?: string
  rows: number
  cols: number
  cellSize?: number
  cells: Record<string, GridCellModel>
  frontier: GridCoord[]
  path: GridCoord[]
  arrows: GridArrowModel[]
}

export type GridCollection = Record<string, GridModel>

export type GridEvent =
  | {
      type: 'grid.create'
      gridId?: string
      title?: string
      rows: number
      cols: number
      values?: unknown[][]
      cellSize?: number
    }
  | {
      type: 'grid.set_cell'
      gridId?: string
      row: number
      col: number
      value?: unknown
      state?: GridCellRole
      color?: string
    }
  | { type: 'grid.visit'; gridId?: string; row: number; col: number; order?: number }
  | { type: 'grid.frontier'; gridId?: string; cells: GridCoord[] }
  | { type: 'grid.path'; gridId?: string; cells: GridCoord[]; color?: string }
  | { type: 'grid.wall'; gridId?: string; row: number; col: number; enabled: boolean }
  | { type: 'grid.weight'; gridId?: string; row: number; col: number; weight: number }
  | { type: 'grid.arrow'; gridId?: string; from: GridCoord; to: GridCoord; label?: string }

export interface GridSceneCommand {
  type: 'grid.model'
  gridId: string
  model: GridModel
  patch?: Partial<GridModel>
}
