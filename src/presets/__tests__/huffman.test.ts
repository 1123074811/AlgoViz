import { describe, it, expect } from 'vitest'
import { generateHuffman } from '../huffman'

describe('generateHuffman', () => {
  it('builds a binary tree and reports codes as result', () => {
    const s = generateHuffman([['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]])
    const create = s.steps.flatMap(st => st.events ?? []).find(e => e.type === 'tree.create')
    expect(create).toBeDefined()
    // n leaves + (n-1) internal = 2n-1 nodes
    expect((create as { nodes: unknown[] }).nodes.length).toBe(11)
    expect(s.result).toBeTruthy()
  })
  it('handles default input', () => {
    const s = generateHuffman()
    expect(s.steps.length).toBeGreaterThan(1)
  })
})
