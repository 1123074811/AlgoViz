import type { AnimationScript } from '@/types/animation'
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
  bfs_graph: bfsGraphPreset, dfs_graph: dfsGraphPreset,
  dijkstra: dijkstraPreset, prim: primPreset, kruskal: kruskalPreset,
  topological_sort: topologicalSortPreset, floyd: floydPreset,
  bellman_ford: bellmanFordPreset, a_star: aStarPreset,
}

export function getPreset(algoId: string): AnimationScript | undefined { return presetRegistry[algoId] }
export function hasPreset(algoId: string): boolean { return algoId in presetRegistry }

export { generatePreset, hasGenerator, generateBubbleSort, generateSelectionSort, generateInsertionSort, generateMergeSort, generateQuickSort, generateBinarySearch } from './generators'
export { generateSlidingWindow } from './slidingWindow'
export { generateMonotonicStack } from './monotonicStack'
export { generateKnapsack } from './knapsack'
export { generateStack } from './stack'
export { generateQueue } from './queue'
export { generateHeapOperations } from './heap'
export { generateUnionFind } from './unionFind'
export { generateSegmentTree } from './segmentTree'

export {
  bfsGraphPreset, dfsGraphPreset, dijkstraPreset,
  primPreset, kruskalPreset, topologicalSortPreset, floydPreset,
  bellmanFordPreset, aStarPreset,
}
