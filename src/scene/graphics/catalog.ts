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
  {
    id: 'graph.node',
    domain: 'graph',
    eventPrefix: 'graph.',
    events: ['graph.create', 'graph.visit_node', 'graph.visit_edge', 'graph.relax_edge', 'graph.enqueue', 'graph.dequeue'],
    coversAlgorithms: ['bfs_graph', 'dfs_graph', 'dijkstra', 'bellman_ford', 'a_star', 'floyd', 'prim', 'kruskal', 'topological_sort', 'tarjan_scc'],
  },
  { id: 'stack.cell', domain: 'stack', eventPrefix: 'stack.', events: ['stack.create', 'stack.push', 'stack.pop', 'stack.peek'], coversAlgorithms: ['stack', 'monotonic_stack'] },
  { id: 'queue.cell', domain: 'queue', eventPrefix: 'queue.', events: ['queue.create', 'queue.enqueue', 'queue.dequeue', 'queue.peek_front'], coversAlgorithms: ['queue', 'bfs_graph', 'topological_sort'] },
  { id: 'deque.cell', domain: 'deque', eventPrefix: 'deque.', events: ['deque.create', 'deque.push_front', 'deque.push_back', 'deque.pop_front', 'deque.pop_back', 'deque.peek_front', 'deque.peek_back'], coversAlgorithms: ['deque', 'sliding_window'] },
  { id: 'linked_list.node', domain: 'linked_list', eventPrefix: 'linked_list.', events: ['linked_list.create', 'linked_list.visit', 'linked_list.move_pointer', 'linked_list.insert_after', 'linked_list.insert_before', 'linked_list.delete', 'linked_list.reverse_link', 'linked_list.set_head', 'linked_list.set_tail'], coversAlgorithms: ['linked_list', 'linked_list_insert', 'linked_list_delete', 'linked_list_search', 'linked_list_reversal'] },
  { id: 'pointer.indicator', domain: 'pointer', eventPrefix: 'pointer.', events: ['pointer.create', 'pointer.move', 'pointer.clear', 'pointer.highlight'], coversAlgorithms: ['binary_search', 'sliding_window'] },
  { id: 'string.cell', domain: 'string', eventPrefix: 'string.', events: ['string.create', 'string.create_double', 'string.compare', 'string.match', 'string.mismatch', 'string.mark_range', 'string.shift_pattern'], coversAlgorithms: ['kmp', 'manacher', 'kmp_automaton'] },
  { id: 'bitset.cell', domain: 'bitset', eventPrefix: 'bitset.', events: ['bitset.create', 'bitset.set', 'bitset.highlight'], coversAlgorithms: ['bitset'] },
  { id: 'hashtable.bucket', domain: 'hashTable', eventPrefix: 'hashtable.', events: ['hashtable.create', 'hashtable.put', 'hashtable.get', 'hashtable.remove', 'hashtable.highlight_bucket'], coversAlgorithms: ['hash_table'] },
  { id: 'heap.tree', domain: 'heap', eventPrefix: 'heap.', events: ['heap.create', 'heap.push', 'heap.pop', 'heap.sift', 'heap.peek'], coversAlgorithms: ['heap_ds'] },
  { id: 'set.cell', domain: 'set', eventPrefix: 'set.', events: ['set.create', 'set.add', 'set.remove', 'set.contains'], coversAlgorithms: ['set'] },
  { id: 'map.entry', domain: 'map', eventPrefix: 'map.', events: ['map.create', 'map.put', 'map.get', 'map.remove'], coversAlgorithms: ['map'] },
  { id: 'math.variables', domain: 'math', eventPrefix: 'math.', events: ['math.init', 'math.set', 'math.highlight', 'math.note'], coversAlgorithms: ['gcd_euclidean'] },
  { id: 'union_find.node', domain: 'unionFind', eventPrefix: 'union_find.', events: ['union_find.create', 'union_find.find', 'union_find.link', 'union_find.compress', 'union_find.same', 'union_find.done'], coversAlgorithms: ['union_find'] },
  { id: 'geometry.plane', domain: 'geometry', eventPrefix: 'geometry.', events: ['geometry.plane', 'geometry.point', 'geometry.segment', 'geometry.polygon', 'geometry.sweepline', 'geometry.clear'], coversAlgorithms: ['convex_hull'] },
  { id: 'automaton.state', domain: 'automaton', eventPrefix: 'automaton.', events: ['automaton.create', 'automaton.transition', 'automaton.activate', 'automaton.consume', 'automaton.clear'], coversAlgorithms: ['kmp_automaton'] },
  { id: 'prob.dist', domain: 'prob', eventPrefix: 'prob.', events: ['prob.dist', 'prob.sample', 'prob.reservoir', 'prob.note', 'prob.clear'], coversAlgorithms: ['reservoir_sampling'] },
  { id: 'graph_analysis.overlay', domain: 'graphAnalysis', eventPrefix: 'graph_analysis.', events: ['graph_analysis.update', 'graph_analysis.clear'], coversAlgorithms: ['tarjan_scc'] },
  { id: 'matrix.cell', domain: 'matrix', eventPrefix: 'matrix.', events: ['matrix.create', 'matrix.visit_cell', 'matrix.update_cell', 'matrix.mark_path', 'matrix.mark_conflict', 'matrix.transition'], coversAlgorithms: ['floyd', 'n_queens', 'edit_distance', 'lcs', 'matrix_chain'] },
  { id: 'skip_list.cell', domain: 'skipList', eventPrefix: 'skip_list.', events: ['skip_list.create', 'skip_list.search'], coversAlgorithms: ['skip_list'] },
  { id: 'grid.cell', domain: 'grid', eventPrefix: 'grid.', events: ['grid.create', 'grid.set_cell', 'grid.visit', 'grid.frontier', 'grid.path', 'grid.wall', 'grid.weight', 'grid.arrow'], coversAlgorithms: ['grid_pathfinding', 'grid_dp'] },
  { id: 'dp.table', domain: 'dp', eventPrefix: 'dp.', events: ['dp.create', 'dp.set', 'dp.highlight', 'dp.dependency', 'dp.formula', 'dp.traceback', 'dp.roll'], coversAlgorithms: ['edit_distance', 'lcs', 'lis', 'knapsack_01', 'unbounded_knapsack', 'interval_dp', 'matrix_chain'] },
  { id: 'callstack.frame', domain: 'callStack', eventPrefix: 'callstack.', events: ['callstack.create', 'callstack.push', 'callstack.update', 'callstack.return', 'callstack.pop', 'callstack.highlight'], coversAlgorithms: ['n_queens', 'backtracking', 'sudoku', 'path_sum_iii'] },
]
