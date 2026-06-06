import type { SceneCell, SceneNode } from '../types'

const CONTAINER_STROKE = '#94A3B8'
const CONTAINER_STROKE_WIDTH = 2

interface ContainerViewProps {
  type: 'stack' | 'queue' | 'auxiliary' | 'map'
  cells: SceneCell[]
  label?: string
  nodes?: SceneNode[]
}

/** Draws structural container shapes: U-shape for stack, parallel lines for queue, panel for map. */
export default function ContainerView({ type, cells, nodes }: ContainerViewProps) {
  // Map container: rounded rectangle panel around key-value entry nodes
  if (type === 'map') {
    if (!nodes || nodes.length === 0) return null
    const nodeW = nodes[0].size?.width ?? 120
    const nodeH = nodes[0].size?.height ?? 48
    const pad = 14
    const minX = Math.min(...nodes.map(n => n.position.x - nodeW / 2))
    const maxX = Math.max(...nodes.map(n => n.position.x + nodeW / 2))
    const minY = Math.min(...nodes.map(n => n.position.y - nodeH / 2))
    const maxY = Math.max(...nodes.map(n => n.position.y + nodeH / 2))
    const rx = 10
    return (
      <g>
        <rect x={minX - pad} y={minY - pad} rx={rx} ry={rx}
          width={maxX - minX + 2 * pad} height={maxY - minY + 2 * pad}
          fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={minX - pad + 8} y={minY - pad - 6} textAnchor="start" fontSize="11" fill="#64748B" fontFamily="monospace">
          {'映射'}
        </text>
      </g>
    )
  }

  if (cells.length === 0) return null

  const cellW = cells[0].size?.width ?? 44
  const cellH = cells[0].size?.height ?? 44
  const pad = 10

  if (type === 'auxiliary') {
    // Rounded rectangle panel around auxiliary array cells
    // Group cells by their y-coordinate (each row is a separate panel)
    const rows = new Map<number, SceneCell[]>()
    for (const c of cells) {
      const y = c.position.y
      if (!rows.has(y)) rows.set(y, [])
      rows.get(y)!.push(c)
    }

    return (
      <g>
        {[...rows.entries()].map(([y, rowCells]) => {
          const minX = Math.min(...rowCells.map(c => c.position.x - (c.size?.width ?? 52) / 2))
          const maxX = Math.max(...rowCells.map(c => c.position.x + (c.size?.width ?? 52) / 2))
          const minY = y - cellH / 2 - pad
          const maxY = y + cellH / 2 + pad
          const rx = 6

          return (
            <rect key={`aux_rect_${y}`}
              x={minX - pad} y={minY} rx={rx} ry={rx}
              width={maxX - minX + 2 * pad} height={maxY - minY}
              fill="#F8FAFC" stroke="#E2E8F0" strokeWidth={1.2}
            />
          )
        })}
      </g>
    )
  }

  if (type === 'stack') {
    // U-shaped container: bottom + left + right lines, open at top
    // Positioned around the vertical column of cells
    const centerX = cells[0].position.x
    const yCoords = cells.map(c => c.position.y)
    const minY = Math.min(...yCoords)
    const maxY = Math.max(...yCoords)
    const topY = minY - cellH / 2 - pad
    const bottomY = maxY + cellH / 2 + pad
    const leftX = centerX - cellW / 2 - pad
    const rightX = centerX + cellW / 2 + pad

    return (
      <g>
        <path
          d={`M ${leftX} ${topY} L ${leftX} ${bottomY} L ${rightX} ${bottomY} L ${rightX} ${topY}`}
          fill="none" stroke={CONTAINER_STROKE} strokeWidth={CONTAINER_STROKE_WIDTH}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <text x={leftX - 8} y={topY + 8} textAnchor="end" fontSize="10" fill="#64748B" fontFamily="monospace" dominantBaseline="middle">栈顶 ➔</text>
      </g>
    )
  }

  // Queue: two parallel horizontal lines (pipe)
  if (type === 'queue') {
    const firstX = cells[0].position.x - cellW / 2 - pad
    const lastX = cells[cells.length - 1].position.x + cellW / 2 + pad
    const topY = cells[0].position.y - cellH / 2 - pad - 4
    const bottomY = cells[0].position.y + cellH / 2 + pad + 4
    const labelY = bottomY + 6

    return (
      <g>
        <line x1={firstX} y1={topY} x2={lastX} y2={topY}
          stroke={CONTAINER_STROKE} strokeWidth={CONTAINER_STROKE_WIDTH}
          strokeLinecap="round" />
        <line x1={firstX} y1={bottomY} x2={lastX} y2={bottomY}
          stroke={CONTAINER_STROKE} strokeWidth={CONTAINER_STROKE_WIDTH}
          strokeLinecap="round" />
        <text x={firstX} y={labelY} textAnchor="start" fontSize="10" fill="#64748B" fontFamily="monospace" dominantBaseline="hanging">队首</text>
        <text x={lastX} y={labelY} textAnchor="end" fontSize="10" fill="#64748B" fontFamily="monospace" dominantBaseline="hanging">队尾</text>
      </g>
    )
  }

  return null
}
