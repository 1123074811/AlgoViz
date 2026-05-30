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

  // Render auxiliary data structures (Queue/Stack) from teachingState for graph/tree algorithms
  const activeStepIdx = currentStep > 0 ? currentStep - 1 : 0
  const activeStep = script.steps[activeStepIdx]
  const teachingState = activeStep?.teachingState

  if (teachingState?.graph) {
    const { queue, stack } = teachingState.graph

    // Clear any existing entities with queue_ or stack_ prefix to avoid duplicates
    Object.keys(scene.entities).forEach(key => {
      if (key.startsWith('queue_') || key.startsWith('stack_')) {
        delete scene.entities[key]
      }
    })
    Object.keys(scene.labels).forEach(key => {
      if (key === 'queue_label' || key === 'stack_label') {
        delete scene.labels[key]
      }
    })

    const getNodeLabel = (nodeId: string) => {
      const ent = scene.entities[nodeId]
      if (ent && 'label' in ent && ent.label) return ent.label
      const initNode = script.initialState.nodes?.find(n => n.id === nodeId)
      if (initNode && initNode.label) return initNode.label
      return nodeId
    }

    // 1. Process Queue
    if (queue && queue.length > 0) {
      const CELL_GAP = 44
      const START_Y = 540 // At the bottom of the canvas
      const START_X = 500 - (queue.length * CELL_GAP) / 2

      queue.forEach((nodeId, index) => {
        const value = getNodeLabel(nodeId)
        const cellId = `queue_${index}`
        scene.entities[cellId] = {
          id: cellId,
          type: 'cell',
          position: { x: START_X + index * CELL_GAP, y: START_Y },
          size: { width: 44, height: 44 },
          value,
          col: index,
          state: {
            role: 'inserted',
            color: 'primary',
            pulse: index === queue.length - 1,
          }
        }
      })

      scene.labels['queue_label'] = {
        id: 'queue_label',
        type: 'label',
        text: 'Queue (队列)',
        position: { x: 500, y: START_Y - 35 },
      }
    }

    // 2. Process Stack
    if (stack && stack.length > 0) {
      const CELL_GAP = 44
      const CX = 840 // On the right side of the canvas
      const START_Y = 160 // Top vertical offset

      stack.forEach((nodeId, index) => {
        const value = getNodeLabel(nodeId)
        const cellId = `stack_${index}`
        scene.entities[cellId] = {
          id: cellId,
          type: 'cell',
          position: { x: CX, y: START_Y + index * CELL_GAP },
          size: { width: 44, height: 44 },
          value,
          col: index,
          state: {
            role: 'inserted',
            color: 'primary',
            pulse: index === stack.length - 1,
          }
        }
      })

      scene.labels['stack_label'] = {
        id: 'stack_label',
        type: 'label',
        text: 'Stack (递归调用栈)',
        position: { x: CX, y: START_Y - 35 },
      }
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
