import type { SceneCell } from '../types'
import { truncateToWidth } from '../textMetrics'
import { SEMANTIC_COLORS, SHAPE, type SemanticColorName } from '../tokens'
import { CELL_KEYFRAMES } from './sharedMotion'

// Legacy color names carried on the scene model map onto semantic tokens.
const COLOR_ALIAS: Record<string, SemanticColorName> = {
  primary: 'primary',
  success: 'success',
  warning: 'compare',
  danger: 'danger',
  muted: 'idle',
}

const resolveColor = (color: string | undefined, role: string | undefined): SemanticColorName => {
  if (role === 'idle') return 'idle'
  if (color && color in COLOR_ALIAS) return COLOR_ALIAS[color]
  return 'idle'
}

interface CellViewProps {
  cell: SceneCell
}

export default function CellView({ cell }: CellViewProps) {
  if (cell.state?.role === 'empty_placeholder') {
    return null
  }
  if (cell.id.startsWith('mathvar_')) {
    return null
  }

  const opacity = cell.state?.opacity ?? 1
  const value = cell.value?.toString() ?? ''

  // Matrix header row/col index labels rendered as plain text
  if (cell.state?.role === 'header') {
    return (
      <g transform={`translate(${cell.position.x}, ${cell.position.y})`} opacity={opacity}>
        <title>{`${cell.id} · header`}</title>
        <text x={0} y={4} textAnchor="middle" fontSize="12" fontFamily="monospace"
          fill="#64748B" fontWeight={500}>
          {value}
        </text>
      </g>
    )
  }

  const width = cell.size?.width ?? 44
  const height = cell.size?.height ?? 44
  const palette = SEMANTIC_COLORS[resolveColor(cell.state?.color, cell.state?.role)]
  const isCurrent = cell.state?.role === 'current' || cell.state?.role === 'active'
  const isWindow = cell.state?.role === 'window'
  const isDanger = cell.state?.role === 'swapping' || cell.state?.role === 'conflict'
  const textColor = isDanger ? SEMANTIC_COLORS.danger.text : SEMANTIC_COLORS.idle.text
  const windowPalette = isWindow ? SEMANTIC_COLORS.window : null
  const cellFill = windowPalette?.fill ?? palette.fill
  const cellStroke = windowPalette?.stroke ?? palette.stroke
  const cellStrokeWidth = isWindow ? SHAPE.strokeWidth.thin : SHAPE.strokeWidth.base
  // Truncate long values so they never spill past the cell border.
  const displayValue = truncateToWidth(value, width - 6, 14)

  return (
    <g transform={`translate(${cell.position.x}, ${cell.position.y})`} opacity={opacity}>
      <title>{`${cell.id}${cell.row !== undefined ? ` (${cell.row},${cell.col})` : ''} · ${cell.state?.role ?? 'idle'}`}</title>
      <g className={cell.state?.pulse ? 'cell-pulse' : undefined}>
        {isCurrent && (
          <rect x={-width / 2 - 4} y={-height / 2 - 4}
            width={width + 8} height={height + 8} rx={SHAPE.ringRadius}
            fill={palette.stroke} opacity="0.08" className="cell-current-ring" />
        )}
        <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={SHAPE.cellRadius}
          fill={cellFill} stroke={cellStroke} strokeWidth={cellStrokeWidth} />
        <text x={0} y={4} textAnchor="middle" fontSize="14" fontFamily="monospace"
          fill={textColor} fontWeight={isCurrent ? 600 : 400}>
          {displayValue !== value && <title>{value}</title>}
          {displayValue}
        </text>
        {cell.col !== undefined && showColLabel(cell.id) && (
          <text x={0} y={height / 2 + 14} textAnchor="middle" fontSize="10"
            fill="#94A3B8" fontFamily="monospace">
            {cell.row !== undefined ? `${cell.row},${cell.col}` : cell.col}
          </text>
        )}
      </g>
      <style>{CELL_KEYFRAMES}</style>
    </g>
  )
}

// Dedicated-structure cells get their index/labels drawn by their own View
// (HashTableView, VariablesView, StringView, SetView, ContainerView), so the
// generic col label here would be duplicate noise.
const DEDICATED_PREFIXES = ['queue_', 'stack_', 'deque_', 'set_', 'hashbucket_', 'hashentry_', 'mathvar_']
function showColLabel(id: string): boolean {
  if (DEDICATED_PREFIXES.some(p => id.startsWith(p))) return false
  if (/^s_\d+_\d+$/.test(id)) return false // string char cells (StringView draws indices)
  return true
}
