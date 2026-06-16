import { describe, it, expect } from 'vitest'
import { generateLinkedListReverse } from '../linkedListReverse'

describe('generateLinkedListReverse', () => {
  it('creates a singly list then reverses every link', () => {
    const s = generateLinkedListReverse([1, 2, 3, 4])
    expect(s.algorithm).toBe('linked_list_reversal')
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('linked_list.create')
    expect(types.filter(t => t === 'linked_list.reverse_link').length).toBeGreaterThanOrEqual(3)
    expect(types).toContain('linked_list.set_head')
  })
  it('defaults when given empty input', () => {
    const s = generateLinkedListReverse([])
    expect(s.steps.length).toBeGreaterThan(2)
  })
})
