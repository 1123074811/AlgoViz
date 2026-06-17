import type { SceneNode } from '../types'
import { getAdaptiveCircleLayout } from '../engineUtils'
import { measureNodeWidth, truncateToWidth } from '../textMetrics'
import { SEMANTIC_COLORS, NEUTRALS, SHAPE, TYPO, RBTREE } from '../tokens'

// Legacy scene color names map onto semantic tokens (warning→compare, muted→idle).
const COLOR_MAP: Record<string, { stroke: string; fill: string }> = {
  primary: SEMANTIC_COLORS.primary,
  success: SEMANTIC_COLORS.success,
  warning: SEMANTIC_COLORS.compare,
  danger:  SEMANTIC_COLORS.danger,
  // Rect nodes paint a pure-white body; muted only contributes the idle stroke.
  muted:   { stroke: SEMANTIC_COLORS.idle.stroke, fill: 'white' },
}

interface NodeViewProps { node: SceneNode }

export default function NodeView({ node }: NodeViewProps) {
  const isCircle = (
    node.variant.startsWith('graph.') ||
    node.variant.startsWith('union_find.') ||
    node.variant.startsWith('tree.')
  ) && node.variant !== 'tree.btree'
  const width = node.size?.width ?? (isCircle ? 48 : 96)
  const height = node.size?.height ?? (isCircle ? 48 : 44)
  const palette = node.state?.color ? (COLOR_MAP[node.state.color] ?? COLOR_MAP.muted) : COLOR_MAP.muted
  const opacity = node.state?.opacity ?? 1
  const isActive = node.state?.role === 'active' || node.state?.role === 'visited' || node.state?.role === 'current'

  if (isCircle) {
    return <><NodeStyles />{renderCircle(node, width, palette, opacity, isActive)}</>
  }
  return <><NodeStyles />{renderRect(node, width, height, palette, opacity, isActive)}</>
}

function renderCircle(
  node: SceneNode,
  d: number,
  palette: { stroke: string; fill: string },
  opacity: number,
  isActive: boolean
) {
  const value = node.fields[0]?.value?.toString() ?? ''
  const { r, fontSize } = getAdaptiveCircleLayout(value, d)
  // 红黑树节点:rbColor 覆盖填充/描边为红/黑、文字转白(对齐 demo .rbnode)；状态光环仍叠加。
  const rb = node.state?.rbColor ? RBTREE[node.state.rbColor] : null
  return (
    <g transform={`translate(${node.position.x}, ${node.position.y})`} opacity={opacity}>
      <title>{`${node.id} · ${node.variant}${node.state?.role ? ` · ${node.state.role}` : ''}`}</title>
      <g className={node.state?.pulse ? 'node-pulse' : undefined}>
        {isActive && (
          <circle cx={0} cy={0} r={r + 4} fill={palette.stroke} opacity="0.08" className="node-active-ring" />
        )}
        <circle cx={0} cy={0} r={r} fill={rb?.fill ?? palette.fill} stroke={rb?.stroke ?? palette.stroke} strokeWidth={SHAPE.strokeWidth.base} />
        <text x={0} y={Math.round(fontSize * 0.3)} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill={rb?.text ?? SEMANTIC_COLORS.idle.text} fontWeight="bold">{value}</text>
        {node.fields.length > 1 && node.fields.slice(1).map((field, i) => (
          <text key={field.id} x={0} y={r + 14 + i * 12} textAnchor="middle" fontSize="10" fill={NEUTRALS.mutedText}>
            {field.label}:{field.value ?? ''}
          </text>
        ))}
      </g>
    </g>
  )
}

function renderRect(
  node: SceneNode,
  width: number,
  height: number,
  palette: { stroke: string; fill: string },
  opacity: number,
  isActive: boolean
) {
  const fieldCount = Math.max(node.fields.length, 1)
  // Adaptive width: each field needs enough room for its own (longest) text.
  // The widest field's text drives a minimum per-field width; total width is the
  // larger of the passed-in width and the sum of per-field requirements.
  const perFieldWidth = node.fields.reduce((max, field) => {
    const text = (field.value ?? field.label ?? field.id)?.toString() ?? ''
    return Math.max(max, measureNodeWidth(text, { padding: 14, min: 36, max: 180 }))
  }, 0)
  const adaptiveWidth = perFieldWidth * fieldCount
  width = Math.max(width, adaptiveWidth)
  const fieldWidth = width / fieldCount
  return (
    <g transform={`translate(${node.position.x}, ${node.position.y})`} opacity={opacity}>
      <title>{`${node.id} · ${node.variant}${node.state?.role ? ` · ${node.state.role}` : ''}`}</title>
      <g className={node.state?.pulse ? 'node-pulse' : undefined}>
        {isActive && (
          <rect x={-width / 2 - 4} y={-height / 2 - 4} width={width + 8} height={height + 8}
            rx={12} fill={palette.stroke} opacity="0.08" className="node-active-ring" />
        )}
        <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8}
          fill="white" stroke={palette.stroke} strokeWidth={SHAPE.strokeWidth.base} />
        {node.fields.map((field, index) => {
          const x = -width / 2 + index * fieldWidth
          const isData = field.role === 'data' || field.role === 'key' || field.role === 'value'
          const fontSize = isData ? 14 : 11
          const rawText = (field.value ?? field.label ?? field.id)?.toString() ?? ''
          const text = truncateToWidth(rawText, fieldWidth - 8, fontSize)
          return (
            <g key={field.id}>
              {index > 0 && (
                <line x1={x} y1={-height / 2 + 4} x2={x} y2={height / 2 - 4}
                  stroke={SEMANTIC_COLORS.idle.stroke} strokeWidth={SHAPE.strokeWidth.thin} />
              )}
              <text x={x + fieldWidth / 2} y={isData ? -2 : 0}
                textAnchor="middle" fontSize={fontSize} fontFamily={isData ? 'monospace' : TYPO.serif}
                fill={isData ? SEMANTIC_COLORS.idle.text : NEUTRALS.mutedText} fontWeight={isData ? 700 : 400}>
                {text !== rawText && <title>{rawText}</title>}
                {text}
              </text>
              {field.label && isData && (
                <text x={x + fieldWidth / 2} y={15} textAnchor="middle" fontSize="9" fill={NEUTRALS.mutedText}>
                  {field.label}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </g>
  )
}

// Observable 风克制：当前/活动结点的强调环改为「静态柔光」(元素自带 opacity 0.08)，
// 去掉无限脉冲动画；保留一次性 pop 落定。
const NODE_STYLES = `
  .node-pulse { animation: node-pop 0.5s ease-in-out; transform-box: fill-box; transform-origin: center; }
  @keyframes node-pop { 0% { transform: scale(0.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
`

function NodeStyles() {
  return <style>{NODE_STYLES}</style>
}

export { NodeStyles }
