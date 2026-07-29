import { describe, expect, it } from 'vitest'
import { generatePreset } from '../generators'

const graph = {
  nodes: ['0', '1', '2', '3'].map(id => ({ id, label: id })),
  edges: [
    { source: '0', target: '1', weight: 2 },
    { source: '0', target: '2', weight: 5 },
    { source: '1', target: '2', weight: 1 },
    { source: '2', target: '3', weight: 3 },
  ],
}

describe('built-in result contracts', () => {
  it.each([
    ['gcd_euclidean', { a: 48, b: 18 }, 6],
    ['kmp_automaton', { text: 'ababaab', pattern: 'aba' }, [0, 2]],
    ['bfs_graph', graph, ['0', '1', '2', '3']],
    ['dfs_graph', graph, ['0', '1', '2', '3']],
    ['dijkstra', graph, ['0:0', '1:2', '2:3', '3:6']],
    ['prim', graph, ['0-1(2)', '1-2(1)', '2-3(3)']],
    ['kruskal', graph, ['1-2(1)', '0-1(2)', '2-3(3)']],
    ['a_star', { ...graph, start: '0', goal: '3' }, 6],
    ['fenwick_tree', [1, 2, 3, 4], 10],
    ['trie', ['app', 'apple', 'bat'], ['app', 'apple', 'bat']],
    ['map', { pairs: { answer: 42, mode: 'fast' } }, ['answer:42', 'mode:fast']],
    ['red_black_tree', [9, 2, 14, 1, 6], [1, 2, 6, 9, 14]],
    ['skip_list', { data: [1, 3, 7, 9], target: 7 }, true],
    ['skip_list', { data: [1, 3, 7, 9], target: 8 }, false],
    ['segment_tree', [1, 3, 5, 7, 9], 15],
    ['stack', [8, 2, 5], [8, 2, 5]],
    ['queue', [8, 2, 5], [2, 5, 4]],
    ['set', [8, 2, 5], [8, 5, 4]],
    ['deque', [8, 2, 5], [8, 2, 5]],
  ] as const)('%s returns the value computed by its algorithm', (id, input, expected) => {
    expect(generatePreset(id, input)?.result).toEqual(expected)
  })

  it('returns an empty path when unreachable and the shortest path when reachable', () => {
    expect(generatePreset('grid_pathfinding', {
      grid: [[0, 1, 0], [0, 1, 0], [0, 1, 0]],
      start: [0, 0],
      target: [0, 2],
    })?.result).toEqual([])
    expect(generatePreset('grid_pathfinding', {
      grid: [[0, 1, 0], [0, 0, 0], [0, 1, 0]],
      start: [0, 0],
      target: [0, 2],
    })?.result).toEqual([[0, 0], [1, 0], [1, 1], [1, 2], [0, 2]])
  })
})
