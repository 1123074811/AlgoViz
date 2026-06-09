import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { AlgorithmEvent, AutomatonAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell, SceneEdge } from '../types'

const START_X = 140, START_Y = 240, GAP = 130, R = 26

export const automatonCompiler: EventCompiler = {
  supports: (event: AlgorithmEvent): event is AutomatonAlgorithmEvent => event.type.startsWith('automaton.'),
  compile: (event, context) => compile(event as AutomatonAlgorithmEvent, context),
}

const stateId = (id: string) => `auto_${id}`
const edgeId = (id: string) => `autoedge_${id}`

function stateCell(id: string, slot: number, label: string | undefined, accepting: boolean, start: boolean, color: ActionColor, pulse: boolean): SceneCell {
  return {
    id: stateId(id), type: 'cell',
    position: { x: START_X + slot * GAP, y: START_Y },
    size: { width: R * 2, height: R * 2 },
    value: label ?? id, col: slot,
    state: { role: pulse ? 'active' : 'idle', color, pulse },
    meta: { kind: 'state', accepting, start, name: id },
  }
}

function compile(event: AutomatonAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'automaton.create':
      return event.states.map((s, i) => ({ type: 'create_cell' as const, cell: stateCell(s.id, i, s.label, !!s.accepting, !!s.start, 'primary', false) }))
    case 'automaton.transition': {
      const edge: SceneEdge = {
        id: edgeId(event.id), type: 'edge',
        from: { entityId: stateId(event.from) }, to: { entityId: stateId(event.to) },
        label: event.label, directed: true,
        style: { curved: event.from === event.to, color: 'muted' },
      }
      return [{ type: 'connect', edge }]
    }
    case 'automaton.activate': {
      const cleanup = Object.keys(context.scene.entities)
        .filter(k => k.startsWith('auto_') && context.scene.entities[k]?.state?.pulse)
        .map(k => ({ type: 'set_state' as const, entityId: k, state: { pulse: false, role: 'idle' as const, color: 'primary' as const }, merge: true }))
      return [...cleanup, { type: 'set_state', entityId: stateId(event.stateId), state: { role: 'active', color: 'success', pulse: true }, merge: true }]
    }
    case 'automaton.consume':
      return [{ type: 'add_note', text: `读入 '${event.symbol}'（位置 ${event.index}）` }]
    case 'automaton.clear':
      return [
        ...Object.keys(context.scene.entities).filter(k => k.startsWith('auto_')).map(id => ({ type: 'remove_entity' as const, entityId: id })),
        ...Object.keys(context.scene.edges).filter(k => k.startsWith('autoedge_')).map(id => ({ type: 'disconnect' as const, edgeId: id })),
      ]
  }
}
