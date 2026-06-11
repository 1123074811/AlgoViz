import type { Point, SceneState } from '../types'
import { measureNodeRenderWidth } from '../textMetrics'
import { forceLayout } from './forceLayout'

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

/** DFS 三色法检测有向图是否含环(存在回边即有环)。 */
function hasDirectedCycle(ids: string[], adj: Map<string, string[]>): boolean {
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>(ids.map(id => [id, WHITE]))
  const stack: Array<{ id: string; i: number }> = []
  for (const start of ids) {
    if (color.get(start) !== WHITE) continue
    stack.push({ id: start, i: 0 })
    color.set(start, GRAY)
    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      const neighbors = adj.get(top.id) ?? []
      if (top.i < neighbors.length) {
        const w = neighbors[top.i++]
        const c = color.get(w)
        if (c === GRAY) return true // 回边 → 有环
        if (c === WHITE) { color.set(w, GRAY); stack.push({ id: w, i: 0 }) }
      } else {
        color.set(top.id, BLACK)
        stack.pop()
      }
    }
  }
  return false
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

    // 含环的有向图(如 Tarjan/SCC 的输入)没有干净的拓扑分层,强行 BFS 分层会把
    // 整条环退化成「每个结点各占一列」的水平一行。改用力导向布局,让环/强连通分量
    // 自然聚成 2D 簇,充分利用画布空间。DAG 仍走下面的分层布局以体现拓扑流向。
    if (hasDirectedCycle(vertices.map(v => v.id), adj)) {
      const structuralEdges = Object.values(scene.edges)
        .filter(e => e.directed)
        .map(e => [e.from.entityId, e.to.entityId] as [string, string])
        .filter(([a, b]) => a !== b && adj.has(a) && adj.has(b))
      return forceLayout(vertices.map(v => v.id), structuralEdges, { cx, cy, minClearance })
    }

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

      // 层内排序:首列字典序保证稳定;后续列按"前驱在前一列中的平均位置"
      // (重心法 barycenter)排序以消减边交叉,重心相同回退字典序。
      columns[0].sort((a, b) => a.localeCompare(b))
      const preds = new Map<string, string[]>()
      vertices.forEach(v => preds.set(v.id, []))
      Object.values(scene.edges).forEach(e => {
        if (e.directed && preds.has(e.to.entityId)) {
          preds.get(e.to.entityId)!.push(e.from.entityId)
        }
      })
      for (let r = 1; r <= maxRank; r++) {
        const prevIndex = new Map(columns[r - 1].map((id, i) => [id, i]))
        const bary = (id: string): number => {
          const ps = (preds.get(id) ?? []).filter(p => prevIndex.has(p))
          if (ps.length === 0) return Number.MAX_SAFE_INTEGER
          return ps.reduce((s, p) => s + prevIndex.get(p)!, 0) / ps.length
        }
        columns[r].sort((a, b) => bary(a) - bary(b) || a.localeCompare(b))
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
  // UNDIRECTED / CYCLIC: force-directed layout for larger or denser graphs.
  // Small sparse graphs (n <= 8 and edges <= nodes) keep the stable circular ring.
  // ==========================================
  const structuralEdges = Object.values(scene.edges)
    .map(e => [e.from.entityId, e.to.entityId] as [string, string])
    .filter(([a, b]) => a !== b)
    .filter(([a, b]) => vertices.some(v => v.id === a) && vertices.some(v => v.id === b))

  const isDense = structuralEdges.length > vertices.length
  if (vertices.length > 8 || isDense) {
    return forceLayout(vertices.map(v => v.id), structuralEdges, { cx, cy, minClearance })
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
