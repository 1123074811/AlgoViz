import type { Point, SceneState } from '../types'

const CENTER_X = 500
const START_Y = 130
const NODE_GAP = 64

/**
 * Stack vertical layout.
 * Positions linked-list-variant nodes in a vertical column for LIFO visualization.
 * The head pointer (labeled "top") sits above the first node.
 */
export function layoutStack(scene: SceneState): Record<string, Point> {
  const nextBySource = new Map<string, string>()
  const incoming = new Set<string>()

  Object.values(scene.edges).forEach((edge) => {
    if (edge.from.portId === 'next') {
      nextBySource.set(edge.from.entityId, edge.to.entityId)
      incoming.add(edge.to.entityId)
    }
  })

  const nodeIds = Object.values(scene.entities)
    .filter((entity) => entity.type === 'node' && entity.variant.startsWith('linked_list.'))
    .map((entity) => entity.id)

  const topTarget = scene.pointers.top?.target?.entityId
  const start = topTarget && nodeIds.includes(topTarget)
    ? topTarget
    : nodeIds.find((id) => !incoming.has(id)) ?? nodeIds[0]

  const ordered: string[] = []
  const seen = new Set<string>()
  let current: string | undefined = start

  while (current && !seen.has(current) && nodeIds.includes(current)) {
    ordered.push(current)
    seen.add(current)
    current = nextBySource.get(current)
  }

  nodeIds.forEach((id) => {
    if (!seen.has(id)) ordered.push(id)
  })

  return ordered.reduce<Record<string, Point>>((acc, id, index) => {
    acc[id] = { x: CENTER_X, y: START_Y + index * NODE_GAP }
    return acc
  }, {})
}
