import type { SceneCell } from '../types'
import { NEUTRALS } from '../tokens'

interface StringViewProps {
  /** All s_<row>_<index> char cells, any number of rows (1 = single string, 2 = text/pattern). */
  cells: SceneCell[]
  hideTitle?: boolean
}

const STROKE = NEUTRALS.mutedText
const STROKE_WIDTH = 1.4
const INDEX_COLOR = NEUTRALS.mutedText
// Indigo accent distinguishes the string structure from neutral chrome; intentional non-token hue.
const LABEL_COLOR = '#6366F1'

/** Default row labels for the common single / double (text-vs-pattern) layouts. */
const ROW_LABELS = ['主串', '模式串']

/**
 * Structural overlay for the dedicated string (字符串) visual. The character cell
 * bodies (one box per char) are drawn by CellView in the main scene loop; this
 * component draws only the surrounding shell — a frame around each row, the
 * per-character index numbers (0,1,2…) beneath each cell, the left-side row
 * labels ("text" / "pattern") for the double-row matching layouts (KMP / 最长回文
 * 等), and the "String" title. Mirrors HashTableView / SetView / VariablesView's
 * "draw shell, not cells" convention.
 */
export default function StringView({ cells, hideTitle }: StringViewProps) {
  if (cells.length === 0) return null

  // Group char cells by their row (parsed from s_<row>_<index>).
  const rows = new Map<number, SceneCell[]>()
  for (const c of cells) {
    const r = rowOf(c.id)
    if (r === undefined) continue
    if (!rows.has(r)) rows.set(r, [])
    rows.get(r)!.push(c)
  }
  for (const list of rows.values()) {
    list.sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  }
  if (rows.size === 0) return null

  const sortedRowKeys = [...rows.keys()].sort((a, b) => a - b)
  const isDouble = sortedRowKeys.length > 1

  const cellW = cells[0].size?.width ?? 36
  const cellH = cells[0].size?.height ?? 36
  const pad = 6

  // Overall bounding box across all rows (for the title placement).
  const allMinX = Math.min(...cells.map(c => c.position.x - cellW / 2))

  return (
    <g>
      {/* Title naming the teaching semantics */}
      {!hideTitle && (
        <text
          x={allMinX - pad} y={Math.min(...cells.map(c => c.position.y)) - cellH / 2 - pad - 8}
          textAnchor="start" fontSize="11" fill={LABEL_COLOR} fontFamily="monospace"
        >
          字符序列
        </text>
      )}

      {sortedRowKeys.map((rowKey, i) => {
        const rowCells = rows.get(rowKey)!
        const minX = Math.min(...rowCells.map(c => c.position.x - cellW / 2))
        const maxX = Math.max(...rowCells.map(c => c.position.x + cellW / 2))
        const rowY = rowCells[0].position.y
        const frameTop = rowY - cellH / 2

        return (
          <g key={`strrow_${rowKey}`}>
            {/* Row frame hugging this string's char cells */}
            <rect
              x={minX - pad} y={frameTop - pad}
              width={maxX - minX + 2 * pad} height={cellH + 2 * pad}
              rx={6} ry={6}
              fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeDasharray="5 3" opacity={0.6}
            />

            {/* Left-side row label (text / pattern) for the double-row matching layout */}
            {isDouble && (
              <text
                x={minX - pad - 8} y={rowY + 4}
                textAnchor="end" fontSize="11" fill={LABEL_COLOR} fontFamily="monospace"
              >
                {ROW_LABELS[i] ?? `row${rowKey}`}
              </text>
            )}

            {/* Per-character index numbers beneath each cell */}
            {rowCells.map(c => (
              <text
                key={`idx_${c.id}`}
                x={c.position.x} y={rowY + cellH / 2 + 14}
                textAnchor="middle" fontSize="10" fill={INDEX_COLOR} fontFamily="monospace"
              >
                {c.col ?? indexOf(c.id)}
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}

function rowOf(id: string): number | undefined {
  // s_<row>_<index>
  const m = /^s_(\d+)_(\d+)$/.exec(id)
  return m ? parseInt(m[1], 10) : undefined
}

function indexOf(id: string): number | undefined {
  const m = /^s_(\d+)_(\d+)$/.exec(id)
  return m ? parseInt(m[2], 10) : undefined
}
