import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import VariablesView from '../VariablesView'
import type { SceneCell } from '../../types'

// 纵向布局：每个变量占一行,左边缘对齐(同 x),y 逐行递增(取自 cell.position.y)。
function variable(name: string, value: string | number, col: number): SceneCell {
  const ROW_STEP = 34
  return {
    id: `mathvar_${name}`,
    type: 'cell',
    position: { x: 200 + 96 / 2, y: 160 + col * ROW_STEP },
    size: { width: 96, height: 30 },
    value,
    col,
    meta: { name, value },
  }
}

describe('VariablesView', () => {
  it('变量纵向排列：各行左边缘对齐,逐行向下', () => {
    const vars = [
      variable('index', 1, 0),
      variable('combination', 'bd', 1),
      variable('result', '["ad", "ae", "af"]', 2),
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
        y: Number(node.getAttribute('y')),
      }))

    const index = labels.find((node) => node.text === 'index')
    const combination = labels.find((node) => node.text === 'combination')
    const result = labels.find((node) => node.text === 'result')

    // 三个变量名标签左边缘对齐(同 x)
    expect(index!.x).toBe(combination!.x)
    expect(combination!.x).toBe(result!.x)
    // 逐行向下：result 在 combination 下方,combination 在 index 下方
    expect(combination!.y).toBeGreaterThan(index!.y)
    expect(result!.y).toBeGreaterThan(combination!.y)
  })
})
