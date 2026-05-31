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

  const rootId = findRoot(scene, nodes)
  if (!rootId) return {}

  const depth = computeDepth(scene, rootId, nodes)

  // Symmetric binary tree layout gaps
  const vGap = Math.max(120, Math.min(145, 500 / Math.max(depth, 1)))
  const hGap = Math.max(85, Math.min(110, 360 / Math.max(depth, 1)))
  const startY = 80

  const positions: Record<string, Point> = {}

  function layoutNode(nodeId: string, x: number, d: number) {
    positions[nodeId] = { x, y: startY + d * vGap }
    
    const { leftId, rightId } = getLeftAndRightChildren(scene, nodeId)
    
    if (leftId || rightId) {
      // Binary Tree Mode: precise left/right symmetric offset
      const hSpacing = hGap * Math.pow(1.85, Math.max(0, depth - d - 1))
      if (leftId) {
        layoutNode(leftId, x - hSpacing, d + 1)
      }
      if (rightId) {
        layoutNode(rightId, x + hSpacing, d + 1)
      }
    } else {
      // General Tree Mode (e.g. Trie, Multi-branch trees): layout all children symmetrically
      const children = getChildren(scene, nodeId)
      if (children.length > 0) {
        const branchGap = hGap * Math.pow(1.5, Math.max(0, depth - d - 1))
        const totalWidth = (children.length - 1) * branchGap
        const startX = x - totalWidth / 2
        children.forEach((childId, index) => {
          layoutNode(childId, startX + index * branchGap, d + 1)
        })
      }
    }
  }

  // Layout recursively starting from root at center x=500
  layoutNode(rootId, 500, 0)

  // Handle any unvisited nodes (nodes that might be disconnected during transitions)
  const visited = new Set(Object.keys(positions))
  let orphanIndex = 0
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      positions[node.id] = { x: 100 + orphanIndex * 120, y: startY + depth * vGap }
      orphanIndex++
    }
  }

  return positions
}
