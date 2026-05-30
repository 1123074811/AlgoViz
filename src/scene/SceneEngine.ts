import type { AnimationScript } from '@/types/animation'
import type { RelayoutCommand, SceneCommand } from './commandTypes'
import type { AlgorithmEvent } from './eventTypes'
import type { SceneNode, SceneState } from './types'
import { createEmptyScene } from './types'
import { compileEvent } from './eventCompiler'
import { layoutGraph } from './layouts/graphLayout'
import { layoutLinkedList } from './layouts/linkedListLayout'
import { layoutTree } from './layouts/treeLayout'

export function deriveSceneState(script: AnimationScript, currentStep: number): SceneState {
  const scene = createEmptyScene()
  const replayLimit = Math.min(currentStep, script.steps.length)

  for (let i = 0; i < replayLimit; i++) {
    const events = script.steps[i].events ?? []
    for (const event of events) {
      const commands = compileEvent(event, { scene, stepIndex: i, script })
      applyCommands(scene, commands)
    }
  }

  // If currentStep is 0 (initial state), proactively compile and apply any 'create' events
  // from the first step so that the initial structure is immediately visible on load.
  if (currentStep === 0 && script.steps.length > 0) {
    const firstStepEvents = script.steps[0].events ?? []
    const createEvents = firstStepEvents.filter((event) =>
      event.type.endsWith('.create') ||
      event.type.endsWith('_double') ||
      event.type === 'linked_list.create' ||
      event.type === 'tree.create' ||
      event.type === 'graph.create'
    )
    for (const event of createEvents) {
      const commands = compileEvent(event, { scene, stepIndex: 0, script })
      applyCommands(scene, commands)
    }
  }

  return scene
}

export function applyCommands(scene: SceneState, commands: SceneCommand[]): SceneState {
  commands.forEach((command) => applyCommand(scene, command))
  return scene
}

function applyCommand(scene: SceneState, command: SceneCommand) {
  switch (command.type) {
    case 'create_node':
      scene.entities[command.node.id] = command.node
      break
    case 'create_cell':
      scene.entities[command.cell.id] = command.cell
      break
    case 'remove_entity':
      removeEntity(scene, command.entityId)
      break
    case 'move': {
      const entity = scene.entities[command.entityId]
      if (entity && 'position' in entity) entity.position = command.to
      break
    }
    case 'connect':
      scene.edges[command.edge.id] = command.edge
      break
    case 'disconnect':
      delete scene.edges[command.edgeId]
      break
    case 'set_state': {
      const entity = scene.entities[command.entityId] ?? scene.pointers[command.entityId] ?? scene.labels[command.entityId] ?? scene.groups[command.entityId]
      if (entity) entity.state = command.merge ? { ...entity.state, ...command.state } : command.state
      if (scene.edges[command.entityId]) scene.edges[command.entityId].state = command.merge ? { ...scene.edges[command.entityId].state, ...command.state } : command.state
      break
    }
    case 'set_field': {
      const node = scene.entities[command.nodeId]
      if (node?.type === 'node') {
        node.fields = node.fields.map((field) => field.id === command.fieldId ? { ...field, ...command.field } : field)
      }
      break
    }
    case 'set_fields': {
      const node = scene.entities[command.nodeId]
      if (node?.type === 'node') node.fields = command.fields
      break
    }
    case 'set_cell': {
      const cell = scene.entities[command.cellId]
      if (cell?.type === 'cell') {
        if (command.value !== undefined) cell.value = command.value
        if (command.state) cell.state = { ...cell.state, ...command.state }
      }
      break
    }
    case 'add_port': {
      const node = scene.entities[command.nodeId]
      if (node?.type === 'node' && !node.ports.some((port) => port.id === command.port.id)) node.ports.push(command.port)
      break
    }
    case 'remove_port': {
      const node = scene.entities[command.nodeId]
      if (node?.type === 'node') node.ports = node.ports.filter((port) => port.id !== command.portId)
      break
    }
    case 'move_pointer':
      scene.pointers[command.pointerId] = {
        id: command.pointerId,
        type: 'pointer',
        label: command.label ?? command.pointerId,
        target: command.target,
      }
      break
    case 'relayout':
      relayout(scene, command.layout, command.scope)
      break
    case 'wait':
      break
    case 'add_note':
      scene.notes = [...(scene.notes ?? []), command.text]
      break
  }
}

function removeEntity(scene: SceneState, entityId: string) {
  delete scene.entities[entityId]
  delete scene.labels[entityId]
  delete scene.groups[entityId]
  delete scene.pointers[entityId]

  Object.entries(scene.edges).forEach(([edgeId, edge]) => {
    if (edge.from.entityId === entityId || edge.to.entityId === entityId || edgeId === entityId) delete scene.edges[edgeId]
  })

  Object.values(scene.pointers).forEach((pointer) => {
    if (pointer.target?.entityId === entityId) pointer.target = null
  })
}

function relayout(scene: SceneState, layout: RelayoutCommand['layout'], scope?: string[]) {
  const positions = layout === 'linked_list' ? layoutLinkedList(scene) : layout === 'tree' ? layoutTree(scene) : layout === 'graph' ? layoutGraph(scene) : {}
  Object.entries(positions).forEach(([entityId, position]) => {
    if (!scope || scope.includes(entityId)) {
      const entity = scene.entities[entityId]
      if (entity && isPositionedNode(entity)) entity.position = position
    }
  })
}

function isPositionedNode(entity: unknown): entity is SceneNode {
  return typeof entity === 'object' && entity !== null && 'position' in entity
}

export interface CompileContext {
  scene: SceneState
  stepIndex: number
  script: AnimationScript
}

export interface EventCompiler {
  supports: (event: AlgorithmEvent) => boolean
  compile: (event: AlgorithmEvent, context: CompileContext) => SceneCommand[]
}
