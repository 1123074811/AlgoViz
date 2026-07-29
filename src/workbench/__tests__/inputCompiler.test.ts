import { describe, expect, it } from 'vitest'
import { compileAlgorithmInput } from '@/workbench/inputCompiler'

describe('compileAlgorithmInput', () => {
  it('waits for an unfinished LeetCode literal instead of parsing partial data', () => {
    const result = compileAlgorithmInput('root = [1, 2', 'leetcode', 'binary_tree_traverse')

    expect(result.status).toBe('incomplete')
    expect(result.diagnostics[0]).toMatchObject({ code: 'E_INPUT_SYNTAX', line: 1, column: 8 })
  })

  it('accepts trailing commas in LeetCode/Python literals', () => {
    const result = compileAlgorithmInput('root = [1, 2,]', 'leetcode', 'binary_tree_traverse')

    expect(result.status).toBe('ready')
    expect(result.value).toMatchObject({ source: [1, 2] })
  })

  it('reports JSON syntax errors with a source location', () => {
    const result = compileAlgorithmInput('{\n  "nums": [1, 2,]\n}', 'json', 'bubble_sort')

    expect(result.status).toBe('error')
    expect(result.diagnostics[0]).toMatchObject({
      code: 'E_INPUT_SYNTAX',
      line: expect.any(Number),
      column: expect.any(Number),
    })
  })

  it('rejects an unsorted binary-search input', () => {
    const result = compileAlgorithmInput('nums = [3, 1, 2], target = 1', 'leetcode', 'binary_search')

    expect(result.status).toBe('error')
    expect(result.diagnostics[0].code).toBe('E_INPUT_DOMAIN')
  })

  it('rejects graph edges that reference undeclared nodes', () => {
    const result = compileAlgorithmInput(
      '{"nodes":[{"id":"0"}],"edges":[{"source":"0","target":"2"}]}',
      'json',
      'bfs_graph',
    )

    expect(result.status).toBe('error')
    expect(result.diagnostics[0].code).toBe('E_INPUT_DOMAIN')
  })

  it('rejects an invalid Sudoku board size', () => {
    const result = compileAlgorithmInput('board = [[1, 2], [3, 4]]', 'leetcode', 'sudoku')

    expect(result.status).toBe('error')
    expect(result.diagnostics[0].code).toBe('E_INPUT_DOMAIN')
  })

  it('rejects duplicate givens in a Sudoku row', () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0))
    board[0][0] = board[0][4] = 7
    const result = compileAlgorithmInput(JSON.stringify(board), 'json', 'sudoku')

    expect(result.status).toBe('error')
    expect(result.diagnostics[0].code).toBe('E_INPUT_DOMAIN')
  })

  it('requires both GCD operands', () => {
    const result = compileAlgorithmInput('a = 48', 'leetcode', 'gcd_euclidean')

    expect(result.status).toBe('error')
    expect(result.diagnostics[0].code).toBe('E_INPUT_TYPE')
  })

  it('preserves the sliding-window size', () => {
    const result = compileAlgorithmInput(
      'nums = [1, 3, -1, -3, 5], k = 2',
      'leetcode',
      'sliding_window',
    )

    expect(result).toMatchObject({
      status: 'ready',
      value: { nums: [1, 3, -1, -3, 5], k: 2 },
    })
  })

  it('rejects a sliding-window size outside the input range', () => {
    const result = compileAlgorithmInput('nums = [1, 2], k = 3', 'leetcode', 'sliding_window')

    expect(result.status).toBe('error')
    expect(result.diagnostics[0].code).toBe('E_INPUT_DOMAIN')
  })

  it('rejects negative Dijkstra edges', () => {
    const result = compileAlgorithmInput(
      'n = 2, edges = [[0, 1, -3]]',
      'leetcode',
      'dijkstra',
    )

    expect(result.status).toBe('error')
    expect(result.diagnostics[0].code).toBe('E_INPUT_DOMAIN')
  })

  it('validates grid path coordinates and walls', () => {
    const ready = compileAlgorithmInput(
      'grid = [[0,1],[0,0]], start = [0,0], target = [1,1]',
      'leetcode',
      'grid_pathfinding',
    )
    const blocked = compileAlgorithmInput(
      'grid = [[1,0],[0,0]], start = [0,0], target = [1,1]',
      'leetcode',
      'grid_pathfinding',
    )

    expect(ready.status).toBe('ready')
    expect(blocked.status).toBe('error')
    expect(blocked.diagnostics[0].code).toBe('E_INPUT_DOMAIN')
  })

  it('rejects non-binary grid cells and non-integer reservoir seeds', () => {
    expect(compileAlgorithmInput(
      'grid = [[0,2],[0,0]], start = [0,0], target = [1,1]',
      'leetcode',
      'grid_pathfinding',
    ).status).toBe('error')
    expect(compileAlgorithmInput(
      '{"stream":[1,2,3],"seed":1.5}',
      'json',
      'reservoir_sampling',
    ).status).toBe('error')
  })
})
