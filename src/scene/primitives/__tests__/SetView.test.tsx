import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SetView from '@/scene/primitives/SetView'
import type { SceneCell } from '@/scene/types'

function memberCell(index: number, value: string, x: number, y: number): SceneCell {
  return {
    id: `set_${index}`,
    type: 'cell',
    position: { x, y },
    size: { width: 44, height: 44 },
    value,
    col: index,
  }
}

describe('SetView', () => {
  it('空 cells 返回 null', () => {
    const { container } = render(<svg><SetView cells={[]} /></svg>)
    expect(container.querySelector('g')).toBeNull()
  })

  it('渲染容器 pill、两条花括号路径与标题', () => {
    const cells = [
      memberCell(0, '1', 100, 200),
      memberCell(1, '2', 150, 200),
      memberCell(2, '3', 200, 200),
    ]
    const { container } = render(<svg><SetView cells={cells} /></svg>)

    // one container rect
    expect(container.querySelectorAll('rect').length).toBe(1)
    // two brace paths
    expect(container.querySelectorAll('path').length).toBe(2)
    // title text
    const titles = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(titles).toContain('集合·去重无序')
  })

  it('hideTitle 隐藏标题', () => {
    const cells = [memberCell(0, '1', 100, 200)]
    const { container } = render(<svg><SetView cells={cells} hideTitle /></svg>)
    expect(container.querySelectorAll('text').length).toBe(0)
    // structure still present
    expect(container.querySelectorAll('rect').length).toBe(1)
    expect(container.querySelectorAll('path').length).toBe(2)
  })

  it('pill 包含成员的水平范围', () => {
    const cells = [
      memberCell(0, '1', 100, 200),
      memberCell(1, '2', 300, 200),
    ]
    const { container } = render(<svg><SetView cells={cells} /></svg>)
    const rect = container.querySelector('rect')!
    const x = Number(rect.getAttribute('x'))
    const width = Number(rect.getAttribute('width'))
    // left member center 100, half-width 22, padX 26 → left ≈ 52
    expect(x).toBeLessThan(100 - 44 / 2)
    // right edge past rightmost member
    expect(x + width).toBeGreaterThan(300 + 44 / 2)
  })

  it('size 缺失时使用默认尺寸', () => {
    const cell: SceneCell = { id: 'set_0', type: 'cell', position: { x: 100, y: 200 }, value: '1' }
    const { container } = render(<svg><SetView cells={[cell]} /></svg>)
    expect(container.querySelectorAll('rect').length).toBe(1)
  })
})
