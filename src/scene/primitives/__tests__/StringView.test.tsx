import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StringView from '@/scene/primitives/StringView'
import type { SceneCell } from '@/scene/types'

function charCell(row: number, index: number, value: string, x: number, y: number): SceneCell {
  return {
    id: `s_${row}_${index}`,
    type: 'cell',
    position: { x, y },
    size: { width: 36, height: 36 },
    value,
    col: index,
  }
}

/** A <text>.textContent includes nested <title> children; strip them for visible text. */
function visibleTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text')).map((t) => {
    const title = t.querySelector('title')
    const titleText = title?.textContent ?? ''
    return (t.textContent ?? '').slice(0, (t.textContent ?? '').length - titleText.length)
  })
}

describe('StringView', () => {
  it('空 cells 返回 null', () => {
    const { container } = render(<svg><StringView cells={[]} /></svg>)
    expect(container.querySelector('g')).toBeNull()
  })

  it('没有合法 s_ id 时返回 null', () => {
    const bad: SceneCell = { id: 'x_0', type: 'cell', position: { x: 0, y: 0 }, value: 'a' }
    const { container } = render(<svg><StringView cells={[bad]} /></svg>)
    // rows.size === 0 → null
    expect(container.querySelector('g')).toBeNull()
  })

  it('单行字符串渲染标题、单个行框与每字符索引', () => {
    const cells = [
      charCell(0, 0, 'a', 50, 100),
      charCell(0, 1, 'b', 86, 100),
      charCell(0, 2, 'c', 122, 100),
    ]
    const { container } = render(<svg><StringView cells={cells} /></svg>)

    const texts = visibleTexts(container)
    expect(texts).toContain('字符序列')
    // index numbers 0,1,2 present
    expect(texts).toContain('0')
    expect(texts).toContain('1')
    expect(texts).toContain('2')
    // single row → exactly one frame rect
    expect(container.querySelectorAll('rect').length).toBe(1)
    // single row → no row labels
    expect(texts).not.toContain('主串')
    expect(texts).not.toContain('模式串')
  })

  it('hideTitle 隐藏标题', () => {
    const cells = [charCell(0, 0, 'a', 50, 100)]
    const { container } = render(<svg><StringView cells={cells} hideTitle /></svg>)
    expect(visibleTexts(container)).not.toContain('字符序列')
  })

  it('双行布局渲染两个行框与主串/模式串标签', () => {
    const cells = [
      charCell(0, 0, 'a', 50, 100),
      charCell(0, 1, 'b', 86, 100),
      charCell(1, 0, 'x', 50, 160),
      charCell(1, 1, 'y', 86, 160),
    ]
    const { container } = render(<svg><StringView cells={cells} /></svg>)
    expect(container.querySelectorAll('rect').length).toBe(2)
    const texts = visibleTexts(container)
    expect(texts).toContain('主串')
    expect(texts).toContain('模式串')
  })

  it('col 缺失时索引回退到 id 解析', () => {
    const cell: SceneCell = {
      id: 's_0_5',
      type: 'cell',
      position: { x: 50, y: 100 },
      size: { width: 36, height: 36 },
      value: 'q',
    }
    const { container } = render(<svg><StringView cells={[cell]} /></svg>)
    expect(visibleTexts(container)).toContain('5')
  })
})
