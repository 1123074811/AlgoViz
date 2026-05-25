import type { AnimationScript } from '@/types/animation'
import bubbleSortPreset from './bubbleSort'
import selectionSortPreset from './selectionSort'
import insertionSortPreset from './insertionSort'
import mergeSortPreset from './mergeSort'
import quickSortPreset from './quickSort'
import binarySearchPreset from './binarySearch'
import bfsGraphPreset from './bfsGraph'
import dfsGraphPreset from './dfsGraph'

const presetRegistry: Record<string, AnimationScript> = {
  bubble_sort: bubbleSortPreset,
  selection_sort: selectionSortPreset,
  insertion_sort: insertionSortPreset,
  merge_sort: mergeSortPreset,
  quick_sort: quickSortPreset,
  binary_search: binarySearchPreset,
  bfs_graph: bfsGraphPreset,
  dfs_graph: dfsGraphPreset,
}

export function getPreset(algoId: string): AnimationScript | undefined {
  return presetRegistry[algoId]
}

export function hasPreset(algoId: string): boolean {
  return algoId in presetRegistry
}

export { generatePreset, hasGenerator } from './generators'

export {
  bubbleSortPreset,
  selectionSortPreset,
  insertionSortPreset,
  mergeSortPreset,
  quickSortPreset,
  binarySearchPreset,
  bfsGraphPreset,
  dfsGraphPreset,
}
