import type { Point, SceneState } from '../types'
import { measureNodeRenderWidth } from '../textMetrics'

/**
 * Generate a stable integer hash for any arbitrary string ID.
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Preset mapping for common graph nodes to secure fixed circular slot angles (for fallback circular mode)
const PRESET_ANGLES: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7,
  'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7,
  'S': 0, 'T': 7, // Source / Sink
}

export function layoutGraph(scene: SceneState): Record<string, Point> {
  const vertices = Object.values(scene.entities)
    .filter(e => e.type === 'node' && e.variant === 'graph.vertex')
  if (vertices.length === 0) return {}

  // Widest vertex drives minimum spacing so wide-label nodes don't overlap.
  // Graph vertices render as circles (compact), so this is a no-op for typical
  // graphs and only widens spacing when a vertex carries long text.
  const maxNodeWidth = vertices.reduce((m, v) => {
    const w = v.type === 'node' ? Math.max(v.size?.width ?? 48, measureNodeRenderWidth(v.fields, 48)) : 48
    return Math.max(m, w)
  }, 0)
  const minClearance = maxNodeWidth + 24

  const hasQueue = Object.keys(scene.entities).some(k => k.startsWith('queue_'))
  const hasStack = Object.keys(scene.entities).some(k => k.startsWith('stack_'))

  let cx = 500
  let cy = 300

  if (hasQueue) {
    cy = 220 // Shift graph up to make room for Queue at bottom
  }
  if (hasStack) {
    cx = 400 // Shift graph left to make room for Stack on right
  }

  // Determine if there are directed edges in the graph
  const isDirected = Object.values(scene.edges).some(e => e.directed)

  if (isDirected) {
    // 1. Build adjacency list of directed edges
    const adj = new Map<string, string[]>()
    vertices.forEach(v => adj.set(v.id, []))
    Object.values(scene.edges).forEach(e => {
      if (e.directed && adj.has(e.from.entityId) && adj.has(e.to.entityId)) {
        adj.get(e.from.entityId)!.push(e.to.entityId)
      }
    })

    // 2. Find in-degrees to identify source nodes
    const inDegrees: Record<string, number> = {}
    vertices.forEach(v => inDegrees[v.id] = 0)
    Object.values(scene.edges).forEach(e => {
      if (e.directed && e.to.entityId in inDegrees) {
        inDegrees[e.to.entityId]++
      }
    })

    const sources = vertices.filter(v => inDegrees[v.id] === 0)
    const startNodes = sources.length > 0 ? sources : [vertices[0]]

    // 3. Run BFS from source nodes to assign vertical layers (ranks)
    const ranks: Record<string, number> = {}
    const queue: string[] = []

    startNodes.forEach(node => {
      ranks[node.id] = 0
      queue.push(node.id)
    })

    while (queue.length > 0) {
      const curr = queue.shift()!
      const currRank = ranks[curr]
      const neighbors = adj.get(curr) ?? []
      for (const neighbor of neighbors) {
        if (ranks[neighbor] === undefined) {
          ranks[neighbor] = currRank + 1
          queue.push(neighbor)
        }
      }
    }

    // Default any unreachable nodes to rank 0
    vertices.forEach(v => {
      if (ranks[v.id] === undefined) {
        ranks[v.id] = 0
      }
    })

    const maxRank = Math.max(...Object.values(ranks), 0)

    if (maxRank > 0) {
      // Group and arrange vertices into layered columns from left to right
      const columns: Record<number, string[]> = {}
      for (let r = 0; r <= maxRank; r++) {
        columns[r] = []
      }
      vertices.forEach(v => {
        columns[ranks[v.id]].push(v.id)
      })

      // Sort nodes inside columns to keep positioning perfectly stable
      for (let r = 0; r <= maxRank; r++) {
        columns[r].sort((a, b) => a.localeCompare(b))
      }

      const colGap = Math.max(160, Math.min(220, 500 / maxRank), minClearance)
      const rowGap = Math.max(135, minClearance)
      const totalWidth = maxRank * colGap
      const startX = cx - totalWidth / 2

      const positions: Record<string, Point> = {}
      for (let r = 0; r <= maxRank; r++) {
        const colNodes = columns[r]
        const colHeight = (colNodes.length - 1) * rowGap
        const startY = cy - colHeight / 2

        colNodes.forEach((nodeId, index) => {
          positions[nodeId] = {
            x: startX + r * colGap,
            y: startY + index * rowGap,
          }
        })
      }
      return positions
    }
  }

  // ==========================================
  // FALLBACK MODE: Stable Circular Layout (for undirected or dense cyclic graphs)
  // ==========================================
  const totalSlots = Math.max(8, vertices.length)
  // Chord between adjacent slots must clear node width: chord = 2·r·sin(π/slots).
  const minRadiusForClearance = minClearance / (2 * Math.sin(Math.PI / totalSlots))
  const radius = Math.max(130, Math.min(280, totalSlots * 32), minRadiusForClearance)
  const positions: Record<string, Point> = {}

  vertices.forEach((v) => {
    let slot = PRESET_ANGLES[v.id]
    if (slot === undefined) {
      const numId = parseInt(v.id, 10)
      slot = !isNaN(numId) ? numId : hashString(v.id)
    }

    const stableSlotIndex = slot % totalSlots
    const angle = (2 * Math.PI * stableSlotIndex) / totalSlots - Math.PI / 2

    positions[v.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })

  return positions
}
