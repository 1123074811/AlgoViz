import type { SceneCell } from '../types'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

interface Props { cells: SceneCell[] }
const MAX_H = 200

export default function DistributionView({ cells }: Props) {
  const bins = cells.filter(c => (c.meta as { kind?: string })?.kind === 'bin').sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const res = cells.filter(c => (c.meta as { kind?: string })?.kind === 'reservoir').sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const maxW = Math.max(1, ...bins.map(b => (b.meta as { weight?: number }).weight ?? 0))

  return (
    <g className="distribution-view">
      {bins.map(c => {
        const w = (c.meta as { weight?: number; label?: string })
        const h = ((w.weight ?? 0) / maxW) * MAX_H
        const bw = c.size?.width ?? 40
        const active = c.state?.pulse || c.state?.role === 'active'
        const fill = active ? SEMANTIC_COLORS.success.fill : SEMANTIC_COLORS.primary.fill
        const stroke = active ? SEMANTIC_COLORS.success.stroke : SEMANTIC_COLORS.primary.stroke
        const baseY = c.position.y
        return (
          <g key={c.id}>
            <rect x={c.position.x - bw / 2} y={baseY - h} width={bw} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={1.4} />
            <text x={c.position.x} y={baseY + 16} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={NEUTRALS.labelText}>{String(w.label ?? c.value ?? '')}</text>
            <text x={c.position.x} y={baseY - h - 6} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={NEUTRALS.mutedText}>{String(w.weight ?? '')}</text>
          </g>
        )
      })}
      {res.map(c => {
        const s = c.size?.width ?? 40
        const active = c.state?.pulse
        return (
          <g key={c.id}>
            <rect x={c.position.x - s / 2} y={c.position.y - s / 2} width={s} height={s} rx={6} fill={active ? SEMANTIC_COLORS.success.fill : NEUTRALS.surface} stroke={active ? SEMANTIC_COLORS.success.stroke : NEUTRALS.frameStroke} strokeWidth={1.4} />
            <text x={c.position.x} y={c.position.y + 4} textAnchor="middle" fontSize={13} fontFamily="monospace" fill={SEMANTIC_COLORS.primary.text}>{String(c.value ?? '')}</text>
          </g>
        )
      })}
    </g>
  )
}
