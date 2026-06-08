import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { MathAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'
import { measureNodeWidth } from '../textMetrics'

// ── Layout constants (VariablesView reads positions off the emitted cells) ──
// 变量纵向排列：每个变量占一行,左边缘统一对齐到 START_X,行间按 ROW_STEP 递增。
// 这样改变量值只撑宽自己那一行,虚线框宽度取最宽行、不会随变量增多/变化而横向变长。
const START_X = 200
const PANEL_Y = 160
const CELL_H = 30
const ROW_STEP = 34 // 行高 + 行间距,VariablesView 直接读取 cell.position.y
const MIN_W = 96

export const mathCompiler: EventCompiler = {
  supports: (event): event is MathAlgorithmEvent => event.type.startsWith('math.'),
  compile: (event, context) => compileMathEvent(event as MathAlgorithmEvent, context),
}

export function mathVarId(name: string) { return `mathvar_${name}` }

/** Width of a variable text register sized to "name = value". */
function cellWidth(name: string, value: number | string): number {
  return measureNodeWidth(`${name} = ${String(value)}`, { fontSize: 13, padding: 28, min: MIN_W, max: 260 })
}

/** Live variable cells in creation order (col carries the slot index). */
function varCells(context: CompileContext): SceneCell[] {
  return Object.keys(context.scene.entities)
    .filter(k => k.startsWith('mathvar_'))
    .map(k => context.scene.entities[k])
    .filter((e): e is SceneCell => e?.type === 'cell')
    .sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
}

function makeVarCell(name: string, value: number | string, slot: number, pulse: boolean, color: ActionColor, delta?: string): SceneCell {
  const w = cellWidth(name, value)
  return {
    id: mathVarId(name),
    type: 'cell',
    // 左边缘固定在 START_X(故 position.x = START_X + w/2),y 按行递增。
    position: { x: START_X + w / 2, y: PANEL_Y + slot * ROW_STEP },
    size: { width: w, height: CELL_H },
    // CellView skips mathvar_*; VariablesView draws this as plain debugger text.
    value: String(value),
    col: slot,
    state: { role: pulse ? 'active' : 'idle', color, pulse },
    meta: { name, value, ...(delta && { delta }) },
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
      return event.vars.map((v, i) => ({
        type: 'create_cell' as const,
        cell: makeVarCell(v.name, v.value, i, false, 'muted'),
      }))
    }

    case 'math.set': {
      const cleanup = clearPulses(context)
      const existing = varCells(context)
      const found = existing.find(c => c.id === mathVarId(event.name))
      if (found) {
        // Refresh value + meta in place, keeping its row slot (vertical layout).
        const slot = found.col ?? existing.indexOf(found)
        const cell = makeVarCell(event.name, event.value, slot, true, 'primary', event.delta ?? inferDelta(found, event.value))
        return [...cleanup, { type: 'create_cell', cell }]
      }
      // First appearance of a variable → append as a new row.
      const slot = existing.length
      const cell = makeVarCell(event.name, event.value, slot, true, 'success', event.delta)
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

function inferDelta(previous: SceneCell, next: number | string): string | undefined {
  const rawPrev = (previous.meta as { value?: unknown } | undefined)?.value ?? previous.value
  if (rawPrev === undefined || rawPrev === next) return undefined

  if (typeof rawPrev === 'number' && typeof next === 'number') {
    const diff = next - rawPrev
    if (diff === 0) return undefined
    return diff > 0 ? `+${diff}` : String(diff)
  }

  return `->${String(next)}`
}
