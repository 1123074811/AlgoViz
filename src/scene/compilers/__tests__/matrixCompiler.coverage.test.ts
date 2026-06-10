import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { matrixCompiler } from '../matrixCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'matrix',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
  initialState: { type: 'matrix', matrix: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = matrixCompiler.compile(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function cellId(row: number, col: number) {
  return `cell_${row}_${col}`
}

function cell(scene: SceneState, id: string): SceneCell | undefined {
  const e = scene.entities[id]
  return e?.type === 'cell' ? e : undefined
}

describe('matrixCompiler · matrix.*', () => {
  it('create 产出主单元格 + 行/列表头 + 角', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'matrix.create',
      rows: 2,
      cols: 3,
      values: [
        [1, 2, 3],
        [4, 5, 6],
      ],
    })

    expect(cell(scene, cellId(0, 0))?.value).toBe(1)
    expect(cell(scene, cellId(1, 2))?.value).toBe(6)
    // 表头
    expect(scene.entities['m_rhead_1']).toBeDefined()
    expect(scene.entities['m_chead_2']).toBeDefined()
    expect(scene.entities['m_corner']).toBeDefined()
    expect(cell(scene, 'm_chead_2')?.value).toBe(2)
  })

  it('create 无 values 时单元格为空字符串', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'matrix.create', rows: 1, cols: 1 })
    expect(cell(scene, cellId(0, 0))?.value).toBe('')
  })

  it('visit_cell 高亮为 current', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'matrix.create', rows: 2, cols: 2 })
    scene = step(scene, { type: 'matrix.visit_cell', row: 0, col: 1 })
    expect(cell(scene, cellId(0, 1))?.state?.role).toBe('current')
  })

  it('mark_path 记录依赖组并把单元标记为 candidate', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'matrix.create', rows: 2, cols: 2 })
    scene = step(scene, {
      type: 'matrix.mark_path',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    })
    expect(scene.groups.__matrix_dependencies?.entityIds).toEqual([cellId(0, 0), cellId(0, 1)])
    expect(cell(scene, cellId(0, 1))?.state?.role).toBe('candidate')
  })

  it('update_cell 写值并按依赖组连出 dep_ 边', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'matrix.create', rows: 2, cols: 2 })
    scene = step(scene, {
      type: 'matrix.mark_path',
      cells: [{ row: 0, col: 0 }],
    })
    scene = step(scene, { type: 'matrix.update_cell', row: 1, col: 1, value: 42 })

    expect(cell(scene, cellId(1, 1))?.value).toBe(42)
    expect(cell(scene, cellId(1, 1))?.state?.role).toBe('current')
    const depEdge = `dep_${cellId(0, 0)}_${cellId(1, 1)}`
    expect(scene.edges[depEdge]).toBeDefined()
    expect(scene.edges[depEdge].from.entityId).toBe(cellId(0, 0))
  })

  it('mark_conflict 把单元标记为 conflict', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'matrix.create', rows: 2, cols: 2 })
    scene = step(scene, { type: 'matrix.mark_conflict', cells: [{ row: 1, col: 0 }] })
    expect(cell(scene, cellId(1, 0))?.state?.role).toBe('conflict')
  })

  it('transition 连一条 trans_ 转移边并清掉旧边', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'matrix.create', rows: 2, cols: 2 })
    scene = step(scene, {
      type: 'matrix.transition',
      from: { row: 0, col: 0 },
      to: { row: 1, col: 1 },
    })
    const e1 = `trans_${cellId(0, 0)}_${cellId(1, 1)}`
    expect(scene.edges[e1]).toBeDefined()

    // 第二次转移：旧的 trans_ 边被断开，只剩新边
    scene = step(scene, {
      type: 'matrix.transition',
      from: { row: 0, col: 1 },
      to: { row: 1, col: 0 },
    })
    expect(scene.edges[e1]).toBeUndefined()
    expect(scene.edges[`trans_${cellId(0, 1)}_${cellId(1, 0)}`]).toBeDefined()
  })
})

describe('matrixCompiler · n_queens.*', () => {
  it('try_place 自动建棋盘并标记 candidate', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'n_queens.try_place', row: 1, col: 2 })
    // ensureBoard 按 max(row+1, col+1, 默认) 建出方阵棋盘
    expect(scene.entities[cellId(0, 0)]).toBeDefined()
    expect(scene.entities[cellId(2, 2)]).toBeDefined()
    expect(cell(scene, cellId(1, 2))?.state?.role).toBe('candidate')
  })

  it('place 写入皇后符号并标记 safe', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'n_queens.place', row: 0, col: 0 })
    expect(cell(scene, cellId(0, 0))?.state?.role).toBe('safe')
    expect(String(cell(scene, cellId(0, 0))?.value ?? '')).not.toBe('')
  })

  it('conflict 把目标格与冲突格都标记 conflict', () => {
    let scene = createEmptyScene()
    scene = step(scene, {
      type: 'n_queens.conflict',
      row: 2,
      col: 2,
      conflicts: [{ row: 0, col: 0 }],
    })
    expect(cell(scene, cellId(2, 2))?.state?.role).toBe('conflict')
    expect(cell(scene, cellId(0, 0))?.state?.role).toBe('conflict')
  })

  it('backtrack 清空格子值并标记 idle', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'n_queens.place', row: 1, col: 1 })
    scene = step(scene, { type: 'n_queens.backtrack', row: 1, col: 1 })
    expect(cell(scene, cellId(1, 1))?.value).toBe('')
    expect(cell(scene, cellId(1, 1))?.state?.role).toBe('idle')
  })

  it('solution 在已存在棋盘上写满皇后', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'matrix.create', rows: 2, cols: 2 })
    scene = step(scene, {
      type: 'n_queens.solution',
      queens: [
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ],
    })
    expect(cell(scene, cellId(0, 1))?.state?.role).toBe('safe')
    expect(cell(scene, cellId(1, 0))?.state?.role).toBe('safe')
  })
})
