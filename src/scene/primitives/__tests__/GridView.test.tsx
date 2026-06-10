import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GridView } from '../GridView'
import type { GridCellModel, GridModel } from '../../overlays/gridTypes'

function cellMap(cells: GridCellModel[]): Record<string, GridCellModel> {
  const out: Record<string, GridCellModel> = {}
  for (const c of cells) out[`${c.row}:${c.col}`] = c
  return out
}

function model(partial: Partial<GridModel> & { cells: Record<string, GridCellModel> }): GridModel {
  return {
    gridId: 'g1',
    rows: 2,
    cols: 2,
    frontier: [],
    path: [],
    arrows: [],
    ...partial,
  }
}

describe('GridView', () => {
  it('renders a titled grid with one cell per model cell', () => {
    const cells = cellMap([
      { row: 0, col: 0, state: 'default', value: 'A' },
      { row: 0, col: 1, state: 'visited', value: 'B' },
      { row: 1, col: 0, state: 'wall', wall: true },
      { row: 1, col: 1, state: 'active', value: 'D' },
    ])
    const { container } = render(<GridView model={model({ title: '迷宫', cells })} />)

    const section = container.querySelector('section')
    expect(section?.getAttribute('aria-label')).toBe('迷宫')
    expect(container.textContent).toContain('迷宫')

    // 4 cells; wall cell label is empty
    const cellDivs = container.querySelectorAll('.grid > div')
    expect(cellDivs.length).toBe(4)
    expect(container.textContent).toContain('A')
    expect(container.textContent).toContain('B')
    expect(container.textContent).toContain('D')

    // visited role class applied
    const visited = Array.from(cellDivs).find(d => d.getAttribute('title') === '(0, 1)')
    expect(visited?.className).toContain('bg-sky-50')
    // wall role class
    const wall = Array.from(cellDivs).find(d => d.getAttribute('title') === '(1, 0)')
    expect(wall?.className).toContain('bg-slate-800')
  })

  it('falls back to default aria-label and renders without title', () => {
    const cells = cellMap([{ row: 0, col: 0, state: 'default' }])
    const { container } = render(<GridView model={model({ rows: 1, cols: 1, cells })} />)
    const section = container.querySelector('section')
    expect(section?.getAttribute('aria-label')).toBe('Grid')
  })

  it('shows weight badge when weight differs from value', () => {
    const cells = cellMap([
      { row: 0, col: 0, state: 'weighted', value: 'V', weight: 7 },
    ])
    const { container } = render(<GridView model={model({ rows: 1, cols: 1, cells })} />)
    // main label is the value, badge shows weight
    expect(container.textContent).toContain('V')
    expect(container.textContent).toContain('7')
    expect(container.querySelector('.absolute.bottom-0\\.5')).toBeTruthy()
  })

  it('renders visitOrder label when no value/weight', () => {
    const cells = cellMap([{ row: 0, col: 0, state: 'visited', visitOrder: 5 }])
    const { container } = render(<GridView model={model({ rows: 1, cols: 1, cells })} />)
    expect(container.textContent).toContain('5')
  })

  it('applies custom cell color style when provided', () => {
    const cells = cellMap([{ row: 0, col: 0, state: 'default', color: '#ff0000', value: 'x' }])
    const { container } = render(<GridView model={model({ rows: 1, cols: 1, cells })} />)
    const cell = container.querySelector('.grid > div') as HTMLElement
    expect(cell.style.borderColor).toBeTruthy()
  })

  it('renders arrows with labels', () => {
    const cells = cellMap([
      { row: 0, col: 0, state: 'default' },
      { row: 1, col: 1, state: 'default' },
    ])
    const { container } = render(
      <GridView
        model={model({
          cells,
          arrows: [{ id: 'a1', from: [0, 0], to: [1, 1], label: '路径' }],
        })}
      />,
    )
    expect(container.textContent).toContain('路径')
    const arrow = container.querySelector('[title="路径"]')
    expect(arrow).toBeTruthy()
  })

  it('renders an arrow without a label', () => {
    const cells = cellMap([{ row: 0, col: 0, state: 'default' }])
    const { container } = render(
      <GridView
        model={model({
          rows: 1,
          cols: 2,
          cells,
          arrows: [{ id: 'a2', from: [0, 0], to: [0, 1] }],
        })}
      />,
    )
    expect(container.querySelector('.border-dashed')).toBeTruthy()
  })
})
