import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('bilingual descriptions', () => {
  it('uses the explicit en argument of desc()', () => {
    const b = new AnimationBuilder('t', 'array')
    b.desc('比较相邻元素', 'Compare adjacent elements').arrayCreate([1, 2])
    const script = b.build()
    expect(script.steps[0].description.zh).toBe('比较相邻元素')
    expect(script.steps[0].description.en).toBe('Compare adjacent elements')
  })

  it('derives an English default when the AI omits the en argument', () => {
    const b = new AnimationBuilder('t', 'array')
    b.arrayCreate([1, 2])
    b.compare(0, 1)
    const script = b.build()
    expect(script.steps[0].description.en).toBe('Initialize array')
    expect(script.steps[1].description.en).toBe('Compare indices 0, 1')
    // English must NOT be a copy of Chinese
    expect(script.steps[1].description.en).not.toBe(script.steps[1].description.zh)
  })

  it('derives English from the event even when desc() only has Chinese', () => {
    const b = new AnimationBuilder('t', 'array')
    b.desc('只有中文').emit({ type: 'scene.wait' } as never)
    const script = b.build()
    expect(script.steps[0].description.zh).toBe('只有中文')
    expect(script.steps[0].description.en).toBe('Wait')
  })

  it('clears pending en after each step', () => {
    const b = new AnimationBuilder('t', 'array')
    b.desc('第一步', 'First step').arrayCreate([1])
    b.compare(0, 0)
    const script = b.build()
    expect(script.steps[1].description.en).toBe('Compare indices 0, 0')
  })

  it('note() accepts an optional English description', () => {
    const b = new AnimationBuilder('t', 'array')
    b.arrayCreate([1])
    b.note('剪枝:跳过重复分支', 'Prune: skip duplicate branches')
    const script = b.build()
    expect(script.steps[1].description.en).toBe('Prune: skip duplicate branches')
  })
})
