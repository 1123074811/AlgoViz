import type { ActionColor } from '@/types/animation'
import type { SceneEntityState } from './types'
import type { CallStackEvent, DPEvent, GridEvent } from './overlays'

export type CommonAlgorithmEvent =
  | { type: 'scene.note'; text: string }
  | { type: 'scene.highlight'; entityId: string; color?: ActionColor; role?: SceneEntityState['role'] }
  | { type: 'scene.clear_highlight'; entityIds?: string[] }
  | { type: 'scene.link'; from: string; to: string; label?: string; color?: ActionColor }
  | { type: 'scene.wait'; duration?: number }
  | { type: 'scene.seq_push'; value: number | string }
  | { type: 'scene.seq_clear' }

export type PointerAlgorithmEvent =
  | { type: 'pointer.create'; pointerId: string; label?: string; targetId?: string; portId?: string }
  | { type: 'pointer.move'; pointerId: string; targetId: string | null; portId?: string; label?: string }
  | { type: 'pointer.clear'; pointerId: string }
  | { type: 'pointer.highlight'; pointerId: string; color?: ActionColor }

export type LinkedListAlgorithmEvent =
  | { type: 'linked_list.create'; variant: 'singly' | 'doubly' | 'circular'; nodes: Array<{ id: string; value: number | string }>; headId?: string; tailId?: string }
  | { type: 'linked_list.visit'; nodeId: string; pointerId?: string }
  | { type: 'linked_list.move_pointer'; pointerId: string; toNodeId: string | null }
  | { type: 'linked_list.insert_after'; targetNodeId: string; newNode: { id: string; value: number | string } }
  | { type: 'linked_list.insert_before'; targetNodeId: string; newNode: { id: string; value: number | string } }
  | { type: 'linked_list.delete'; nodeId: string }
  | { type: 'linked_list.reverse_link'; fromNodeId: string; toNodeId: string | null }
  | { type: 'linked_list.set_head'; nodeId: string | null }
  | { type: 'linked_list.set_tail'; nodeId: string | null }

export type TreeAlgorithmEvent =
  | { type: 'tree.create'; variant: 'binary' | 'bst' | 'avl' | 'btree' | 'trie'; rootId: string; nodes: Array<{ id: string; value: number | string; rbColor?: 'red' | 'black' }>; edges: Array<{ parentId: string; childId: string; port?: string }> }
  | { type: 'tree.visit'; nodeId: string }
  | { type: 'tree.compare'; nodeId: string; value: number | string; result?: 'less' | 'greater' | 'equal' }
  | { type: 'tree.insert'; parentId: string; node: { id: string; value: number | string }; side?: 'left' | 'right' | string }
  | { type: 'tree.delete'; nodeId: string }
  | { type: 'tree.rotate'; rotation: 'left' | 'right' | 'left-right' | 'right-left'; pivotId: string }
  | { type: 'tree.update_metadata'; nodeId: string; height?: number; balanceFactor?: number; metadata?: Record<string, unknown> }
  | { type: 'tree.recolor'; nodeId: string; rbColor: 'red' | 'black' }

export type ArrayAlgorithmEvent =
  | { type: 'array.create'; values: Array<number | string> }
  | { type: 'array.compare'; indices: [number, number] }
  | { type: 'array.swap'; indices: [number, number] }
  | { type: 'array.move'; from: number; to: number }
  | { type: 'array.set_value'; index: number; value: number | string }
  | { type: 'array.mark_sorted'; indices: number[] }
  | { type: 'array.window'; indices: number[]; entering?: number; leaving?: number; isNewMax?: boolean }
  | { type: 'array.partition'; pivotIndex: number; left: number; right: number }

export type GraphAlgorithmEvent =
  | { type: 'graph.create'; nodes: Array<{ id: string; label?: string }>; edges: Array<{ id?: string; source: string; target: string; weight?: number }>; directed?: boolean }
  | { type: 'graph.visit_node'; nodeId: string }
  | { type: 'graph.visit_edge'; source: string; target: string }
  | { type: 'graph.relax_edge'; source: string; target: string; oldDistance?: number | string; newDistance?: number | string; success: boolean }
  | { type: 'graph.enqueue'; nodeId: string }
  | { type: 'graph.dequeue'; nodeId: string }

export type MatrixAlgorithmEvent =
  | { type: 'matrix.create'; rows: number; cols: number; values?: Array<Array<number | string>> }
  | { type: 'matrix.visit_cell'; row: number; col: number }
  | { type: 'matrix.update_cell'; row: number; col: number; value: number | string }
  | { type: 'matrix.mark_path'; cells: Array<{ row: number; col: number }> }
  | { type: 'matrix.mark_conflict'; cells: Array<{ row: number; col: number }> }
  | { type: 'matrix.transition'; from: { row: number; col: number }; to: { row: number; col: number } }

export type NQueensAlgorithmEvent =
  | { type: 'n_queens.try_place'; row: number; col: number }
  | { type: 'n_queens.place'; row: number; col: number }
  | { type: 'n_queens.conflict'; row: number; col: number; conflicts: Array<{ row: number; col: number }> }
  | { type: 'n_queens.backtrack'; row: number; col: number }
  | { type: 'n_queens.solution'; queens: Array<{ row: number; col: number }> }

export type StackAlgorithmEvent =
  | { type: 'stack.create'; values: Array<number | string>; label?: string }
  | { type: 'stack.push'; value: number | string; label?: string }
  | { type: 'stack.pop' }
  | { type: 'stack.peek'; index: number }

export type QueueAlgorithmEvent =
  | { type: 'queue.create'; values: Array<number | string> }
  | { type: 'queue.enqueue'; value: number | string }
  | { type: 'queue.dequeue' }
  | { type: 'queue.peek_front'; index: number }

export type StringAlgorithmEvent =
  | { type: 'string.create'; text: string; row?: number }
  | { type: 'string.create_double'; text: string; pattern: string }
  | { type: 'string.compare'; row: number; indices: [number, number] }
  | { type: 'string.match'; row: number; index: number }
  | { type: 'string.mismatch'; row: number; index: number }
  | { type: 'string.mark_range'; row: number; indices: number[] }
  | { type: 'string.shift_pattern'; offset: number }

export type SetAlgorithmEvent =
  | { type: 'set.create'; values: Array<number | string>; label?: string }
  | { type: 'set.add'; value: number | string }
  | { type: 'set.remove'; value: number | string }
  | { type: 'set.contains'; value: number | string; found: boolean }

export type MapAlgorithmEvent =
  | { type: 'map.create'; entries: Array<{ key: string; value: number | string }>; label?: string }
  | { type: 'map.put'; key: string; value: number | string }
  | { type: 'map.get'; key: string; value?: number | string; found: boolean }
  | { type: 'map.remove'; key: string }

export type DequeAlgorithmEvent =
  | { type: 'deque.create'; values: Array<number | string> }
  | { type: 'deque.push_front'; value: number | string }
  | { type: 'deque.push_back'; value: number | string }
  | { type: 'deque.pop_front' }
  | { type: 'deque.pop_back' }
  | { type: 'deque.peek_front'; index: number }
  | { type: 'deque.peek_back'; index: number }

export type HashTableAlgorithmEvent =
  | { type: 'hashtable.create'; capacity: number }
  | { type: 'hashtable.put'; key: string; value: number | string; bucket: number; collision?: boolean }
  | { type: 'hashtable.get'; key: string; bucket: number; found: boolean }
  | { type: 'hashtable.remove'; key: string; bucket: number }
  | { type: 'hashtable.highlight_bucket'; bucket: number }

export type HeapAlgorithmEvent =
  | { type: 'heap.create'; values: Array<number>; variant?: 'min' | 'max' }
  | { type: 'heap.push'; value: number }
  | { type: 'heap.pop' }
  | { type: 'heap.sift'; from: number; to: number }
  | { type: 'heap.peek'; index: number }

export type BitsetAlgorithmEvent =
  | { type: 'bitset.create'; bits: number; label?: string }
  | { type: 'bitset.set'; index: number; value: 0 | 1 }
  | { type: 'bitset.highlight'; index: number }

export type SkipListAlgorithmEvent =
  | { type: 'skip_list.create'; values: number[]; heights: number[] }
  | { type: 'skip_list.compare'; node: number; level: number; target: number }
  | { type: 'skip_list.move_right'; from: number; to: number; level: number }
  | { type: 'skip_list.drop_down'; node: number; fromLevel: number; toLevel: number }
  | { type: 'skip_list.found'; node: number; level: number; target: number }
  | { type: 'skip_list.miss'; node: number; level: number; target: number }

export type UnionFindAlgorithmEvent =
  | { type: 'union_find.create'; size: number; parent: number[]; rank?: number[] }
  | { type: 'union_find.find'; node: number; root: number; path: number[]; parent: number[]; rank?: number[] }
  | { type: 'union_find.link'; childRoot: number; parentRoot: number; parent: number[]; rank?: number[]; reason?: string }
  | { type: 'union_find.compress'; node: number; from: number; to: number; parent: number[]; rank?: number[] }
  | { type: 'union_find.same'; x: number; y: number; root: number; parent: number[]; rank?: number[] }
  | { type: 'union_find.done'; parent: number[]; rank?: number[] }

export type MathAlgorithmEvent =
  | { type: 'math.init'; vars: Array<{ name: string; value: number | string }> }
  | { type: 'math.set'; name: string; value: number | string; delta?: string }
  | { type: 'math.highlight'; name: string }
  | { type: 'math.note'; text: string }

export type GeometryAlgorithmEvent =
  | { type: 'geometry.plane'; xRange: [number, number]; yRange: [number, number] }
  | { type: 'geometry.point'; id: string; x: number; y: number; label?: string; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.segment'; id: string; from: [number, number]; to: [number, number]; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.polygon'; id: string; points: Array<[number, number]>; color?: 'primary' | 'success' | 'danger' | 'muted' }
  | { type: 'geometry.sweepline'; axis: 'x' | 'y'; value: number }
  | { type: 'geometry.clear' }

export type AutomatonAlgorithmEvent =
  | { type: 'automaton.create'; states: Array<{ id: string; label?: string; accepting?: boolean; start?: boolean }> }
  | { type: 'automaton.transition'; id: string; from: string; to: string; label: string }
  | { type: 'automaton.activate'; stateId: string }
  | { type: 'automaton.consume'; symbol: string; index: number }
  | { type: 'automaton.clear' }

export type ProbAlgorithmEvent =
  | { type: 'prob.dist'; bins: Array<{ label: string; weight: number }> }
  | { type: 'prob.sample'; index: number }
  | { type: 'prob.reservoir'; capacity: number; items: Array<number | string> }
  | { type: 'prob.note'; text: string }
  | { type: 'prob.clear' }

export type GraphAnalysisAlgorithmEvent =
  | { type: 'graph_analysis.update'; discLow?: Record<string, [number, number]>; stack?: string[]; components?: Record<string, number> }
  | { type: 'graph_analysis.clear' }

export type AlgorithmEvent = CommonAlgorithmEvent | PointerAlgorithmEvent | LinkedListAlgorithmEvent | TreeAlgorithmEvent | ArrayAlgorithmEvent | GraphAlgorithmEvent | MatrixAlgorithmEvent | NQueensAlgorithmEvent | StackAlgorithmEvent | QueueAlgorithmEvent | StringAlgorithmEvent | SetAlgorithmEvent | MapAlgorithmEvent | DequeAlgorithmEvent | HashTableAlgorithmEvent | HeapAlgorithmEvent | BitsetAlgorithmEvent | SkipListAlgorithmEvent | UnionFindAlgorithmEvent | MathAlgorithmEvent | GeometryAlgorithmEvent | AutomatonAlgorithmEvent | ProbAlgorithmEvent | GraphAnalysisAlgorithmEvent | CallStackEvent | DPEvent | GridEvent

export const ALGORITHM_EVENT_TYPES = new Set<AlgorithmEvent['type']>([
  'scene.note', 'scene.highlight', 'scene.clear_highlight', 'scene.link', 'scene.wait',
  'scene.seq_push', 'scene.seq_clear',
  'pointer.create', 'pointer.move', 'pointer.clear', 'pointer.highlight',
  'linked_list.create', 'linked_list.visit', 'linked_list.move_pointer',
  'linked_list.insert_after', 'linked_list.insert_before', 'linked_list.delete',
  'linked_list.reverse_link', 'linked_list.set_head', 'linked_list.set_tail',
  'tree.create', 'tree.visit', 'tree.compare', 'tree.insert', 'tree.delete',
  'tree.rotate', 'tree.update_metadata', 'tree.recolor',
  'array.create', 'array.compare', 'array.swap', 'array.move', 'array.set_value',
  'array.mark_sorted', 'array.window', 'array.partition',
  'graph.create', 'graph.visit_node', 'graph.visit_edge', 'graph.relax_edge',
  'graph.enqueue', 'graph.dequeue',
  'matrix.create', 'matrix.visit_cell', 'matrix.update_cell', 'matrix.mark_path',
  'matrix.mark_conflict', 'matrix.transition',
  'n_queens.try_place', 'n_queens.place', 'n_queens.conflict',
  'n_queens.backtrack', 'n_queens.solution',
  'stack.create', 'stack.push', 'stack.pop', 'stack.peek',
  'queue.create', 'queue.enqueue', 'queue.dequeue', 'queue.peek_front',
  'string.create', 'string.create_double', 'string.compare', 'string.match',
  'string.mismatch', 'string.mark_range', 'string.shift_pattern',
  'set.create', 'set.add', 'set.remove', 'set.contains',
  'map.create', 'map.put', 'map.get', 'map.remove',
  'deque.create', 'deque.push_front', 'deque.push_back', 'deque.pop_front',
  'deque.pop_back', 'deque.peek_front', 'deque.peek_back',
  'hashtable.create', 'hashtable.put', 'hashtable.get', 'hashtable.remove',
  'hashtable.highlight_bucket',
  'heap.create', 'heap.push', 'heap.pop', 'heap.sift', 'heap.peek',
  'bitset.create', 'bitset.set', 'bitset.highlight',
  'skip_list.create', 'skip_list.compare', 'skip_list.move_right',
  'skip_list.drop_down', 'skip_list.found', 'skip_list.miss',
  'union_find.create', 'union_find.find', 'union_find.link', 'union_find.compress',
  'union_find.same', 'union_find.done',
  'math.init', 'math.set', 'math.highlight', 'math.note',
  'geometry.plane', 'geometry.point', 'geometry.segment', 'geometry.polygon',
  'geometry.sweepline', 'geometry.clear',
  'automaton.create', 'automaton.transition', 'automaton.activate',
  'automaton.consume', 'automaton.clear',
  'prob.dist', 'prob.sample', 'prob.reservoir', 'prob.note', 'prob.clear',
  'graph_analysis.update', 'graph_analysis.clear',
  'callstack.create', 'callstack.push', 'callstack.update', 'callstack.return',
  'callstack.pop', 'callstack.highlight',
  'dp.create', 'dp.set', 'dp.highlight', 'dp.dependency', 'dp.formula',
  'dp.traceback', 'dp.roll',
  'grid.create', 'grid.set_cell', 'grid.visit', 'grid.frontier', 'grid.path',
  'grid.wall', 'grid.weight', 'grid.arrow',
])

export function isAlgorithmEvent(value: unknown): value is AlgorithmEvent {
  if (!value || typeof value !== 'object') return false
  const type = (value as { type?: unknown }).type
  return typeof type === 'string' && ALGORITHM_EVENT_TYPES.has(type as AlgorithmEvent['type'])
}
