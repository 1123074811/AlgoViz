import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api'
import type { AnimationScript } from '@/types/animation'
import { finalizeSceneGeometry } from '../geometry'
import type { Point, SceneCell, SceneEdge, SceneNode, SceneState } from '../types'

export type ElkPilotMode = 'skip-list' | 'tree' | 'union-find' | 'graph'

export interface ElkLayoutTask {
  graph: ElkNode
  mode: ElkPilotMode
  columns?: Record<string, string[]>
}

const TREE_ALGORITHMS = new Set([
  'btree',
  'btree_search',
  'btree_insert',
  'bplus_tree',
  'bplus_tree_search',
  'bplus_tree_range_query',
  'trie',
])

export function elkPilotMode(script: AnimationScript, scene: SceneState): ElkPilotMode | null {
  if (script.algorithm === 'skip_list') return 'skip-list'
  if (TREE_ALGORITHMS.has(script.algorithm)) return 'tree'
  if (script.algorithm === 'union_find') return 'union-find'
  const graphNodes = Object.values(scene.entities).filter(entity => entity.type === 'node' && entity.variant === 'graph.vertex')
  const graphEdges = Object.values(scene.edges).filter(edge =>
    graphNodes.some(node => node.id === edge.from.entityId)
    && graphNodes.some(node => node.id === edge.to.entityId),
  )
  return graphNodes.length > 0 && graphEdges.some(edge => edge.directed) && (graphNodes.length > 6 || graphEdges.length > graphNodes.length)
    ? 'graph'
    : null
}

function layoutOptions(mode: ElkPilotMode): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': mode === 'graph' || mode === 'skip-list' ? 'RIGHT' : 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.spacing.nodeNode': '36',
    'elk.layered.spacing.nodeNodeBetweenLayers': mode === 'skip-list' ? '30' : '72',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  }
}

function regularNodes(scene: SceneState, mode: Exclude<ElkPilotMode, 'skip-list'>): SceneNode[] {
  return Object.values(scene.entities).filter((entity): entity is SceneNode => {
    if (entity.type !== 'node') return false
    if (mode === 'tree') return entity.variant === 'tree.btree' || entity.variant === 'tree.trie'
    if (mode === 'union-find') return entity.variant === 'union_find.element'
    return entity.variant === 'graph.vertex'
  })
}

export function createElkLayoutTask(scene: SceneState, mode: ElkPilotMode): ElkLayoutTask | null {
  if (mode === 'skip-list') {
    const cells = Object.values(scene.entities).filter((entity): entity is SceneCell => entity.type === 'cell' && entity.id.startsWith('sl_'))
    const grouped = new Map<number, SceneCell[]>()
    for (const cell of cells) {
      const col = cell.col ?? 0
      grouped.set(col, [...(grouped.get(col) ?? []), cell])
    }
    if (grouped.size < 2) return null
    const columns = Object.fromEntries([...grouped.entries()].map(([col, items]) => [`elk-col-${col}`, items.map(item => item.id)]))
    const children = [...grouped.entries()].sort(([a], [b]) => a - b).map(([col, items]) => {
      const width = Math.max(...items.map(item => item.size?.width ?? 52))
      const top = Math.min(...items.map(item => item.position.y - (item.size?.height ?? 44) / 2))
      const bottom = Math.max(...items.map(item => item.position.y + (item.size?.height ?? 44) / 2))
      return { id: `elk-col-${col}`, width, height: bottom - top }
    })
    const edges = children.slice(1).map((child, index) => ({
      id: `elk-order-${index}`,
      sources: [children[index].id],
      targets: [child.id],
    }))
    return { mode, columns, graph: { id: 'root', layoutOptions: layoutOptions(mode), children, edges } }
  }

  const nodes = regularNodes(scene, mode)
  if (nodes.length < 2) return null
  const ids = new Set(nodes.map(node => node.id))
  const edges = Object.values(scene.edges)
    .filter(edge => edge.from.entityId !== edge.to.entityId && ids.has(edge.from.entityId) && ids.has(edge.to.entityId))
    .map(edge => ({
      id: edge.id,
      sources: [edge.from.entityId],
      targets: [edge.to.entityId],
      labels: edge.label ? [{ id: `${edge.id}-label`, text: edge.label, width: edge.label.length * 7 + 8, height: 18 }] : undefined,
    }))
  return {
    mode,
    graph: {
      id: 'root',
      layoutOptions: layoutOptions(mode),
      children: nodes.map(node => ({ id: node.id, width: node.size?.width ?? 52, height: node.size?.height ?? 52 })),
      edges,
    },
  }
}

function translatedRoute(edge: ElkExtendedEdge | undefined, dx: number, dy: number): Point[] | undefined {
  if (!edge) return undefined
  const section = edge.sections?.[0]
  if (!section) return undefined
  return [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map(point => ({
    x: point.x + dx,
    y: point.y + dy,
  }))
}

export function applyElkLayout(scene: SceneState, task: ElkLayoutTask, result: ElkNode): SceneState {
  const children = result.children ?? []
  if (children.length === 0) return scene
  const centers = children.map(child => ({
    id: child.id,
    x: (child.x ?? 0) + (child.width ?? 0) / 2,
    y: (child.y ?? 0) + (child.height ?? 0) / 2,
  }))
  const minX = Math.min(...centers.map(point => point.x))
  const maxX = Math.max(...centers.map(point => point.x))
  const minY = Math.min(...centers.map(point => point.y))
  const maxY = Math.max(...centers.map(point => point.y))
  const dx = 500 - (minX + maxX) / 2
  const dy = task.mode === 'graph' ? 300 - (minY + maxY) / 2 : 90 - minY
  const entities = { ...scene.entities }

  if (task.mode === 'skip-list') {
    for (const center of centers) {
      for (const entityId of task.columns?.[center.id] ?? []) {
        const entity = entities[entityId]
        if (entity && 'position' in entity && entity.position) {
          entities[entityId] = { ...entity, position: { x: center.x + dx, y: entity.position.y } }
        }
      }
    }
    return finalizeSceneGeometry({ ...scene, entities })
  }

  for (const center of centers) {
    const entity = entities[center.id]
    if (entity && 'position' in entity) {
      entities[center.id] = { ...entity, position: { x: center.x + dx, y: center.y + dy } }
    }
  }
  const resultEdges = new Map((result.edges ?? []).map(edge => [edge.id, edge]))
  const edges: Record<string, SceneEdge> = Object.fromEntries(Object.values(scene.edges).map(edge => {
    const route = translatedRoute(resultEdges.get(edge.id), dx, dy)
    return [edge.id, route ? { ...edge, route } : edge]
  }))
  return finalizeSceneGeometry({ ...scene, entities, edges }, true)
}

export function elkLayoutKey(task: ElkLayoutTask): string {
  return JSON.stringify(task.graph)
}
