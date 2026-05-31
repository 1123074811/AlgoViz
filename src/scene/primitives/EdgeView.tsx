import type { Point, SceneEdge, SceneState } from '../types'

const COLOR_MAP = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#94A3B8',
}

interface EdgeViewProps {
  edge: SceneEdge
  scene: SceneState
}

export default function EdgeView({ edge, scene }: EdgeViewProps) {
  const rawFrom = resolveAnchor(scene, edge.from.entityId, edge.from.portId)
  const rawTo = resolveAnchor(scene, edge.to.entityId, edge.to.portId)
  const from = rawFrom && rawTo ? trimAnchor(scene, edge.from.entityId, rawFrom, rawTo) : rawFrom
  const to = rawFrom && rawTo ? trimAnchor(scene, edge.to.entityId, rawTo, rawFrom) : rawTo
  if (!from || !to) return null

  const color = edge.state?.color ? COLOR_MAP[edge.state.color] : edge.style?.color ? COLOR_MAP[edge.style.color] : '#94A3B8'
  const markerEnd = edge.directed ? edge.variant === 'dependency' ? 'url(#sceneDependencyArrow)' : 'url(#sceneArrow)' : undefined
  
  let path = ''
  if (edge.style?.curved) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    if (Math.abs(dy) < 30) {
      // Horizontal separation: classic bottom dip (e.g., adjacent list nodes)
      path = `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.max(from.y, to.y) + 40} ${to.x} ${to.y}`
    } else {
      // Significant vertical separation: sweep in a beautiful, natural outward side-arch
      const bulgeX = dx > 0 ? -Math.abs(dy) * 0.35 : Math.abs(dy) * 0.35
      const controlX = (from.x + to.x) / 2 + bulgeX
      const controlY = (from.y + to.y) / 2
      path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
    }
  } else {
    path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  }

  return (
    <g>
      <title>{`${edge.id}: ${edge.from.entityId}${edge.from.portId ? `.${edge.from.portId}` : ''} → ${edge.to.entityId}${edge.to.portId ? `.${edge.to.portId}` : ''}`}</title>
      <path d={path} fill="none" stroke={color} strokeWidth={edge.style?.thickness ?? 2} strokeDasharray={edge.style?.dashed ? '4 4' : undefined} markerEnd={markerEnd} className={edge.state?.pulse ? 'scene-edge-flow' : undefined} />
      {edge.label && <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle" className="fill-slate-500 text-xs">{edge.label}</text>}
    </g>
  )
}

function trimAnchor(scene: SceneState, entityId: string, from: Point, to: Point): Point {
  const entity = scene.entities[entityId]
  if (!entity || !('size' in entity) || !entity.size) return from
  const dx = to.x - from.x
  const dy = to.y - from.y
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax === 0 && ay === 0) return from

  const halfW = entity.size.width / 2
  const halfH = entity.size.height / 2
  const scale = Math.min(halfW / Math.max(ax, 0.001), halfH / Math.max(ay, 0.001))
  return { x: from.x + dx * scale, y: from.y + dy * scale }
}

export function resolveAnchor(scene: SceneState, entityId: string, portId?: string): Point | null {
  const entity = scene.entities[entityId]
  if (!entity || !('position' in entity)) return null
  const position = entity.position
  if (!position) return null
  const width = 'size' in entity ? entity.size?.width ?? 80 : 80
  const height = 'size' in entity ? entity.size?.height ?? 50 : 50
  const port = entity.type === 'node' ? entity.ports.find((item) => item.id === portId) : undefined

  if (!port) return position
  const offset = port.offset ?? { x: 0, y: 0 }

  switch (port.side) {
    case 'left':
      return { x: position.x - width / 2 + offset.x, y: position.y + offset.y }
    case 'right':
      return { x: position.x + width / 2 + offset.x, y: position.y + offset.y }
    case 'top':
      return { x: position.x + offset.x, y: position.y - height / 2 + offset.y }
    case 'bottom':
      return { x: position.x + offset.x, y: position.y + height / 2 + offset.y }
    case 'top-left':
      return { x: position.x - width / 2 + offset.x, y: position.y - height / 2 + offset.y }
    case 'top-right':
      return { x: position.x + width / 2 + offset.x, y: position.y - height / 2 + offset.y }
    case 'bottom-left':
      return { x: position.x - width / 2 + offset.x, y: position.y + height / 2 + offset.y }
    case 'bottom-right':
      return { x: position.x + width / 2 + offset.x, y: position.y + height / 2 + offset.y }
    default:
      return position
  }
}
