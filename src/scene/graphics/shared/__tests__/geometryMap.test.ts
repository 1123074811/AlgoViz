import { describe, it, expect } from 'vitest'
import { makeProjector, PLANE } from '../geometryMap'

describe('geometry 坐标映射', () => {
  it('数据范围映射到画布矩形,Y 轴翻转(上为正)', () => {
    const p = makeProjector([0, 10], [0, 10])
    const origin = p(0, 0)
    const topRight = p(10, 10)
    // x: 0→左内边距, 10→右内边距
    expect(origin.x).toBeCloseTo(PLANE.pad)
    expect(topRight.x).toBeCloseTo(PLANE.width - PLANE.pad)
    // y 翻转: 数据 y=0 在底部(屏幕 y 大), y=10 在顶部(屏幕 y 小)
    expect(origin.y).toBeGreaterThan(topRight.y)
  })

  it('零宽度范围不除零(退化为居中)', () => {
    const p = makeProjector([5, 5], [0, 10])
    expect(Number.isFinite(p(5, 5).x)).toBe(true)
  })
})
