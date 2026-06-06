import type { Point, SceneState, SceneNode } from '../types'
import { measureNodeRenderWidth } from '../textMetrics'

/**
 * Effective rendered width of a tree node. Circular tree nodes use a small
 * fixed diameter; rectangular nodes (e.g. B/B+ tree) grow with their field text.
 */
function nodeWidth(node: SceneNode): number {
  const isCircle = node.variant.startsWith('tree.') && node.variant !== 'tree.btree'
  if (isCircle) return node.size?.width ?? 48
  return Math.max(node.size?.width ?? 96, measureNodeRenderWidth(node.fields, 96))
}

/**
 * Filter entities with type === 'node' and variant.startsWith('tree.')
 */
function getTreeNodeEntities(scene: SceneState): SceneNode[] {
  return Object.values(scene.entities)
    .filter((e): e is SceneNode => e.type === 'node' && e.variant.startsWith('tree.'))
}

/**
 * Find the root — first check the 'root' pointer target,
 * then find a node not targeted by any edge, then fall back to the first node.
 */
function findRoot(scene: SceneState, nodes: SceneNode[]): string | null {
  const nodeIds = nodes.map(n => n.id)

  // Check for explicit root pointer
  const rootPointerTarget = scene.pointers.root?.target?.entityId
  if (rootPointerTarget && nodeIds.includes(rootPointerTarget)) {
    return rootPointerTarget
  }

  // Find node not targeted by any edge
  const targeted = new Set(
    Object.values(scene.edges).map(e => e.to.entityId)
  )
  const root = nodes.find(n => !targeted.has(n.id))
  return root?.id ?? (nodes.length > 0 ? nodes[0].id : null)
}

/**
 * Get child node IDs from edges originating from the given node.
 */
function getChildren(scene: SceneState, nodeId: string): string[] {
  return Object.values(scene.edges)
    .filter(e => e.from.entityId === nodeId)
    .map(e => e.to.entityId)
}

/**
 * Compute the maximum depth of the tree (root is depth 0).
 */
function computeDepth(scene: SceneState, rootId: string, nodes: SceneNode[]): number {
  const nodeIdSet = new Set(nodes.map(n => n.id))
  let maxDepth = 0
  function dfs(id: string, depth: number) {
    if (!nodeIdSet.has(id)) return
    maxDepth = Math.max(maxDepth, depth)
    getChildren(scene, id).forEach(c => dfs(c, depth + 1))
  }
  dfs(rootId, 0)
  return maxDepth
}

/**
 * Count the number of leaf nodes in the tree.
 */
function countLeaves(scene: SceneState, rootId: string, nodes: SceneNode[]): number {
  const nodeIdSet = new Set(nodes.map(n => n.id))
  let count = 0
  function dfs(id: string) {
    if (!nodeIdSet.has(id)) return
    const children = getChildren(scene, id).filter(c => nodeIdSet.has(c))
    if (children.length === 0) {
      count++
      return
    }
    children.forEach(c => dfs(c))
  }
  dfs(rootId)
  return count
}

/**
 * Layout tree nodes with adaptive spacing.
 *
 * Horizontal and vertical gaps are computed from tree depth and leaf count,
 * so large trees don't overflow and small trees aren't too sparse.
 * The root is centered horizontally around x=500.
 */
/**
 * Query an edge to see if a child node is connected to the left or right port of its parent.
 */
function getLeftAndRightChildren(scene: SceneState, nodeId: string): { leftId: string | null; rightId: string | null } {
  let leftId: string | null = null
  let rightId: string | null = null
  for (const edge of Object.values(scene.edges)) {
    if (edge.from.entityId === nodeId) {
      if (edge.from.portId === 'left') {
        leftId = edge.to.entityId
      } else if (edge.from.portId === 'right') {
        rightId = edge.to.entityId
      }
    }
  }
  return { leftId, rightId }
}

/** Horizontal whitespace kept between two adjacent node boxes. */
const H_GAP = 28
/** How far a single-child binary parent leans away from its lone child. */
const LEAN = 48

/**
 * Layout tree nodes with width-aware leaf packing.
 *
 * Instead of positioning each node by fixed offsets from its parent (which lets
 * wide sibling subtrees overlap), we pack the leaves left-to-right using each
 * node's *actual* rendered width, then center every internal node over the span
 * of its children. This guarantees no two node boxes overlap regardless of how
 * wide a B/B+ tree node's key list is. The tree is finally shifted so the root
 * sits at x=500.
 */
export function layoutTree(scene: SceneState): Record<string, Point> {
  const nodes = getTreeNodeEntities(scene)
  if (nodes.length === 0) return {}

  const rootId = findRoot(scene, nodes)
  if (!rootId) return {}

  const depth = computeDepth(scene, rootId, nodes)
  const vGap = Math.max(120, Math.min(145, 500 / Math.max(depth, 1)))
  const startY = 80

  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const positions: Record<string, Point> = {}
  const visiting = new Set<string>() // cycle guard for malformed graphs
  let cursor = 0 // running x for the next leaf slot

  /** Place a node and its subtree, returning the node's center x. */
  function place(nodeId: string, d: number): number {
    const node = nodeById.get(nodeId)
    const y = startY + d * vGap
    if (!node || visiting.has(nodeId)) {
      const w = node ? nodeWidth(node) : 48
      const x = cursor + w / 2
      cursor += w + H_GAP
      if (node) positions[nodeId] = { x, y }
      return x
    }
    visiting.add(nodeId)

    const { leftId, rightId } = getLeftAndRightChildren(scene, nodeId)
    let x: number

    if (leftId !== null || rightId !== null) {
      // Binary mode: keep left/right semantics; center over both children, or
      // lean away from a lone child so the missing side stays visually open.
      const lx = leftId ? place(leftId, d + 1) : null
      const rx = rightId ? place(rightId, d + 1) : null
      if (lx !== null && rx !== null) x = (lx + rx) / 2
      else if (lx !== null) x = lx + LEAN
      else x = (rx as number) - LEAN
    } else {
      const children = getChildren(scene, nodeId).filter(c => nodeById.has(c))
      if (children.length === 0) {
        // Leaf: consume a width-sized slot off the cursor.
        const w = nodeWidth(node)
        x = cursor + w / 2
        cursor += w + H_GAP
      } else {
        // Internal node: center over the span of its children.
        const xs = children.map(c => place(c, d + 1))
        x = (xs[0] + xs[xs.length - 1]) / 2
      }
    }

    positions[nodeId] = { x, y }
    visiting.delete(nodeId)
    return x
  }

  place(rootId, 0)

  // Handle any unvisited nodes (disconnected during transitions): pack them on
  // a fresh row beneath the tree so they never sit on top of laid-out nodes.
  let orphanIndex = 0
  for (const node of nodes) {
    if (!positions[node.id]) {
      positions[node.id] = { x: 100 + orphanIndex * 120, y: startY + (depth + 1) * vGap }
      orphanIndex++
    }
  }

  // Center the tree so the root sits at x=500.
  const shift = 500 - positions[rootId].x
  for (const id of Object.keys(positions)) {
    positions[id] = { x: positions[id].x + shift, y: positions[id].y }
  }

  return positions
}
