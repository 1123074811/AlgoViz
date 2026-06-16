import { describe, it, expect } from 'vitest'
import { hasGenerator, generatePreset } from '@/presets'
import { DEFAULT_ALGORITHMS } from '@/data/algorithmCatalog'

describe('red_black_tree wiring', () => {
  it('is registered as a generator', () => {
    expect(hasGenerator('red_black_tree')).toBe(true)
  })
  it('appears in the catalog as a data-structure', () => {
    const e = DEFAULT_ALGORITHMS.find(a => a.id === 'red_black_tree')
    expect(e).toBeDefined()
    expect(e!.hasPreset).toBe(true)
  })
  it('produces a tree.create script', () => {
    const s = generatePreset('red_black_tree', '')
    expect(s).toBeDefined()
    const hasCreate = s!.steps.some(st => st.events?.some(e => e.type === 'tree.create'))
    expect(hasCreate).toBe(true)
  })
})
