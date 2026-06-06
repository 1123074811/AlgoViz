import type { AnimationScript } from '@/types/animation'

// All presets are now dynamic generators — the static preset registry is empty
const presetRegistry: Record<string, AnimationScript> = {}

export function getPreset(algoId: string): AnimationScript | undefined { return presetRegistry[algoId] }
export function hasPreset(algoId: string): boolean { return algoId in presetRegistry }

export {
  generatePreset, hasGenerator,
  generateBubbleSort, generateSelectionSort, generateInsertionSort,
  generateMergeSort, generateQuickSort, generateBinarySearch,
  generateBFS, generateDFS,
  generateDijkstra, generatePrim, generateKruskal, generateTopologicalSort,
  generateFloyd, generateAStar,
} from './generators'

export { generateSlidingWindow } from './slidingWindow'
export { generateMonotonicStack } from './monotonicStack'
export { generateKnapsack } from './knapsack'
export { generateStack } from './stack'
export { generateQueue } from './queue'
export { generateHeapOperations } from './heap'
export { generateUnionFind } from './unionFind'
export { generateSegmentTree } from './segmentTree'
export { generateSet } from './setDS'
export { generateMap } from './mapDS'
export { generateDeque } from './dequeDS'
export { generateCircularLinkedList } from './circularLinkedList'
export { generateBTree } from './bTree'
export { generateBPlusTree } from './bPlusTree'
export { generateGCD } from './gcd'
