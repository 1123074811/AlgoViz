import type { AnimationScript } from '@/types/animation'
import type { AlgorithmType } from '@/store/algorithmStore'
import type { OperationDef } from '@/presets/operationPresets'
import { getPreset, generatePreset, hasGenerator } from '@/presets'

/**
 * Maps a generic algorithm id + operation id to the concrete generator id used by
 * the preset registry (e.g. `bst` + `insert` → `bst_insert`).
 */
export function getConcreteAlgoId(algoId: string, opId: string): string {
  if (algoId.startsWith('linked_list_') || algoId === 'doubly_linked_list' || algoId === 'linked_list') {
    return `linked_list_${opId}`
  }
  if (algoId.startsWith('bst_') || algoId === 'avl_tree' || algoId === 'red_black_tree' || algoId === 'bst' || algoId === 'avl_insert') {
    return `bst_${opId}`
  }
  if (algoId === 'btree') {
    return `btree_${opId}`
  }
  if (algoId === 'bplus_tree') {
    return `bplus_tree_${opId}`
  }
  return algoId
}

export interface ResolveScriptArgs {
  selectedAlgorithm: AlgorithmType
  currentOperationId: string
  operations: OperationDef[] | undefined
  /** Thunk returning the parsed input for the selected algorithm. */
  parsedInput: () => unknown
  operationParam: string
}

/**
 * Pure decision function: given the selected algorithm + parsed input, decides HOW
 * to produce the AnimationScript. Priority (matching the orchestration effect):
 *   custom operation generator → static op.script
 *   → built-in preset generator → static preset → null.
 *
 * This deliberately does NOT handle AI live mode — that is handled separately by
 * useAIGenerator and the effect skips the preset path while live mode is active.
 */
export function resolveScript(args: ResolveScriptArgs): AnimationScript | null {
  const { selectedAlgorithm, currentOperationId, operations, parsedInput, operationParam } = args

  // If a custom operation is selected, load its script dynamically if a dynamic
  // generator is available, otherwise fall back to the static op script.
  if (currentOperationId) {
    const concreteAlgoId = getConcreteAlgoId(selectedAlgorithm.id, currentOperationId)
    if (hasGenerator(concreteAlgoId)) {
      const baseData = parsedInput()
      const paramVal = Number(operationParam) || 5
      const script = generatePreset(concreteAlgoId, { data: baseData, param: paramVal })
      if (script) {
        return script
      }
    }

    // Fallback to static op script if no dynamic generator
    const op = operations?.find((o) => o.id === currentOperationId)
    if (op) {
      return op.script
    }
  }

  if (selectedAlgorithm.hasPreset) {
    // Try generator first (dynamic, responds to input changes)
    if (hasGenerator(selectedAlgorithm.id)) {
      const data = parsedInput()
      const script = generatePreset(selectedAlgorithm.id, data)
      if (script) {
        return script
      }
    }
    // Fallback to static preset
    const preset = getPreset(selectedAlgorithm.id)
    if (preset) {
      return preset
    }
  }

  return null
}
