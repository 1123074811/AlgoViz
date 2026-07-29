import React from 'react'
import type { SceneEdge, SceneState } from '../../types'
import { computeCurvedRoute, resolveAnchor, trimAnchor } from '../../geometry'
import { SEMANTIC_COLORS, NEUTRALS, SHAPE } from '../../tokens'

export { resolveAnchor, trimAnchor } from '../../geometry'

const COLOR_MAP = {
  primary: SEMANTIC_COLORS.primary.stroke,
  success: SEMANTIC_COLORS.success.stroke,
  warning: SEMANTIC_COLORS.compare.stroke,
  danger: SEMANTIC_COLORS.danger.stroke,
  // Edge "muted" = demo 的发线色（极浅灰 #D3D3D3），结构边默认走它，高亮才上语义色。
  muted: NEUTRALS.edgeStroke,
}

interface EdgeRendererProps {
  edge: SceneEdge
  scene: SceneState
}

export default function EdgeRenderer({ edge, scene }: EdgeRendererProps) {
  const color = edge.state?.color ? COLOR_MAP[edge.state.color] : edge.style?.color ? COLOR_MAP[edge.style.color] : NEUTRALS.edgeStroke

  // Self-loop: rotation arrows (clockwise / counterclockwise)
  if (edge.from.entityId === edge.to.entityId && (edge.variant === 'clockwise' || edge.variant === 'counterclockwise')) {
    return renderSelfLoop(edge, scene, color)
  }

  const rawFrom = resolveAnchor(scene, edge.from.entityId, edge.from.portId)
  const rawTo = resolveAnchor(scene, edge.to.entityId, edge.to.portId)
  const from = rawFrom && rawTo ? trimAnchor(scene, edge.from.entityId, rawFrom, rawTo) : rawFrom
  const to = rawFrom && rawTo ? trimAnchor(scene, edge.to.entityId, rawTo, rawFrom, edge.directed ? 10 : 5) : rawTo
  if (!from || !to) return null

  // Select marker: trajectory arrows use subtle color-matched markers, structural edges use standard
  const markerEnd = edge.directed ? selectMarker(edge) : undefined

  // Academic dash pattern: subtle long dash for trajectory, short dash for structural
  const dashArray = edge.style?.dashed
    ? (edge.state?.pulse ? '6 4' : '5 5')
    : undefined

  // Default thickness 接 token：结构实线=base，轨迹虚线=thin（Observable 更细）。
  const thickness = edge.style?.thickness ?? (edge.style?.dashed ? SHAPE.strokeWidth.thin : SHAPE.strokeWidth.base)

  // 数组移动/右移:在格子上方画一道明显拱起的跳跃弧,避免挤在相邻格子缝隙里。
  if (edge.variant === 'hop') {
    return renderHopArc(edge, scene, color, thickness, dashArray, markerEnd)
  }

  const route = edge.route?.length
    ? edge.route
    : edge.style?.curved
      ? computeCurvedRoute(from, to, edge)
      : [from, to]
  const path = edge.style?.curved && route.length === 3
    ? `M ${route[0].x} ${route[0].y} Q ${route[1].x} ${route[1].y} ${route[2].x} ${route[2].y}`
    : route.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const labelPosition = edge.labelPosition ?? {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - 8,
  }

  return (
    <g>
      <title>{`${edge.id}: ${edge.from.entityId}${edge.from.portId ? `.${edge.from.portId}` : ''} → ${edge.to.entityId}${edge.to.portId ? `.${edge.to.portId}` : ''}`}</title>
      <path d={path} fill="none" stroke={color} strokeWidth={thickness}
        strokeDasharray={dashArray}
        strokeOpacity={edge.style?.dashed ? 0.7 : 1}
        markerEnd={markerEnd}
        className={edge.state?.pulse ? 'scene-edge-flow' : undefined} />
      {edge.label && <text x={labelPosition.x} y={labelPosition.y} textAnchor="middle" className="fill-slate-500 text-xs">{edge.label}</text>}
    </g>
  )
}

/**
 * Select the appropriate SVG marker based on edge variant and color.
 * Trajectory arrows get color-matched subtle markers; structural edges get standard markers.
 */
function selectMarker(edge: SceneEdge): string | undefined {
  if (edge.variant === 'dependency') return 'url(#sceneDependencyArrow)'
  // Trajectory arrows (dashed + curved) use color-matched trajectory markers
  if (edge.style?.dashed && edge.style?.curved) {
    const colorKey = edge.state?.color ?? edge.style?.color ?? 'muted'
    if (colorKey === 'success') return 'url(#sceneTrajectorySuccess)'
    if (colorKey === 'danger') return 'url(#sceneTrajectoryDanger)'
    if (colorKey === 'primary') return 'url(#sceneTrajectoryPrimary)'
  }
  return 'url(#sceneArrow)'
}

/**
 * 渲染数组「移动 / 右移」的跳跃弧:从源格顶部上方明显拱起到目标格顶部。
 * 直接读取格子真实位置(而非端口锚点),弧顶抬到格子上方,弧高随跨度自适应,
 * 既不挤在相邻格子的缝隙里,也避开格子下方的索引标签。
 */
function renderHopArc(
  edge: SceneEdge,
  scene: SceneState,
  color: string,
  thickness: number,
  dashArray: string | undefined,
  markerEnd: string | undefined,
): React.ReactElement | null {
  const fromEnt = scene.entities[edge.from.entityId]
  const toEnt = scene.entities[edge.to.entityId]
  if (!fromEnt || !toEnt || !('position' in fromEnt) || !('position' in toEnt)) return null
  if (!fromEnt.position || !toEnt.position) return null
  const fromHalfH = ('size' in fromEnt ? fromEnt.size?.height ?? 44 : 44) / 2
  const toHalfH = ('size' in toEnt ? toEnt.size?.height ?? 44 : 44) / 2
  const start = { x: fromEnt.position.x, y: fromEnt.position.y - fromHalfH }
  const end = { x: toEnt.position.x, y: toEnt.position.y - toHalfH }
  const span = Math.abs(end.x - start.x)
  // 弧顶净空:近距离也保证 ~34px,远距离按跨度放大(上限 120),避免过分夸张。
  const lift = Math.min(120, Math.max(34, span * 0.5))
  const topY = Math.min(start.y, end.y) - lift
  const ctrlX = (start.x + end.x) / 2
  const path = `M ${start.x} ${start.y} Q ${ctrlX} ${topY} ${end.x} ${end.y}`
  return (
    <g>
      <title>{`${edge.id}: ${edge.from.entityId} → ${edge.to.entityId}`}</title>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={dashArray}
        strokeOpacity={0.85}
        strokeLinecap="round"
        markerEnd={markerEnd}
        className={edge.state?.pulse ? 'scene-edge-flow' : undefined}
      />
    </g>
  )
}

/**
 * Render a self-loop arrow for tree rotation visualization.
 * Draws a circular arc above the node with an arrowhead indicating direction.
 */
function renderSelfLoop(edge: SceneEdge, scene: SceneState, color: string): React.ReactElement | null {
  const entity = scene.entities[edge.from.entityId]
  if (!entity || !('position' in entity) || !entity.position) return null
  const pos = entity.position
  const r = ('size' in entity ? entity.size?.width ?? 48 : 48) / 2
  const isClockwise = edge.variant === 'clockwise'

  // Loop arc parameters
  const loopR = r + 18
  const startAngle = isClockwise ? -60 : -120
  const endAngle = isClockwise ? 120 : 60

  // Convert angles to SVG arc
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180
  const cx = pos.x
  const cy = pos.y - r - loopR * 0.4

  const sx = cx + loopR * Math.cos(startRad)
  const sy = cy + loopR * Math.sin(startRad)
  const ex = cx + loopR * Math.cos(endRad)
  const ey = cy + loopR * Math.sin(endRad)

  const path = `M ${sx} ${sy} A ${loopR} ${loopR} 0 ${isClockwise ? 1 : 0} ${isClockwise ? 1 : 0} ${ex} ${ey}`
  const marker = isClockwise ? 'url(#sceneTrajectoryDanger)' : 'url(#sceneTrajectoryDanger)'

  return (
    <g>
      <title>{`${edge.id}: ${edge.variant} rotation on ${edge.from.entityId}`}</title>
      <path d={path} fill="none" stroke={color} strokeWidth={1.2}
        strokeDasharray="5 5" strokeOpacity={0.7}
        markerEnd={marker}
        className={edge.state?.pulse ? 'scene-edge-flow' : undefined} />
    </g>
  )
}
