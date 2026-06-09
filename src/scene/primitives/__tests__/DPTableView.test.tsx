import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DPTableView } from '../DPTableView'
import type { DPTableModel } from '../../overlays/dpTypes'

function model(): DPTableModel {
  return {
    id: 'dp',
    kind: 'dp-table',
    title: 'DP 状态表',
    rowCount: 2,
    colCount: 2,
    rowLabels: ['i0', 'i1'],
    colLabels: ['j0', 'j1'],
    cells: [
      [{ value: true, highlights: ['dependency'] }, { value: false, highlights: [] }],
      [{ value: false, highlights: [] }, { value: true, highlights: ['current'] }],
    ],
    dependencies: [{ from: { row: 0, col: 0 }, to: { row: 1, col: 1 }, label: 'match' }],
    formulas: [{ target: { row: 1, col: 1 }, text: 'dp[i][j] = dp[i-1][j-1]' }],
    traceback: [],
  }
}

describe('DPTableView', () => {
  it('promotes the current transition formula above the table', () => {
    render(<DPTableView model={model()} />)

    expect(screen.getByText('当前 DP 方程')).toBeTruthy()
    expect(screen.getAllByText('i1,j1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('dp[i][j] = dp[i-1][j-1]').length).toBeGreaterThan(0)
    expect(screen.getByText('依赖')).toBeTruthy()
    expect(screen.getAllByText('i0,j0').length).toBeGreaterThan(0)
    expect(screen.getByText('match')).toBeTruthy()
  })
})
