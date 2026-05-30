import type { SceneCommand } from '../commandTypes'
import type { StringAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'

const CELL = 36
const START_X = 100
const ROW_GAP = 60

export const stringCompiler: EventCompiler = {
  supports: (event): event is StringAlgorithmEvent => event.type.startsWith('string.'),
  compile: (event, context) => compileStringEvent(event as StringAlgorithmEvent, context),
}

function compileStringEvent(event: StringAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'string.create':
      return event.text.split('').map((char, i) =>
        charCell(cid(event.row ?? 0, i), char, i, START_X + i * CELL, 200 + (event.row ?? 0) * ROW_GAP))
    case 'string.create_double':
      return [
        ...event.text.split('').map((char, i) =>
          charCell(cid(0, i), char, i, START_X + i * CELL, 200)),
        ...event.pattern.split('').map((char, i) =>
          charCell(cid(1, i), char, i, START_X + i * CELL, 200 + ROW_GAP)),
      ]
    case 'string.compare': {
      const [a, b] = event.indices
      return [
        { type: 'set_state' as const, entityId: cid(event.row, a), state: { role: 'comparing' as const, color: 'warning' as const, pulse: true }, merge: true },
        { type: 'set_state' as const, entityId: cid(event.row, b), state: { role: 'comparing' as const, color: 'warning' as const, pulse: true }, merge: true },
      ]
    }
    case 'string.match':
      return [{ type: 'set_state' as const, entityId: cid(event.row, event.index), state: { role: 'safe' as const, color: 'success' as const, pulse: true }, merge: true }]
    case 'string.mismatch':
      return [{ type: 'set_state' as const, entityId: cid(event.row, event.index), state: { role: 'conflict' as const, color: 'danger' as const, pulse: true }, merge: true }]
    case 'string.mark_range':
      return event.indices.map(i => ({ type: 'set_state' as const, entityId: cid(event.row, i), state: { role: 'sorted' as const, color: 'success' as const, pulse: false }, merge: true }))
    case 'string.shift_pattern': {
      const prefix = cid(1, 0).replace('0', '')
      const pIds = Object.keys(context.scene.entities).filter(k => k.startsWith(prefix))
      return pIds.map(id => {
        const idx = parseInt(id.replace(prefix, ''))
        return { type: 'move' as const, entityId: id, to: { x: START_X + (idx + event.offset) * CELL, y: 200 + ROW_GAP } }
      })
    }
  }
}

function charCell(id: string, char: string, index: number, x: number, y: number): SceneCommand {
  return {
    type: 'create_cell',
    cell: { id, type: 'cell', position: { x, y }, size: { width: CELL, height: CELL }, value: char, col: index, state: { role: 'idle', color: 'muted' } },
  }
}

function cid(row: number, index: number) { return `s_${row}_${index}` }
