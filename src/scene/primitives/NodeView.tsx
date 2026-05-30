import type { SceneNode } from '../types'

const COLOR_MAP: Record<string, { stroke: string; fill: string }> = {
  primary: { stroke: '#3B82F6', fill: '#EFF6FF' },
  success: { stroke: '#10B981', fill: '#ECFDF5' },
  warning: { stroke: '#F59E0B', fill: '#FFFBEB' },
  danger:  { stroke: '#EF4444', fill: '#FEF2F2' },
  muted:   { stroke: '#E2E8F0', fill: 'white' },
}

interface NodeViewProps { node: SceneNode }

export default function NodeView({ node }: NodeViewProps) {
  const isCircle = node.variant.startsWith('graph.') || node.variant.startsWith('tree.')
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
  const r = d / 2
  const value = node.fields[0]?.value?.toString() ?? ''
  return (
    <g transform={`translate(${node.position.x}, ${node.position.y})`} opacity={opacity}>
      <title>{`${node.id} · ${node.variant}${node.state?.role ? ` · ${node.state.role}` : ''}`}</title>
      <g className={node.state?.pulse ? 'node-pulse' : undefined}>
        {isActive && (
          <circle cx={0} cy={0} r={r + 4} fill={palette.stroke} opacity="0.08" className="node-active-ring" />
        )}
        <circle cx={0} cy={0} r={r} fill={palette.fill} stroke={palette.stroke} strokeWidth={1.5} />
        <text x={0} y={4} textAnchor="middle" fontSize="14" fontFamily="monospace" fill="#1E293B" fontWeight="bold">{value}</text>
        {node.fields.length > 1 && node.fields.slice(1).map((field, i) => (
          <text key={field.id} x={0} y={r + 14 + i * 12} textAnchor="middle" fontSize="10" fill="#94A3B8">
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
  const fieldWidth = width / Math.max(node.fields.length, 1)
  return (
    <g transform={`translate(${node.position.x}, ${node.position.y})`} opacity={opacity}>
      <title>{`${node.id} · ${node.variant}${node.state?.role ? ` · ${node.state.role}` : ''}`}</title>
      <g className={node.state?.pulse ? 'node-pulse' : undefined}>
        {isActive && (
          <rect x={-width / 2 - 4} y={-height / 2 - 4} width={width + 8} height={height + 8}
            rx={12} fill={palette.stroke} opacity="0.08" className="node-active-ring" />
        )}
        <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8}
          fill="white" stroke={palette.stroke} strokeWidth={1.5} />
        {node.fields.map((field, index) => {
          const x = -width / 2 + index * fieldWidth
          const isData = field.role === 'data' || field.role === 'key' || field.role === 'value'
          return (
            <g key={field.id}>
              {index > 0 && (
                <line x1={x} y1={-height / 2 + 4} x2={x} y2={height / 2 - 4}
                  stroke="#E2E8F0" strokeWidth={1} />
              )}
              <text x={x + fieldWidth / 2} y={isData ? -2 : 0}
                textAnchor="middle" fontSize={isData ? 14 : 11} fontFamily="monospace"
                fill={isData ? '#1E293B' : '#94A3B8'} fontWeight={isData ? 700 : 400}>
                {field.value ?? field.label ?? field.id}
              </text>
              {field.label && isData && (
                <text x={x + fieldWidth / 2} y={15} textAnchor="middle" fontSize="9" fill="#94A3B8">
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

const NODE_STYLES = `
  .node-pulse { animation: node-pop 0.5s ease-in-out; transform-box: fill-box; transform-origin: center; }
  .node-active-ring { animation: node-ring 0.9s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes node-pop { 0% { transform: scale(0.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
  @keyframes node-ring { from { opacity: 0.15; transform: scale(0.94); } to { opacity: 0.02; transform: scale(1.12); } }
`

function NodeStyles() {
  return <style>{NODE_STYLES}</style>
}

export { NodeStyles }
