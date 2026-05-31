import type { SceneCommand } from '../commandTypes'
import type { QueueAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { AuxiliaryUnit, DataUnit } from '../primitives/DataUnits'

const START_X = 140
const START_Y = 300
const CELL_GAP = 44

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
      const count = Object.keys(context.scene.entities).filter(k => k.startsWith('queue_')).length
      const phantomId = `phantom_enq_${count}`
      const arrowId = `enq_arrow_${count}`
      const id = queueCellId(count)
      // Hide actual cell first, draw curve trajectory from phantom cell, wait, then show actual cell and cleanup
      return [
        { type: 'create_cell', cell: DataUnit.arrayCell({ id, value: event.value, index: count, x: START_X + count * CELL_GAP, y: START_Y }) },
        { type: 'set_state', entityId: id, state: { role: 'inserted', color: 'success', opacity: 0 }, merge: true },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: event.value, index: -1, x: START_X + (count + 2) * CELL_GAP, y: START_Y - 80 }) },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: arrowId, fromEntity: phantomId, toEntity: id,
          curved: true, dashed: true, thickness: 2, color: 'success', pulse: true,
        }) },
        { type: 'wait', duration: 300 },
        { type: 'remove_entity', entityId: phantomId },
        { type: 'disconnect', edgeId: arrowId },
        { type: 'set_state', entityId: id, state: { role: 'inserted', color: 'success', opacity: 1, pulse: true }, merge: true },
        { type: 'add_note', text: `enqueue(${event.value})` },
      ]
    }
    case 'queue.dequeue': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('queue_')).sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
      const frontId = ids[0]
      const frontCell = context.scene.entities[frontId]
      const frontVal = (frontCell?.type === 'cell' && (typeof frontCell.value === 'string' || typeof frontCell.value === 'number')) ? frontCell.value : '?'
      const phantomId = 'phantom_deq_0'
      const arrowId = 'deq_arrow_0'
      // Phantom cell exits left, showing the dequeue path
      return [
        { type: 'set_state', entityId: frontId, state: { role: 'deleted', color: 'danger', pulse: true }, merge: true },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: frontVal, index: -1, x: START_X - 100, y: START_Y - 80, color: 'danger' }) },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: arrowId, fromEntity: frontId, toEntity: phantomId,
          curved: true, dashed: true, thickness: 2, color: 'danger', pulse: true,
        }) },
        { type: 'wait', duration: 300 },
        { type: 'disconnect', edgeId: arrowId },
        { type: 'remove_entity', entityId: phantomId },
        { type: 'remove_entity', entityId: frontId },
        // Shift remaining cells left
        ...ids.slice(1).map((oldId, newIndex) => {
          const cell = context.scene.entities[oldId]
          if (cell?.type === 'cell') {
            const val = (typeof cell.value === 'number' || typeof cell.value === 'string') ? cell.value : ''
            return { type: 'create_cell' as const, cell: DataUnit.arrayCell({ id: queueCellId(newIndex), value: val, index: newIndex, x: START_X + newIndex * CELL_GAP, y: START_Y }) }
          }
          return { type: 'wait' as const, duration: 0 }
        }),
        ...ids.slice(1).map((oldId) => ({ type: 'remove_entity' as const, entityId: oldId })),
        { type: 'add_note', text: `dequeue() → ${frontVal}` },
      ]
    }
    case 'queue.peek_front':
      return [{ type: 'set_state', entityId: queueCellId(event.index), state: { role: 'current', color: 'warning', pulse: true }, merge: true }]
  }
}

export function queueCellId(index: number) { return `queue_${index}` }
