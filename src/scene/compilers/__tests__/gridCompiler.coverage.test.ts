import { describe, expect, it } from 'vitest'
import {
  reduceGridEvent,
  compileGridEvent,
  compileGridEvents,
} from '../gridCompiler'
import type { GridCollection } from '../../overlays/gridTypes'

function createCollection(gridId?: string): GridCollection {
  return reduceGridEvent(
    {},
    {
      type: 'grid.create',
      gridId,
      rows: 3,
      cols: 3,
      values: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    },
  )
}

describe('gridCompiler · reduce edge cases', () => {
  it('忽略针对不存在网格的事件', () => {
    const collection = createCollection()
    const next = reduceGridEvent(collection, {
      type: 'grid.set_cell',
      gridId: 'does_not_exist',
      row: 0,
      col: 0,
      value: 'X',
    })
    // 原集合不变（同引用返回）
    expect(next).toBe(collection)
  })

  it('支持自定义 gridId 创建并寻址', () => {
    const collection = createCollection('aux')
    expect(collection.aux.rows).toBe(3)
    const next = reduceGridEvent(collection, {
      type: 'grid.set_cell',
      gridId: 'aux',
      row: 0,
      col: 0,
      value: 'Z',
    })
    expect(next.aux.cells['0:0'].value).toBe('Z')
  })

  it('越界 set_cell 不写入', () => {
    const collection = createCollection()
    const next = reduceGridEvent(collection, {
      type: 'grid.set_cell',
      row: 9,
      col: 9,
      value: 'oops',
    })
    expect(next.main.cells['9:9']).toBeUndefined()
  })

  it('frontier 过滤越界坐标，且不覆盖 path / wall 单元', () => {
    let collection = createCollection()
    collection = reduceGridEvent(collection, {
      type: 'grid.wall',
      row: 0,
      col: 0,
      enabled: true,
    })
    collection = reduceGridEvent(collection, {
      type: 'grid.path',
      cells: [[1, 1]],
    })
    collection = reduceGridEvent(collection, {
      type: 'grid.frontier',
      cells: [
        [0, 0], // wall → 不变
        [1, 1], // path → 不变
        [0, 1], // 普通 → frontier
        [99, 99], // 越界 → 过滤
      ],
    })
    expect(collection.main.frontier).toEqual([
      [0, 0],
      [1, 1],
      [0, 1],
    ])
    expect(collection.main.cells['0:0'].state).toBe('wall')
    expect(collection.main.cells['1:1'].state).toBe('path')
    expect(collection.main.cells['0:1'].state).toBe('frontier')
  })

  it('set_cell 不带 state 时保留既有 state', () => {
    let collection = createCollection()
    collection = reduceGridEvent(collection, {
      type: 'grid.set_cell',
      row: 0,
      col: 0,
      value: 'A',
      state: 'target',
    })
    collection = reduceGridEvent(collection, {
      type: 'grid.set_cell',
      row: 0,
      col: 0,
      value: 'B',
    })
    expect(collection.main.cells['0:0']).toMatchObject({ value: 'B', state: 'target' })
  })

  it('path 可附带颜色', () => {
    const collection = reduceGridEvent(createCollection(), {
      type: 'grid.path',
      cells: [[2, 2]],
      color: 'gold',
    })
    expect(collection.main.cells['2:2']).toMatchObject({ state: 'path', color: 'gold' })
  })

  it('wall 关闭恢复默认态', () => {
    let collection = createCollection()
    collection = reduceGridEvent(collection, { type: 'grid.wall', row: 1, col: 1, enabled: true })
    collection = reduceGridEvent(collection, { type: 'grid.wall', row: 1, col: 1, enabled: false })
    expect(collection.main.cells['1:1']).toMatchObject({ wall: false, state: 'default' })
  })

  it('arrow 添加箭头，重复 id 去重替换，越界忽略', () => {
    let collection = createCollection()
    collection = reduceGridEvent(collection, {
      type: 'grid.arrow',
      from: [0, 0],
      to: [1, 1],
      label: 'a',
    })
    expect(collection.main.arrows).toHaveLength(1)
    expect(collection.main.arrows[0]).toMatchObject({ id: '0:0->1:1', label: 'a' })

    // 同 from/to → 同 id，替换 label
    collection = reduceGridEvent(collection, {
      type: 'grid.arrow',
      from: [0, 0],
      to: [1, 1],
      label: 'b',
    })
    expect(collection.main.arrows).toHaveLength(1)
    expect(collection.main.arrows[0].label).toBe('b')

    // 越界 → 忽略
    collection = reduceGridEvent(collection, {
      type: 'grid.arrow',
      from: [0, 0],
      to: [9, 9],
    })
    expect(collection.main.arrows).toHaveLength(1)
  })
})

describe('gridCompiler · compile helpers', () => {
  it('compileGridEvent 返回单条 grid.model 命令', () => {
    const cmds = compileGridEvent({
      type: 'grid.create',
      rows: 2,
      cols: 2,
    })
    expect(cmds).toHaveLength(1)
    const cmd = cmds[0]
    expect(cmd.type).toBe('grid.model')
    expect(cmd.gridId).toBe('main')
    expect(cmd.model.rows).toBe(2)
  })

  it('compileGridEvent 对不存在网格的事件返回空命令列表', () => {
    const cmds = compileGridEvent({
      type: 'grid.set_cell',
      gridId: 'ghost',
      row: 0,
      col: 0,
      value: 1,
    })
    expect(cmds).toEqual([])
  })

  it('compileGridEvents 顺序归约并累积命令与集合', () => {
    const { commands, collection } = compileGridEvents([
      { type: 'grid.create', rows: 2, cols: 2 },
      { type: 'grid.set_cell', row: 0, col: 0, value: 'X' },
      { type: 'grid.visit', row: 1, col: 1, order: 1 },
    ])
    expect(commands).toHaveLength(3)
    expect(collection.main.cells['0:0'].value).toBe('X')
    expect(collection.main.cells['1:1'].state).toBe('visited')
  })

  it('compileGridEvents 跳过对缺失网格的命令', () => {
    const { commands } = compileGridEvents([
      { type: 'grid.set_cell', gridId: 'nope', row: 0, col: 0, value: 1 },
    ])
    expect(commands).toEqual([])
  })
})
