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
const CHAR_W = 8 // 13px 等宽字体的近似字宽
const MAX_VALUE_CHARS = 22 // 过长的值(如序列化字符串)截断,避免撑爆面板

function clip(s: string): string {
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS - 1) + '…' : s
}

/** 计算单个变量的渲染布局(名称/值/delta 的位置与显示文本),供边框测量与渲染共用。 */
function layoutVar(c: SceneCell) {
  const meta = c.meta as VariableMeta | undefined
  const name = meta?.name ?? nameOfId(c.id) ?? ''
  const value = clip(String(c.value ?? meta?.value ?? ''))
  const delta = meta?.delta ? clip(meta.delta) : ''
  const leftEdge = c.position.x - (c.size?.width ?? 72) / 2
  const valueX = leftEdge + Math.max(34, name.length * CHAR_W + 18)
  const deltaX = valueX + 8 + Math.max(10, value.length * CHAR_W) + 8
  const right = (delta ? deltaX + delta.length * CHAR_W : valueX + 8 + value.length * CHAR_W) + 4
  return { meta, name, value, delta, leftEdge, valueX, deltaX, right }
}

export default function VariablesView({ vars, hideTitle }: VariablesViewProps) {
  if (vars.length === 0) return null

  const sorted = [...vars].sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const rowH = 24
  const layouts = sorted.map(layoutVar)

  // 边框按实际渲染文本的左右极值自适应,长值已截断,不再溢出。
  const minX = Math.min(...layouts.map(l => l.leftEdge))
  const maxX = Math.max(...layouts.map(l => l.right))
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

      {sorted.map((c, i) => {
        const l = layouts[i]
        if (!l.name) return null
        const active = c.state?.pulse || c.state?.role === 'current' || c.state?.role === 'active'
        const textColor = active ? ACTIVE : '#334155'
        const labelColor = active ? '#1D4ED8' : '#64748B'
        const title = `${l.name} = ${String(c.value ?? l.meta?.value ?? '')}${l.meta?.delta ? ' ' + l.meta.delta : ''}`
        return (
          <g key={`var_meta_${c.id}`}>
            <title>{title}</title>
            <text
              x={l.leftEdge} y={c.position.y + 4}
              textAnchor="start" fontSize="13" fill={labelColor} fontFamily="monospace" fontWeight={600}
            >
              {l.name}
            </text>
            <text
              x={l.valueX - 8} y={c.position.y + 4}
              textAnchor="start" fontSize="13" fill="#94A3B8" fontFamily="monospace"
            >
              =
            </text>
            <text
              x={l.valueX + 8} y={c.position.y + 4}
              textAnchor="start" fontSize="13" fill={textColor} fontFamily="monospace" fontWeight={c.state?.pulse ? 700 : 500}
            >
              {l.value}
            </text>
            {l.delta && (
              <text
                x={l.deltaX} y={c.position.y + 4}
                textAnchor="start" fontSize="12" fill="#94A3B8" fontFamily="monospace"
              >
                {l.delta}
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
