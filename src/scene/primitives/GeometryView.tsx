import type { SceneCell } from '../types'
import { makeProjector } from '../compilers/geometryMap'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

const COLOR = (c?: string) =>
  c === 'success' ? SEMANTIC_COLORS.success.stroke
  : c === 'danger' ? SEMANTIC_COLORS.danger.stroke
  : c === 'warning' ? SEMANTIC_COLORS.compare.stroke
  : c === 'muted' ? NEUTRALS.mutedText
  : SEMANTIC_COLORS.primary.stroke

interface Props { cells: SceneCell[] }

export default function GeometryView({ cells }: Props) {
  const plane = cells.find(c => (c.meta as { kind?: string })?.kind === 'plane')
  if (!plane) return null
  const meta = plane.meta as { xRange: [number, number]; yRange: [number, number] }
  const project = makeProjector(meta.xRange, meta.yRange)

  return (
    <g className="geometry-view">
      {/* 坐标轴 */}
      <line x1={project(meta.xRange[0], 0).x} y1={project(meta.xRange[0], 0).y} x2={project(meta.xRange[1], 0).x} y2={project(meta.xRange[1], 0).y} stroke={NEUTRALS.frameStroke} strokeWidth={1} />
      <line x1={project(0, meta.yRange[0]).x} y1={project(0, meta.yRange[0]).y} x2={project(0, meta.yRange[1]).x} y2={project(0, meta.yRange[1]).y} stroke={NEUTRALS.frameStroke} strokeWidth={1} />
      {cells.map(c => {
        const m = c.meta as Record<string, unknown>
        const color = COLOR(m.color as string)
        if (m.kind === 'segment') {
          const a = project(m.gx as number, m.gy as number)
          const to = m.to as [number, number]
          const b = project(to[0], to[1])
          return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1.6} />
        }
        if (m.kind === 'polygon') {
          const pts = (m.points as Array<[number, number]>).map(([x, y]) => { const p = project(x, y); return `${p.x},${p.y}` }).join(' ')
          return <polygon key={c.id} points={pts} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.6} />
        }
        if (m.kind === 'sweepline') {
          const axis = m.axis as 'x' | 'y'; const v = m.value as number
          return axis === 'x'
            ? <line key={c.id} x1={project(v, meta.yRange[0]).x} y1={project(v, meta.yRange[0]).y} x2={project(v, meta.yRange[1]).x} y2={project(v, meta.yRange[1]).y} stroke={color} strokeWidth={1.4} strokeDasharray="5 4" />
            : <line key={c.id} x1={project(meta.xRange[0], v).x} y1={project(meta.xRange[0], v).y} x2={project(meta.xRange[1], v).x} y2={project(meta.xRange[1], v).y} stroke={color} strokeWidth={1.4} strokeDasharray="5 4" />
        }
        if (m.kind === 'point') {
          const p = project(m.gx as number, m.gy as number)
          return (
            <g key={c.id}>
              <circle cx={p.x} cy={p.y} r={5} fill={color} />
              {m.label != null && <text x={p.x + 8} y={p.y - 6} fontSize={12} fill={NEUTRALS.bodyText} fontFamily="monospace">{String(m.label)}</text>}
            </g>
          )
        }
        return null
      })}
    </g>
  )
}
