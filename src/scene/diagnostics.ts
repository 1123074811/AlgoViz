import type { AnimationScript } from '@/types/animation'

export interface SceneDiagnostic {
  stepId: number
  eventIndex: number
  type: string
  severity: 'warning' | 'error'
  message: string
}

const IMPLEMENTED_EVENT_PREFIXES = ['scene.', 'linked_list.', 'tree.', 'array.', 'matrix.', 'n_queens.', 'graph.', 'queue.', 'stack.', 'string.', 'set.', 'map.', 'deque.', 'hashtable.', 'math.']

const REQUIRED_FIELDS: Record<string, string[]> = {
  'linked_list.create': ['variant', 'nodes'],
  'linked_list.insert_after': ['targetNodeId', 'newNode'],
  'linked_list.insert_before': ['targetNodeId', 'newNode'],
  'linked_list.delete': ['nodeId'],
  'linked_list.move_pointer': ['pointerId'],
  'tree.create': ['variant', 'rootId', 'nodes', 'edges'],
  'tree.insert': ['parentId', 'node'],
  'tree.visit': ['nodeId'],
  'tree.compare': ['nodeId', 'value'],
  'graph.create': ['nodes', 'edges'],
  'graph.visit_node': ['nodeId'],
  'graph.visit_edge': ['source', 'target'],
  'graph.enqueue': ['nodeId'],
  'graph.dequeue': ['nodeId'],
  'array.create': ['values'],
  'array.compare': ['indices'],
  'array.swap': ['indices'],
  'matrix.create': ['rows', 'cols'],
  'matrix.visit_cell': ['row', 'col'],
  'matrix.update_cell': ['row', 'col', 'value'],
  'n_queens.try_place': ['row', 'col'],
  'n_queens.place': ['row', 'col'],
  'n_queens.backtrack': ['row', 'col'],
  'n_queens.solution': ['queens'],
}

export function diagnoseSceneScript(script: AnimationScript | null | undefined): SceneDiagnostic[] {
  if (!script) return []
  const diagnostics: SceneDiagnostic[] = []

  script.steps.forEach((step) => {
    step.events?.forEach((event, eventIndex) => {
      const record = event as unknown as Record<string, unknown>
      const type = String(record.type ?? '')
      if (!IMPLEMENTED_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix))) {
        diagnostics.push({ stepId: step.stepId, eventIndex, type, severity: 'warning', message: `未注册的 Scene event: ${type}` })
        return
      }

      const required = REQUIRED_FIELDS[type] ?? []
      required.forEach((field) => {
        if (record[field] === undefined || record[field] === null) {
          diagnostics.push({ stepId: step.stepId, eventIndex, type, severity: 'error', message: `${type} 缺少字段 ${field}` })
        }
      })
    })
  })

  return diagnostics
}

export function getStepDiagnostics(script: AnimationScript | null | undefined, currentStep: number): SceneDiagnostic[] {
  if (!script || currentStep <= 0) return []
  const step = script.steps[Math.min(currentStep, script.steps.length) - 1]
  if (!step) return []
  return diagnoseSceneScript(script).filter((diagnostic) => diagnostic.stepId === step.stepId)
}

export function getSceneDiagnosticSummary(script: AnimationScript | null | undefined) {
  const diagnostics = diagnoseSceneScript(script)
  return {
    diagnostics,
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length,
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
  }
}
