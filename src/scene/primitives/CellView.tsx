import type { SceneCell } from '../types'

const COLOR_MAP: Record<string, { stroke: string; fill: string }> = {
  primary: { stroke: '#3B82F6', fill: '#EFF6FF' },
  success: { stroke: '#10B981', fill: '#ECFDF5' },
  warning: { stroke: '#F59E0B', fill: '#FFFBEB' },
  danger:  { stroke: '#EF4444', fill: '#FEF2F2' },
  muted:   { stroke: '#E2E8F0', fill: '#F8FAFC' },
}

interface CellViewProps {
  cell: SceneCell
}

export default function CellView({ cell }: CellViewProps) {
  const width = cell.size?.width ?? 44
  const height = cell.size?.height ?? 44
  const palette = cell.state?.role === 'idle' ? COLOR_MAP.muted
    : cell.state?.color ? (COLOR_MAP[cell.state.color] ?? COLOR_MAP.muted)
    : COLOR_MAP.muted
  const opacity = cell.state?.opacity ?? 1
  const value = cell.value?.toString() ?? ''
  const isCurrent = cell.state?.role === 'current' || cell.state?.role === 'active'
  const isDanger = cell.state?.role === 'swapping' || cell.state?.role === 'conflict'
  const textColor = isDanger ? '#EF4444' : '#1E293B'

  return (
    <g transform={`translate(${cell.position.x}, ${cell.position.y})`} opacity={opacity}>
      <title>{`${cell.id}${cell.row !== undefined ? ` (${cell.row},${cell.col})` : ''} · ${cell.state?.role ?? 'idle'}`}</title>
      <g className={cell.state?.pulse ? 'cell-pulse' : undefined}>
        {isCurrent && (
          <rect x={-width / 2 - 4} y={-height / 2 - 4}
            width={width + 8} height={height + 8} rx={10}
            fill={palette.stroke} opacity="0.08" className="cell-current-ring" />
        )}
        <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8}
          fill={palette.fill} stroke={palette.stroke} strokeWidth={1.5} />
        <text x={0} y={4} textAnchor="middle" fontSize="14" fontFamily="monospace"
          fill={textColor} fontWeight={isCurrent ? 600 : 400}>
          {value}
        </text>
        {cell.col !== undefined && (
          <text x={0} y={height / 2 + 14} textAnchor="middle" fontSize="10"
            fill="#94A3B8" fontFamily="monospace">
            {cell.row !== undefined ? `${cell.row},${cell.col}` : cell.col}
          </text>
        )}
      </g>
      <style>{`
        .cell-pulse { animation: cell-pop 0.5s ease-in-out; transform-box: fill-box; transform-origin: center; }
        .cell-current-ring { animation: cell-ring 0.9s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes cell-pop { 0% { transform: scale(0.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
        @keyframes cell-ring { from { opacity: 0.15; transform: scale(0.94); } to { opacity: 0.02; transform: scale(1.12); } }
      `}</style>
    </g>
  )
}
