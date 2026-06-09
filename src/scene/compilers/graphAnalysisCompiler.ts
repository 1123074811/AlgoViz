import type { SceneCommand } from '../commandTypes'
import type { GraphAnalysisAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'

const MARKER = 'gan_marker'

interface AnalysisModel {
  discLow: Record<string, [number, number]>
  stack: string[]
  components: Record<string, number>
}

export const graphAnalysisCompiler: EventCompiler = {
  supports: (e): e is GraphAnalysisAlgorithmEvent => e.type.startsWith('graph_analysis.'),
  compile: (e, ctx) => compile(e as GraphAnalysisAlgorithmEvent, ctx),
}

function readModel(context: CompileContext): AnalysisModel {
  const m = context.scene.entities[MARKER]
  const meta = m?.type === 'cell' ? (m.meta as Partial<AnalysisModel> | undefined) : undefined
  return { discLow: { ...(meta?.discLow ?? {}) }, stack: [...(meta?.stack ?? [])], components: { ...(meta?.components ?? {}) } }
}

function markerCell(model: AnalysisModel): SceneCell {
  return {
    id: MARKER, type: 'cell',
    position: { x: 0, y: 0 }, size: { width: 0, height: 0 },
    value: '', state: { role: 'empty_placeholder', color: 'muted' },
    meta: { ...model },
  }
}

function compile(event: GraphAnalysisAlgorithmEvent, context: CompileContext): SceneCommand[] {
  if (event.type === 'graph_analysis.clear') {
    return context.scene.entities[MARKER] ? [{ type: 'remove_entity', entityId: MARKER }] : []
  }
  const model = readModel(context)
  if (event.discLow) Object.assign(model.discLow, event.discLow)
  if (event.stack) model.stack = [...event.stack]
  if (event.components) Object.assign(model.components, event.components)
  return [{ type: 'create_cell', cell: markerCell(model) }]
}
