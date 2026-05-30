import type { SceneCommand } from '../commandTypes'
import type { TreeAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
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
      return [{ type: 'set_state', entityId: event.nodeId, state: { role: 'deleted', color: 'danger', opacity: 0.45 }, merge: true }, { type: 'remove_entity', entityId: event.nodeId }, { type: 'relayout', layout: 'tree' }]
    case 'tree.rotate':
      return [{ type: 'set_state', entityId: event.pivotId, state: { role: 'active', color: 'warning', pulse: true, note: event.rotation }, merge: true }, { type: 'relayout', layout: 'tree' }]
    case 'tree.update_metadata':
      return compileUpdateMetadata(event, context)
  }
}

function compileCreate(event: Extract<TreeAlgorithmEvent, { type: 'tree.create' }>): SceneCommand[] {
  const commands: SceneCommand[] = []
  event.nodes.forEach((node) => {
    commands.push({ type: 'create_node', node: createTreeNode(node.id, node.value, event.variant), animation: 'scale' })
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
  return [
    { type: 'set_state', entityId: event.parentId, state: { role: 'active', color: 'warning', pulse: true }, merge: true },
    { type: 'create_node', node: createTreeNode(event.node.id, event.node.value, variant), animation: 'drop' },
    { type: 'connect', edge: createEdge(treeEdgeId(event.parentId, port, event.node.id), event.parentId, port, event.node.id, 'parent') },
    { type: 'relayout', layout: 'tree' },
    { type: 'set_state', entityId: event.node.id, state: { role: 'inserted', color: 'success', pulse: true }, merge: true },
  ]
}

function compileUpdateMetadata(event: Extract<TreeAlgorithmEvent, { type: 'tree.update_metadata' }>, context: CompileContext): SceneCommand[] {
  const node = context.scene.entities[event.nodeId]
  if (node?.type !== 'node') return []
  const fields = node.fields.filter((field) => field.id !== 'height' && field.id !== 'balanceFactor')
  if (event.height !== undefined) fields.push({ id: 'height', label: 'h', value: event.height, role: 'metadata' })
  if (event.balanceFactor !== undefined) fields.push({ id: 'balanceFactor', label: 'bf', value: event.balanceFactor, role: 'metadata' })
  return [{ type: 'set_fields', nodeId: event.nodeId, fields }, { type: 'set_state', entityId: event.nodeId, state: { role: 'active', color: 'primary' }, merge: true }]
}

function treeEdgeId(parentId: string, port: string, childId: string) {
  return `e_${parentId}_${port}_${childId}`
}
