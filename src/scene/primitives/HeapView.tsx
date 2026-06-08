import type { SceneCell } from '../types'
import { SEMANTIC_COLORS } from '../tokens'

interface HeapViewProps {
  nodes: SceneCell[]
  hideTitle?: boolean
}

const STROKE = '#94A3B8'
const MIRROR_FILL = SEMANTIC_COLORS.idle.fill
const MIRROR_STROKE = SEMANTIC_COLORS.idle.stroke

/**
 * Structural overlay for the dedicated heap / priority-queue visual. The node
 * bodies (cells) and parent→child edges are drawn by CellView / EdgeView in the
 * main scene loop; this component draws only the shell — a title naming the heap
 * variant (最小堆 / 最大堆) and a bottom "array mirror" showing the level-order
 * backing array with its indices. Mirrors HashTableView / SetView's
 * "draw shell, not cells" convention.
 *
 * The compiler lays out heap_<i> cells as a complete binary tree (node i at
 * level floor(log2(i+1)); children 2i+1, 2i+2), so the mirror just re-sorts the
 * cells by index and renders them in a horizontal row beneath the tree.
 */
export default function HeapView({ nodes, hideTitle }: HeapViewProps) {
  if (nodes.length === 0) return null

  const sorted = [...nodes].sort((a, b) => indexOf(a) - indexOf(b))
  const variant = variantOf(sorted[0])
  const title = variant === 'min' ? '最小堆' : variant === 'max' ? '最大堆' : '堆'

  // Tree bounding box (for title placement).
  const nodeW = sorted[0].size?.width ?? 44
  const nodeH = sorted[0].size?.height ?? 44
  const minX = Math.min(...sorted.map(c => c.position.x - nodeW / 2))
  const maxX = Math.max(...sorted.map(c => c.position.x + nodeW / 2))
  const minY = Math.min(...sorted.map(c => c.position.y - nodeH / 2))
  const maxY = Math.max(...sorted.map(c => c.position.y + nodeH / 2))

  // Array-mirror geometry: a horizontal strip below the tree.
  const cellW = 40
  const cellH = 34
  const gap = 4
  const mirrorY = maxY + 56
  const totalW = sorted.length * cellW + (sorted.length - 1) * gap
  const mirrorStartX = (minX + maxX) / 2 - totalW / 2

  return (
    <g>
      {/* Title above the tree */}
      {!hideTitle && (
        <text
          x={minX} y={minY - 16}
          textAnchor="start" fontSize="12" fill="#64748B" fontFamily="monospace" fontWeight={600}
        >
          {title}
        </text>
      )}

      {/* Array mirror label */}
      <text
        x={mirrorStartX} y={mirrorY - cellH / 2 - 8}
        textAnchor="start" fontSize="10" fill="#94A3B8" fontFamily="monospace"
      >
        底层数组（层序）
      </text>

      {/* Array mirror: one box per heap_<i>, in index order */}
      {sorted.map((c, slot) => {
        const x = mirrorStartX + slot * (cellW + gap)
        const idx = indexOf(c)
        return (
          <g key={`mirror_${c.id}`}>
            <rect
              x={x} y={mirrorY - cellH / 2}
              width={cellW} height={cellH} rx={6} ry={6}
              fill={MIRROR_FILL} stroke={MIRROR_STROKE} strokeWidth={1.2}
            />
            <text
              x={x + cellW / 2} y={mirrorY + 4}
              textAnchor="middle" fontSize="13" fill="#475569" fontFamily="monospace" fontWeight={600}
            >
              {String(c.value ?? '')}
            </text>
            {/* index label below */}
            <text
              x={x + cellW / 2} y={mirrorY + cellH / 2 + 12}
              textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="monospace"
            >
              {idx}
            </text>
          </g>
        )
      })}

      {/* Outer frame around the array mirror */}
      <rect
        x={mirrorStartX - 6} y={mirrorY - cellH / 2 - 6}
        width={totalW + 12} height={cellH + 12} rx={8} ry={8}
        fill="none" stroke={STROKE} strokeWidth={1.4} strokeDasharray="5 3" opacity={0.5}
      />
    </g>
  )
}

function indexOf(cell: SceneCell): number {
  const meta = cell.meta as { index?: number } | undefined
  if (meta?.index !== undefined) return meta.index
  const n = parseInt(cell.id.split('_')[1] ?? '', 10)
  return Number.isNaN(n) ? 0 : n
}

function variantOf(cell: SceneCell): 'min' | 'max' | undefined {
  const meta = cell.meta as { variant?: 'min' | 'max' } | undefined
  return meta?.variant
}
