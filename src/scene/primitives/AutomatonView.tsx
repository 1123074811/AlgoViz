import type { SceneCell } from '../types'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

interface Props { cells: SceneCell[] }

export default function AutomatonView({ cells }: Props) {
  return (
    <g className="automaton-view">
      {cells.map(c => {
        const m = (c.meta ?? {}) as { accepting?: boolean; start?: boolean }
        const active = c.state?.pulse || c.state?.role === 'active'
        const stroke = active ? SEMANTIC_COLORS.success.stroke : SEMANTIC_COLORS.primary.stroke
        const fill = active ? SEMANTIC_COLORS.success.fill : SEMANTIC_COLORS.primary.fill
        const r = (c.size?.width ?? 52) / 2
        return (
          <g key={c.id}>
            {m.start && (
              <line x1={c.position.x - r - 22} y1={c.position.y} x2={c.position.x - r - 2} y2={c.position.y} stroke={NEUTRALS.mutedText} strokeWidth={1.4} markerEnd="url(#sceneArrow)" />
            )}
            <circle cx={c.position.x} cy={c.position.y} r={r} fill={fill} stroke={stroke} strokeWidth={1.6} />
            {m.accepting && <circle cx={c.position.x} cy={c.position.y} r={r - 4} fill="none" stroke={stroke} strokeWidth={1.2} />}
            <text x={c.position.x} y={c.position.y + 4} textAnchor="middle" fontSize={13} fontFamily="monospace" fill={SEMANTIC_COLORS.primary.text}>{String(c.value ?? '')}</text>
          </g>
        )
      })}
    </g>
  )
}
