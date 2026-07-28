import { getAdaptiveCircleLayout } from './engineUtils'
import { measureTextWidth } from './textMetrics'
import type { Point, SceneEdge, SceneEntity, SceneLabel, SceneState } from './types'

export interface GeometryBox {
  id: string
  kind: 'entity' | 'label' | 'edge-label'
  left: number
  right: number
  top: number
  bottom: number
}

export interface GeometryViolation {
  type: 'overlap' | 'edge-obstacle' | 'text-overflow'
  ids: string[]
  message: string
}

const LABEL_HEIGHT = 18
const ROUTE_CLEARANCE = 18

function box(id: string, kind: GeometryBox['kind'], position: Point, width: number, height: number): GeometryBox {
  return {
    id,
    kind,
    left: position.x - width / 2,
    right: position.x + width / 2,
    top: position.y - height / 2,
    bottom: position.y + height / 2,
  }
}

function entityBox(entity: SceneEntity): GeometryBox | null {
  if (
    !('position' in entity)
    || !entity.position
    || entity.id.startsWith('mathvar_')
    || entity.id.startsWith('geo_')
    || entity.id.startsWith('auto_')
    || entity.id.startsWith('prob_')
    || entity.state?.role === 'empty_placeholder'
  ) return null
  if (entity.type === 'label') {
    return labelBox(entity)
  }
  if (entity.type !== 'cell' && entity.type !== 'node') return null
  const width = entity.size?.width ?? 80
  const height = entity.size?.height ?? 44
  return box(entity.id, 'entity', entity.position, width, height)
}

function labelBox(label: SceneLabel): GeometryBox {
  return box(label.id, 'label', label.position, Math.min(260, measureTextWidth(label.text, 14)) + 8, LABEL_HEIGHT)
}

function edgeLabelBox(edge: SceneEdge): GeometryBox | null {
  if (!edge.label || !edge.labelPosition) return null
  return box(`edge-label:${edge.id}`, 'edge-label', edge.labelPosition, measureTextWidth(edge.label, 12) + 8, LABEL_HEIGHT)
}

/** Measure every visible obstacle used by layout validation and viewport fitting. */
export function measureSceneGeometry(scene: SceneState): GeometryBox[] {
  return [
    ...Object.values(scene.entities).map(entityBox).filter((item): item is GeometryBox => item !== null),
    ...Object.values(scene.labels).map(labelBox),
    ...Object.values(scene.edges).map(edgeLabelBox).filter((item): item is GeometryBox => item !== null),
  ]
}

function overlaps(a: GeometryBox, b: GeometryBox, clearance = 0): boolean {
  return a.left < b.right + clearance
    && a.right + clearance > b.left
    && a.top < b.bottom + clearance
    && a.bottom + clearance > b.top
}

function pointInBox(point: Point, obstacle: GeometryBox): boolean {
  return point.x > obstacle.left && point.x < obstacle.right
    && point.y > obstacle.top && point.y < obstacle.bottom
}

function segmentIntersectsBox(from: Point, to: Point, obstacle: GeometryBox): boolean {
  if (pointInBox(from, obstacle) || pointInBox(to, obstacle)) return true
  const dx = to.x - from.x
  const dy = to.y - from.y
  let near = 0
  let far = 1
  for (const [p, q] of [
    [-dx, from.x - obstacle.left],
    [dx, obstacle.right - from.x],
    [-dy, from.y - obstacle.top],
    [dy, obstacle.bottom - from.y],
  ] as Array<[number, number]>) {
    if (p === 0) {
      if (q <= 0) return false
      continue
    }
    const ratio = q / p
    if (p < 0) near = Math.max(near, ratio)
    else far = Math.min(far, ratio)
    if (near >= far) return false
  }
  return near < far && far > 0 && near < 1
}

function routeCollisionCount(route: Point[], obstacles: GeometryBox[]): number {
  let count = 0
  for (let i = 1; i < route.length; i++) {
    count += obstacles.filter(obstacle => segmentIntersectsBox(route[i - 1], route[i], obstacle)).length
  }
  return count
}

function routeLength(route: Point[]): number {
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y)
  }
  return total
}

export function resolveAnchor(scene: SceneState, entityId: string, portId?: string): Point | null {
  const entity = scene.entities[entityId]
  if (!entity || !('position' in entity) || !entity.position) return null
  const position = entity.position
  const width = 'size' in entity ? entity.size?.width ?? 80 : 80
  const height = 'size' in entity ? entity.size?.height ?? 50 : 50
  const port = entity.type === 'node' ? entity.ports.find(item => item.id === portId) : undefined
  if (!port) return position
  const offset = port.offset ?? { x: 0, y: 0 }
  const x = position.x + offset.x
  const y = position.y + offset.y
  switch (port.side) {
    case 'left': return { x: x - width / 2, y }
    case 'right': return { x: x + width / 2, y }
    case 'top': return { x, y: y - height / 2 }
    case 'bottom': return { x, y: y + height / 2 }
    case 'top-left': return { x: x - width / 2, y: y - height / 2 }
    case 'top-right': return { x: x + width / 2, y: y - height / 2 }
    case 'bottom-left': return { x: x - width / 2, y: y + height / 2 }
    case 'bottom-right': return { x: x + width / 2, y: y + height / 2 }
    default: return position
  }
}

export function trimAnchor(scene: SceneState, entityId: string, from: Point, to: Point): Point {
  const entity = scene.entities[entityId]
  if (!entity || !('size' in entity) || !entity.size || !('position' in entity) || !entity.position) return from
  const gap = 5
  const center = entity.position
  const dx = to.x - center.x
  const dy = to.y - center.y
  const distance = Math.hypot(dx, dy)
  if (distance === 0) return from

  const isCircle = entity.type === 'node' && (
    entity.variant.startsWith('tree.')
    || entity.variant.startsWith('graph.')
    || entity.variant.startsWith('union_find.')
  )
  if (isCircle) {
    let radius = entity.size.width / 2
    if (entity.fields[0]?.value != null) {
      radius = getAdaptiveCircleLayout(String(entity.fields[0].value), entity.size.width).r
    }
    const scale = (radius + gap) / distance
    return { x: center.x + dx * scale, y: center.y + dy * scale }
  }

  const scale = Math.min(
    entity.size.width / 2 / Math.max(Math.abs(dx), 0.001),
    entity.size.height / 2 / Math.max(Math.abs(dy), 0.001),
  )
  return {
    x: center.x + dx * scale + dx / distance * gap,
    y: center.y + dy * scale + dy / distance * gap,
  }
}

export function computeCurvedRoute(from: Point, to: Point, edge: SceneEdge): Point[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)
  if (Math.abs(dy) < 30 && Math.abs(dx) < 30) {
    return [from, { x: (from.x + to.x) / 2, y: Math.max(from.y, to.y) + 30 }, to]
  }
  if (Math.abs(dy) < 30) {
    return [from, { x: (from.x + to.x) / 2, y: Math.max(from.y, to.y) + Math.max(35, distance * 0.25) }, to]
  }
  if (Math.abs(dx) < 30) {
    const direction = edge.from.portId === 'right' || edge.to.portId === 'right' ? 1 : -1
    return [from, { x: (from.x + to.x) / 2 + direction * Math.max(40, Math.abs(dy) * 0.3), y: (from.y + to.y) / 2 }, to]
  }
  return [from, { x: (from.x + to.x) / 2 + (dx > 0 ? -1 : 1) * Math.abs(dy) * 0.3, y: (from.y + to.y) / 2 }, to]
}

function routeEdge(scene: SceneState, edge: SceneEdge, boxes: GeometryBox[]): Point[] | undefined {
  const rawFrom = resolveAnchor(scene, edge.from.entityId, edge.from.portId)
  const rawTo = resolveAnchor(scene, edge.to.entityId, edge.to.portId)
  if (!rawFrom || !rawTo) return undefined
  if (edge.id.startsWith('dep_') && /^cell_\d+_\d+$/.test(edge.from.entityId) && /^cell_\d+_\d+$/.test(edge.to.entityId)) {
    const matrixBoxes = boxes.filter(item => /^cell_\d+_\d+$/.test(item.id))
    const tableBoxes = boxes.filter(item => /^cell_\d+_\d+$/.test(item.id) || item.id.startsWith('m_'))
    const source = matrixBoxes.find(item => item.id === edge.from.entityId)
    const target = matrixBoxes.find(item => item.id === edge.to.entityId)
    if (source && target) {
      const outsideX = Math.min(...tableBoxes.map(item => item.left)) - ROUTE_CLEARANCE
      return [
        { x: rawFrom.x, y: source.top },
        { x: outsideX, y: source.top },
        { x: outsideX, y: target.top },
        { x: rawTo.x, y: target.top },
      ]
    }
  }
  const from = trimAnchor(scene, edge.from.entityId, rawFrom, rawTo)
  const to = trimAnchor(scene, edge.to.entityId, rawTo, rawFrom)
  if (edge.from.entityId === edge.to.entityId || edge.variant === 'hop') return [from, to]

  const obstacles = boxes.filter(item =>
    item.kind === 'entity'
    && item.id !== edge.from.entityId
    && item.id !== edge.to.entityId,
  )
  const direct = edge.style?.curved ? computeCurvedRoute(from, to, edge) : [from, to]
  if (routeCollisionCount(direct, obstacles) === 0) return direct

  const top = Math.min(from.y, to.y, ...obstacles.map(item => item.top)) - ROUTE_CLEARANCE
  const bottom = Math.max(from.y, to.y, ...obstacles.map(item => item.bottom)) + ROUTE_CLEARANCE
  const left = Math.min(from.x, to.x, ...obstacles.map(item => item.left)) - ROUTE_CLEARANCE
  const right = Math.max(from.x, to.x, ...obstacles.map(item => item.right)) + ROUTE_CLEARANCE
  const candidates = [
    [from, { x: from.x, y: top }, { x: to.x, y: top }, to],
    [from, { x: from.x, y: bottom }, { x: to.x, y: bottom }, to],
    [from, { x: left, y: from.y }, { x: left, y: to.y }, to],
    [from, { x: right, y: from.y }, { x: right, y: to.y }, to],
  ]
  return candidates.sort((a, b) =>
    routeCollisionCount(a, obstacles) - routeCollisionCount(b, obstacles)
    || routeLength(a) - routeLength(b),
  )[0]
}

function placeEdgeLabel(edge: SceneEdge, obstacles: GeometryBox[]): Point | undefined {
  if (!edge.label || !edge.route || edge.route.length < 2) return undefined
  const width = measureTextWidth(edge.label, 12) + 8
  const candidates: Point[] = []
  for (let i = 1; i < edge.route.length; i++) {
    const from = edge.route[i - 1]
    const to = edge.route[i]
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
    candidates.push(
      horizontal ? { x: midpoint.x, y: midpoint.y - 14 } : { x: midpoint.x + 14, y: midpoint.y },
      horizontal ? { x: midpoint.x, y: midpoint.y + 14 } : { x: midpoint.x - 14, y: midpoint.y },
    )
  }
  return candidates
    .map((position, index) => ({
      position,
      index,
      collisions: obstacles.filter(obstacle => overlaps(box(`candidate:${edge.id}`, 'edge-label', position, width, LABEL_HEIGHT), obstacle, 4)).length,
    }))
    .sort((a, b) => a.collisions - b.collisions || a.index - b.index)[0]?.position
}

/** Persist deterministic routes and collision-aware edge-label positions in Scene. */
export function finalizeSceneGeometry(scene: SceneState, preserveRoutes = false): SceneState {
  const entityBoxes = measureSceneGeometry({ ...scene, edges: {} })
  const routedEdges = Object.fromEntries(Object.values(scene.edges).map(edge => [
    edge.id,
    { ...edge, route: preserveRoutes && edge.route?.length ? edge.route : routeEdge(scene, edge, entityBoxes) },
  ]))
  const placed: GeometryBox[] = [...entityBoxes]
  const edges = Object.fromEntries(Object.values(routedEdges).map(edge => {
    const labelPosition = placeEdgeLabel(edge, placed)
    const next = { ...edge, labelPosition }
    const label = edgeLabelBox(next)
    if (label) placed.push(label)
    return [edge.id, next]
  }))
  return { ...scene, edges }
}

/** Return every hard geometry violation; callers decide whether to fail tests or show diagnostics. */
export function validateSceneGeometry(scene: SceneState, clearance = 0): GeometryViolation[] {
  const boxes = measureSceneGeometry(scene)
  const violations: GeometryViolation[] = []
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j], clearance)) {
        violations.push({
          type: 'overlap',
          ids: [boxes[i].id, boxes[j].id],
          message: `${boxes[i].id} overlaps ${boxes[j].id}`,
        })
      }
    }
  }

  for (const edge of Object.values(scene.edges)) {
    if (!edge.route || edge.route.length < 2) continue
    const obstacles = boxes.filter(item =>
      item.kind !== 'edge-label'
      && item.id !== edge.from.entityId
      && item.id !== edge.to.entityId,
    )
    for (let i = 1; i < edge.route.length; i++) {
      const obstacle = obstacles.find(item => segmentIntersectsBox(edge.route![i - 1], edge.route![i], item))
      if (obstacle) {
        violations.push({
          type: 'edge-obstacle',
          ids: [edge.id, obstacle.id],
          message: `${edge.id} crosses ${obstacle.id}`,
        })
        break
      }
    }
  }

  for (const entity of Object.values(scene.entities)) {
    if (entity.type !== 'cell' || entity.value == null || !entity.size) continue
    if (measureTextWidth(String(entity.value), 14) > entity.size.width - 6) {
      violations.push({
        type: 'text-overflow',
        ids: [entity.id],
        message: `${entity.id} text exceeds its cell`,
      })
    }
  }
  return violations
}
