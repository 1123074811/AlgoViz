import type { CSSProperties } from 'react'
import type { GridArrowModel, GridCellModel, GridModel } from '../overlays/gridTypes'

interface GridViewProps {
  model: GridModel
  className?: string
}

const roleClass: Record<GridCellModel['state'], string> = {
  default: 'border-slate-200 bg-white text-slate-700',
  active: 'border-orange-400 bg-orange-50 text-orange-900',
  visited: 'border-sky-300 bg-sky-50 text-sky-900',
  frontier: 'border-amber-300 bg-amber-50 text-amber-900',
  path: 'border-emerald-400 bg-emerald-50 text-emerald-900',
  wall: 'border-slate-700 bg-slate-800 text-white',
  start: 'border-emerald-500 bg-emerald-100 text-emerald-950',
  target: 'border-rose-500 bg-rose-100 text-rose-950',
  weighted: 'border-violet-300 bg-violet-50 text-violet-950',
  warning: 'border-yellow-400 bg-yellow-50 text-yellow-950',
  error: 'border-red-400 bg-red-50 text-red-950',
}

const cellLabel = (cell: GridCellModel) => {
  if (cell.wall) return ''
  if (cell.value !== undefined && cell.value !== null) return String(cell.value)
  if (cell.weight !== undefined) return String(cell.weight)
  if (cell.visitOrder !== undefined) return String(cell.visitOrder)
  return ''
}

const cellStyle = (cell: GridCellModel): CSSProperties | undefined =>
  cell.color
    ? {
        borderColor: cell.color,
        backgroundColor: `${cell.color}1f`,
      }
    : undefined

const arrowStyle = (arrow: GridArrowModel, cellSize: number): CSSProperties => {
  const [fromRow, fromCol] = arrow.from
  const [toRow, toCol] = arrow.to
  const x1 = fromCol * cellSize + cellSize / 2
  const y1 = fromRow * cellSize + cellSize / 2
  const x2 = toCol * cellSize + cellSize / 2
  const y2 = toRow * cellSize + cellSize / 2

  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1) || 1,
  }
}

export function GridView({ model, className = '' }: GridViewProps) {
  const cellSize = model.cellSize ?? 40
  const cells = Object.values(model.cells).sort((a, b) => a.row - b.row || a.col - b.col)
  const width = model.cols * cellSize
  const height = model.rows * cellSize

  return (
    <section
      className={`rounded-md border border-slate-200 bg-white/95 p-3 shadow-sm ${className}`}
      aria-label={model.title ?? 'Grid'}
    >
      {model.title ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
          {model.title}
        </div>
      ) : null}
      <div className="max-w-full overflow-auto">
        <div className="relative" style={{ width, height }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${model.cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${model.rows}, ${cellSize}px)`,
            }}
          >
            {cells.map((cell) => (
              <div
                key={`${cell.row}:${cell.col}`}
                className={`relative flex items-center justify-center border text-xs font-semibold transition-colors ${
                  roleClass[cell.state]
                }`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  ...cellStyle(cell),
                }}
                title={`(${cell.row}, ${cell.col})`}
              >
                <span className="max-w-full truncate px-1 leading-none">{cellLabel(cell)}</span>
                {cell.weight !== undefined && cell.value !== cell.weight ? (
                  <span className="absolute bottom-0.5 right-0.5 text-[10px] leading-none text-slate-500">
                    {cell.weight}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          {model.arrows.map((arrow) => (
            <div
              key={arrow.id}
              className="pointer-events-none absolute border-t-2 border-dashed border-sky-500"
              style={arrowStyle(arrow, cellSize)}
              title={arrow.label}
            >
              {arrow.label ? (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-1 text-[10px] text-sky-700 shadow-sm">
                  {arrow.label}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default GridView
