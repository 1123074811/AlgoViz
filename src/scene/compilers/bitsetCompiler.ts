import type { SceneCommand } from '../commandTypes'
import type { BitsetAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'

// ── Layout constants (BitsetView reads positions off the emitted cells) ──
const START_X = 240
const BIT_Y = 200
const CELL_W = 44
const CELL_H = 44
const BIT_GAP = 8 // horizontal gap between adjacent bit cells

export const bitsetCompiler: EventCompiler = {
  supports: (event): event is BitsetAlgorithmEvent => event.type.startsWith('bitset.'),
  compile: (event, context) => compileBitsetEvent(event as BitsetAlgorithmEvent, context),
}

export function bitCellId(index: number) { return `bit_${index}` }
export const BITSET_LABEL_ID = 'bitset_label' // hidden marker cell carrying the optional label

function bitX(index: number) { return START_X + index * (CELL_W + BIT_GAP) }

/** Live bit cell count currently in the scene. */
function bitCount(context: CompileContext): number {
  return Object.keys(context.scene.entities).filter(k => /^bit_\d+$/.test(k)).length
}

function bitCell(index: number, value: 0 | 1, state: SceneCell['state']): SceneCell {
  return {
    id: bitCellId(index),
    type: 'cell',
    position: { x: bitX(index), y: BIT_Y },
    size: { width: CELL_W, height: CELL_H },
    value,
    col: index,
    state: state ?? { role: 'idle', color: 'muted' },
    meta: { index },
  }
}

function labelMarkerCell(label: string, bits: number): SceneCell {
  // Off-screen, zero-size marker carrying the bitset label across steps. Never drawn
  // (empty_placeholder → CellView renders nothing; BitsetView reads .value/.meta).
  return {
    id: BITSET_LABEL_ID,
    type: 'cell',
    position: { x: START_X, y: BIT_Y - 60 },
    size: { width: 0, height: 0 },
    value: label,
    state: { role: 'empty_placeholder', color: 'muted' },
    meta: { label, bits },
  }
}

function valueAt(context: CompileContext, index: number): 0 | 1 {
  const ent = context.scene.entities[bitCellId(index)]
  return ent?.type === 'cell' && Number(ent.value) === 1 ? 1 : 0
}

function compileBitsetEvent(event: BitsetAlgorithmEvent, context: CompileContext): SceneCommand[] {
  // Reset prior-step pulses so the bitset reads as static between steps.
  const cleanup: SceneCommand[] = []
  for (const key of Object.keys(context.scene.entities)) {
    const ent = context.scene.entities[key]
    if (!ent) continue
    if (/^bit_\d+$/.test(key) && ent.state?.pulse) {
      const value = ent.type === 'cell' && Number(ent.value) === 1 ? 1 : 0
      cleanup.push({ type: 'set_state', entityId: key, state: { role: value === 1 ? 'active' : 'idle', color: value === 1 ? 'primary' : 'muted', pulse: false }, merge: true })
    }
  }

  switch (event.type) {
    case 'bitset.create': {
      const cmds: SceneCommand[] = [{ type: 'create_cell', cell: labelMarkerCell(event.label ?? 'Bitmask', event.bits) }]
      for (let i = 0; i < event.bits; i++) {
        cmds.push({ type: 'create_cell', cell: bitCell(i, 0, { role: 'idle', color: 'muted' }) })
      }
      cmds.push({ type: 'add_note', text: `创建位集（${event.bits} 位，初始全 0）` })
      return cmds
    }

    case 'bitset.set': {
      const value: 0 | 1 = event.value === 1 ? 1 : 0
      if (event.index < 0 || event.index >= bitCount(context)) {
        return [...cleanup, { type: 'add_note', text: `set：下标 ${event.index} 越界` }]
      }
      return [
        ...cleanup,
        {
          type: 'set_cell',
          cellId: bitCellId(event.index),
          value,
          state: { role: value === 1 ? 'active' : 'idle', color: value === 1 ? 'success' : 'muted', pulse: true },
        },
        { type: 'add_note', text: `bit[${event.index}] = ${value}` },
      ]
    }

    case 'bitset.highlight': {
      const value = valueAt(context, event.index)
      return [
        ...cleanup,
        { type: 'set_state', entityId: bitCellId(event.index), state: { role: 'current', color: 'warning', pulse: true }, merge: true },
        { type: 'add_note', text: `检视 bit[${event.index}] = ${value}` },
      ]
    }
  }
}
