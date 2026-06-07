import { describe, expect, it } from 'vitest'
import { parseInputData } from '../input'

describe('parseInputData', () => {
  it('parses LeetCode root assignment as a tree input', () => {
    const parsed = parseInputData('root = [1,2,2,3,4,4,3]')

    expect(parsed.valid).toBe(true)
    expect(parsed.kind).toBe('tree')
    expect(parsed.summary).toContain('根=1')

    const value = parsed.value as {
      root: string
      children: Record<string, string[]>
      treeNodes: Array<{ id: string; value: number | string }>
      source: unknown[]
    }

    expect(value.root).toBe('0')
    expect(value.children['0']).toEqual(['1', '2'])
    expect(value.treeNodes.find((node) => node.id === '2')?.value).toBe(2)
    expect(value.source).toEqual([1, 2, 2, 3, 4, 4, 3])
  })

  it('accepts pasted Python literals in assignments', () => {
    const parsed = parseInputData('root = [1,None,True,False]')

    expect(parsed.valid).toBe(true)
    expect(parsed.kind).toBe('tree')
    expect((parsed.value as { source: unknown[] }).source).toEqual([1, null, true, false])
  })

  it('parses multi-line LeetCode assignments as an object input', () => {
    const parsed = parseInputData('nums = [2,7,11,15]\ntarget = 9')

    expect(parsed.valid).toBe(true)
    expect(parsed.kind).toBe('array')
    expect(parsed.summary).toBe('数组 [4 个元素]')
    expect(parsed.value).toEqual({ nums: [2, 7, 11, 15], target: 9 })
  })

  it('parses comma-separated LeetCode assignments with root plus target', () => {
    const parsed = parseInputData('root = [10,5,-3,3,2,null,11,3,-2,null,1], targetSum = 8')

    expect(parsed.valid).toBe(true)
    expect(parsed.kind).toBe('tree')

    const value = parsed.value as {
      root: string
      children: Record<string, string[]>
      treeNodes: Array<{ id: string; value: number | string }>
      source: unknown[]
      targetSum: number
    }

    expect(value.root).toBe('0')
    expect(value.targetSum).toBe(8)
    expect(value.source).toEqual([10, 5, -3, 3, 2, null, 11, 3, -2, null, 1])
    expect(value.children['0']).toEqual(['1', '2'])
  })

  it('treats common object-wrapped arrays as array inputs', () => {
    const parsed = parseInputData('{"temperatures":[73,74,75,71],"window":2}')

    expect(parsed.valid).toBe(true)
    expect(parsed.kind).toBe('array')
    expect(parsed.summary).toBe('数组 [4 个元素]')
  })

  it('normalizes value-id tree objects with duplicate values into unique nodes', () => {
    const parsed = parseInputData(JSON.stringify({
      root: '1',
      children: {
        '1': ['2', '2'],
        '2': ['3', '4'],
        '3': [],
        '4': [],
        '2_1': ['4', '3'],
      },
    }))

    expect(parsed.valid).toBe(true)
    expect(parsed.kind).toBe('tree')

    const value = parsed.value as {
      root: string
      children: Record<string, string[]>
      treeNodes: Array<{ id: string; value: number | string }>
    }

    expect(value.root).toBe('n0')
    expect(value.children.n0).toEqual(['n1', 'n2'])
    expect(value.children.n1).toEqual(['n3', 'n4'])
    expect(value.children.n2).toEqual(['n5', 'n6'])
    expect(value.treeNodes.map(node => node.value)).toEqual([1, 2, 2, 3, 4, 4, 3])
  })
})
