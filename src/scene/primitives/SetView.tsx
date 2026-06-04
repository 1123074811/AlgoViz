import type { SceneCell } from '../types'

interface SetViewProps {
  cells: SceneCell[]
}

const SET_STROKE = '#6366F1'
const BRACE_COLOR = '#818CF8'

/**
 * Structural overlay for the dedicated set (集合) visual. The member cell bodies
 * are drawn by CellView in the main scene loop; this component draws only the
 * surrounding shell — a rounded "集合容器" enclosing the members, framing
 * curly braces `{ }`, and a title that names the set's teaching semantics
 * (去重·无序). Mirrors HashTableView / VariablesView's "draw shell, not cells"
 * convention.
 *
 * The compiler packs members into a single horizontal row (set_<i> cells),
 * so the shell is a pill that hugs that row. Deleted members (role==='deleted')
 * are still drawn by CellView while fading out, so we keep them inside the
 * bounding box during their exit frame.
 */
export default function SetView({ cells }: SetViewProps) {
  if (cells.length === 0) return null

  const cellW = cells[0].size?.width ?? 44
  const cellH = cells[0].size?.height ?? 44
  const padX = 26
  const padY = 16

  const minX = Math.min(...cells.map(c => c.position.x - cellW / 2))
  const maxX = Math.max(...cells.map(c => c.position.x + cellW / 2))
  const centerY = cells[0].position.y

  const left = minX - padX
  const right = maxX + padX
  const top = centerY - cellH / 2 - padY
  const bottom = centerY + cellH / 2 + padY
  const height = bottom - top

  // Curly-brace geometry: a thin bump on each vertical edge.
  const braceDepth = 9
  const midY = (top + bottom) / 2
  const leftBrace = `M ${left} ${top}`
    + ` Q ${left - braceDepth} ${top}, ${left - braceDepth} ${top + height / 4}`
    + ` Q ${left - braceDepth} ${midY}, ${left - braceDepth * 1.8} ${midY}`
    + ` Q ${left - braceDepth} ${midY}, ${left - braceDepth} ${bottom - height / 4}`
    + ` Q ${left - braceDepth} ${bottom}, ${left} ${bottom}`
  const rightBrace = `M ${right} ${top}`
    + ` Q ${right + braceDepth} ${top}, ${right + braceDepth} ${top + height / 4}`
    + ` Q ${right + braceDepth} ${midY}, ${right + braceDepth * 1.8} ${midY}`
    + ` Q ${right + braceDepth} ${midY}, ${right + braceDepth} ${bottom - height / 4}`
    + ` Q ${right + braceDepth} ${bottom}, ${right} ${bottom}`

  return (
    <g>
      {/* Set container — rounded pill enclosing the (deduplicated) members */}
      <rect
        x={left} y={top}
        width={right - left} height={height}
        rx={height / 2} ry={height / 2}
        fill="#EEF2FF" fillOpacity={0.5}
        stroke={SET_STROKE} strokeWidth={1.8} strokeDasharray="6 3" opacity={0.85}
      />

      {/* Framing curly braces { } to evoke set-builder notation */}
      <path d={leftBrace} fill="none" stroke={BRACE_COLOR} strokeWidth={2.2} strokeLinecap="round" />
      <path d={rightBrace} fill="none" stroke={BRACE_COLOR} strokeWidth={2.2} strokeLinecap="round" />

      {/* Title naming the teaching semantics */}
      <text
        x={left} y={top - 8}
        textAnchor="start" fontSize="11" fill="#6366F1" fontFamily="monospace"
      >
        Set（去重·无序）
      </text>
    </g>
  )
}
