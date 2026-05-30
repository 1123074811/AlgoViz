import type { Point, SceneState } from '../types'

const START_X = 110
const START_Y = 260
const NODE_GAP = 150

export function layoutLinkedList(scene: SceneState): Record<string, Point> {
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

  const headPointerTarget = scene.pointers.head?.target?.entityId
  const start = headPointerTarget && nodeIds.includes(headPointerTarget)
    ? headPointerTarget
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
    acc[id] = { x: START_X + index * NODE_GAP, y: START_Y }
    return acc
  }, {})
}
