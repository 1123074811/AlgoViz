import type { SceneCommand } from '../commandTypes'
import type { DequeAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { DataUnit } from '../primitives/DataUnits'

const CX = 500
const BASE_Y = 280
const CELL_GAP = 44

export const dequeCompiler: EventCompiler = {
  supports: (event): event is DequeAlgorithmEvent => event.type.startsWith('deque.'),
  compile: (event, context) => compileDequeEvent(event as DequeAlgorithmEvent, context),
}

function compileDequeEvent(event: DequeAlgorithmEvent, context: CompileContext): SceneCommand[] {
  const cleanupCommands: SceneCommand[] = []
  Object.keys(context.scene.entities).forEach(key => {
    if (key.startsWith('phantom_')) {
      cleanupCommands.push({ type: 'remove_entity', entityId: key })
    }
    const ent = context.scene.entities[key]
    if (ent && 'state' in ent && ent.state?.role === 'deleted') {
      cleanupCommands.push({ type: 'remove_entity', entityId: key })
    }
  })

  switch (event.type) {
    case 'deque.create': {
      const offset = event.values.length * CELL_GAP / 2
      const startX = CX - offset
      return [
        ...cleanupCommands,
        ...event.values.map((value, index) => ({
          type: 'create_cell' as const,
          cell: DataUnit.arrayCell({ id: dequeCellId(index), value, index, x: startX + index * CELL_GAP, y: BASE_Y }),
        }))
      ]
    }
    case 'deque.push_front': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('deque_'))
      const count = ids.length
      const startX = CX - (count + 1) * CELL_GAP / 2 + CELL_GAP / 2
      const phantomId = `phantom_front_${count}`
      const id = dequeCellId(count)
      const repositions: SceneCommand[] = ids.map((eid, i) => ({
        type: 'move' as const, entityId: eid, to: { x: startX + (i + 1) * CELL_GAP, y: BASE_Y }, duration: 300, easing: 'ease' as const,
      }))
      return [
        ...cleanupCommands,
        ...repositions,
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: event.value, index: -1, x: CX - 200, y: BASE_Y - 60, color: 'success' }) },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id, value: event.value, index: count, x: startX, y: BASE_Y, role: 'inserted', color: 'success', pulse: true }) },
        { type: 'add_note', text: `push_front(${event.value})` },
      ]
    }
    case 'deque.push_back': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('deque_'))
      const count = ids.length
      const startX = CX - (count + 1) * CELL_GAP / 2 + CELL_GAP / 2
      const phantomId = `phantom_back_${count}`
      const id = dequeCellId(count)
      const repositions: SceneCommand[] = ids.map((eid, i) => ({
        type: 'move' as const, entityId: eid, to: { x: startX + i * CELL_GAP, y: BASE_Y }, duration: 300, easing: 'ease' as const,
      }))
      return [
        ...cleanupCommands,
        ...repositions,
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: event.value, index: -1, x: CX + 200, y: BASE_Y - 60, color: 'success' }) },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id, value: event.value, index: count, x: startX + count * CELL_GAP, y: BASE_Y, role: 'inserted', color: 'success', pulse: true }) },
        { type: 'add_note', text: `push_back(${event.value})` },
      ]
    }
    case 'deque.pop_front': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('deque_')).sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
      if (ids.length === 0) return [...cleanupCommands, { type: 'add_note', text: 'pop_front() → empty' }]
      const frontId = ids[0]
      const frontEnt = context.scene.entities[frontId]
      const frontVal = frontEnt?.type === 'cell' ? String(frontEnt.value ?? '?') : '?'
      const phantomId = `phantom_pf_${frontId}`
      const frontPos = (frontEnt && 'position' in frontEnt ? (frontEnt as { position: { x: number; y: number } }).position : null) ?? { x: CX, y: BASE_Y }
      const shiftCommands: SceneCommand[] = ids.slice(1).map((eid, i) => ({
        type: 'move' as const, entityId: eid, to: { x: CX - (ids.length - 1) * CELL_GAP / 2 + i * CELL_GAP, y: BASE_Y }, duration: 300, easing: 'ease' as const,
      }))
      return [
        ...cleanupCommands,
        ...shiftCommands,
        { type: 'set_state', entityId: frontId, state: { role: 'deleted', color: 'danger', opacity: 0.3, pulse: true }, merge: true },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: frontVal, index: -1, x: frontPos.x, y: frontPos.y - 70, color: 'danger' }) },
        { type: 'add_note', text: `pop_front() → ${frontVal}` },
      ]
    }
    case 'deque.pop_back': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('deque_')).sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
      if (ids.length === 0) return [...cleanupCommands, { type: 'add_note', text: 'pop_back() → empty' }]
      const backId = ids[ids.length - 1]
      const backEnt = context.scene.entities[backId]
      const backVal = backEnt?.type === 'cell' ? String(backEnt.value ?? '?') : '?'
      const phantomId = `phantom_pb_${backId}`
      const backPos = (backEnt && 'position' in backEnt ? (backEnt as { position: { x: number; y: number } }).position : null) ?? { x: CX, y: BASE_Y }
      const newStartX = CX - (ids.length - 1) * CELL_GAP / 2
      const shiftCommands: SceneCommand[] = ids.slice(0, -1).map((eid, i) => ({
        type: 'move' as const, entityId: eid, to: { x: newStartX + i * CELL_GAP, y: BASE_Y }, duration: 300, easing: 'ease' as const,
      }))
      return [
        ...cleanupCommands,
        ...shiftCommands,
        { type: 'set_state', entityId: backId, state: { role: 'deleted', color: 'danger', opacity: 0.3, pulse: true }, merge: true },
        { type: 'create_cell', cell: DataUnit.arrayCell({ id: phantomId, value: backVal, index: -1, x: backPos.x, y: backPos.y - 70, color: 'danger' }) },
        { type: 'add_note', text: `pop_back() → ${backVal}` },
      ]
    }
    case 'deque.peek_front':
    case 'deque.peek_back': {
      const targetId = dequeCellId(event.index)
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: targetId, state: { role: 'current', color: 'warning', pulse: true }, merge: true },
      ]
    }
  }
}

export function dequeCellId(index: number) { return `deque_${index}` }
