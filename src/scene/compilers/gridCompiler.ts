import type {
  GridArrowModel,
  GridCellModel,
  GridCellRole,
  GridCollection,
  GridCoord,
  GridEvent,
  GridModel,
  GridSceneCommand,
} from '../overlays/gridTypes'

const DEFAULT_GRID_ID = 'main'

const keyOf = (row: number, col: number) => `${row}:${col}`

const coordKey = ([row, col]: GridCoord) => keyOf(row, col)

const inBounds = (model: GridModel, row: number, col: number) =>
  row >= 0 && row < model.rows && col >= 0 && col < model.cols

const cloneCoordList = (coords: GridCoord[]) =>
  coords.map(([row, col]) => [row, col] as GridCoord)

const createCell = (
  row: number,
  col: number,
  value: unknown,
  state: GridCellRole = 'default',
): GridCellModel => ({
  row,
  col,
  value,
  state,
})

const createModel = (event: Extract<GridEvent, { type: 'grid.create' }>): GridModel => {
  const gridId = event.gridId ?? DEFAULT_GRID_ID
  const cells: Record<string, GridCellModel> = {}

  for (let row = 0; row < event.rows; row += 1) {
    for (let col = 0; col < event.cols; col += 1) {
      cells[keyOf(row, col)] = createCell(row, col, event.values?.[row]?.[col])
    }
  }

  return {
    gridId,
    title: event.title,
    rows: event.rows,
    cols: event.cols,
    cellSize: event.cellSize,
    cells,
    frontier: [],
    path: [],
    arrows: [],
  }
}

const cloneModel = (model: GridModel): GridModel => ({
  ...model,
  cells: Object.fromEntries(
    Object.entries(model.cells).map(([key, cell]) => [key, { ...cell }]),
  ),
  frontier: cloneCoordList(model.frontier),
  path: cloneCoordList(model.path),
  arrows: model.arrows.map((arrow) => ({
    ...arrow,
    from: [...arrow.from] as GridCoord,
    to: [...arrow.to] as GridCoord,
  })),
})

const getModel = (collection: GridCollection, gridId: string) => collection[gridId]

const updateCell = (
  model: GridModel,
  row: number,
  col: number,
  patch: Partial<GridCellModel>,
) => {
  if (!inBounds(model, row, col)) return
  const key = keyOf(row, col)
  model.cells[key] = {
    ...model.cells[key],
    ...patch,
    row,
    col,
  }
}

const normalizeFrontier = (model: GridModel, cells: GridCoord[]) =>
  cells.filter(([row, col]) => inBounds(model, row, col))

export function reduceGridEvent(
  collection: GridCollection,
  event: GridEvent,
): GridCollection {
  const gridId = event.gridId ?? DEFAULT_GRID_ID

  if (event.type === 'grid.create') {
    return {
      ...collection,
      [gridId]: createModel(event),
    }
  }

  const current = getModel(collection, gridId)
  if (!current) return collection

  const next = cloneModel(current)

  switch (event.type) {
    case 'grid.set_cell':
      updateCell(next, event.row, event.col, {
        value: event.value,
        state: event.state ?? next.cells[keyOf(event.row, event.col)]?.state ?? 'default',
        color: event.color,
      })
      break
    case 'grid.visit':
      updateCell(next, event.row, event.col, {
        state: 'visited',
        visited: true,
        visitOrder: event.order,
      })
      break
    case 'grid.frontier': {
      next.frontier = normalizeFrontier(next, event.cells)
      next.frontier.forEach(([row, col]) => {
        const cell = next.cells[keyOf(row, col)]
        if (cell && !cell.wall && cell.state !== 'path') {
          cell.state = 'frontier'
        }
      })
      break
    }
    case 'grid.path':
      next.path = normalizeFrontier(next, event.cells)
      next.path.forEach(([row, col]) => {
        updateCell(next, row, col, {
          state: 'path',
          color: event.color ?? next.cells[keyOf(row, col)]?.color,
        })
      })
      break
    case 'grid.wall':
      updateCell(next, event.row, event.col, {
        wall: event.enabled,
        state: event.enabled ? 'wall' : 'default',
      })
      break
    case 'grid.weight':
      updateCell(next, event.row, event.col, {
        weight: event.weight,
        state: 'weighted',
      })
      break
    case 'grid.arrow': {
      const [fromRow, fromCol] = event.from
      const [toRow, toCol] = event.to
      if (!inBounds(next, fromRow, fromCol) || !inBounds(next, toRow, toCol)) break
      const id = `${coordKey(event.from)}->${coordKey(event.to)}`
      const arrow: GridArrowModel = {
        id,
        from: [...event.from] as GridCoord,
        to: [...event.to] as GridCoord,
        label: event.label,
      }
      next.arrows = [...next.arrows.filter((item) => item.id !== id), arrow]
      break
    }
  }

  return {
    ...collection,
    [gridId]: next,
  }
}

export function compileGridEvent(
  event: GridEvent,
  collection: GridCollection = {},
): GridSceneCommand[] {
  const nextCollection = reduceGridEvent(collection, event)
  const gridId = event.gridId ?? DEFAULT_GRID_ID
  const model = nextCollection[gridId]
  return model ? [{ type: 'grid.model', gridId, model, patch: model }] : []
}

export function compileGridEvents(
  events: GridEvent[],
  collection: GridCollection = {},
): { commands: GridSceneCommand[]; collection: GridCollection } {
  let current = collection
  const commands: GridSceneCommand[] = []

  events.forEach((event) => {
    current = reduceGridEvent(current, event)
    const gridId = event.gridId ?? DEFAULT_GRID_ID
    const model = current[gridId]
    if (model) {
      commands.push({ type: 'grid.model', gridId, model, patch: model })
    }
  })

  return { commands, collection: current }
}
