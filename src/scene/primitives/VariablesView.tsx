import type { SceneCell } from '../types'
import { NEUTRALS } from '../tokens'

interface VariablesViewProps {
  vars: SceneCell[]
  hideTitle?: boolean
}

const STROKE = NEUTRALS.frameStroke
// Deeper blue than the primary token: signals a variable that just changed.
const ACTIVE = '#2563EB'

/**
 * Dedicated "variables / debugger locals" visual. Variables are drawn as plain
 * text instead of cells so they cannot be mistaken for an array or DP table.
 */
const CHAR_W = 8 // 13px 等宽字体的近似字宽
const MAX_VALUE_CHARS = 18 // 过长的值(如序列化字符串)截断,避免撑爆面板
const ITEM_GAP = 34
const ROW_H = 24

function clip(s: string): string {
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS - 1) + '…' : s
}

/** 计算单个变量自身所需宽度，后续按真实宽度单行顺排。 */
function measureVar(c: SceneCell) {
  const meta = c.meta as VariableMeta | undefined
  const name = meta?.name ?? nameOfId(c.id) ?? ''
  const value = clip(String(c.value ?? meta?.value ?? ''))
  const delta = meta?.delta ? clip(meta.delta) : ''
  const nameW = Math.max(24, name.length * CHAR_W)
  const valueW = Math.max(12, value.length * CHAR_W)
  const deltaW = delta ? delta.length * CHAR_W + 14 : 0
  const width = nameW + 22 + valueW + deltaW
  return { meta, name, value, delta, nameW, valueW, width }
}

export default function VariablesView({ vars, hideTitle }: VariablesViewProps) {
  if (vars.length === 0) return null

  const sorted = [...vars].sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const measured = sorted.map(measureVar)
  const sourceMinX = Math.min(...sorted.map(c => c.position.x - (c.size?.width ?? 72) / 2))
  const startY = sorted[0].position.y
  const layouts: Array<ReturnType<typeof measureVar> & {
    leftEdge: number
    valueX: number
    deltaX: number
    y: number
  }> = []
  let cursorX = sourceMinX

  measured.forEach((item) => {
    const leftEdge = cursorX
    const valueX = leftEdge + item.nameW + 14
    const deltaX = valueX + 8 + item.valueW + 12
    layouts.push({ ...item, leftEdge, valueX, deltaX, y: startY })
    cursorX += item.width + ITEM_GAP
  })

  const minX = sourceMinX
  const maxX = Math.max(sourceMinX, cursorX - ITEM_GAP)
  const frameY = startY - ROW_H / 2
  const pad = 12

  return (
    <g>
      <rect
        x={minX - pad} y={frameY - pad}
        width={maxX - minX + 2 * pad} height={ROW_H + 2 * pad}
        rx={4} ry={4}
        fill={NEUTRALS.surface} fillOpacity={0.7} stroke={STROKE} strokeWidth={1} strokeDasharray="4 4" opacity={0.9}
      />
      {!hideTitle && (
        <text
          x={minX - pad} y={frameY - pad - 6}
          textAnchor="start" fontSize="11" fill={NEUTRALS.labelText} fontFamily="monospace"
        >
          变量
        </text>
      )}

      {sorted.map((c, i) => {
        const l = layouts[i]
        if (!l.name) return null
        const active = c.state?.pulse || c.state?.role === 'current' || c.state?.role === 'active'
        const textColor = active ? ACTIVE : '#334155'
        const labelColor = active ? '#1D4ED8' : NEUTRALS.labelText
        const title = `${l.name} = ${String(c.value ?? l.meta?.value ?? '')}${l.meta?.delta ? ' ' + l.meta.delta : ''}`
        return (
          <g key={`var_meta_${c.id}`}>
            <title>{title}</title>
            <text
              x={l.leftEdge} y={l.y + 4}
              textAnchor="start" fontSize="13" fill={labelColor} fontFamily="monospace" fontWeight={600}
            >
              {l.name}
            </text>
            <text
              x={l.valueX - 8} y={l.y + 4}
              textAnchor="start" fontSize="13" fill={NEUTRALS.mutedText} fontFamily="monospace"
            >
              =
            </text>
            <text
              x={l.valueX + 8} y={l.y + 4}
              textAnchor="start" fontSize="13" fill={textColor} fontFamily="monospace" fontWeight={c.state?.pulse ? 700 : 500}
            >
              {l.value}
            </text>
            {l.delta && (
              <text
                x={l.deltaX} y={l.y + 4}
                textAnchor="start" fontSize="12" fill={NEUTRALS.mutedText} fontFamily="monospace"
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
