import type { AnimationStep, TeachingState, RangeState, VisualRole, ActionColor, AuxiliaryArrayState } from '@/types/animation'

export function makeStep(
  id: number, codeLine: number, zh: string, en: string,
  type: AnimationStep['action']['type'], targets: number[],
  color: AnimationStep['action']['color'],
  comps: number, swaps: number, accs: number,
  teachingState?: TeachingState,
): AnimationStep {
  return { stepId: id, codeLine, description: { zh, en }, action: { type, targets, color }, stats: { comparisons: comps, swaps, accesses: accs }, teachingState }
}

/** Shorthand: create a range segment */
export function rng(id: string, label: string, start: number, end: number, role: VisualRole, color?: ActionColor): RangeState {
  return { id, label, start, end, role, color }
}

/** Shorthand: create an auxiliary array panel */
export function auxArr(id: string, label: string, data: Array<number | string>, activeIndices?: number[]): AuxiliaryArrayState {
  return { id, label, data, activeIndices }
}

/** Create a teachingState object for sorting algorithms */
export function sortTeaching(
  vars: Record<string, string | number | boolean | null>,
  ...ranges: RangeState[]
): TeachingState {
  return { variables: vars, ranges: ranges.length > 0 ? ranges : undefined }
}

/** Create a teachingState with auxiliary arrays (for merge/count/radix sort etc.) */
export function sortTeachingWithAux(
  vars: Record<string, string | number | boolean | null>,
  auxArrays: AuxiliaryArrayState[],
  ...ranges: RangeState[]
): TeachingState {
  return { variables: vars, ranges: ranges.length > 0 ? ranges : undefined, auxiliaryArrays: auxArrays }
}
