import type { ScenePointer, SceneState } from '../types'
import { resolveAnchor } from './EdgeView'

interface PointerViewProps {
  pointer: ScenePointer
  scene: SceneState
  index: number
}

export default function PointerView({ pointer, scene, index }: PointerViewProps) {
  const target = pointer.target ? resolveAnchor(scene, pointer.target.entityId, pointer.target.portId) : null
  const x = target?.x ?? pointer.position?.x ?? 80 + index * 78
  const y = target ? target.y - 72 - index * 16 : pointer.position?.y ?? 80

  return (
    <g>
      <title>{`${pointer.id} → ${pointer.target?.entityId ?? 'null'}${pointer.target?.portId ? `.${pointer.target.portId}` : ''}`}</title>
      <rect x={x - 24} y={y - 14} width={48} height={22} rx={6}
        fill="#EFF6FF" stroke="#93C5FD" strokeWidth={1} />
      <text x={x} y={y} textAnchor="middle" fontSize="11" fontFamily="monospace"
        fill="#3B82F6" fontWeight={600}>{pointer.label}</text>
      {target ? (
        <line x1={x} y1={y + 8} x2={target.x} y2={target.y - 24}
          stroke="#93C5FD" strokeWidth={1.5} markerEnd="url(#scenePointerArrow)" />
      ) : (
        <text x={x} y={y + 28} textAnchor="middle" fontSize="10" fill="#94A3B8">null</text>
      )}
    </g>
  )
}
