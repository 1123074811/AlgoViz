import type { SceneCell } from '../types'

interface VariablesViewProps {
  vars: SceneCell[]
  hideTitle?: boolean
}

const STROKE = '#94A3B8'
const STROKE_WIDTH = 1.6

/**
 * Structural overlay for the dedicated "variables / register panel" visual used
 * by structure-free algorithms (GCD, fast power, Fibonacci, digit DP …). Each
 * variable cell body (the `name=value` chip) is drawn by CellView in the main
 * scene loop; this component draws only the surrounding shell — the panel frame
 * and its "变量" title. Mirrors HashTableView / ContainerView's "draw shell,
 * not cells" convention.
 */
export default function VariablesView({ vars, hideTitle }: VariablesViewProps) {
  if (vars.length === 0) return null

  const sorted = [...vars].sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const cellH = sorted[0].size?.height ?? 52

  const minX = Math.min(...sorted.map(c => c.position.x - (c.size?.width ?? 72) / 2))
  const maxX = Math.max(...sorted.map(c => c.position.x + (c.size?.width ?? 72) / 2))
  const frameY = sorted[0].position.y - cellH / 2
  const pad = 12

  return (
    <g>
      {/* Panel outer frame */}
      <rect
        x={minX - pad} y={frameY - pad}
        width={maxX - minX + 2 * pad} height={cellH + 2 * pad}
        rx={10} ry={10}
        fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeDasharray="5 3" opacity={0.7}
      />
      {!hideTitle && (
        <text
          x={minX - pad} y={frameY - pad - 6}
          textAnchor="start" fontSize="11" fill="#64748B" fontFamily="monospace"
        >
          变量
        </text>
      )}

      {/* Per-variable name labels above each register chip */}
      {sorted.map(c => {
        const meta = c.meta as { name?: string } | undefined
        const name = meta?.name ?? nameOfId(c.id)
        if (!name) return null
        return (
          <text
            key={`name_${c.id}`}
            x={c.position.x} y={c.position.y - cellH / 2 - 8}
            textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="monospace"
          >
            {name}
          </text>
        )
      })}
    </g>
  )
}

function nameOfId(id: string): string | undefined {
  // mathvar_<name>
  return id.startsWith('mathvar_') ? id.slice('mathvar_'.length) : undefined
}
