import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CallStackView from '../CallStackView'
import type {
  CallStackFrame,
  CallStackModel,
  CallStackFrameStatus,
} from '../../overlays/callStackTypes'

let seq = 0
function frame(partial: Partial<CallStackFrame> & { status: CallStackFrameStatus }): CallStackFrame {
  return {
    id: `f${seq++}`,
    functionName: 'dfs',
    parameters: {},
    locals: {},
    active: false,
    highlighted: false,
    depth: 0,
    ...partial,
  }
}

function model(frames: CallStackFrame[], title = '调用栈'): CallStackModel {
  return {
    id: 'cs1',
    title,
    frames,
    highlightedFrameIds: [],
  }
}

describe('CallStackView', () => {
  it('renders empty state when no frames', () => {
    const { container } = render(<CallStackView model={model([])} />)
    expect(container.textContent).toContain('当前步骤暂无递归调用')
    expect(container.querySelector('ol')).toBeNull()
    // header count shows 0 层
    expect(container.textContent).toContain('0 层')
  })

  it('uses a custom emptyLabel', () => {
    const { container } = render(<CallStackView model={model([])} emptyLabel="空空如也" />)
    expect(container.textContent).toContain('空空如也')
  })

  it('renders frames with translated function/status labels and bindings', () => {
    const frames = [
      frame({
        functionName: 'dfs',
        status: 'active',
        active: true,
        depth: 0,
        parameters: { row: 1, col: 2 },
        locals: { valid: true },
      }),
    ]
    const { container } = render(<CallStackView model={model(frames)} />)
    expect(container.textContent).toContain('深度搜索')
    expect(container.textContent).toContain('执行中')
    // binding label translation + formatted boolean
    expect(container.textContent).toContain('行')
    expect(container.textContent).toContain('已找到')
    expect(container.textContent).toContain('是')
    expect(container.querySelectorAll('ol > li').length).toBeGreaterThan(0)
  })

  it('shows return value chip for returned frames', () => {
    const frames = [
      frame({ status: 'returned', returnValue: 42, depth: 1 }),
    ]
    const { container } = render(<CallStackView model={model(frames)} />)
    expect(container.textContent).toContain('返回')
    expect(container.textContent).toContain('42')
    expect(container.textContent).toContain('已返回')
  })

  it('formats various value types (null, undefined, object, string)', () => {
    const frames = [
      frame({
        status: 'pending',
        functionName: 'mystery',
        parameters: {
          a: null,
          b: undefined,
          path: ['x', 'y'],
          result: 'done',
        },
      }),
    ]
    const { container } = render(<CallStackView model={model(frames)} />)
    expect(container.textContent).toContain('空') // null
    expect(container.textContent).toContain('未定义') // undefined
    expect(container.textContent).toContain('["x","y"]') // object/array JSON
    expect(container.textContent).toContain('done')
    // untranslated function name falls through
    expect(container.textContent).toContain('mystery')
    expect(container.textContent).toContain('等待')
  })

  it('collapses frames beyond the visible limit', () => {
    const frames = Array.from({ length: 8 }, (_, i) =>
      frame({ status: 'pending', depth: i, functionName: `fn${i}` }),
    )
    const { container } = render(<CallStackView model={model(frames)} />)
    expect(container.textContent).toContain('其余 3 层递归已折叠')
    expect(container.textContent).toContain('8 层')
  })

  it('renders highlighted and error frame variants', () => {
    const frames = [
      frame({ status: 'pending', highlighted: true, depth: 0 }),
      frame({ status: 'error', depth: 1 }),
    ]
    const { container } = render(<CallStackView model={model(frames)} />)
    expect(container.textContent).toContain('异常')
    expect(container.querySelector('[data-overlay-id="cs1"]')).toBeTruthy()
  })
})
