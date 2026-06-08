import type { SceneGroup } from '../types'
import { NEUTRALS } from '../tokens'

interface RegionViewProps { region: SceneGroup }

/** 画组合场景中单个结构区域的边框 + 标题。实体本体由各自 View/CellView/NodeView 画。 */
export default function RegionView({ region }: RegionViewProps) {
  if (!region.bounds) return null
  const { position, size } = region.bounds
  return (
    <g>
      <rect
        x={position.x} y={position.y} width={size.width} height={size.height}
        rx={12} ry={12}
        fill={NEUTRALS.surface} fillOpacity={0.35}
        stroke={NEUTRALS.frameStroke} strokeWidth={1.4} strokeDasharray="6 4"
      />
      {region.label && (
        <text x={position.x + 10} y={position.y - 8} fontSize="12" fontWeight={600}
          fill={NEUTRALS.labelText} fontFamily="monospace">
          {region.label}
        </text>
      )}
    </g>
  )
}
