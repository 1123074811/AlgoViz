import type { AnimationScript } from '@/types/animation'
import bubbleSortPreset from './bubbleSort'

const presetRegistry: Record<string, AnimationScript> = {
  bubble_sort: bubbleSortPreset,
}

export function getPreset(algoId: string): AnimationScript | undefined {
  return presetRegistry[algoId]
}

export function hasPreset(algoId: string): boolean {
  return algoId in presetRegistry
}

export { bubbleSortPreset }
