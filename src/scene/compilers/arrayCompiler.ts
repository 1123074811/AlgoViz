import type { SceneCommand } from '../commandTypes'
import type { ArrayAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { AuxiliaryUnit, DataUnit } from '../primitives/DataUnits'

export const arrayCompiler: EventCompiler = {
  supports: (event): event is ArrayAlgorithmEvent => event.type.startsWith('array.'),
  compile: (event, context) => compileArrayEvent(event as ArrayAlgorithmEvent, context),
}

function compileArrayEvent(event: ArrayAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'array.create':
      return event.values.map((value, index) => ({
        type: 'create_cell',
        cell: DataUnit.arrayCell({
          id: cellId(index), value, index,
          x: 140 + index * 44, y: 300,
        }),
      }))
    case 'array.compare': {
      const allIds = Object.keys(context.scene.entities).filter(k => k.startsWith('arr_'))
      const reset = allIds
        .filter(id => !event.indices.includes(parseInt(id.replace('arr_', ''))))
        .map(id => ({ type: 'set_state' as const, entityId: id, state: { role: 'idle' as const, color: 'muted' as const, pulse: false }, merge: true }))
      const highlight = event.indices.map(index => ({
        type: 'set_state' as const, entityId: cellId(index),
        state: { role: 'comparing' as const, color: 'warning' as const, pulse: true }, merge: true,
      }))
      // Clean up previous swap arrows
      const swapEdgeIds = Object.keys(context.scene.edges).filter(k => k.startsWith('swap_'))
      const disconnectOld = swapEdgeIds.map(edgeId => ({ type: 'disconnect' as const, edgeId }))
      return [...disconnectOld, ...reset, ...highlight]
    }
    case 'array.swap': {
      const [a, b] = event.indices
      const cellA = context.scene.entities[cellId(a)]
      const cellB = context.scene.entities[cellId(b)]
      const valueA = cellA?.type === 'cell' ? cellA.value : undefined
      const valueB = cellB?.type === 'cell' ? cellB.value : undefined
      // Create two curved transfer arrows between swapped cells
      return [
        { type: 'set_cell', cellId: cellId(a), value: valueB, state: { role: 'swapping', color: 'danger', pulse: true } },
        { type: 'set_cell', cellId: cellId(b), value: valueA, state: { role: 'swapping', color: 'danger', pulse: true } },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: swapEdgeId(a, b), fromEntity: cellId(a), toEntity: cellId(b),
          curved: true, dashed: true, thickness: 2, color: 'danger', pulse: true,
        }) },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: swapEdgeId(b, a), fromEntity: cellId(b), toEntity: cellId(a),
          curved: true, dashed: true, thickness: 2, color: 'danger', pulse: true,
        }) },
        { type: 'wait', duration: 200 },
      ]
    }
    case 'array.move': {
      const fromCell = context.scene.entities[cellId(event.from)]
      const value = fromCell?.type === 'cell' ? fromCell.value : undefined
      return [
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: `move_${event.from}_${event.to}`, fromEntity: cellId(event.from), toEntity: cellId(event.to),
          curved: true, dashed: true, thickness: 2, color: 'primary', pulse: true,
        }) },
        { type: 'set_cell', cellId: cellId(event.to), value, state: { role: 'current', color: 'primary', pulse: true } },
        { type: 'set_state', entityId: cellId(event.from), state: { role: 'idle', color: 'muted' }, merge: true },
      ]
    }
    case 'array.mark_sorted':
      return event.indices.map(index => ({
        type: 'set_state', entityId: cellId(index),
        state: { role: 'sorted', color: 'success', pulse: false }, merge: true,
      }))
    case 'array.partition':
      return [
        { type: 'set_state', entityId: cellId(event.pivotIndex), state: { role: 'current', color: 'primary', badge: 'pivot' }, merge: true },
        ...range(event.left, event.right).map((index) => ({ type: 'set_state' as const, entityId: cellId(index), state: { role: 'candidate' as const, color: 'warning' as const }, merge: true })),
      ]
  }
}

function cellId(index: number) { return `arr_${index}` }
function swapEdgeId(a: number, b: number) { return `swap_${a}_${b}` }
function range(left: number, right: number) {
  return Array.from({ length: Math.max(0, right - left + 1) }, (_v, index) => left + index)
}
