import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { ProbAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'

const BASE_X = 160, BASE_Y = 360, BAR_GAP = 56, BAR_W = 40, RES_Y = 120, RES_GAP = 50

export const probCompiler: EventCompiler = {
  supports: (e): e is ProbAlgorithmEvent => e.type.startsWith('prob.'),
  compile: (e, ctx) => compile(e as ProbAlgorithmEvent, ctx),
}

function binCell(i: number, label: string, weight: number, color: ActionColor, pulse: boolean): SceneCell {
  return {
    id: `prob_bin_${i}`, type: 'cell',
    position: { x: BASE_X + i * BAR_GAP, y: BASE_Y }, size: { width: BAR_W, height: 1 },
    value: label, col: i, state: { role: pulse ? 'active' : 'idle', color, pulse },
    meta: { kind: 'bin', label, weight },
  }
}
function resCell(i: number, value: number | string, color: ActionColor, pulse: boolean): SceneCell {
  return {
    id: `prob_res_${i}`, type: 'cell',
    position: { x: BASE_X + i * RES_GAP, y: RES_Y }, size: { width: 40, height: 40 },
    value: String(value), col: i, state: { role: pulse ? 'inserted' : 'idle', color, pulse },
    meta: { kind: 'reservoir' },
  }
}

function compile(event: ProbAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'prob.dist':
      return event.bins.map((b, i) => ({ type: 'create_cell' as const, cell: binCell(i, b.label, b.weight, 'primary', false) }))
    case 'prob.sample': {
      const cleanup = Object.keys(context.scene.entities)
        .filter(k => k.startsWith('prob_bin_') && context.scene.entities[k]?.state?.pulse)
        .map(k => ({ type: 'set_state' as const, entityId: k, state: { pulse: false, role: 'idle' as const, color: 'primary' as const }, merge: true }))
      return [...cleanup, { type: 'set_state', entityId: `prob_bin_${event.index}`, state: { role: 'active', color: 'success', pulse: true }, merge: true }]
    }
    case 'prob.reservoir':
      return event.items.map((v, i) => ({ type: 'create_cell' as const, cell: resCell(i, v, 'primary', false) }))
    case 'prob.note':
      return [{ type: 'add_note', text: event.text }]
    case 'prob.clear':
      return Object.keys(context.scene.entities).filter(k => k.startsWith('prob_')).map(id => ({ type: 'remove_entity' as const, entityId: id }))
  }
}
