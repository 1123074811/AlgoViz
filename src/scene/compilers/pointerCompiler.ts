import type { SceneCommand } from '../commandTypes'
import type { PointerAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'

export const pointerCompiler: EventCompiler = {
  supports: (event): event is PointerAlgorithmEvent => event.type.startsWith('pointer.'),
  compile: (event, context) => compilePointerEvent(event as PointerAlgorithmEvent, context),
}

function compilePointerEvent(event: PointerAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'pointer.create':
      return [{
        type: 'move_pointer',
        pointerId: event.pointerId,
        target: event.targetId ? { entityId: event.targetId, portId: event.portId } : null,
        label: event.label ?? event.pointerId,
      }]
    case 'pointer.move': {
      const existing = context.scene.pointers[event.pointerId]
      return [{
        type: 'move_pointer',
        pointerId: event.pointerId,
        target: event.targetId ? { entityId: event.targetId, portId: event.portId } : null,
        label: event.label ?? existing?.label ?? event.pointerId,
      }]
    }
    case 'pointer.clear': {
      const existing = context.scene.pointers[event.pointerId]
      return [{
        type: 'move_pointer',
        pointerId: event.pointerId,
        target: null,
        label: existing?.label ?? event.pointerId,
      }]
    }
    case 'pointer.highlight':
      return [{
        type: 'set_state',
        entityId: event.pointerId,
        state: { role: 'active', color: event.color ?? 'primary', pulse: true },
        merge: true,
      }]
  }
}
