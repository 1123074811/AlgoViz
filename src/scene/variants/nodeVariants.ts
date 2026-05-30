import type { SceneNode } from '../types'
import { DataUnit } from '../primitives/DataUnits'

export function createLinkedListNode(id: string, value: number | string, variant: 'singly' | 'doubly' | 'circular' = 'singly', x = 0, y = 0): SceneNode {
  return DataUnit.listNode({ id, value, variant, x, y })
}

export function createTreeNode(id: string, value: number | string, variant: 'binary' | 'bst' | 'avl' | 'btree' | 'trie' = 'binary', x = 0, y = 0): SceneNode {
  return DataUnit.treeNode({ id, value, variant, x, y })
}

