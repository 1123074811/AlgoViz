import { describe, expect, it } from 'vitest'
import { reduceGridEvent } from '../gridCompiler'
import type { GridCollection } from '../../overlays/gridTypes'

describe('gridCompiler', () => {
  const create = (collection: GridCollection = {}) =>
    reduceGridEvent(collection, {
      type: 'grid.create',
      rows: 3,
      cols: 3,
      values: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    })

  it('creates a grid model from values', () => {
    const collection = create()
    expect(collection.main.rows).toBe(3)
    expect(collection.main.cols).toBe(3)
    expect(collection.main.cells['1:1'].value).toBe(5)
  })

  it('sets a cell value and state', () => {
    const collection = reduceGridEvent(create(), {
      type: 'grid.set_cell',
      row: 1,
      col: 2,
      value: 'T',
      state: 'target',
    })

    expect(collection.main.cells['1:2']).toMatchObject({
      value: 'T',
      state: 'target',
    })
  })

  it('marks visited cells with visit order', () => {
    const collection = reduceGridEvent(create(), {
      type: 'grid.visit',
      row: 2,
      col: 0,
      order: 4,
    })

    expect(collection.main.cells['2:0']).toMatchObject({
      state: 'visited',
      visited: true,
      visitOrder: 4,
    })
  })

  it('tracks frontier cells', () => {
    const collection = reduceGridEvent(create(), {
      type: 'grid.frontier',
      cells: [
        [0, 1],
        [1, 0],
      ],
    })

    expect(collection.main.frontier).toEqual([
      [0, 1],
      [1, 0],
    ])
    expect(collection.main.cells['0:1'].state).toBe('frontier')
  })

  it('tracks path cells', () => {
    const collection = reduceGridEvent(create(), {
      type: 'grid.path',
      cells: [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
    })

    expect(collection.main.path).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
    ])
    expect(collection.main.cells['1:1'].state).toBe('path')
  })

  it('toggles walls and weights', () => {
    let collection = create()
    collection = reduceGridEvent(collection, {
      type: 'grid.wall',
      row: 1,
      col: 1,
      enabled: true,
    })
    collection = reduceGridEvent(collection, {
      type: 'grid.weight',
      row: 2,
      col: 2,
      weight: 7,
    })

    expect(collection.main.cells['1:1']).toMatchObject({
      wall: true,
      state: 'wall',
    })
    expect(collection.main.cells['2:2']).toMatchObject({
      weight: 7,
      state: 'weighted',
    })
  })
})
