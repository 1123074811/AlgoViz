import type { AnimationScript } from '@/types/animation'
import bubbleSortPreset from './bubbleSort'
import selectionSortPreset from './selectionSort'
import insertionSortPreset from './insertionSort'
import mergeSortPreset from './mergeSort'
import quickSortPreset from './quickSort'
import binarySearchPreset from './binarySearch'
import bfsGraphPreset from './bfsGraph'
import dfsGraphPreset from './dfsGraph'
import dijkstraPreset from './dijkstra'
import primPreset from './prim'
import kruskalPreset from './kruskal'
import topologicalSortPreset from './topologicalSort'
import floydPreset from './floyd'
import bellmanFordPreset from './bellmanFord'
import aStarPreset from './aStar'

const presetRegistry: Record<string, AnimationScript> = {
  bubble_sort: bubbleSortPreset, selection_sort: selectionSortPreset,
  insertion_sort: insertionSortPreset, merge_sort: mergeSortPreset,
  quick_sort: quickSortPreset, binary_search: binarySearchPreset,
  bfs_graph: bfsGraphPreset, dfs_graph: dfsGraphPreset,
  dijkstra: dijkstraPreset, prim: primPreset, kruskal: kruskalPreset,
  topological_sort: topologicalSortPreset, floyd: floydPreset,
  bellman_ford: bellmanFordPreset, a_star: aStarPreset,
}

export function getPreset(algoId: string): AnimationScript | undefined { return presetRegistry[algoId] }
export function hasPreset(algoId: string): boolean { return algoId in presetRegistry }

export { generatePreset, hasGenerator } from './generators'
export { generateSlidingWindow } from './slidingWindow'
export { generateMonotonicStack } from './monotonicStack'
export { generateKnapsack } from './knapsack'
export { generateStack } from './stack'
export { generateQueue } from './queue'
export { generateHeapOperations } from './heap'
export { generateUnionFind } from './unionFind'
export { generateSegmentTree } from './segmentTree'

export {
  bubbleSortPreset, selectionSortPreset, insertionSortPreset,
  mergeSortPreset, quickSortPreset, binarySearchPreset,
  bfsGraphPreset, dfsGraphPreset, dijkstraPreset,
  primPreset, kruskalPreset, topologicalSortPreset, floydPreset,
  bellmanFordPreset, aStarPreset,
}
