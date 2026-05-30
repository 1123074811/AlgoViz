import type { SceneCommand } from '../commandTypes'
import type { StackAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { DataUnit } from '../primitives/DataUnits'

const CX = 500
const START_Y = 200
const CELL_GAP = 60

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
      const existingCount = Object.keys(context.scene.entities).filter(k => k.startsWith('stack_')).length
      const commands: SceneCommand[] = [{
        type: 'create_cell' as const,
        cell: DataUnit.arrayCell({ id: stackCellId(existingCount), value: event.value, index: existingCount, x: CX, y: START_Y + existingCount * CELL_GAP }),
      }]
      commands.push({ type: 'set_state', entityId: stackCellId(existingCount), state: { role: 'inserted', color: 'success', pulse: true }, merge: true })
      commands.push({ type: 'add_note', text: `push(${event.value})` })
      return commands
    }
    case 'stack.pop': {
      const allIds = Object.keys(context.scene.entities).filter(k => k.startsWith('stack_'))
      const topIdx = allIds.length - 1
      const topId = stackCellId(topIdx)
      const topCell = context.scene.entities[topId]
      const topVal = topCell?.type === 'cell' ? topCell.value : '?'
      return [
        { type: 'set_state', entityId: topId, state: { role: 'deleted', color: 'danger', pulse: true }, merge: true },
        { type: 'remove_entity', entityId: topId },
        { type: 'add_note', text: `pop() → ${topVal}` },
      ]
    }
    case 'stack.peek': {
      return [{ type: 'set_state', entityId: stackCellId(event.index), state: { role: 'current', color: 'warning', pulse: true }, merge: true }]
    }
  }
}

export function stackCellId(index: number) { return `stack_${index}` }

export function getStackCells(scene: CompileContext['scene']): import('../types').SceneCell[] {
  return Object.keys(scene.entities)
    .filter(k => k.startsWith('stack_'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
    .map(k => scene.entities[k])
    .filter(e => e?.type === 'cell') as import('../types').SceneCell[]
}
