import type { SceneCommand } from './commandTypes'
import type { AlgorithmEvent } from './eventTypes'
import type { CompileContext } from './SceneEngine'
import { sceneEventCompilers as compilers } from './compilerRegistry'
import { compileAlgorithmOverlayEvent, createAlgorithmOverlayState, isAlgorithmOverlayEvent } from './overlays/overlayCompiler'
import { AuxiliaryUnit } from './primitives/DataUnits'

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
  if (event.type === 'scene.seq_push') {
    // 输出序列条:遍历类算法把访问到的值依次追加到画布底部的绿色 chip 行(对齐 demo 的 seqchip)。
    const n = Object.keys(context.scene.entities).filter((id) => id.startsWith('seq_')).length
    return [{
      type: 'create_cell',
      cell: {
        id: `seq_${n}`, type: 'cell',
        position: { x: 180 + n * 40, y: 470 }, size: { width: 34, height: 30 },
        value: event.value,
        state: { role: 'sorted', color: 'success' },
      },
      animation: 'scale',
    }]
  }
  if (event.type === 'scene.seq_clear') {
    return Object.keys(context.scene.entities)
      .filter((id) => id.startsWith('seq_'))
      .map((entityId) => ({ type: 'remove_entity' as const, entityId }))
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
