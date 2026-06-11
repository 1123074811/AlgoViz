import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('b.phase', () => {
  it('attaches the phase marker to the next emitted step only', () => {
    const b = new AnimationBuilder('heap_sort', 'array')
    b.phase('建堆', 'Build heap')
    b.arrayCreate([3, 1, 2])
    b.compare(0, 1)
    const script = b.build()
    expect(script.steps[0].phase).toEqual({ zh: '建堆', en: 'Build heap' })
    expect(script.steps[1].phase).toBeUndefined()
  })

  it('defaults en to zh when omitted', () => {
    const b = new AnimationBuilder('t', 'array')
    b.phase('排序')
    b.arrayCreate([1])
    expect(b.build().steps[0].phase).toEqual({ zh: '排序', en: '排序' })
  })

  it('is chainable with desc', () => {
    const b = new AnimationBuilder('t', 'array')
    b.phase('初始化', 'Init').desc('建数组', 'Create array').arrayCreate([1])
    const step = b.build().steps[0]
    expect(step.phase?.en).toBe('Init')
    expect(step.description.en).toBe('Create array')
  })
})
