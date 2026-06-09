import type { SceneCommand } from '../commandTypes'
import type { TreeAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { AuxiliaryUnit, DataUnit } from '../primitives/DataUnits'
import { createEdge } from '../variants/edgeVariants'
import { createTreeNode } from '../variants/nodeVariants'

export const treeCompiler: EventCompiler = {
  supports: (event): event is TreeAlgorithmEvent => event.type.startsWith('tree.'),
  compile: (event, context) => compileTreeEvent(event as TreeAlgorithmEvent, context),
}

function compileTreeEvent(event: TreeAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'tree.create':
      return compileCreate(event)
    case 'tree.visit':
      return [{ type: 'set_state', entityId: event.nodeId, state: { role: 'visited', color: 'warning', pulse: true }, merge: true }]
    case 'tree.compare':
      return [
        { type: 'set_state', entityId: event.nodeId, state: { role: event.result === 'equal' ? 'safe' : 'comparing', color: event.result === 'equal' ? 'success' : 'warning', pulse: true }, merge: true },
        { type: 'set_field', nodeId: event.nodeId, fieldId: 'compare', field: { id: 'compare', label: 'compare', value: event.value, role: 'metadata' } },
      ]
    case 'tree.insert':
      return compileInsert(event, context)
    case 'tree.delete':
      return compileDelete(event, context)
    case 'tree.rotate':
      return compileRotate(event, context)
    case 'tree.update_metadata':
      return compileUpdateMetadata(event, context)
  }
}

function compileCreate(event: Extract<TreeAlgorithmEvent, { type: 'tree.create' }>): SceneCommand[] {
  const commands: SceneCommand[] = []
  event.nodes.forEach((node) => {
    const sceneNode = event.variant === 'btree'
      ? DataUnit.btreeNode({ id: node.id, keys: parseBTreeKeys(node.value) })
      : createTreeNode(node.id, node.value, event.variant)
    commands.push({ type: 'create_node', node: sceneNode, animation: 'scale' })
  })
  event.edges.forEach((edge) => {
    const port = edge.port ?? 'child'
    commands.push({ type: 'connect', edge: createEdge(treeEdgeId(edge.parentId, port, edge.childId), edge.parentId, port, edge.childId, 'parent') })
  })
  commands.push({ type: 'move_pointer', pointerId: 'root', target: { entityId: event.rootId }, label: 'root' })
  commands.push({ type: 'relayout', layout: 'tree' })
  return commands
}

function compileInsert(event: Extract<TreeAlgorithmEvent, { type: 'tree.insert' }>, context: CompileContext): SceneCommand[] {
  const parent = context.scene.entities[event.parentId]
  const variant = parent?.type === 'node' && parent.variant.startsWith('tree.') ? parent.variant.replace('tree.', '') as 'binary' | 'bst' | 'avl' | 'btree' | 'trie' : 'binary'
  const port = event.side ?? 'child'
  const parentPos = parent && 'position' in parent && parent.position ? parent.position : { x: 500, y: 80 }
  const phantomId = `phantom_ins_${event.node.id}`
  const arrowId = `arrow_ins_${event.node.id}`
  const sideOffset = port === 'left' ? -80 : port === 'right' ? 80 : 0
  return [
    { type: 'set_state', entityId: event.parentId, state: { role: 'active', color: 'warning', pulse: true }, merge: true },
    // Phantom cell showing the value coming from above
    { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: event.node.value, index: -1, x: parentPos.x + sideOffset, y: parentPos.y - 80, color: 'success' }) },
    { type: 'connect', edge: AuxiliaryUnit.arrow({
      id: arrowId, fromEntity: phantomId, toEntity: event.node.id,
      curved: true, dashed: true, thickness: 1.2, color: 'success', pulse: true,
    }) },
    { type: 'create_node', node: createTreeNode(event.node.id, event.node.value, variant), animation: 'drop' },
    { type: 'connect', edge: createEdge(treeEdgeId(event.parentId, port, event.node.id), event.parentId, port, event.node.id, 'parent') },
    { type: 'wait', duration: 250 },
    { type: 'disconnect', edgeId: arrowId },
    { type: 'remove_entity', entityId: phantomId },
    { type: 'relayout', layout: 'tree' },
    { type: 'set_state', entityId: event.node.id, state: { role: 'inserted', color: 'success', pulse: true }, merge: true },
  ]
}

function compileUpdateMetadata(event: Extract<TreeAlgorithmEvent, { type: 'tree.update_metadata' }>, context: CompileContext): SceneCommand[] {
  const node = context.scene.entities[event.nodeId]
  if (node?.type !== 'node') return []
  const metadataKeys = event.metadata?.keys
  if (node.variant === 'tree.btree' && metadataKeys !== undefined) {
    const nextNode = DataUnit.btreeNode({
      id: node.id,
      keys: parseBTreeKeys(metadataKeys),
      x: node.position.x,
      y: node.position.y,
      color: 'primary',
    })
    return [
      { type: 'create_node', node: nextNode, animation: 'scale' },
      { type: 'set_state', entityId: event.nodeId, state: { role: 'active', color: 'primary', pulse: true }, merge: true },
    ]
  }

  const fields = node.fields.filter((field) => field.id !== 'height' && field.id !== 'balanceFactor')
  if (event.height !== undefined) fields.push({ id: 'height', label: 'h', value: event.height, role: 'metadata' })
  if (event.balanceFactor !== undefined) fields.push({ id: 'balanceFactor', label: 'bf', value: event.balanceFactor, role: 'metadata' })
  return [{ type: 'set_fields', nodeId: event.nodeId, fields }, { type: 'set_state', entityId: event.nodeId, state: { role: 'active', color: 'primary' }, merge: true }]
}

function parseBTreeKeys(value: unknown): Array<number | string> {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'number' || typeof v === 'string') as Array<number | string>
  if (typeof value === 'number') return [value]
  if (typeof value !== 'string') return [String(value)]

  const raw = value.trim()
  if (!raw) return ['']
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parseBTreeKeys(parsed)
    } catch {
      return raw.slice(1, -1).split(',').map(part => parseKey(part.trim())).filter(part => part !== '')
    }
  }
  if (raw.includes('·')) return raw.split('·').map(part => parseKey(part.trim())).filter(part => part !== '')
  return [parseKey(raw)]
}

function parseKey(value: string): number | string {
  const n = Number(value)
  return Number.isFinite(n) && value !== '' ? n : value
}

function compileDelete(event: Extract<TreeAlgorithmEvent, { type: 'tree.delete' }>, context: CompileContext): SceneCommand[] {
  const node = context.scene.entities[event.nodeId]
  const nodeVal = node?.type === 'node' ? String(node.fields.find(f => f.id === 'value' || f.id === 'data')?.value ?? '?') : '?'
  const phantomId = `phantom_del_${event.nodeId}`
  const arrowId = `arrow_del_${event.nodeId}`
  const pos = node && 'position' in node && node.position ? node.position : { x: 500, y: 200 }
  return [
    { type: 'set_state', entityId: event.nodeId, state: { role: 'deleted', color: 'danger', pulse: true }, merge: true },
    { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: nodeVal, index: -1, x: pos.x + 140, y: pos.y - 80, color: 'danger' }) },
    { type: 'connect', edge: AuxiliaryUnit.arrow({
      id: arrowId, fromEntity: event.nodeId, toEntity: phantomId,
      curved: true, dashed: true, thickness: 1.2, color: 'danger', pulse: true,
    }) },
    { type: 'wait', duration: 250 },
    { type: 'disconnect', edgeId: arrowId },
    { type: 'remove_entity', entityId: phantomId },
    { type: 'remove_entity', entityId: event.nodeId },
    { type: 'relayout', layout: 'tree' },
  ]
}

function compileRotate(event: Extract<TreeAlgorithmEvent, { type: 'tree.rotate' }>, _context: CompileContext): SceneCommand[] {
  const rotateArrowId = `rotate_${event.pivotId}`
  // Determine rotation direction for arrow visualization
  const isLeft = event.rotation === 'left' || event.rotation === 'right-left'
  const isRight = event.rotation === 'right' || event.rotation === 'left-right'
  const commands: SceneCommand[] = [
    { type: 'set_state', entityId: event.pivotId, state: { role: 'active', color: 'warning', pulse: true, note: event.rotation }, merge: true },
  ]
  // Draw curved rotation arrow(s)
  if (isLeft) {
    commands.push({ type: 'connect', edge: AuxiliaryUnit.arrow({
      id: `${rotateArrowId}_left`, fromEntity: event.pivotId, toEntity: event.pivotId,
      curved: true, dashed: true, thickness: 1.2, color: 'danger', pulse: true, variant: 'counterclockwise',
    }) })
  }
  if (isRight) {
    commands.push({ type: 'connect', edge: AuxiliaryUnit.arrow({
      id: `${rotateArrowId}_right`, fromEntity: event.pivotId, toEntity: event.pivotId,
      curved: true, dashed: true, thickness: 1.2, color: 'danger', pulse: true, variant: 'clockwise',
    }) })
  }
  commands.push({ type: 'wait', duration: 300 })
  commands.push({ type: 'disconnect', edgeId: `${rotateArrowId}_left` })
  commands.push({ type: 'disconnect', edgeId: `${rotateArrowId}_right` })
  commands.push({ type: 'relayout', layout: 'tree' })
  return commands
}

function treeEdgeId(parentId: string, port: string, childId: string) {
  return `e_${parentId}_${port}_${childId}`
}
