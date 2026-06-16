import type { SceneCommand } from '../commandTypes'
import type { GraphAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { createEdge } from '../variants/edgeVariants'
import { createGraphNode } from '../variants/graphNodeVariants'

export const graphCompiler: EventCompiler = {
  supports: (event): event is GraphAlgorithmEvent => event.type.startsWith('graph.'),
  compile: (event, context) => compileGraphEvent(event as GraphAlgorithmEvent, context),
}

function compileGraphEvent(event: GraphAlgorithmEvent, _context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'graph.create':
      return [
        ...event.nodes.map((node) => ({ type: 'create_node' as const, node: createGraphNode(node.id, node.label ?? node.id) })),
        ...event.edges.map((edge) => ({ type: 'connect' as const, edge: createEdge(edge.id ?? edgeId(edge.source, edge.target), edge.source, 'center', edge.target, 'center', undefined, false) })),
        { type: 'relayout', layout: 'graph' },
      ]
    case 'graph.visit_node':
      return [{ type: 'set_state', entityId: event.nodeId, state: { role: 'visited', color: 'success', pulse: true }, merge: true }]
    case 'graph.visit_edge':
      return [{ type: 'set_state', entityId: edgeId(event.source, event.target), state: { role: 'active', color: 'warning', pulse: true }, merge: true }]
    case 'graph.relax_edge':
      return [
        { type: 'set_state', entityId: edgeId(event.source, event.target), state: { role: event.success ? 'safe' : 'candidate', color: event.success ? 'success' : 'warning', pulse: event.success }, merge: true },
        { type: 'set_state', entityId: event.target, state: { role: event.success ? 'visited' : 'candidate', color: event.success ? 'success' : 'warning' }, merge: true },
      ]
    case 'graph.enqueue':
      // 入队=frontier(已发现待处理)：对齐 demo .frontier 橙。
      return [{ type: 'set_state', entityId: event.nodeId, state: { role: 'candidate', color: 'warning', badge: 'Q' }, merge: true }]
    case 'graph.dequeue':
      // 出队=current(正在处理)：对齐 demo .active 钢蓝 + lens 光斑跟随。
      return [{ type: 'set_state', entityId: event.nodeId, state: { role: 'current', color: 'primary', badge: undefined, pulse: true }, merge: true }]
  }
}

function edgeId(source: string, target: string) {
  return `e_${source}_center_${target}`
}
