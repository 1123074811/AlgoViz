import type { Point, SceneState, SceneNode } from '../types'

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
export function layoutTree(scene: SceneState): Record<string, Point> {
  const nodes = getTreeNodeEntities(scene)
  if (nodes.length === 0) return {}

  const nodeIdSet = new Set(nodes.map(n => n.id))
  const rootId = findRoot(scene, nodes)
  if (!rootId) return {}

  const depth = computeDepth(scene, rootId, nodes)
  const leafCount = countLeaves(scene, rootId, nodes)

  const hGap = Math.max(64, Math.min(120, 900 / Math.max(leafCount, 1)))
  const vGap = Math.max(56, Math.min(90, 500 / Math.max(depth, 1)))
  const startY = 80

  const positions: Record<string, Point> = {}
  let leafIndex = 0

  function dfs(nodeId: string, d: number) {
    if (!nodeIdSet.has(nodeId)) return
    const children = getChildren(scene, nodeId).filter(c => nodeIdSet.has(c))

    if (children.length === 0) {
      positions[nodeId] = { x: leafIndex * hGap, y: startY + d * vGap }
      leafIndex++
      return
    }

    for (const child of children) {
      dfs(child, d + 1)
    }

    const xs = children
      .map(c => positions[c]?.x)
      .filter((x): x is number => x !== undefined)

    if (xs.length > 0) {
      positions[nodeId] = {
        x: xs.reduce((a, b) => a + b, 0) / xs.length,
        y: startY + d * vGap,
      }
    }
  }

  dfs(rootId, 0)

  // Center the root horizontally around x=500
  const rootPos = positions[rootId]
  const offsetX = rootPos ? 500 - rootPos.x : 0

  for (const id of Object.keys(positions)) {
    positions[id].x += offsetX
  }

  // Handle any unvisited nodes
  const visited = new Set(Object.keys(positions))
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      positions[node.id] = { x: leafIndex * hGap + offsetX, y: startY }
      leafIndex++
    }
  }

  return positions
}
