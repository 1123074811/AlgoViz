import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('search tree sugar', () => {
  it('builds a root and child nodes via tree.* events', () => {
    const b = new AnimationBuilder('n_queens', 'array')
    b.searchRoot('根')
    const c1 = b.searchTry('st_0', '皇后@(0,1)')
    const c2 = b.searchTry('st_0', '皇后@(0,3)')
    expect(c1).toBe('st_1')
    expect(c2).toBe('st_2')
    const script = b.build()
    const types = script.steps.flatMap(s => (s.events ?? []).map(e => e.type))
    expect(types).toContain('tree.create')
    expect(types.filter(t => t === 'tree.insert')).toHaveLength(2)
  })

  it('marks conflict / success / backtrack via scene.highlight', () => {
    const b = new AnimationBuilder('n_queens', 'array')
    b.searchRoot('根')
    const c1 = b.searchTry('st_0', 'x')
    b.searchFail(c1)
    b.searchBack(c1)
    const c2 = b.searchTry('st_0', 'y')
    b.searchOk(c2)
    const script = b.build()
    const highlights = script.steps
      .flatMap(s => s.events ?? [])
      .filter(e => e.type === 'scene.highlight') as Array<{ type: string; entityId: string; color?: string }>
    expect(highlights.map(h => h.color)).toEqual(['danger', 'muted', 'success'])
    expect(highlights[0].entityId).toBe('st_1')
  })

  it('derives meaningful default descriptions for search steps', () => {
    const b = new AnimationBuilder('n_queens', 'array')
    b.searchRoot('根')
    b.searchTry('st_0', '尝试')
    const script = b.build()
    expect(script.steps[1].description.zh).not.toMatch(/^步骤 \d+$/)
  })
})
