import { describe, it, expect } from 'vitest'
import { generateSkipList } from '../skipList'

describe('generateSkipList', () => {
  it('emits create then search events', () => {
    const s = generateSkipList([1, 3, 4, 7, 9, 12], 9)
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('skip_list.create')
    expect(types).toContain('skip_list.search')
    expect(s.result).toBeDefined()
  })
})
