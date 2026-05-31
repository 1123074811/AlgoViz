import type { SceneCommand } from '../commandTypes'
import type { StackAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { AuxiliaryUnit, DataUnit } from '../primitives/DataUnits'

const CX = 500
const START_Y = 200
const CELL_GAP = 44

export const stackCompiler: EventCompiler = {
  supports: (event): event is StackAlgorithmEvent => event.type.startsWith('stack.'),
  compile: (event, context) => compileStackEvent(event as StackAlgorithmEvent, context),
}

function compileStackEvent(event: StackAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'stack.create':
      return event.values.map((value, index) => ({
        type: 'create_cell' as const,
        cell: DataUnit.arrayCell({ id: stackCellId(index), value, index, x: CX, y: START_Y + index * CELL_GAP }),
      }))
    case 'stack.push': {
      const count = Object.keys(context.scene.entities).filter(k => k.startsWith('stack_')).length
      const arrowId = `push_arrow_${count}`
      const phantomId = `phantom_push_${count}`
      const id = stackCellId(count)
      // Create actual cell hidden, draw curve trajectory from phantom cell, wait, then show actual cell and cleanup
      return [
        { type: 'create_cell', cell: DataUnit.arrayCell({ id, value: event.value, index: count, x: CX, y: START_Y + count * CELL_GAP }) },
        { type: 'set_state', entityId: id, state: { role: 'inserted', color: 'success', opacity: 0 }, merge: true },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: event.value, index: -1, x: CX + 160, y: START_Y - 60 }) },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: arrowId, fromEntity: phantomId, toEntity: id,
          curved: true, dashed: true, thickness: 2, color: 'success', pulse: true,
        }) },
        { type: 'wait', duration: 300 },
        { type: 'remove_entity', entityId: phantomId },
        { type: 'disconnect', edgeId: arrowId },
        { type: 'set_state', entityId: id, state: { role: 'inserted', color: 'success', opacity: 1, pulse: true }, merge: true },
        { type: 'add_note', text: `push(${event.value})` },
      ]
    }
    case 'stack.pop': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('stack_'))
      const topIdx = ids.length - 1
      const topId = stackCellId(topIdx)
      const topCell = context.scene.entities[topId]
      const topVal = (topCell?.type === 'cell' && (typeof topCell.value === 'string' || typeof topCell.value === 'number')) ? topCell.value : '?'
      const phantomId = `popped_${topIdx}`
      const arrowId = `pop_arrow_${topIdx}`
      return [
        { type: 'set_state', entityId: topId, state: { role: 'deleted', color: 'danger', pulse: true }, merge: true },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: topVal, index: -1, x: CX + 160, y: START_Y - 60, color: 'danger' }) },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: arrowId, fromEntity: topId, toEntity: phantomId,
          curved: true, dashed: true, thickness: 2, color: 'danger', pulse: true,
        }) },
        { type: 'wait', duration: 300 },
        { type: 'disconnect', edgeId: arrowId },
        { type: 'remove_entity', entityId: phantomId },
        { type: 'remove_entity', entityId: topId },
        { type: 'add_note', text: `pop() → ${topVal}` },
      ]
    }
    case 'stack.peek':
      return [{ type: 'set_state', entityId: stackCellId(event.index), state: { role: 'current', color: 'warning', pulse: true }, merge: true }]
  }
}

export function stackCellId(index: number) { return `stack_${index}` }
