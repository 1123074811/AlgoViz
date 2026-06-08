import type { SceneCommand } from '../commandTypes'
import type { ArrayAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { AuxiliaryUnit, DataUnit } from '../primitives/DataUnits'
import { measureNodeWidth } from '../textMetrics'

const CELL_Y = 300
const CELL_SIZE = 44
const CELL_GAP = 6
const CELL_X0 = 140

/** Width a cell needs to show its value without truncation (square cells stay 44). */
function cellWidth(value: string | number): number {
  return measureNodeWidth(String(value), { fontSize: 14, padding: 18, min: CELL_SIZE, max: 220 })
}

export const arrayCompiler: EventCompiler = {
  supports: (event): event is ArrayAlgorithmEvent => event.type.startsWith('array.'),
  compile: (event, context) => compileArrayEvent(event as ArrayAlgorithmEvent, context),
}

function compileArrayEvent(event: ArrayAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'array.create': {
      // Each cell sizes to its own content (e.g. interval pairs like "[1,3]")
      // and is laid out left-to-right by cumulative width, so wide values are
      // never truncated and never overlap their neighbours.
      const widths = event.values.map(cellWidth)
      let x = CELL_X0
      return event.values.map((value, index) => {
        const w = widths[index]
        const cx = x + w / 2
        x += w + CELL_GAP
        return {
          type: 'create_cell' as const,
          cell: DataUnit.arrayCell({ id: cellId(index), value, index, x: cx, y: CELL_Y, width: w }),
        }
      })
    }
    case 'array.compare': {
      const allIds = Object.keys(context.scene.entities).filter(k => k.startsWith('arr_'))
      const reset = allIds
        .filter(id => !event.indices.includes(parseInt(id.replace('arr_', ''))))
        .map(id => ({ type: 'set_state' as const, entityId: id, state: { role: 'idle' as const, color: 'muted' as const, pulse: false }, merge: true }))
      const highlight = event.indices.map(index => ({
        type: 'set_state' as const, entityId: cellId(index),
        state: { role: 'comparing' as const, color: 'warning' as const, pulse: true }, merge: true,
      }))
      const swapEdgeIds = Object.keys(context.scene.edges).filter(k => k.startsWith('swap_'))
      return [...swapEdgeIds.map(id => ({ type: 'disconnect' as const, edgeId: id })), ...reset, ...highlight]
    }
    case 'array.swap': {
      const [a, b] = event.indices
      const cellA = context.scene.entities[cellId(a)]
      const cellB = context.scene.entities[cellId(b)]
      // 值互换(位置固定)。补间层会检测到这是一次「值互换」并渲染成带弧线的位置
      // 交叉动画(见 interpolate.ts),因此这里不再画曲线箭头,也不软等待。
      // 颜色用 warning(琥珀)而非 danger(红),交换是正常操作而非冲突/错误。
      return [
        { type: 'set_cell', cellId: cellId(a), value: cellB?.type === 'cell' ? cellB.value : undefined, state: { role: 'swapping', color: 'warning', pulse: true } },
        { type: 'set_cell', cellId: cellId(b), value: cellA?.type === 'cell' ? cellA.value : undefined, state: { role: 'swapping', color: 'warning', pulse: true } },
      ]
    }
    case 'array.move': {
      const fromCell = context.scene.entities[cellId(event.from)]
      const value = fromCell?.type === 'cell' ? fromCell.value : undefined
      return [
        { type: 'connect', edge: AuxiliaryUnit.arrow({ id: `move_${event.from}_${event.to}`, fromEntity: cellId(event.from), toEntity: cellId(event.to), curved: true, dashed: true, thickness: 1.2, color: 'primary', pulse: true }) },
        { type: 'set_cell', cellId: cellId(event.to), value, state: { role: 'current', color: 'primary', pulse: true } },
        { type: 'set_state', entityId: cellId(event.from), state: { role: 'idle', color: 'muted' }, merge: true },
      ]
    }
    case 'array.set_value':
      return [{ type: 'set_cell', cellId: cellId(event.index), value: event.value, state: { role: 'current', color: 'primary', pulse: true } }]
    case 'array.mark_sorted':
      return event.indices.map(index => ({ type: 'set_state' as const, entityId: cellId(index), state: { role: 'sorted' as const, color: 'success' as const, pulse: false }, merge: true }))
    case 'array.window': {
      const windowSet = new Set(event.indices)
      const allIds = Object.keys(context.scene.entities).filter(k => k.startsWith('arr_'))
      const reset = allIds
        .filter(id => !windowSet.has(parseInt(id.replace('arr_', ''))))
        .map(id => {
          const index = parseInt(id.replace('arr_', ''))
          const isLeaving = index === event.leaving
          return {
            type: 'set_state' as const,
            entityId: id,
            state: {
              role: isLeaving ? 'comparing' as const : 'idle' as const,
              color: isLeaving ? 'warning' as const : 'muted' as const,
              pulse: isLeaving,
              badge: undefined,
              note: undefined,
              windowPosition: undefined,
            },
            merge: true,
          }
        })
      const windowColor = event.isNewMax ? 'success' as const : 'primary' as const
      const highlight = event.indices.map((index, offset) => {
        const windowPosition: 'start' | 'middle' | 'end' | 'single' = event.indices.length === 1
          ? 'single'
          : offset === 0
            ? 'start'
            : offset === event.indices.length - 1
              ? 'end'
              : 'middle'
        return {
          type: 'set_state' as const,
          entityId: cellId(index),
          state: {
            role: 'window' as const,
            color: windowColor,
            pulse: index === event.entering,
            badge: undefined,
            note: undefined,
            windowPosition,
          },
          merge: true,
        }
      })
      return [...reset, ...highlight]
    }
    case 'array.partition':
      return [
        { type: 'set_state', entityId: cellId(event.pivotIndex), state: { role: 'current', color: 'primary', badge: 'pivot' }, merge: true },
        ...range(event.left, event.right).map(index => ({ type: 'set_state' as const, entityId: cellId(index), state: { role: 'candidate' as const, color: 'warning' as const }, merge: true })),
      ]
  }
}

function cellId(index: number) { return `arr_${index}` }
function range(left: number, right: number) { return Array.from({ length: Math.max(0, right - left + 1) }, (_v, index) => left + index) }
