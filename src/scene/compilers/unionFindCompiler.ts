import type { SceneCommand } from '../commandTypes'
import type { UnionFindAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { AuxiliaryUnit, DataUnit } from '../primitives/DataUnits'
import type { ActionColor } from '@/types/animation'
import type { NodePort, SceneNode, SceneEdge, SceneLabel } from '../types'

const NODE_PREFIX = 'uf_'
const EDGE_PREFIX = 'uf_edge_'
const PARENT_CELL_PREFIX = 'uf_parent_'
const RANK_CELL_PREFIX = 'uf_rank_'
const NODE_Y = 120
const NODE_LEVEL_GAP = 108
const PARENT_Y = 380
const RANK_Y = 450
const ARRAY_GAP_X = 82
const MIN_SUBTREE_W = 72
const SIBLING_GAP = 84
const ROOT_GAP = 120
const CENTER_X = 500

export const unionFindCompiler: EventCompiler = {
  supports: (event): event is UnionFindAlgorithmEvent => event.type.startsWith('union_find.'),
  compile: (event, context) => compileUnionFindEvent(event as UnionFindAlgorithmEvent, context),
}

function compileUnionFindEvent(event: UnionFindAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'union_find.create':
      return [
        ...createAllNodes(event.parent),
        ...createArrayCells('parent', event.parent),
        ...(event.rank ? createArrayCells('rank', event.rank) : []),
        ...createLabels(Boolean(event.rank)),
        ...syncParentEdges(event.parent),
      ]
    case 'union_find.find':
      return [
        ...clearTransient(context),
        ...layoutNodeMoves(event.parent),
        ...event.path.map((node, index) => highlightNode(node, index === event.path.length - 1 ? 'success' : 'warning')),
        ...event.path.map((node) => highlightCell('parent', node, 'warning')),
        highlightNode(event.root, 'success'),
      ]
    case 'union_find.link':
      return [
        ...clearTransient(context),
        ...syncArrays(event.parent, event.rank, [event.childRoot, event.parentRoot]),
        ...layoutNodeMoves(event.parent),
        ...syncParentEdges(event.parent),
        highlightNode(event.childRoot, 'warning'),
        highlightNode(event.parentRoot, 'success'),
        highlightCell('parent', event.childRoot, 'primary'),
        ...(event.rank ? [highlightCell('rank', event.parentRoot, 'success')] : []),
      ]
    case 'union_find.compress':
      return [
        ...clearTransient(context),
        ...syncArrays(event.parent, event.rank, [event.node]),
        ...layoutNodeMoves(event.parent),
        ...syncParentEdges(event.parent),
        highlightNode(event.node, 'primary'),
        highlightNode(event.to, 'success'),
        highlightCell('parent', event.node, 'primary'),
      ]
    case 'union_find.same':
      return [
        ...clearTransient(context),
        highlightNode(event.x, 'warning'),
        highlightNode(event.y, 'warning'),
        highlightNode(event.root, 'success'),
        ...syncArrays(event.parent, event.rank, [event.x, event.y, event.root]),
        ...layoutNodeMoves(event.parent),
        ...syncParentEdges(event.parent),
      ]
    case 'union_find.done':
      return [
        ...clearTransient(context),
        ...syncArrays(event.parent, event.rank, event.parent.map((_v, index) => index)),
        ...layoutNodeMoves(event.parent),
        ...syncParentEdges(event.parent),
        ...event.parent.map((_v, index) => highlightNode(index, 'success')),
      ]
  }
}

function createAllNodes(parent: number[]): SceneCommand[] {
  const positions = layoutForest(parent)
  return parent.map((_v, index) => ({
    type: 'create_node' as const,
    node: createUnionFindNode(index, positions[index]?.x ?? arrayX(index, parent.length), positions[index]?.y ?? NODE_Y),
    animation: 'scale' as const,
  }))
}

function createUnionFindNode(index: number, x: number, y: number): SceneNode {
  const ports: NodePort[] = [
    { id: 'parent', side: 'top', role: 'parent' },
    { id: 'child', side: 'bottom', role: 'child' },
    { id: 'center', side: 'center', role: 'custom' },
  ]
  return {
    id: nodeId(index),
    type: 'node',
    variant: 'union_find.element',
    position: { x, y },
    size: { width: 52, height: 52 },
    fields: [{ id: 'value', value: index, role: 'data' }],
    ports,
    state: { role: 'idle', color: 'muted', pulse: false },
    meta: { index },
  }
}

function createArrayCells(kind: 'parent' | 'rank', values: number[]): SceneCommand[] {
  return values.map((value, index) => ({
    type: 'create_cell' as const,
    cell: DataUnit.arrayCell({
      id: cellId(kind, index),
      value,
      index,
      x: arrayX(index, values.length),
      y: kind === 'parent' ? PARENT_Y : RANK_Y,
      width: 46,
    }),
    animation: 'scale' as const,
  }))
}

function createLabels(hasRank: boolean): SceneCommand[] {
  const labels: SceneLabel[] = [
    { id: 'uf_label_nodes', type: 'label', text: 'Disjoint-set forest', position: { x: CENTER_X, y: NODE_Y - 58 }, state: { color: 'muted' } },
    { id: 'uf_label_parent', type: 'label', text: 'parent', position: { x: CENTER_X, y: PARENT_Y - 44 }, state: { color: 'primary' } },
  ]
  if (hasRank) labels.push({ id: 'uf_label_rank', type: 'label', text: 'rank', position: { x: CENTER_X, y: RANK_Y - 44 }, state: { color: 'muted' } })
  return labels.map((label) => ({ type: 'create_label' as const, label }))
}

function syncArrays(parent: number[], rank: number[] | undefined, activeIndices: number[]): SceneCommand[] {
  const active = new Set(activeIndices)
  return [
    ...parent.map((value, index) => ({
      type: 'set_cell' as const,
      cellId: cellId('parent', index),
      value,
      state: { role: active.has(index) ? 'current' as const : 'idle' as const, color: active.has(index) ? 'primary' as const : 'muted' as const, pulse: active.has(index) },
    })),
    ...(rank ?? []).map((value, index) => ({
      type: 'set_cell' as const,
      cellId: cellId('rank', index),
      value,
      state: { role: active.has(index) ? 'current' as const : 'idle' as const, color: active.has(index) ? 'success' as const : 'muted' as const, pulse: active.has(index) },
    })),
  ]
}

function syncParentEdges(parent: number[]): SceneCommand[] {
  const disconnects = parent.map((_value, index) => ({ type: 'disconnect' as const, edgeId: edgeId(index) }))
  const connects = parent.flatMap((root, index) => {
    if (root === index) return []
    return [{ type: 'connect' as const, edge: parentEdge(index, root) }]
  })
  return [...disconnects, ...connects]
}

function layoutNodeMoves(parent: number[]): SceneCommand[] {
  const positions = layoutForest(parent)
  return parent.map((_value, index) => ({
    type: 'move' as const,
    entityId: nodeId(index),
    to: positions[index] ?? { x: arrayX(index, parent.length), y: NODE_Y },
    duration: 360,
    easing: 'spring' as const,
  }))
}

function parentEdge(child: number, parent: number): SceneEdge {
  return AuxiliaryUnit.arrow({
    id: edgeId(child),
    fromEntity: nodeId(child),
    fromPort: 'center',
    toEntity: nodeId(parent),
    toPort: 'center',
    color: 'primary',
    curved: false,
    thickness: 1.5,
    pulse: true,
  })
}

function clearTransient(context: CompileContext): SceneCommand[] {
  const ids = Object.keys(context.scene.entities).filter((id) =>
    id.startsWith(NODE_PREFIX) || id.startsWith(PARENT_CELL_PREFIX) || id.startsWith(RANK_CELL_PREFIX)
  )
  return ids.map((entityId) => ({
    type: 'set_state' as const,
    entityId,
    state: { role: 'idle' as const, color: 'muted' as const, pulse: false, badge: undefined },
    merge: true,
  }))
}

function highlightNode(index: number, color: ActionColor): SceneCommand {
  return { type: 'set_state', entityId: nodeId(index), state: { role: color === 'success' ? 'visited' : 'current', color, pulse: true }, merge: true }
}

function highlightCell(kind: 'parent' | 'rank', index: number, color: ActionColor): SceneCommand {
  return { type: 'set_state', entityId: cellId(kind, index), state: { role: 'current', color, pulse: true }, merge: true }
}

function layoutForest(parent: number[]) {
  const size = parent.length
  const children = Array.from({ length: size }, () => [] as number[])
  const roots: number[] = []
  parent.forEach((p, index) => {
    if (p === index || p < 0 || p >= size) {
      roots.push(index)
    } else {
      children[p].push(index)
    }
  })
  if (roots.length === 0 && size > 0) roots.push(0)

  const widthCache = new Map<number, number>()
  const visiting = new Set<number>()
  function subtreeWidth(node: number): number {
    if (widthCache.has(node)) return widthCache.get(node)!
    if (visiting.has(node)) return MIN_SUBTREE_W
    visiting.add(node)
    const childWidths = children[node].map(subtreeWidth)
    const childrenWidth = childWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, childWidths.length - 1) * SIBLING_GAP
    const width = Math.max(MIN_SUBTREE_W, childrenWidth)
    widthCache.set(node, width)
    visiting.delete(node)
    return width
  }

  const rootWidths = roots.map(subtreeWidth)
  const totalWidth = rootWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, rootWidths.length - 1) * ROOT_GAP
  const positions: Record<number, { x: number; y: number }> = {}
  let cursor = CENTER_X - totalWidth / 2

  function place(node: number, left: number, width: number, depth: number) {
    const nodeChildren = children[node]
    const y = NODE_Y + depth * NODE_LEVEL_GAP
    if (nodeChildren.length === 0) {
      positions[node] = { x: left + width / 2, y }
      return
    }

    let childCursor = left + (width - (nodeChildren.reduce((sum, child) => sum + subtreeWidth(child), 0) + (nodeChildren.length - 1) * SIBLING_GAP)) / 2
    for (const child of nodeChildren) {
      const childWidth = subtreeWidth(child)
      place(child, childCursor, childWidth, depth + 1)
      childCursor += childWidth + SIBLING_GAP
    }
    const firstChild = positions[nodeChildren[0]]
    const lastChild = positions[nodeChildren[nodeChildren.length - 1]]
    positions[node] = { x: firstChild && lastChild ? (firstChild.x + lastChild.x) / 2 : left + width / 2, y }
  }

  roots.forEach((root, index) => {
    const width = rootWidths[index]
    place(root, cursor, width, 0)
    cursor += width + ROOT_GAP
  })

  for (let index = 0; index < size; index++) {
    if (!positions[index]) positions[index] = { x: arrayX(index, size), y: NODE_Y + NODE_LEVEL_GAP }
  }
  return positions
}

function arrayX(index: number, size: number) {
  return CENTER_X - ((size - 1) * ARRAY_GAP_X) / 2 + index * ARRAY_GAP_X
}

function nodeId(index: number) { return `${NODE_PREFIX}${index}` }
function cellId(kind: 'parent' | 'rank', index: number) { return `${kind === 'parent' ? PARENT_CELL_PREFIX : RANK_CELL_PREFIX}${index}` }
function edgeId(child: number) { return `${EDGE_PREFIX}${child}` }
