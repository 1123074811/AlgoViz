// 公共图元目录:枚举每个图元域的元信息,供发现 + (未来)AI 依据其生成脚本。
export interface GraphicEntry {
  /** 图元 id,形如 'array.cell'。 */
  id: string
  /** 图元域(对应 builder/compile 模块)。 */
  domain: string
  /** 该域消费的事件类型前缀(如 'array.')。 */
  eventPrefix: string
  /** 该域支持的具体事件类型。 */
  events: string[]
  /** 覆盖的 demo/生产算法 id。 */
  coversAlgorithms: string[]
}

/** 公共图元目录。批 A~G 逐域追加。 */
export const GRAPHICS_CATALOG: GraphicEntry[] = [
  {
    id: 'array.cell',
    domain: 'array',
    eventPrefix: 'array.',
    events: ['array.create', 'array.compare', 'array.swap', 'array.move', 'array.set_value', 'array.mark_sorted', 'array.window', 'array.partition'],
    coversAlgorithms: ['bubble_sort', 'selection_sort', 'insertion_sort', 'merge_sort', 'quick_sort', 'heap_sort', 'shell_sort', 'counting_sort', 'radix_sort', 'bucket_sort', 'binary_search', 'sliding_window', 'monotonic_stack', 'segment_tree'],
  },
  {
    id: 'tree.node',
    domain: 'tree',
    eventPrefix: 'tree.',
    events: ['tree.create', 'tree.visit', 'tree.compare', 'tree.insert', 'tree.delete', 'tree.rotate', 'tree.update_metadata', 'tree.recolor'],
    coversAlgorithms: ['binary_tree_traverse', 'bst_insert', 'bst_delete', 'bst_search', 'avl_insert', 'avl_tree', 'red_black_tree', 'btree', 'huffman', 'trie'],
  },
]
