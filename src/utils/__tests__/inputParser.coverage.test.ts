import { describe, expect, it } from 'vitest'
import {
  parseAlgorithmInput,
  getLeetCodePlaceholder,
  getLeetCodeDefault,
} from '@/utils/inputParser'

// ─── parseAlgorithmInput: JSON format ──────────────────────────────────────
describe('parseAlgorithmInput — json format', () => {
  it('parses valid JSON object', () => {
    expect(parseAlgorithmInput('{"a":1,"b":[2,3]}', 'json', 'whatever')).toEqual({ a: 1, b: [2, 3] })
  })

  it('parses valid JSON array', () => {
    expect(parseAlgorithmInput('[1, 2, 3]', 'json', 'bubble_sort')).toEqual([1, 2, 3])
  })

  it('returns raw string when JSON is malformed', () => {
    expect(parseAlgorithmInput('{not json}', 'json', 'x')).toBe('{not json}')
  })

  it('parses JSON primitives', () => {
    expect(parseAlgorithmInput('42', 'json', 'x')).toBe(42)
    expect(parseAlgorithmInput('"hello"', 'json', 'x')).toBe('hello')
  })
})

// ─── parseCodeInput: JSON-looking input fast path ──────────────────────────
describe('parseAlgorithmInput — leetcode format, JSON-looking', () => {
  it('parses bare JSON array directly', () => {
    expect(parseAlgorithmInput('[5, 3, 8]', 'leetcode', 'bubble_sort')).toEqual([5, 3, 8])
  })

  it('parses bare JSON object directly', () => {
    expect(parseAlgorithmInput('{"x": 1}', 'leetcode', 'bubble_sort')).toEqual({ x: 1 })
  })

  it('falls through to code parser when JSON-looking input is invalid', () => {
    // starts with [ but is not valid JSON → code parser extracts the array
    const result = parseAlgorithmInput('[1, 2, 3] extra', 'leetcode', 'bubble_sort')
    expect(result).toEqual([1, 2, 3])
  })
})

// ─── Default / simple array algorithms ──────────────────────────────────────
describe('parseAlgorithmInput — default array algorithms', () => {
  it('extracts nums for sorting', () => {
    expect(parseAlgorithmInput('nums = [5, 3, 8, 1]', 'leetcode', 'bubble_sort')).toEqual([5, 3, 8, 1])
  })

  it('handles negatives and large numbers', () => {
    expect(parseAlgorithmInput('nums = [-5, 1000000, -3, 0]', 'leetcode', 'quick_sort')).toEqual([-5, 1000000, -3, 0])
  })

  it('extracts arr alias', () => {
    expect(parseAlgorithmInput('arr = [9, 8, 7]', 'leetcode', 'merge_sort')).toEqual([9, 8, 7])
  })

  it('extracts array alias', () => {
    expect(parseAlgorithmInput('array = [4, 5, 6]', 'leetcode', 'heap_sort')).toEqual([4, 5, 6])
  })

  it('extracts bare array with no var name (_array)', () => {
    expect(parseAlgorithmInput('[7, 2, 9]', 'leetcode', 'shell_sort')).toEqual([7, 2, 9])
  })

  it('returns n when only a number is present', () => {
    expect(parseAlgorithmInput('n = 5', 'leetcode', 'bubble_sort')).toBe(5)
  })

  it('returns _n object when only a bare number is present (no named var)', () => {
    // No `=`/`:` assignment → no named vars → bare-number fallback sets _n,
    // which the default parser does not unwrap, so the raw vars object is returned.
    expect(parseAlgorithmInput('just 42 here', 'leetcode', 'bubble_sort')).toEqual({ _n: 42 })
  })

  it('returns vars object when nothing usable found', () => {
    const result = parseAlgorithmInput('foo = "bar"', 'leetcode', 'bubble_sort')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('keeps vars when k and nums present (sliding_window)', () => {
    const result = parseAlgorithmInput('nums = [1, 3, -1, -3, 5], k = 3', 'leetcode', 'sliding_window')
    expect(result).toEqual([1, 3, -1, -3, 5])
  })

  it('handles empty array', () => {
    expect(parseAlgorithmInput('nums = []', 'leetcode', 'bubble_sort')).toEqual([])
  })
})

// ─── Graph algorithms ───────────────────────────────────────────────────────
describe('parseAlgorithmInput — graph algorithms', () => {
  it('parses unweighted edges into nodes + edges', () => {
    const result = parseAlgorithmInput('n = 6, edges = [[0,1],[0,2],[1,3]]', 'leetcode', 'bfs_graph') as {
      nodes: { id: string; label: string }[]
      edges: { source: string; target: string; weight?: number }[]
    }
    expect(result.nodes).toHaveLength(6)
    expect(result.nodes[0]).toEqual({ id: '0', label: '0' })
    expect(result.edges[0]).toEqual({ source: '0', target: '1', weight: undefined })
    expect(result.edges).toHaveLength(3)
  })

  it('parses weighted edges with weight field', () => {
    const result = parseAlgorithmInput('n = 5, edges = [[0,1,4],[0,2,2]]', 'leetcode', 'dijkstra') as {
      edges: { source: string; target: string; weight?: number }[]
    }
    expect(result.edges[0]).toEqual({ source: '0', target: '1', weight: 4 })
    expect(result.edges[1].weight).toBe(2)
  })

  it('infers node count from edges when n is missing', () => {
    const result = parseAlgorithmInput('edges = [[0,1],[1,7]]', 'leetcode', 'dfs_graph') as {
      nodes: unknown[]
    }
    // maxId = 7 → 8 nodes
    expect(result.nodes).toHaveLength(8)
  })

  it('parses start and goal for a_star', () => {
    const result = parseAlgorithmInput(
      'n = 5, edges = [[0,1,1],[1,3,5]], start = 0, goal = 4',
      'leetcode',
      'a_star',
    ) as { start: string; goal: string }
    expect(result.start).toBe('0')
    expect(result.goal).toBe('4')
  })

  it('handles negative weights (bellman_ford)', () => {
    const result = parseAlgorithmInput('n = 3, edges = [[0,1,5],[2,1,-2]]', 'leetcode', 'bellman_ford') as {
      edges: { weight?: number }[]
    }
    expect(result.edges[1].weight).toBe(-2)
  })

  it('union_find routes through graph parser', () => {
    const result = parseAlgorithmInput('n = 6, edges = [[0,1],[1,2]]', 'leetcode', 'union_find') as {
      nodes: unknown[]
    }
    expect(result.nodes).toHaveLength(6)
  })

  it('uses _array fallback for bare edge list', () => {
    const result = parseAlgorithmInput('[[0,1],[1,2]]', 'leetcode', 'bfs_graph')
    // bare JSON array → returned directly by JSON fast path, not graph parser
    expect(result).toEqual([[0, 1], [1, 2]])
  })

  it('returns vars when no edges found in graph algo', () => {
    const result = parseAlgorithmInput('foo = "bar"', 'leetcode', 'bfs_graph')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('expands node count when maxId exceeds given n', () => {
    const result = parseAlgorithmInput('n = 2, edges = [[0,9]]', 'leetcode', 'dijkstra') as {
      nodes: unknown[]
    }
    expect(result.nodes).toHaveLength(10)
  })
})

// ─── String algorithms ─────────────────────────────────────────────────────
describe('parseAlgorithmInput — string algorithms', () => {
  it('parses kmp text + pattern', () => {
    const result = parseAlgorithmInput('text = "ABAB", pattern = "AB"', 'leetcode', 'kmp')
    expect(result).toEqual({ text: 'ABAB', pattern: 'AB' })
  })

  it('parses kmp s + p aliases', () => {
    const result = parseAlgorithmInput('s = "ABAB", p = "AB"', 'leetcode', 'kmp_automaton')
    expect(result).toEqual({ text: 'ABAB', pattern: 'AB' })
  })

  it('parses manacher s', () => {
    expect(parseAlgorithmInput('s = "babad"', 'leetcode', 'manacher')).toBe('babad')
  })

  it('parses manacher str alias', () => {
    expect(parseAlgorithmInput('str = "racecar"', 'leetcode', 'manacher')).toBe('racecar')
  })

  it('parses lcs text1 + text2', () => {
    const result = parseAlgorithmInput('text1 = "ABC", text2 = "AC"', 'leetcode', 'lcs')
    expect(result).toEqual({ text1: 'ABC', text2: 'AC' })
  })

  it('parses edit_distance word1 + word2', () => {
    const result = parseAlgorithmInput('word1 = "horse", word2 = "ros"', 'leetcode', 'edit_distance')
    expect(result).toEqual({ text1: 'horse', text2: 'ros' })
  })

  it('parses lcs s1 + pattern aliases', () => {
    const result = parseAlgorithmInput('s1 = "ABC", pattern = "AC"', 'leetcode', 'lcs')
    expect(result).toEqual({ text1: 'ABC', text2: 'AC' })
  })

  it('returns [s1, ""] when only one lcs string present', () => {
    const result = parseAlgorithmInput('text1 = "ABC"', 'leetcode', 'lcs')
    expect(result).toEqual(['ABC', ''])
  })

  it('falls back to first string for kmp when fields incomplete', () => {
    const result = parseAlgorithmInput('text = "ABAB"', 'leetcode', 'kmp')
    expect(result).toBe('ABAB')
  })

  it('returns vars object when no string present in string algo', () => {
    const result = parseAlgorithmInput('n = 5', 'leetcode', 'manacher')
    expect(result).toEqual({ n: 5 })
  })
})

// ─── Matrix algorithms ──────────────────────────────────────────────────────
describe('parseAlgorithmInput — matrix algorithms', () => {
  it('parses knapsack weights + values + capacity', () => {
    const result = parseAlgorithmInput(
      'weights = [2, 3, 4], values = [3, 4, 5], capacity = 8',
      'leetcode',
      'knapsack_01',
    )
    expect(result).toEqual({ weights: [2, 3, 4], values: [3, 4, 5], capacity: 8 })
  })

  it('parses matrix_chain dims as raw array', () => {
    expect(parseAlgorithmInput('dims = [10, 20, 30]', 'leetcode', 'matrix_chain')).toEqual([10, 20, 30])
  })

  it('parses interval_dp stones as raw array', () => {
    expect(parseAlgorithmInput('stones = [3, 4, 5]', 'leetcode', 'interval_dp')).toEqual([3, 4, 5])
  })

  it('parses n_queens n as number', () => {
    expect(parseAlgorithmInput('n = 4', 'leetcode', 'n_queens')).toBe(4)
  })

  it('parses floyd matrix', () => {
    const result = parseAlgorithmInput('matrix = [[0,3],[8,0]]', 'leetcode', 'floyd')
    expect(result).toEqual([[0, 3], [8, 0]])
  })

  it('parses sudoku board', () => {
    const result = parseAlgorithmInput('board = [[5,3,0],[6,0,0]]', 'leetcode', 'sudoku')
    expect(result).toEqual([[5, 3, 0], [6, 0, 0]])
  })

  it('returns vars with intervals untouched', () => {
    const result = parseAlgorithmInput('intervals = [[1,2],[3,4]]', 'leetcode', 'interval_dp')
    expect(result).toEqual({ intervals: [[1, 2], [3, 4]] })
  })

  it('returns vars with ranges untouched', () => {
    const result = parseAlgorithmInput('ranges = [[1,2]]', 'leetcode', 'interval_dp')
    expect(result).toEqual({ ranges: [[1, 2]] })
  })

  it('returns vars with segments untouched', () => {
    const result = parseAlgorithmInput('segments = [[1,2]]', 'leetcode', 'matrix_chain')
    expect(result).toEqual({ segments: [[1, 2]] })
  })

  it('returns _array fallback for matrix algo', () => {
    const result = parseAlgorithmInput('[1, 2, 3]', 'leetcode', 'matrix_chain')
    // bare JSON → fast path returns array directly
    expect(result).toEqual([1, 2, 3])
  })

  it('returns vars when nothing matches matrix shapes', () => {
    const result = parseAlgorithmInput('foo = "bar"', 'leetcode', 'knapsack_01')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('does not treat partial knapsack as knapsack', () => {
    // missing capacity → not knapsack shape, falls to default _array/vars
    const result = parseAlgorithmInput('weights = [2, 3], values = [3, 4]', 'leetcode', 'knapsack_01')
    expect(result).toEqual({ weights: [2, 3], values: [3, 4] })
  })
})

// ─── Tree algorithms ────────────────────────────────────────────────────────
describe('parseAlgorithmInput — tree algorithms', () => {
  it('parses root array, converting null to 0', () => {
    const result = parseAlgorithmInput('root = [8, 3, 10, null, 6]', 'leetcode', 'binary_tree_traverse')
    expect(result).toEqual([8, 3, 10, 0, 6])
  })

  it('returns object with root + source when extra vars present', () => {
    const result = parseAlgorithmInput(
      'root = [10, 5, null, 11], targetSum = 8',
      'leetcode',
      'path_sum_iii',
    ) as { root: number[]; source: unknown[]; targetSum: number }
    expect(result.root).toEqual([10, 5, 0, 11])
    expect(result.source).toEqual([10, 5, null, 11])
    expect(result.targetSum).toBe(8)
  })

  it('parses keys for btree', () => {
    expect(parseAlgorithmInput('keys = [10, 20, 30]', 'leetcode', 'btree')).toEqual([10, 20, 30])
  })

  it('parses keys for bplus_tree', () => {
    expect(parseAlgorithmInput('keys = [1, 2, 3]', 'leetcode', 'bplus_tree')).toEqual([1, 2, 3])
  })

  it('parses nums for bst_insert', () => {
    expect(parseAlgorithmInput('nums = [8, 3, 10]', 'leetcode', 'bst_insert')).toEqual([8, 3, 10])
  })

  it('parses words for trie', () => {
    const result = parseAlgorithmInput('words = ["cat", "car", "dog"]', 'leetcode', 'trie')
    expect(result).toEqual(['cat', 'car', 'dog'])
  })

  it('uses _array fallback for tree algo (bare array, no named var)', () => {
    // Comment-only prefix avoids the JSON fast path; after stripping there are
    // no named vars, so the bare array lands in _array and the tree parser uses it.
    const result = parseAlgorithmInput('// data\n[1, 2, 3]', 'leetcode', 'bst_search')
    expect(result).toEqual([1, 2, 3])
  })

  it('returns vars when no array present in tree algo', () => {
    const result = parseAlgorithmInput('foo = "bar"', 'leetcode', 'bst_search')
    expect(result).toEqual({ foo: 'bar' })
  })
})

// ─── Points (geometry) algorithms ──────────────────────────────────────────
describe('parseAlgorithmInput — points algorithms', () => {
  it('parses points field', () => {
    const result = parseAlgorithmInput('points = [[0,0],[4,0],[2,5]]', 'leetcode', 'convex_hull')
    expect(result).toEqual({ points: [[0, 0], [4, 0], [2, 5]] })
  })

  it('parses pts alias', () => {
    const result = parseAlgorithmInput('pts = [[1,1],[2,2]]', 'leetcode', 'convex_hull')
    expect(result).toEqual({ points: [[1, 1], [2, 2]] })
  })

  it('returns vars when no points present', () => {
    const result = parseAlgorithmInput('foo = "bar"', 'leetcode', 'convex_hull')
    expect(result).toEqual({ foo: 'bar' })
  })
})

// ─── binary_search / leetcode_hot100 (array + target) ──────────────────────
describe('parseAlgorithmInput — array + target algorithms', () => {
  it('parses nums + target for binary_search', () => {
    const result = parseAlgorithmInput('nums = [1, 3, 5, 7], target = 7', 'leetcode', 'binary_search')
    expect(result).toEqual({ nums: [1, 3, 5, 7], target: 7, data: [1, 3, 5, 7], param: 7 })
  })

  it('parses nums + param alias as target', () => {
    const result = parseAlgorithmInput('nums = [1, 2, 3], param = 2', 'leetcode', 'binary_search')
    expect(result).toEqual({ nums: [1, 2, 3], target: 2, data: [1, 2, 3], param: 2 })
  })

  it('returns nums only when no target present', () => {
    const result = parseAlgorithmInput('nums = [1, 2, 3]', 'leetcode', 'leetcode_hot100')
    expect(result).toEqual([1, 2, 3])
  })

  it('uses arr alias for array+target algo', () => {
    const result = parseAlgorithmInput('arr = [4, 5, 6]', 'leetcode', 'binary_search')
    expect(result).toEqual([4, 5, 6])
  })

  it('returns vars when nothing matches array+target', () => {
    const result = parseAlgorithmInput('foo = "bar"', 'leetcode', 'binary_search')
    expect(result).toEqual({ foo: 'bar' })
  })
})

// ─── gcd_euclidean ──────────────────────────────────────────────────────────
describe('parseAlgorithmInput — gcd_euclidean', () => {
  it('parses a + b', () => {
    expect(parseAlgorithmInput('a = 48, b = 18', 'leetcode', 'gcd_euclidean')).toEqual({ a: 48, b: 18 })
  })

  it('parses x + y aliases', () => {
    expect(parseAlgorithmInput('x = 12, y = 8', 'leetcode', 'gcd_euclidean')).toEqual({ a: 12, b: 8 })
  })

  it('falls back to nums array', () => {
    expect(parseAlgorithmInput('nums = [48, 18]', 'leetcode', 'gcd_euclidean')).toEqual([48, 18])
  })

  it('falls back to arr array', () => {
    expect(parseAlgorithmInput('arr = [3, 6]', 'leetcode', 'gcd_euclidean')).toEqual([3, 6])
  })

  it('returns vars when nothing matches gcd', () => {
    expect(parseAlgorithmInput('foo = "bar"', 'leetcode', 'gcd_euclidean')).toEqual({ foo: 'bar' })
  })
})

// ─── Value parsing edge cases ───────────────────────────────────────────────
describe('parseAlgorithmInput — value parsing edge cases', () => {
  it('parses single-quoted strings', () => {
    expect(parseAlgorithmInput("s = 'hello'", 'leetcode', 'manacher')).toBe('hello')
  })

  it('parses floats', () => {
    const result = parseAlgorithmInput('a = 1.5, b = 2.5', 'leetcode', 'gcd_euclidean')
    expect(result).toEqual({ a: 1.5, b: 2.5 })
  })

  it('strips C-style declarations (const/int/vector)', () => {
    const result = parseAlgorithmInput('int n = 5, vector<int> edges = [[0,1]]', 'leetcode', 'bfs_graph') as {
      nodes: unknown[]
    }
    expect(result.nodes).toHaveLength(5)
  })

  it('strips line comments', () => {
    const result = parseAlgorithmInput('nums = [1, 2, 3] // a comment', 'leetcode', 'bubble_sort')
    expect(result).toEqual([1, 2, 3])
  })

  it('strips block comments', () => {
    const result = parseAlgorithmInput('nums = [1, 2, 3] /* block */', 'leetcode', 'bubble_sort')
    expect(result).toEqual([1, 2, 3])
  })

  it('strips trailing semicolons', () => {
    const result = parseAlgorithmInput('nums = [1, 2, 3];', 'leetcode', 'bubble_sort')
    expect(result).toEqual([1, 2, 3])
  })

  it('keeps malformed array as raw string value', () => {
    // const declaration stripped; value "[1, 2" is unparseable array → kept raw string
    const result = parseAlgorithmInput('foo = [1, 2', 'leetcode', 'bubble_sort') as { foo: string }
    expect(result.foo).toBe('[1, 2')
  })

  it('parses object value', () => {
    const result = parseAlgorithmInput('pairs = {"a": "1"}', 'leetcode', 'hash_table') as { pairs: unknown }
    expect(result.pairs).toEqual({ a: '1' })
  })

  it('keeps malformed object as raw string', () => {
    const result = parseAlgorithmInput('pairs = {bad', 'leetcode', 'hash_table') as { pairs: string }
    expect(result.pairs).toBe('{bad')
  })
})

// ─── getLeetCodePlaceholder ─────────────────────────────────────────────────
describe('getLeetCodePlaceholder', () => {
  it('returns special hint for gcd_euclidean', () => {
    expect(getLeetCodePlaceholder('gcd_euclidean')).toBe('a = 48, b = 18')
  })

  it('returns sudoku board hint', () => {
    expect(getLeetCodePlaceholder('sudoku')).toContain('board =')
  })

  it('returns keys hint for btree / bplus_tree', () => {
    expect(getLeetCodePlaceholder('btree')).toContain('keys =')
    expect(getLeetCodePlaceholder('bplus_tree')).toContain('keys =')
  })

  it('returns target hint for leetcode_hot100', () => {
    expect(getLeetCodePlaceholder('leetcode_hot100')).toContain('target = 9')
  })

  it('returns acm_templates hint', () => {
    expect(getLeetCodePlaceholder('acm_templates')).toContain('nums =')
  })

  it('returns graph hint for graph algos', () => {
    expect(getLeetCodePlaceholder('dijkstra')).toContain('edges =')
  })

  it('returns string hint for string algos', () => {
    expect(getLeetCodePlaceholder('kmp')).toContain('pattern')
  })

  it('returns matrix hint for matrix algos', () => {
    expect(getLeetCodePlaceholder('knapsack_01')).toContain('capacity')
  })

  it('returns tree hint for tree algos', () => {
    expect(getLeetCodePlaceholder('binary_tree_traverse')).toContain('root =')
  })

  it('returns generic nums hint by default', () => {
    expect(getLeetCodePlaceholder('bubble_sort')).toBe('nums = [5, 3, 8, 1, 9, 2]')
  })
})

// ─── getLeetCodeDefault ─────────────────────────────────────────────────────
describe('getLeetCodeDefault', () => {
  it('returns specific default for known algo', () => {
    expect(getLeetCodeDefault('binary_search')).toBe('nums = [1, 3, 5, 7, 9, 11, 13, 15], target = 7')
  })

  it('returns graph default for dijkstra', () => {
    expect(getLeetCodeDefault('dijkstra')).toContain('edges =')
  })

  it('returns _default fallback for unknown algo', () => {
    expect(getLeetCodeDefault('totally_unknown_algo')).toBe('nums = [5, 3, 8, 1, 9, 2]')
  })

  it('returns n_queens default', () => {
    expect(getLeetCodeDefault('n_queens')).toBe('n = 4')
  })

  it('round-trips: default value parses back to a usable structure', () => {
    const def = getLeetCodeDefault('dijkstra')
    const parsed = parseAlgorithmInput(def, 'leetcode', 'dijkstra') as { nodes: unknown[]; edges: unknown[] }
    expect(parsed.nodes).toHaveLength(5)
    expect(parsed.edges.length).toBeGreaterThan(0)
  })
})
