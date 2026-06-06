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
