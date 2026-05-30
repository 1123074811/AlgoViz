import type { SceneCommand } from '../commandTypes'
import type { MatrixAlgorithmEvent, NQueensAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { DataUnit, AuxiliaryUnit, VisualDecorator } from '../primitives/DataUnits'

export const matrixCompiler: EventCompiler = {
  supports: (event): event is MatrixAlgorithmEvent | NQueensAlgorithmEvent => event.type.startsWith('matrix.') || event.type.startsWith('n_queens.'),
  compile: (event, context) => compileMatrixEvent(event as MatrixAlgorithmEvent | NQueensAlgorithmEvent, context),
}

function compileMatrixEvent(event: MatrixAlgorithmEvent | NQueensAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'matrix.create':
      return createMatrix(event.rows, event.cols, event.values)
    case 'matrix.visit_cell':
      return [{ type: 'set_state', entityId: cellId(event.row, event.col), state: { role: 'current', color: 'warning', pulse: true }, merge: true }]
    case 'matrix.update_cell':
      return [
        ...dependencyEdges(context, event.row, event.col),
        { type: 'set_cell', cellId: cellId(event.row, event.col), value: event.value, state: { role: 'current', color: 'primary', pulse: true } },
      ]
    case 'matrix.mark_path':
      context.scene.groups.__matrix_dependencies = { id: '__matrix_dependencies', type: 'group', entityIds: event.cells.map((cell) => cellId(cell.row, cell.col)) }
      return [
        ...Object.keys(context.scene.edges).filter((id) => id.startsWith('dep_')).map((edgeId) => ({ type: 'disconnect' as const, edgeId })),
        ...event.cells.map((cell) => ({ type: 'set_state' as const, entityId: cellId(cell.row, cell.col), state: { role: 'candidate' as const, color: 'warning' as const }, merge: true })),
      ]
    case 'matrix.mark_conflict':
      return event.cells.map((cell) => ({ type: 'set_state', entityId: cellId(cell.row, cell.col), state: { role: 'conflict', color: 'danger', pulse: true }, merge: true }))
    case 'n_queens.try_place':
      ensureBoard(context, event.row, event.col)
      return [{ type: 'set_state', entityId: cellId(event.row, event.col), state: { role: 'candidate', color: 'warning', pulse: true }, merge: true }]
    case 'n_queens.place':
      ensureBoard(context, event.row, event.col)
      return [{ type: 'set_cell', cellId: cellId(event.row, event.col), value: VisualDecorator.Symbols.QUEEN, state: { role: 'safe', color: 'success', pulse: true } }]
    case 'n_queens.conflict':
      ensureBoard(context, event.row, event.col)
      return [
        { type: 'set_state', entityId: cellId(event.row, event.col), state: { role: 'conflict', color: 'danger', pulse: true }, merge: true },
        ...event.conflicts.map((cell) => ({ type: 'set_state' as const, entityId: cellId(cell.row, cell.col), state: { role: 'conflict' as const, color: 'danger' as const }, merge: true })),
      ]
    case 'n_queens.backtrack':
      ensureBoard(context, event.row, event.col)
      return [{ type: 'set_cell', cellId: cellId(event.row, event.col), value: '', state: { role: 'idle', color: 'muted' } }]
    case 'n_queens.solution':
      return event.queens.map((queen) => ({ type: 'set_cell', cellId: cellId(queen.row, queen.col), value: VisualDecorator.Symbols.QUEEN, state: { role: 'safe', color: 'success' } }))
  }
}

function createMatrix(rows: number, cols: number, values?: Array<Array<number | string>>): SceneCommand[] {
  const cellSize = Math.min(58, Math.max(36, Math.floor(360 / Math.max(rows, cols))))
  const startX = 500 - ((cols - 1) * (cellSize + 8)) / 2
  const startY = 120
  const commands: SceneCommand[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      commands.push({
        type: 'create_cell',
        cell: DataUnit.matrixCell({
          id: cellId(row, col),
          row,
          col,
          value: values?.[row]?.[col] ?? '',
          size: cellSize,
          x: startX + col * (cellSize + 8),
          y: startY + row * (cellSize + 8),
        }),
      })
    }
  }

  return commands
}

function ensureBoard(context: CompileContext, row: number, col: number) {
  if (context.scene.entities[cellId(row, col)]) return
  const size = Math.max(row + 1, col + 1, context.script.initialState.matrix?.length ?? 4)
  createMatrix(size, size).forEach((command) => {
    if (command.type === 'create_cell') context.scene.entities[command.cell.id] = command.cell
  })
}

function dependencyEdges(context: CompileContext, row: number, col: number): SceneCommand[] {
  const target = cellId(row, col)
  const dependencies = context.scene.groups.__matrix_dependencies?.entityIds ?? []
  return dependencies
    .filter((source) => source !== target)
    .map((source) => ({
      type: 'connect' as const,
      edge: AuxiliaryUnit.arrow({
        id: `dep_${source}_${target}`,
        fromEntity: source,
        toEntity: target,
        directed: true,
        dashed: true,
        thickness: 2,
        color: 'warning',
        pulse: true,
        variant: 'dependency',
      }),
    }))
}

function cellId(row: number, col: number) {
  return `cell_${row}_${col}`
}

