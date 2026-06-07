import type { SceneCommand } from '../commandTypes'
import type { StackAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { AuxiliaryUnit, DataUnit } from '../primitives/DataUnits'
import { measureNodeWidth } from '../textMetrics'

const CX = 500
const BOTTOM_Y = 360
const CELL_GAP = 44
const MIN_WIDTH = 52
const MAX_WIDTH = 180

export const stackCompiler: EventCompiler = {
  supports: (event): event is StackAlgorithmEvent => event.type.startsWith('stack.'),
  compile: (event, context) => compileStackEvent(event as StackAlgorithmEvent, context),
}

function compileStackEvent(event: StackAlgorithmEvent, context: CompileContext): SceneCommand[] {
  // 1. Auto-cleanup any phantoms, trajectory arrows and deleted nodes from previous steps to maintain static state persistence
  const cleanupCommands: SceneCommand[] = []
  Object.keys(context.scene.entities).forEach(key => {
    if (key.startsWith('phantom_') || key.startsWith('popped_')) {
      cleanupCommands.push({ type: 'remove_entity', entityId: key })
    }
    const ent = context.scene.entities[key]
    if (ent && 'state' in ent && ent.state?.role === 'deleted') {
      cleanupCommands.push({ type: 'remove_entity', entityId: key })
    }
  })
  Object.keys(context.scene.edges).forEach(key => {
    if (key.startsWith('push_arrow_') || key.startsWith('pop_arrow_')) {
      cleanupCommands.push({ type: 'disconnect', edgeId: key })
    }
  })

  switch (event.type) {
    case 'stack.create':
      return [
        ...cleanupCommands,
        ...event.values.map((value, index) => ({
          type: 'create_cell' as const,
          cell: stackCell(stackCellId(index), value, index, BOTTOM_Y - index * CELL_GAP, 'muted', event.label),
        }))
      ]
    case 'stack.push': {
      const count = liveStackIds(context).length
      const arrowId = `push_arrow_${count}`
      const phantomId = `phantom_push_${count}`
      const id = stackCellId(count)
      // Create actual cell, and create a phantom cell representing the path, connected with a curved arrow
      return [
        ...cleanupCommands,
        { type: 'create_cell', cell: stackCell(id, event.value, count, BOTTOM_Y - count * CELL_GAP, 'success', event.label) },
        { type: 'set_state', entityId: id, state: { role: 'inserted', color: 'success', pulse: true }, merge: true },
        { type: 'create_cell', cell: stackCell(phantomId, event.value, -1, BOTTOM_Y - count * CELL_GAP - 60, 'success', event.label, CX + 180) },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: arrowId, fromEntity: phantomId, toEntity: id,
          curved: true, dashed: true, thickness: 1.2, color: 'success', pulse: true,
        }) },
        { type: 'add_note', text: `push(${event.value})` },
      ]
    }
    case 'stack.pop': {
      const ids = liveStackIds(context)
      const topIdx = ids.length - 1
      const topId = stackCellId(topIdx)
      const topCell = context.scene.entities[topId]
      const topVal = (topCell?.type === 'cell' && (typeof topCell.value === 'string' || typeof topCell.value === 'number')) ? topCell.value : '?'
      const phantomId = `popped_${topIdx}`
      const arrowId = `pop_arrow_${topIdx}`
      // Keep topId as 'deleted' with half opacity so arrow remains visible, and clean up in the next step
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: topId, state: { role: 'deleted', color: 'danger', opacity: 0.4, pulse: true }, merge: true },
        { type: 'create_cell', cell: stackCell(phantomId, topVal, -1, BOTTOM_Y - topIdx * CELL_GAP - 60, 'danger', undefined, CX + 180) },
        { type: 'connect', edge: AuxiliaryUnit.arrow({
          id: arrowId, fromEntity: topId, toEntity: phantomId,
          curved: true, dashed: true, thickness: 1.2, color: 'danger', pulse: true,
        }) },
        { type: 'add_note', text: `pop() → ${topVal}` },
      ]
    }
    case 'stack.peek':
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: stackCellId(event.index), state: { role: 'current', color: 'warning', pulse: true }, merge: true }
      ]
  }
}

export function stackCellId(index: number) { return `stack_${index}` }

function liveStackIds(context: CompileContext): string[] {
  return Object.keys(context.scene.entities)
    .filter(k => k.startsWith('stack_') && context.scene.entities[k]?.state?.role !== 'deleted')
}

function stackCell(
  id: string,
  value: number | string,
  index: number,
  y: number,
  color: 'muted' | 'success' | 'danger',
  label?: string,
  x = CX,
) {
  const width = measureNodeWidth(String(value), { fontSize: 14, padding: 22, min: MIN_WIDTH, max: MAX_WIDTH })
  return {
    ...DataUnit.arrayCell({ id, value, index, x, y, width, color }),
    meta: { ...(label && { label }) },
  }
}
