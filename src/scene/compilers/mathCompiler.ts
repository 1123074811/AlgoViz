import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { MathAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'
import { measureNodeWidth } from '../textMetrics'

// ── Layout constants (VariablesView reads positions off the emitted cells) ──
const START_X = 200
const PANEL_Y = 200
const CELL_H = 52
const CELL_GAP = 14 // horizontal gap between variable registers
const MIN_W = 72

export const mathCompiler: EventCompiler = {
  supports: (event): event is MathAlgorithmEvent => event.type.startsWith('math.'),
  compile: (event, context) => compileMathEvent(event as MathAlgorithmEvent, context),
}

export function mathVarId(name: string) { return `mathvar_${name}` }

/** Width of a register cell sized to its value text (name shown above, value inside). */
function cellWidth(name: string, value: number | string): number {
  const valueW = measureNodeWidth(String(value), { fontSize: 16, padding: 24, min: MIN_W, max: 220 })
  const nameW = measureNodeWidth(name, { fontSize: 11, padding: 18, min: MIN_W, max: 220 })
  return Math.max(valueW, nameW)
}

/** Live variable cells in creation order (col carries the slot index). */
function varCells(context: CompileContext): SceneCell[] {
  return Object.keys(context.scene.entities)
    .filter(k => k.startsWith('mathvar_'))
    .map(k => context.scene.entities[k])
    .filter((e): e is SceneCell => e?.type === 'cell')
    .sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
}

/** X position of the next slot, packed after existing cells. */
function nextSlotX(cells: SceneCell[]): number {
  if (cells.length === 0) return START_X
  const last = cells[cells.length - 1]
  const lastW = last.size?.width ?? MIN_W
  return last.position.x + lastW / 2 + CELL_GAP
}

function makeVarCell(name: string, value: number | string, slot: number, x: number, pulse: boolean, color: ActionColor): SceneCell {
  const w = cellWidth(name, value)
  return {
    id: mathVarId(name),
    type: 'cell',
    position: { x: x + w / 2, y: PANEL_Y },
    size: { width: w, height: CELL_H },
    value: `${name}=${value}`,
    col: slot,
    state: { role: pulse ? 'active' : 'idle', color, pulse },
    meta: { name, value },
  }
}

/** Reset prior-step pulses so highlights don't linger. */
function clearPulses(context: CompileContext): SceneCommand[] {
  return Object.keys(context.scene.entities)
    .filter(k => k.startsWith('mathvar_') && context.scene.entities[k]?.state?.pulse)
    .map(k => ({ type: 'set_state' as const, entityId: k, state: { pulse: false, role: 'idle' as const, color: 'muted' as const }, merge: true }))
}

function compileMathEvent(event: MathAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'math.init': {
      const cells: SceneCommand[] = []
      let cursor = START_X
      event.vars.forEach((v, i) => {
        const cell = makeVarCell(v.name, v.value, i, cursor, false, 'muted')
        cells.push({ type: 'create_cell', cell })
        cursor += (cell.size?.width ?? MIN_W) + CELL_GAP
      })
      return cells
    }

    case 'math.set': {
      const cleanup = clearPulses(context)
      const existing = varCells(context)
      const found = existing.find(c => c.id === mathVarId(event.name))
      if (found) {
        // Refresh value + meta in place. Recreate keeps meta consistent for the
        // View; anchor to the cell's left edge so growth expands rightward.
        const slot = found.col ?? existing.indexOf(found)
        const leftX = found.position.x - (found.size?.width ?? MIN_W) / 2
        const cell = makeVarCell(event.name, event.value, slot, leftX, true, 'primary')
        return [...cleanup, { type: 'create_cell', cell }]
      }
      // First appearance of a variable → create it appended to the panel.
      const slot = existing.length
      const x = nextSlotX(existing)
      const cell = makeVarCell(event.name, event.value, slot, x, true, 'success')
      return [...cleanup, { type: 'create_cell', cell }]
    }

    case 'math.highlight': {
      const cleanup = clearPulses(context)
      return [
        ...cleanup,
        { type: 'set_state', entityId: mathVarId(event.name), state: { role: 'current', color: 'warning', pulse: true }, merge: true },
      ]
    }

    case 'math.note': {
      return [{ type: 'add_note', text: event.text }]
    }
  }
}
