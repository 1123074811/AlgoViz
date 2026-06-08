import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import VariablesView from '../VariablesView'
import type { SceneCell } from '../../types'

function variable(name: string, value: string | number, col: number, x: number): SceneCell {
  return {
    id: `mathvar_${name}`,
    type: 'cell',
    position: { x, y: 200 },
    size: { width: 96, height: 30 },
    value,
    col,
    meta: { name, value },
  }
}

describe('VariablesView', () => {
  it('keeps variables on one row while spacing long values apart', () => {
    const vars = [
      variable('index', 1, 0, 200),
      variable('combination', 'bd', 1, 314),
      variable('result', '["ad", "ae", "af"]', 2, 472),
    ]

    const { container } = render(
      <svg>
        <VariablesView vars={vars} />
      </svg>,
    )

    const labels = Array.from(container.querySelectorAll('text'))
      .map((node) => ({
        text: node.textContent,
        x: Number(node.getAttribute('x')),
        y: node.getAttribute('y'),
      }))

    const combination = labels.find((node) => node.text === 'combination')
    const result = labels.find((node) => node.text === 'result')

    expect(combination?.y).toBeDefined()
    expect(result?.y).toBeDefined()
    expect(result?.y).toBe(combination?.y)
    expect(result!.x).toBeGreaterThan(combination!.x + 'combination'.length * 8)
  })
})
