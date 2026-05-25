import type { AnimationScript } from '@/types/animation'
import bubbleSortPreset from './bubbleSort'
import selectionSortPreset from './selectionSort'
import binarySearchPreset from './binarySearch'

const presetRegistry: Record<string, AnimationScript> = {
  bubble_sort: bubbleSortPreset,
  selection_sort: selectionSortPreset,
  binary_search: binarySearchPreset,
}

export function getPreset(algoId: string): AnimationScript | undefined {
  return presetRegistry[algoId]
}

export function hasPreset(algoId: string): boolean {
  return algoId in presetRegistry
}

export { bubbleSortPreset, selectionSortPreset, binarySearchPreset }
