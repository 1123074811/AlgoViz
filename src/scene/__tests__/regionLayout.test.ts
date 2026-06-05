import { describe, it, expect } from 'vitest'
import { applyRegionLayout, structureOf } from '../regionLayout'
import { createEmptyScene } from '../types'
import type { SceneState, SceneCell, SceneNode } from '../types'

function cell(id: string, x: number, y: number): SceneCell {
  return { id, type: 'cell', position: { x, y }, size: { width: 44, height: 44 }, value: '' }
}
function node(id: string, x: number, y: number): SceneNode {
  return { id, type: 'node', variant: 'graph.default', position: { x, y }, size: { width: 48, height: 48 }, fields: [], ports: [] }
}

describe('structureOf', () => {
  it('按前缀分组', () => {
    expect(structureOf('arr_0')).toBe('array')
    expect(structureOf('heap_0')).toBe('heap')
    expect(structureOf('A')).toBe('main')
  })
})

describe('applyRegionLayout', () => {
  it('单组不分区，原样返回', () => {
    const s = createEmptyScene()
    s.entities['arr_0'] = cell('arr_0', 100, 100)
    s.entities['arr_1'] = cell('arr_1', 160, 100)
    const out = applyRegionLayout(s)
    expect((out.entities['arr_0'] as SceneCell).position.y).toBe(100) // 未平移
    expect(Object.keys(out.groups).length).toBe(0)
  })

  it('两组（图+数组）分到两个不重叠区域', () => {
    const s: SceneState = createEmptyScene()
    // 图节点（main）与数组（array）初始重叠在同一片区域
    s.entities['A'] = node('A', 300, 300)
    s.entities['B'] = node('B', 360, 300)
    s.entities['arr_0'] = cell('arr_0', 300, 320)
    s.entities['arr_1'] = cell('arr_1', 360, 320)
    const out = applyRegionLayout(s)
    // 生成两个区域 group
    const regions = Object.values(out.groups).filter(g => g.id.startsWith('region_'))
    expect(regions.length).toBe(2)
    // 两区域竖直不重叠：array 区域顶 ≥ main 区域底
    const main = out.groups['region_main'].bounds!
    const array = out.groups['region_array'].bounds!
    expect(array.position.y).toBeGreaterThanOrEqual(main.position.y + main.size.height)
  })

  it('平移后组内相对关系不变', () => {
    const s = createEmptyScene()
    s.entities['A'] = node('A', 300, 300)
    s.entities['arr_0'] = cell('arr_0', 300, 320)
    s.entities['arr_1'] = cell('arr_1', 360, 320)
    const out = applyRegionLayout(s)
    // arr_0 与 arr_1 的相对 x 间距保持 60
    expect((out.entities['arr_1'] as SceneCell).position.x - (out.entities['arr_0'] as SceneCell).position.x).toBe(60)
  })
})
