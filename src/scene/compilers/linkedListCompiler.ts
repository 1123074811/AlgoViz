import type { SceneCommand } from '../commandTypes'
import type { LinkedListAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { createEdge } from '../variants/edgeVariants'
import { createLinkedListNode } from '../variants/nodeVariants'

export const linkedListCompiler: EventCompiler = {
  supports: (event): event is LinkedListAlgorithmEvent => event.type.startsWith('linked_list.'),
  compile: (event, context) => compileLinkedListEvent(event as LinkedListAlgorithmEvent, context),
}

function compileLinkedListEvent(event: LinkedListAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'linked_list.create':
      return compileCreate(event)
    case 'linked_list.visit':
      return [
        { type: 'set_state', entityId: event.nodeId, state: { role: 'visited', color: 'warning', pulse: true }, merge: true },
        ...(event.pointerId ? [{ type: 'move_pointer' as const, pointerId: event.pointerId, target: { entityId: event.nodeId }, label: event.pointerId }] : []),
      ]
    case 'linked_list.move_pointer':
      return [{ type: 'move_pointer', pointerId: event.pointerId, target: event.toNodeId ? { entityId: event.toNodeId } : null, label: event.pointerId }]
    case 'linked_list.insert_after':
      return compileInsertAfter(event, context)
    case 'linked_list.insert_before':
      return compileInsertBefore(event, context)
    case 'linked_list.delete':
      return [{ type: 'set_state', entityId: event.nodeId, state: { role: 'deleted', color: 'danger', opacity: 0.45 }, merge: true }, { type: 'remove_entity', entityId: event.nodeId }, { type: 'relayout', layout: 'linked_list' }]
    case 'linked_list.reverse_link':
      return compileReverseLink(event, context)
    case 'linked_list.set_head':
      return [{ type: 'move_pointer', pointerId: 'head', target: event.nodeId ? { entityId: event.nodeId } : null, label: 'head' }, { type: 'relayout', layout: 'linked_list' }]
    case 'linked_list.set_tail':
      return [{ type: 'move_pointer', pointerId: 'tail', target: event.nodeId ? { entityId: event.nodeId } : null, label: 'tail' }]
  }
}

function compileCreate(event: Extract<LinkedListAlgorithmEvent, { type: 'linked_list.create' }>): SceneCommand[] {
  const commands: SceneCommand[] = []

  event.nodes.forEach((node, index) => {
    commands.push({ type: 'create_node', node: createLinkedListNode(node.id, node.value, event.variant, 110 + index * 150, 260), animation: 'scale' })
  })

  for (let i = 0; i < event.nodes.length - 1; i++) {
    const current = event.nodes[i].id
    const next = event.nodes[i + 1].id
    commands.push({ type: 'connect', edge: createEdge(edgeId(current, 'next', next), current, 'next', next) })
    if (event.variant === 'doubly') commands.push({ type: 'connect', edge: createEdge(edgeId(next, 'prev', current), next, 'prev', current, 'next', 'muted', true) })
  }

  if (event.variant === 'circular' && event.nodes.length > 1) {
    const tail = event.nodes[event.nodes.length - 1].id
    const head = event.nodes[0].id
    commands.push({ type: 'connect', edge: createEdge(edgeId(tail, 'next', head), tail, 'next', head, 'input', 'muted', true) })
  }

  if (event.headId) commands.push({ type: 'move_pointer', pointerId: 'head', target: { entityId: event.headId }, label: 'head' })
  if (event.tailId) commands.push({ type: 'move_pointer', pointerId: 'tail', target: { entityId: event.tailId }, label: 'tail' })
  commands.push({ type: 'relayout', layout: 'linked_list' })
  return commands
}

function compileInsertAfter(event: Extract<LinkedListAlgorithmEvent, { type: 'linked_list.insert_after' }>, context: CompileContext): SceneCommand[] {
  const oldNextEdge = Object.values(context.scene.edges).find((edge) => edge.from.entityId === event.targetNodeId && edge.from.portId === 'next')
  const oldNextId = oldNextEdge?.to.entityId
  const target = context.scene.entities[event.targetNodeId]
  const variant = target?.type === 'node' && target.variant === 'linked_list.doubly' ? 'doubly' : 'singly'
  const targetPosition = target && 'position' in target && target.position ? target.position : { x: 110, y: 260 }
  const commands: SceneCommand[] = [
    { type: 'set_state', entityId: event.targetNodeId, state: { role: 'active', color: 'warning', pulse: true }, merge: true },
    { type: 'create_node', node: createLinkedListNode(event.newNode.id, event.newNode.value, variant, targetPosition.x + 80, targetPosition.y + 120), animation: 'drop' },
  ]

  if (oldNextEdge) commands.push({ type: 'disconnect', edgeId: oldNextEdge.id })
  commands.push({ type: 'connect', edge: createEdge(edgeId(event.targetNodeId, 'next', event.newNode.id), event.targetNodeId, 'next', event.newNode.id) })
  if (oldNextId) commands.push({ type: 'connect', edge: createEdge(edgeId(event.newNode.id, 'next', oldNextId), event.newNode.id, 'next', oldNextId) })

  if (variant === 'doubly') {
    const oldPrevEdge = oldNextId ? Object.values(context.scene.edges).find((edge) => edge.from.entityId === oldNextId && edge.from.portId === 'prev' && edge.to.entityId === event.targetNodeId) : undefined
    if (oldPrevEdge) commands.push({ type: 'disconnect', edgeId: oldPrevEdge.id })
    commands.push({ type: 'connect', edge: createEdge(edgeId(event.newNode.id, 'prev', event.targetNodeId), event.newNode.id, 'prev', event.targetNodeId, 'next', 'muted', true) })
    if (oldNextId) commands.push({ type: 'connect', edge: createEdge(edgeId(oldNextId, 'prev', event.newNode.id), oldNextId, 'prev', event.newNode.id, 'next', 'muted', true) })
  }

  commands.push({ type: 'relayout', layout: 'linked_list' })
  commands.push({ type: 'set_state', entityId: event.newNode.id, state: { role: 'inserted', color: 'success', pulse: true }, merge: true })
  return commands
}

function compileInsertBefore(event: Extract<LinkedListAlgorithmEvent, { type: 'linked_list.insert_before' }>, context: CompileContext): SceneCommand[] {
  const prevEdge = Object.values(context.scene.edges).find((edge) => edge.to.entityId === event.targetNodeId && edge.from.portId === 'next')
  if (!prevEdge) {
    return [
      { type: 'create_node', node: createLinkedListNode(event.newNode.id, event.newNode.value) },
      { type: 'connect', edge: createEdge(edgeId(event.newNode.id, 'next', event.targetNodeId), event.newNode.id, 'next', event.targetNodeId) },
      { type: 'move_pointer', pointerId: 'head', target: { entityId: event.newNode.id }, label: 'head' },
      { type: 'relayout', layout: 'linked_list' },
    ]
  }
  return compileInsertAfter({ type: 'linked_list.insert_after', targetNodeId: prevEdge.from.entityId, newNode: event.newNode }, context)
}

function compileReverseLink(event: Extract<LinkedListAlgorithmEvent, { type: 'linked_list.reverse_link' }>, context: CompileContext): SceneCommand[] {
  const oldEdge = Object.values(context.scene.edges).find((edge) => edge.from.entityId === event.fromNodeId && edge.from.portId === 'next')
  const commands: SceneCommand[] = [{ type: 'set_state', entityId: event.fromNodeId, state: { role: 'active', color: 'warning' }, merge: true }]
  if (oldEdge) commands.push({ type: 'disconnect', edgeId: oldEdge.id })
  if (event.toNodeId) commands.push({ type: 'connect', edge: createEdge(edgeId(event.fromNodeId, 'next', event.toNodeId), event.fromNodeId, 'next', event.toNodeId) })
  commands.push({ type: 'relayout', layout: 'linked_list' })
  return commands
}

function edgeId(from: string, port: string, to: string) {
  return `e_${from}_${port}_${to}`
}
