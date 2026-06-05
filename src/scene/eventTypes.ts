import type { ActionColor } from '@/types/animation'
import type { SceneEntityState } from './types'

export type CommonAlgorithmEvent =
  | { type: 'scene.note'; text: string }
  | { type: 'scene.highlight'; entityId: string; color?: ActionColor; role?: SceneEntityState['role'] }
  | { type: 'scene.clear_highlight'; entityIds?: string[] }
  | { type: 'scene.wait'; duration?: number }

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
  | { type: 'tree.create'; variant: 'binary' | 'bst' | 'avl' | 'btree' | 'trie'; rootId: string; nodes: Array<{ id: string; value: number | string }>; edges: Array<{ parentId: string; childId: string; port?: string }> }
  | { type: 'tree.visit'; nodeId: string }
  | { type: 'tree.compare'; nodeId: string; value: number | string; result?: 'less' | 'greater' | 'equal' }
  | { type: 'tree.insert'; parentId: string; node: { id: string; value: number | string }; side?: 'left' | 'right' | string }
  | { type: 'tree.delete'; nodeId: string }
  | { type: 'tree.rotate'; rotation: 'left' | 'right' | 'left-right' | 'right-left'; pivotId: string }
  | { type: 'tree.update_metadata'; nodeId: string; height?: number; balanceFactor?: number; metadata?: Record<string, unknown> }

export type ArrayAlgorithmEvent =
  | { type: 'array.create'; values: Array<number | string> }
  | { type: 'array.compare'; indices: [number, number] }
  | { type: 'array.swap'; indices: [number, number] }
  | { type: 'array.move'; from: number; to: number }
  | { type: 'array.set_value'; index: number; value: number | string }
  | { type: 'array.mark_sorted'; indices: number[] }
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

export type NQueensAlgorithmEvent =
  | { type: 'n_queens.try_place'; row: number; col: number }
  | { type: 'n_queens.place'; row: number; col: number }
  | { type: 'n_queens.conflict'; row: number; col: number; conflicts: Array<{ row: number; col: number }> }
  | { type: 'n_queens.backtrack'; row: number; col: number }
  | { type: 'n_queens.solution'; queens: Array<{ row: number; col: number }> }

export type StackAlgorithmEvent =
  | { type: 'stack.create'; values: Array<number | string> }
  | { type: 'stack.push'; value: number | string }
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

export type MathAlgorithmEvent =
  | { type: 'math.init'; vars: Array<{ name: string; value: number | string }> }
  | { type: 'math.set'; name: string; value: number | string }
  | { type: 'math.highlight'; name: string }
  | { type: 'math.note'; text: string }

export type AlgorithmEvent = CommonAlgorithmEvent | LinkedListAlgorithmEvent | TreeAlgorithmEvent | ArrayAlgorithmEvent | GraphAlgorithmEvent | MatrixAlgorithmEvent | NQueensAlgorithmEvent | StackAlgorithmEvent | QueueAlgorithmEvent | StringAlgorithmEvent | SetAlgorithmEvent | MapAlgorithmEvent | DequeAlgorithmEvent | HashTableAlgorithmEvent | HeapAlgorithmEvent | MathAlgorithmEvent
