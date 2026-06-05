import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('AnimationBuilder — 组合场景（W3）', () => {
  it('多结构（array + graph + heap）build() 自动开启 composite 布局', () => {
    const b = new AnimationBuilder('dijkstra', 'graph')
    b.arrayCreate([0, '∞', '∞'])
    b.graphCreate([{ id: 'A' }, { id: 'B' }], [{ source: 'A', target: 'B', weight: 1 }])
    b.heapCreate([0])
    b.link('arr_0', 'A', { label: 'dist' })
    const script = b.build()
    expect(script.presentation?.layout).toBe('composite')
  })

  it('单结构脚本不被设为 composite（向后兼容）', () => {
    const b = new AnimationBuilder('bubble_sort', 'array')
    b.arrayCreate([3, 1, 2])
    b.desc('比较').compare(0, 1)
    const script = b.build()
    expect(script.presentation?.layout).toBeUndefined()
  })

  it('单结构 + scene.* 操作也不算 composite（scene 不计入 family）', () => {
    const b = new AnimationBuilder('bubble_sort', 'array')
    b.arrayCreate([3, 1, 2])
    b.note('旁注')
    b.link('arr_0', 'arr_1', { label: 'x' })
    const script = b.build()
    expect(script.presentation?.layout).toBeUndefined()
  })

  it('link() 产生 scene.link 事件', () => {
    const b = new AnimationBuilder('dijkstra', 'graph')
    b.arrayCreate([0])
    b.graphCreate([{ id: 'A' }], [])
    b.link('arr_0', 'A', { label: 'dist', color: 'success' })
    const script = b.build()
    const linkStep = script.steps.find(s => s.events?.[0]?.type === 'scene.link')
    expect(linkStep?.events?.[0]).toEqual({
      type: 'scene.link',
      from: 'arr_0',
      to: 'A',
      label: 'dist',
      color: 'success',
    })
  })
})
