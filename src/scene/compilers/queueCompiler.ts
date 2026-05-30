import type { SceneCommand } from '../commandTypes'
import type { QueueAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { DataUnit } from '../primitives/DataUnits'

const START_X = 140
const START_Y = 300
const CELL_GAP = 68

export const queueCompiler: EventCompiler = {
  supports: (event): event is QueueAlgorithmEvent => event.type.startsWith('queue.'),
  compile: (event, context) => compileQueueEvent(event as QueueAlgorithmEvent, context),
}

function compileQueueEvent(event: QueueAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'queue.create':
      return event.values.map((value, index) => ({
        type: 'create_cell' as const,
        cell: DataUnit.arrayCell({ id: queueCellId(index), value, index, x: START_X + index * CELL_GAP, y: START_Y }),
      }))
    case 'queue.enqueue': {
      const existingCount = Object.keys(context.scene.entities).filter(k => k.startsWith('queue_')).length
      const id = queueCellId(existingCount)
      const commands: SceneCommand[] = [{
        type: 'create_cell' as const,
        cell: DataUnit.arrayCell({ id, value: event.value, index: existingCount, x: START_X + existingCount * CELL_GAP, y: START_Y }),
      }]
      commands.push({ type: 'set_state', entityId: id, state: { role: 'inserted', color: 'success', pulse: true }, merge: true })
      commands.push({ type: 'add_note', text: `enqueue(${event.value})` })
      return commands
    }
    case 'queue.dequeue': {
      const allIds = Object.keys(context.scene.entities).filter(k => k.startsWith('queue_')).sort((a, b) => {
        return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1])
      })
      const frontId = allIds[0]
      const frontCell = context.scene.entities[frontId]
      const frontVal = frontCell?.type === 'cell' ? frontCell.value : '?'
      return [
        { type: 'set_state', entityId: frontId, state: { role: 'deleted', color: 'danger', pulse: true }, merge: true },
        { type: 'remove_entity', entityId: frontId },
        { type: 'add_note', text: `dequeue() → ${frontVal}` },
        // Shift remaining cells left
        ...allIds.slice(1).map((id, newIndex) => {
          const cell = context.scene.entities[id]
          if (cell?.type === 'cell') {
            const val = (typeof cell.value === 'number' || typeof cell.value === 'string') ? cell.value : ''
            return { type: 'create_cell' as const, cell: DataUnit.arrayCell({ id: queueCellId(newIndex), value: val, index: newIndex, x: START_X + newIndex * CELL_GAP, y: START_Y }), }
          }
          return { type: 'wait' as const, duration: 0 }
        }),
        ...allIds.slice(1).map((id) => ({ type: 'remove_entity' as const, entityId: id })),
      ]
    }
    case 'queue.peek_front':
      return [{ type: 'set_state', entityId: queueCellId(event.index), state: { role: 'current', color: 'warning', pulse: true }, merge: true }]
  }
}

export function queueCellId(index: number) { return `queue_${index}` }

export function getQueueCells(scene: CompileContext['scene']): import('../types').SceneCell[] {
  return Object.keys(scene.entities)
    .filter(k => k.startsWith('queue_'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
    .map(k => scene.entities[k])
    .filter(e => e?.type === 'cell') as import('../types').SceneCell[]
}
