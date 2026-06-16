import type { SceneCell, SceneNode } from '../types'
import { SEMANTIC_COLORS, NEUTRALS, TYPO, SHAPE } from '../tokens'

const CONTAINER_STROKE = NEUTRALS.mutedText
const CONTAINER_STROKE_WIDTH = 2

interface ContainerViewProps {
  type: 'stack' | 'queue' | 'auxiliary' | 'map'
  cells: SceneCell[]
  label?: string
  nodes?: SceneNode[]
}

/** Draws structural container shapes: U-shape for stack, parallel lines for queue, panel for map. */
export default function ContainerView({ type, cells, nodes, label }: ContainerViewProps) {
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
          fill={SEMANTIC_COLORS.idle.fill} stroke={NEUTRALS.frameStroke} strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={minX - pad + 8} y={minY - pad - 6} textAnchor="start" fontSize="11" fill={NEUTRALS.labelText} fontFamily={TYPO.serif}>
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
              fill={SEMANTIC_COLORS.idle.fill} stroke={SEMANTIC_COLORS.idle.stroke} strokeWidth={1.2}
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
    const stackLabel = label ?? (cells[0]?.meta as { label?: string } | undefined)?.label ?? '栈'

    return (
      <g>
        <path
          d={`M ${leftX} ${topY} L ${leftX} ${bottomY} L ${rightX} ${bottomY} L ${rightX} ${topY}`}
          fill="none" stroke={CONTAINER_STROKE} strokeWidth={CONTAINER_STROKE_WIDTH}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <text x={leftX} y={topY - 8} textAnchor="start" fontSize="11" fill={NEUTRALS.labelText} fontFamily={TYPO.serif}>
          {stackLabel}
        </text>
        <text x={leftX - 8} y={topY + 8} textAnchor="end" fontSize="10" fill={NEUTRALS.labelText} fontFamily={TYPO.serif} dominantBaseline="middle">栈顶 ➔</text>
      </g>
    )
  }

  // Queue: 对齐 demo —— 一排小格,空槽虚线,格下索引数字,格上 ▼front/▼rear 指针。
  // 已占用格由 CellView 渲染(empty_placeholder 被 CellView 跳过),故空槽在此补画。
  if (type === 'queue') {
    const sorted = [...cells].sort((a, b) => a.position.x - b.position.x)
    const meta = (cells[0]?.meta ?? {}) as { queueFront?: number; queueRear?: number }
    const frontIndex = meta.queueFront ?? -1
    const rearIndex = meta.queueRear ?? -1
    const idxY = sorted[0].position.y + cellH / 2 + 12 // 索引数字基线(格子下方)
    const cellAt = (i: number) => sorted.find(c => c.col === i) ?? sorted[i]

    return (
      <g>
        {sorted.map((c) => {
          const isEmpty = c.state?.role === 'empty_placeholder'
          const cw = c.size?.width ?? cellW
          const ch = c.size?.height ?? cellH
          return (
            <g key={`q_${c.id}`}>
              {/* CellView 不画 empty_placeholder,空槽虚线方块在此补画 */}
              {isEmpty && (
                <rect x={c.position.x - cw / 2} y={c.position.y - ch / 2}
                  width={cw} height={ch} rx={SHAPE.cellRadius}
                  fill={NEUTRALS.emptyFill} stroke={NEUTRALS.emptyStroke}
                  strokeWidth={1.2} strokeDasharray="3 3" />
              )}
              {/* 格子下方索引数字 */}
              <text x={c.position.x} y={idxY} textAnchor="middle"
                fontSize={String(TYPO.size.index)} fill={NEUTRALS.mutedText}
                fontFamily={TYPO.mono} dominantBaseline="middle">
                {c.col ?? 0}
              </text>
            </g>
          )
        })}
        {/* ▼front(绿) / ▼rear(橙) 指针 —— 仅在队列非空时显示 */}
        {frontIndex >= 0 && cellAt(frontIndex) && (
          <text x={cellAt(frontIndex)!.position.x} y={cellAt(frontIndex)!.position.y - cellH / 2 - 8}
            textAnchor="middle" fontSize="11" fontWeight={600}
            fill={SEMANTIC_COLORS.success.stroke} fontFamily={TYPO.mono}>
            ▼front
          </text>
        )}
        {rearIndex >= 0 && cellAt(rearIndex) && (
          <text x={cellAt(rearIndex)!.position.x} y={cellAt(rearIndex)!.position.y - cellH / 2 - 24}
            textAnchor="middle" fontSize="11" fontWeight={600}
            fill={SEMANTIC_COLORS.compare.stroke} fontFamily={TYPO.mono}>
            ▼rear
          </text>
        )}
      </g>
    )
  }

  return null
}
