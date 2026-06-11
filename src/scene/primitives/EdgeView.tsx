import React from 'react'
import type { Point, SceneEdge, SceneState } from '../types'
import { getAdaptiveCircleLayout } from '../engineUtils'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

const COLOR_MAP = {
  primary: SEMANTIC_COLORS.primary.stroke,
  success: SEMANTIC_COLORS.success.stroke,
  warning: SEMANTIC_COLORS.compare.stroke,
  danger: SEMANTIC_COLORS.danger.stroke,
  // Edge "muted" uses a darker slate than the idle cell stroke for line legibility.
  muted: NEUTRALS.mutedText,
}

interface EdgeViewProps {
  edge: SceneEdge
  scene: SceneState
}

export default function EdgeView({ edge, scene }: EdgeViewProps) {
  const color = edge.state?.color ? COLOR_MAP[edge.state.color] : edge.style?.color ? COLOR_MAP[edge.style.color] : NEUTRALS.mutedText

  // Self-loop: rotation arrows (clockwise / counterclockwise)
  if (edge.from.entityId === edge.to.entityId && (edge.variant === 'clockwise' || edge.variant === 'counterclockwise')) {
    return renderSelfLoop(edge, scene, color)
  }

  const rawFrom = resolveAnchor(scene, edge.from.entityId, edge.from.portId)
  const rawTo = resolveAnchor(scene, edge.to.entityId, edge.to.portId)
  const from = rawFrom && rawTo ? trimAnchor(scene, edge.from.entityId, rawFrom, rawTo) : rawFrom
  const to = rawFrom && rawTo ? trimAnchor(scene, edge.to.entityId, rawTo, rawFrom) : rawTo
  if (!from || !to) return null

  // Select marker: trajectory arrows use subtle color-matched markers, structural edges use standard
  const markerEnd = edge.directed ? selectMarker(edge) : undefined

  // Academic dash pattern: subtle long dash for trajectory, short dash for structural
  const dashArray = edge.style?.dashed
    ? (edge.state?.pulse ? '6 4' : '5 5')
    : undefined

  // Default thickness: structural=1.5, trajectory=1.2
  const thickness = edge.style?.thickness ?? (edge.style?.dashed ? 1.2 : 1.5)

  // 数组移动/右移:在格子上方画一道明显拱起的跳跃弧,避免挤在相邻格子缝隙里。
  if (edge.variant === 'hop') {
    return renderHopArc(edge, scene, color, thickness, dashArray, markerEnd)
  }

  let path = ''
  if (edge.style?.curved) {
    path = computeCurvedPath(from, to, edge)
  } else {
    path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  }

  return (
    <g>
      <title>{`${edge.id}: ${edge.from.entityId}${edge.from.portId ? `.${edge.from.portId}` : ''} → ${edge.to.entityId}${edge.to.portId ? `.${edge.to.portId}` : ''}`}</title>
      <path d={path} fill="none" stroke={color} strokeWidth={thickness}
        strokeDasharray={dashArray}
        strokeOpacity={edge.style?.dashed ? 0.7 : 1}
        markerEnd={markerEnd}
        className={edge.state?.pulse ? 'scene-edge-flow' : undefined} />
      {edge.label && <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle" className="fill-slate-500 text-xs">{edge.label}</text>}
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
 * Compute an elegant academic curved path between two points.
 * Uses quadratic Bézier with context-aware control point placement.
 */
function computeCurvedPath(from: Point, to: Point, edge: SceneEdge): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (Math.abs(dy) < 30 && Math.abs(dx) < 30) {
    // Very close points: small bottom dip
    return `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.max(from.y, to.y) + 30} ${to.x} ${to.y}`
  }

  if (Math.abs(dy) < 30) {
    // Horizontal separation: elegant bottom arc (e.g., adjacent list nodes, swap arrows)
    const dipDepth = Math.max(35, dist * 0.25)
    return `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.max(from.y, to.y) + dipDepth} ${to.x} ${to.y}`
  }

  if (Math.abs(dx) < 30) {
    // Vertical separation: elegant side arc (e.g., stack push/pop)
    const sideDir = edge.from.portId === 'right' || edge.to.portId === 'right' ? 1 : -1
    const bulge = Math.max(40, Math.abs(dy) * 0.3)
    const controlX = (from.x + to.x) / 2 + sideDir * bulge
    return `M ${from.x} ${from.y} Q ${controlX} ${(from.y + to.y) / 2} ${to.x} ${to.y}`
  }

  // Diagonal: natural outward side-arch
  const bulgeX = dx > 0 ? -Math.abs(dy) * 0.3 : Math.abs(dy) * 0.3
  const controlX = (from.x + to.x) / 2 + bulgeX
  const controlY = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
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

export function trimAnchor(scene: SceneState, entityId: string, from: Point, to: Point): Point {
  const entity = scene.entities[entityId]
  if (!entity || !('size' in entity) || !entity.size) return from
  const gap = 5

  const isCircle = entity.type === 'node' && (
    entity.variant.startsWith('tree.') ||
    entity.variant.startsWith('graph.') ||
    entity.variant.startsWith('union_find.')
  )

  // 圆形结点：端口锚点已落在结点边界上。必须从「中心」沿朝向对方的方向算到圆周，
  // 否则把端口点当中心再裁掉一个半径，会重复裁剪、把父子连线砍成悬在中间的短线。
  if (isCircle && 'position' in entity && entity.position) {
    const center = entity.position
    let r = entity.size.width / 2
    if ('fields' in entity && entity.fields?.[0]?.value != null) {
      r = getAdaptiveCircleLayout(entity.fields[0].value.toString(), entity.size.width).r
    }
    const dx = to.x - center.x
    const dy = to.y - center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return from
    const k = (r + gap) / dist
    return { x: center.x + dx * k, y: center.y + dy * k }
  }

  // 矩形结点/单元格：从「中心」沿朝向对方的方向裁到矩形边界 + gap。
  // 与圆形分支同理——不能把 from 当中心:带 side 端口的结点(如链表节点)其
  // resolveAnchor 返回的已是边缘锚点,若再按半宽/半高裁剪会二次裁剪、把端点拽进
  // 结点内部,导致箭头头部被结点矩形遮挡。无端口的 cell 其锚点本就是中心,结果不变。
  const center = ('position' in entity && entity.position) ? entity.position : from
  const dx = to.x - center.x
  const dy = to.y - center.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return from
  const halfW = entity.size.width / 2
  const halfH = entity.size.height / 2
  const scale = Math.min(halfW / Math.max(Math.abs(dx), 0.001), halfH / Math.max(Math.abs(dy), 0.001))
  const boundaryX = center.x + dx * scale
  const boundaryY = center.y + dy * scale
  return {
    x: boundaryX + (dx / dist) * gap,
    y: boundaryY + (dy / dist) * gap,
  }
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
