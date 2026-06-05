import type { SceneCell } from '../types'

interface BitsetViewProps {
  bits: SceneCell[]
  labelCell?: SceneCell
}

const STROKE = '#94A3B8'
const STROKE_WIDTH = 1.6

/**
 * Structural overlay for the dedicated bitmask / bitset visual (状压 DP). The
 * bit-cell bodies (0/1) are drawn by CellView in the main scene loop; this
 * component draws only the shell — a title ("Bitmask") and a per-cell index
 * label below each bit. Mirrors HashTableView / HeapView's "draw shell, not
 * cells" convention.
 *
 * Convention: bit index 0 sits leftmost (低位在左 / least-significant bit on the
 * left), ascending rightward. The index labels below the cells make this
 * explicit so the row reads as bit[0], bit[1], ….
 */
export default function BitsetView({ bits, labelCell }: BitsetViewProps) {
  if (bits.length === 0) return null

  const sorted = [...bits].sort((a, b) => indexOf(a) - indexOf(b))
  const cellW = sorted[0].size?.width ?? 44
  const cellH = sorted[0].size?.height ?? 44

  const minX = Math.min(...sorted.map(c => c.position.x - cellW / 2))
  const maxX = Math.max(...sorted.map(c => c.position.x + cellW / 2))
  const frameY = sorted[0].position.y - cellH / 2
  const pad = 6

  const title = (labelCell?.value?.toString() || 'Bitmask') + '（位集 · 低位在左）'

  return (
    <g>
      {/* Outer frame around the bit row */}
      <rect
        x={minX - pad} y={frameY - pad}
        width={maxX - minX + 2 * pad} height={cellH + 2 * pad}
        rx={8} ry={8}
        fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeDasharray="5 3" opacity={0.7}
      />
      <text
        x={minX - pad} y={frameY - pad - 12}
        textAnchor="start" fontSize="12" fill="#64748B" fontFamily="monospace" fontWeight={600}
      >
        {title}
      </text>

      {/* Per-bit index labels (below each cell) */}
      {sorted.map(b => (
        <text
          key={`bidx_${b.id}`}
          x={b.position.x} y={b.position.y + cellH / 2 + 16}
          textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="monospace"
        >
          {b.col ?? indexOf(b)}
        </text>
      ))}
    </g>
  )
}

function indexOf(cell: SceneCell): number {
  const meta = cell.meta as { index?: number } | undefined
  if (meta?.index !== undefined) return meta.index
  const n = parseInt(cell.id.split('_')[1] ?? '', 10)
  return Number.isNaN(n) ? 0 : n
}
