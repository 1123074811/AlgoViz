import type { SceneCell } from '../types'

interface VariablesViewProps {
  vars: SceneCell[]
  hideTitle?: boolean
}

const STROKE = '#CBD5E1'
const ACTIVE = '#2563EB'

/**
 * Dedicated "variables / debugger locals" visual. Variables are drawn as plain
 * text instead of cells so they cannot be mistaken for an array or DP table.
 */
export default function VariablesView({ vars, hideTitle }: VariablesViewProps) {
  if (vars.length === 0) return null

  const sorted = [...vars].sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const rowH = 24

  const minX = Math.min(...sorted.map(c => c.position.x - (c.size?.width ?? 72) / 2))
  const maxX = Math.max(...sorted.map(c => {
    const meta = c.meta as VariableMeta | undefined
    const name = meta?.name ?? nameOfId(c.id) ?? ''
    const value = String(meta?.value ?? c.value ?? '')
    const deltaWidth = meta?.delta ? Math.min(80, meta.delta.length * 8 + 18) : 0
    const textWidth = Math.max(72, (name.length + value.length + 3) * 8)
    return c.position.x + (c.size?.width ?? 72) / 2 + deltaWidth
      + Math.max(0, textWidth - (c.size?.width ?? 72))
  }))
  const frameY = sorted[0].position.y - rowH / 2
  const pad = 12

  return (
    <g>
      <rect
        x={minX - pad} y={frameY - pad}
        width={maxX - minX + 2 * pad} height={rowH + 2 * pad}
        rx={4} ry={4}
        fill="#FFFFFF" fillOpacity={0.7} stroke={STROKE} strokeWidth={1} strokeDasharray="4 4" opacity={0.9}
      />
      {!hideTitle && (
        <text
          x={minX - pad} y={frameY - pad - 6}
          textAnchor="start" fontSize="11" fill="#64748B" fontFamily="monospace"
        >
          变量
        </text>
      )}

      {sorted.map(c => {
        const meta = c.meta as VariableMeta | undefined
        const name = meta?.name ?? nameOfId(c.id)
        if (!name) return null
        const value = String(c.value ?? meta?.value ?? '')
        const textColor = c.state?.pulse || c.state?.role === 'current' || c.state?.role === 'active' ? ACTIVE : '#334155'
        const labelColor = c.state?.pulse || c.state?.role === 'current' || c.state?.role === 'active' ? '#1D4ED8' : '#64748B'
        const valueX = c.position.x - (c.size?.width ?? 72) / 2 + Math.max(34, name.length * 8 + 18)
        return (
          <g key={`var_meta_${c.id}`}>
            <text
              x={c.position.x - (c.size?.width ?? 72) / 2} y={c.position.y + 4}
              textAnchor="start" fontSize="13" fill={labelColor} fontFamily="monospace" fontWeight={600}
            >
              {name}
            </text>
            <text
              x={valueX - 8} y={c.position.y + 4}
              textAnchor="start" fontSize="13" fill="#94A3B8" fontFamily="monospace"
            >
              =
            </text>
            <text
              x={valueX + 8} y={c.position.y + 4}
              textAnchor="start" fontSize="13" fill={textColor} fontFamily="monospace" fontWeight={c.state?.pulse ? 700 : 500}
            >
              {value}
            </text>
            {meta?.delta && (
              <text
                x={valueX + 8 + Math.max(10, value.length * 8) + 8}
                y={c.position.y + 4}
                textAnchor="start" fontSize="12" fill="#94A3B8" fontFamily="monospace"
              >
                {meta.delta}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

function nameOfId(id: string): string | undefined {
  // mathvar_<name>
  return id.startsWith('mathvar_') ? id.slice('mathvar_'.length) : undefined
}

interface VariableMeta {
  name?: string
  value?: string | number
  delta?: string
}
