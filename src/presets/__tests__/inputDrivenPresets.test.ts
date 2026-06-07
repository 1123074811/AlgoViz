import { describe, expect, it } from 'vitest'
import { generateACM } from '../acm'
import { generateBPlusTree } from '../bPlusTree'
import { generateBTree } from '../bTree'
import { generateLeetCode } from '../leetcode'
import { generateSudoku } from '../sudoku'
import { generatePreset } from '../generators'
import { parseAlgorithmInput } from '@/utils/inputParser'

describe('input-driven built-in presets', () => {
  it('builds B-Tree scene data from input keys', () => {
    const script = generateBTree([9, 1, 5, 13, 17, 21, 25])

    expect(script.initialState.data).toEqual([1, 5, 9, 13, 17, 21, 25])
    expect(JSON.stringify(script.steps[0].events)).toContain('[5, 13, 21]')
  })

  it('builds B+ Tree scene data from input keys', () => {
    const script = generateBPlusTree({ keys: [4, 8, 12, 16, 20, 24], target: 20 })

    expect(script.initialState.data).toEqual([4, 8, 12, 16, 20, 24])
    expect(script.steps.some(step => step.description.zh.includes('search(20)'))).toBe(true)
  })

  it('uses the provided Sudoku board as the initial matrix', () => {
    const board = Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 9 }, (_, col) => (row === col ? row + 1 : 0)),
    )
    const script = generateSudoku(board)

    expect(script.initialState.data.slice(0, 10)).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(script.steps[0].events?.[0]).toMatchObject({ type: 'matrix.create', values: board })
  })

  it('uses nums and target for LeetCode Hot 100 Two Sum', () => {
    const input = parseAlgorithmInput('nums = [3, 4, 8, 12], target = 16', 'leetcode', 'leetcode_hot100')
    const script = generateLeetCode(input)

    expect(script.initialState.data).toEqual([3, 4, 8, 12])
    expect(script.steps.some(step => step.description.zh.includes('target = 16'))).toBe(true)
    expect(script.steps.some(step => step.description.zh.includes('result=[1,3]'))).toBe(true)
  })

  it('keeps comma-separated tree root input with extra LeetCode parameters usable', () => {
    const input = parseAlgorithmInput(
      'root = [10,5,-3,3,2,null,11,3,-2,null,1], targetSum = 8',
      'leetcode',
      'binary_tree_traverse',
    )

    expect(input).toMatchObject({
      targetSum: 8,
      root: [10, 5, -3, 3, 2, 0, 11, 3, -2, 0, 1],
    })
    expect(generatePreset('binary_tree_traverse', input)?.initialState.data.slice(0, 5)).toEqual([10, 5, -3, 3, 2])
  })

  it('generates a full Path Sum III tree animation from LeetCode input', () => {
    const input = parseAlgorithmInput(
      'root = [10,5,-3,3,2,null,11,3,-2,null,1], targetSum = 8',
      'leetcode',
      'path_sum_iii',
    )
    const script = generatePreset('path_sum_iii', input)!
    const firstEvents = script.steps[0].events ?? []
    const treeCreate = firstEvents.find(event => event.type === 'tree.create') as
      | { type: 'tree.create'; nodes: Array<{ id: string; value: number | string }>; edges: Array<{ parentId: string; childId: string }> }
      | undefined
    const events = script.steps.flatMap(step => step.events ?? [])

    expect(input).toMatchObject({ targetSum: 8 })
    expect(Array.isArray((input as { source?: unknown }).source)).toBe(true)
    expect(treeCreate?.nodes).toHaveLength(9)
    expect(treeCreate?.edges).toHaveLength(8)
    expect(treeCreate?.nodes.find(node => node.id === '0')?.value).toBe(10)
    expect(script.initialState.treeNodes?.find(node => node.id === '0')?.value).toBe(10)
    expect(script.result).toBe(3)
    expect(events.some(event => event.type === 'math.init')).toBe(true)
    expect(events.some(event => event.type === 'math.set' && 'name' in event && event.name === 'count' && event.value === 3)).toBe(true)
    expect(events.some(event => event.type === 'stack.create')).toBe(true)
    expect(events.some(event => event.type === 'stack.push')).toBe(true)
    expect(events.some(event => event.type === 'stack.pop')).toBe(true)
    expect(events.some(event => event.type.startsWith('callstack.'))).toBe(false)
  })

  it('uses input numbers for ACM template scenes', () => {
    const script = generateACM([6, 5, 10, 11])

    expect(script.initialState.data).toEqual([6, 5, 10, 11])
    expect(script.steps[1].description.zh).toContain('pow(6, 5)')
  })

  it('passes input through the dynamic preset registry', () => {
    expect(generatePreset('btree', [8, 2, 4, 6])?.initialState.data).toEqual([2, 4, 6, 8])
    expect(generatePreset('acm_templates', [1, 2, 3])?.initialState.data).toEqual([1, 2, 3])
  })
})
