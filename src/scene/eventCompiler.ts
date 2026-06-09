import type { SceneCommand } from './commandTypes'
import type { AlgorithmEvent } from './eventTypes'
import type { CompileContext } from './SceneEngine'
import { arrayCompiler } from './compilers/arrayCompiler'
import { bitsetCompiler } from './compilers/bitsetCompiler'
import { dequeCompiler } from './compilers/dequeCompiler'
import { geometryCompiler } from './compilers/geometryCompiler'
import { graphCompiler } from './compilers/graphCompiler'
import { hashTableCompiler } from './compilers/hashTableCompiler'
import { heapCompiler } from './compilers/heapCompiler'
import { linkedListCompiler } from './compilers/linkedListCompiler'
import { mapCompiler } from './compilers/mapCompiler'
import { mathCompiler } from './compilers/mathCompiler'
import { matrixCompiler } from './compilers/matrixCompiler'
import { pointerCompiler } from './compilers/pointerCompiler'
import { queueCompiler } from './compilers/queueCompiler'
import { setCompiler } from './compilers/setCompiler'
import { stackCompiler } from './compilers/stackCompiler'
import { stringCompiler } from './compilers/stringCompiler'
import { treeCompiler } from './compilers/treeCompiler'
import { unionFindCompiler } from './compilers/unionFindCompiler'
import { compileAlgorithmOverlayEvent, createAlgorithmOverlayState, isAlgorithmOverlayEvent } from './overlays/overlayCompiler'
import { AuxiliaryUnit } from './primitives/DataUnits'

const compilers = [pointerCompiler, linkedListCompiler, treeCompiler, unionFindCompiler, arrayCompiler, matrixCompiler, graphCompiler, stackCompiler, queueCompiler, stringCompiler, setCompiler, mapCompiler, dequeCompiler, hashTableCompiler, heapCompiler, bitsetCompiler, mathCompiler, geometryCompiler]

export function compileEvent(event: AlgorithmEvent, context: CompileContext): SceneCommand[] {
  if (isAlgorithmOverlayEvent(event)) {
    const overlayState = context.scene.overlays ?? createAlgorithmOverlayState()
    return compileAlgorithmOverlayEvent(overlayState, event).commands
  }

  if (event.type === 'scene.note') return [{ type: 'add_note', text: event.text }]
  if (event.type === 'scene.wait') return [{ type: 'wait', duration: event.duration ?? 300 }]
  if (event.type === 'scene.highlight') {
    return [{ type: 'set_state', entityId: event.entityId, state: { role: event.role ?? 'active', color: event.color ?? 'primary', pulse: true }, merge: true }]
  }
  if (event.type === 'scene.link') {
    return [{
      type: 'connect',
      edge: AuxiliaryUnit.arrow({
        id: `link_${event.from}_${event.to}`,
        fromEntity: event.from,
        toEntity: event.to,
        curved: true,
        dashed: true,
        thickness: 1.2,
        color: event.color ?? 'primary',
        label: event.label,
        pulse: true,
      }),
    }]
  }
  if (event.type === 'scene.clear_highlight') {
    delete context.scene.groups.__matrix_dependencies
    const ids = event.entityIds ?? Object.keys(context.scene.entities)
    return [
      ...Object.keys(context.scene.edges).filter((id) => id.startsWith('dep_')).map((edgeId) => ({ type: 'disconnect' as const, edgeId })),
      ...ids.map((entityId) => ({ type: 'set_state' as const, entityId, state: { role: 'idle' as const, color: 'muted' as const, pulse: false }, merge: true })),
    ]
  }

  const compiler = compilers.find((item) => item.supports(event))
  return compiler ? compiler.compile(event, context) : []
}
