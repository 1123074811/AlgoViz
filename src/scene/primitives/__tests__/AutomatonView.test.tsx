import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AutomatonView from '../AutomatonView'
import type { SceneCell } from '../../types'

function st(id: string, x: number, meta: Record<string, unknown>): SceneCell {
  return { id, type: 'cell', position: { x, y: 100 }, size: { width: 52, height: 52 }, value: id, meta, state: { role: 'idle', color: 'primary' } } as SceneCell
}

describe('AutomatonView', () => {
  it('为每个状态渲染圆;接受态渲染双圈', () => {
    const cells = [st('auto_s0', 100, { kind: 'state', start: true }), st('auto_s1', 200, { kind: 'state', accepting: true })]
    const { container } = render(<svg><AutomatonView cells={cells} /></svg>)
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(3) // s0 一圈 + s1 双圈
  })
})
