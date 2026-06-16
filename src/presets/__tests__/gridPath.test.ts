import { describe, it, expect } from 'vitest'
import { generateGridPathfinding, generateGridDP } from '../gridPath'

describe('grid generators', () => {
  it('BFS pathfinding emits create/visit/path', () => {
    const s = generateGridPathfinding()
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('grid.create')
    expect(types).toContain('grid.visit')
    expect(types).toContain('grid.path')
    expect(s.result).toBeDefined()
  })
  it('grid DP emits create + set_cell + arrow path', () => {
    const s = generateGridDP([[1, 3, 1], [1, 5, 1], [4, 2, 1]])
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toContain('grid.create')
    expect(types).toContain('grid.set_cell')
    expect(s.result).toBe(7) // classic min path sum
  })
})
