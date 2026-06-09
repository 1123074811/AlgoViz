import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'
import type { RefObject } from 'react'
import { useResizablePanels } from '@/pages/Visualizer/useResizablePanels'

type LayoutEditor = { layout: () => void }

const originalInnerWidth = window.innerWidth

function setInnerWidth(value: number) {
  Object.defineProperty(window, 'innerWidth', { value, configurable: true, writable: true })
}

function dispatchMouseMove(coords: { clientX?: number; clientY?: number }) {
  const evt = new MouseEvent('mousemove', { bubbles: true })
  // jsdom MouseEvent doesn't carry clientX/Y reliably across versions; force them.
  Object.defineProperty(evt, 'clientX', { value: coords.clientX ?? 0 })
  Object.defineProperty(evt, 'clientY', { value: coords.clientY ?? 0 })
  document.dispatchEvent(evt)
}

function dispatchMouseUp() {
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

function fakeReactMouseEvent(coords: { clientX?: number; clientY?: number }) {
  return {
    preventDefault: vi.fn(),
    clientX: coords.clientX ?? 0,
    clientY: coords.clientY ?? 0,
  } as unknown as React.MouseEvent
}

describe('useResizablePanels', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setInnerWidth(1000) // makes percent math easy: 1px = 0.1%
  })

  afterEach(() => {
    vi.useRealTimers()
    setInnerWidth(originalInnerWidth)
    document.body.innerHTML = ''
  })

  it('exposes initial widths/heights and desktop flag', () => {
    setInnerWidth(1400)
    const editorRef = createRef<LayoutEditor>() as RefObject<LayoutEditor | null>
    const { result } = renderHook(() => useResizablePanels(editorRef))

    expect(result.current.leftWidth).toBe(35)
    expect(result.current.rightWidth).toBe(22)
    expect(result.current.editorHeight).toBe(62)
    expect(result.current.isDesktop).toBe(true)
  })

  it('reports non-desktop below 1280px and reacts to window resize', () => {
    setInnerWidth(1024)
    const editorRef = createRef<LayoutEditor>() as RefObject<LayoutEditor | null>
    const { result } = renderHook(() => useResizablePanels(editorRef))

    expect(result.current.isDesktop).toBe(false)

    act(() => {
      setInnerWidth(1400)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.isDesktop).toBe(true)

    act(() => {
      setInnerWidth(800)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.isDesktop).toBe(false)
  })

  it('left resize updates leftWidth on mousemove and calls editor layout', () => {
    const layout = vi.fn()
    const editorRef = { current: { layout } } as RefObject<LayoutEditor | null>
    const { result } = renderHook(() => useResizablePanels(editorRef))

    act(() => {
      result.current.handleLeftResizeStart(fakeReactMouseEvent({ clientX: 100 }))
    })
    // +100px at width 1000 = +10% → 35 + 10 = 45
    act(() => {
      dispatchMouseMove({ clientX: 200 })
    })
    expect(result.current.leftWidth).toBe(45)
    expect(layout).toHaveBeenCalled()

    // mouseup detaches and schedules a deferred layout()
    layout.mockClear()
    act(() => {
      dispatchMouseUp()
      vi.advanceTimersByTime(25)
    })
    expect(layout).toHaveBeenCalledTimes(1)

    // After mouseup, further moves are ignored.
    act(() => {
      dispatchMouseMove({ clientX: 999 })
    })
    expect(result.current.leftWidth).toBe(45)
  })

  it('left resize clamps to [20, 50]', () => {
    const editorRef = createRef<LayoutEditor>() as RefObject<LayoutEditor | null>
    const { result } = renderHook(() => useResizablePanels(editorRef))

    // Drag far right → clamp to 50
    act(() => {
      result.current.handleLeftResizeStart(fakeReactMouseEvent({ clientX: 0 }))
    })
    act(() => {
      dispatchMouseMove({ clientX: 1000 }) // +100% → clamp 50
    })
    expect(result.current.leftWidth).toBe(50)
    act(() => { dispatchMouseUp(); vi.advanceTimersByTime(25) })

    // Drag far left → clamp to 20
    act(() => {
      result.current.handleLeftResizeStart(fakeReactMouseEvent({ clientX: 1000 }))
    })
    act(() => {
      dispatchMouseMove({ clientX: 0 }) // -100% → clamp 20
    })
    expect(result.current.leftWidth).toBe(20)
  })

  it('right resize updates rightWidth (inverse delta) and clamps to [15, 35]', () => {
    const editorRef = createRef<LayoutEditor>() as RefObject<LayoutEditor | null>
    const { result } = renderHook(() => useResizablePanels(editorRef))

    // Dragging left (smaller clientX) increases rightWidth: start 22, -(-5%) = +5 → 27
    act(() => {
      result.current.handleRightResizeStart(fakeReactMouseEvent({ clientX: 100 }))
    })
    act(() => {
      dispatchMouseMove({ clientX: 50 }) // delta -50px = -5% → 22 - (-5) = 27
    })
    expect(result.current.rightWidth).toBe(27)
    act(() => { dispatchMouseUp() })

    // Clamp high to 35
    act(() => {
      result.current.handleRightResizeStart(fakeReactMouseEvent({ clientX: 1000 }))
    })
    act(() => {
      dispatchMouseMove({ clientX: 0 }) // delta -1000px = -100% → 27+100 clamp 35
    })
    expect(result.current.rightWidth).toBe(35)
    act(() => { dispatchMouseUp() })

    // Clamp low to 15
    act(() => {
      result.current.handleRightResizeStart(fakeReactMouseEvent({ clientX: 0 }))
    })
    act(() => {
      dispatchMouseMove({ clientX: 1000 }) // +100% → 35 - 100 clamp 15
    })
    expect(result.current.rightWidth).toBe(15)
  })

  it('editor-height resize requires the left panel element; no-op when missing', () => {
    const layout = vi.fn()
    const editorRef = { current: { layout } } as RefObject<LayoutEditor | null>
    const { result } = renderHook(() => useResizablePanels(editorRef))

    // No #left-workspace-panel in DOM → early return, listeners not attached.
    act(() => {
      result.current.handleEditorHeightResizeStart(fakeReactMouseEvent({ clientY: 100 }))
    })
    act(() => {
      dispatchMouseMove({ clientY: 500 })
    })
    expect(result.current.editorHeight).toBe(62)
    expect(layout).not.toHaveBeenCalled()
  })

  it('editor-height resize updates editorHeight using panel height and clamps to [30, 82]', () => {
    const layout = vi.fn()
    const editorRef = { current: { layout } } as RefObject<LayoutEditor | null>

    const panel = document.createElement('div')
    panel.id = 'left-workspace-panel'
    document.body.appendChild(panel)
    // Mock layout height = 1000px so 1px = 0.1%.
    panel.getBoundingClientRect = () => ({ height: 1000, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

    const { result } = renderHook(() => useResizablePanels(editorRef))

    act(() => {
      result.current.handleEditorHeightResizeStart(fakeReactMouseEvent({ clientY: 100 }))
    })
    act(() => {
      dispatchMouseMove({ clientY: 200 }) // +100px = +10% → 62 + 10 = 72
    })
    expect(result.current.editorHeight).toBe(72)
    expect(layout).toHaveBeenCalled()

    // Clamp high to 82
    act(() => {
      dispatchMouseMove({ clientY: 1100 }) // +1000px = +100% → clamp 82
    })
    expect(result.current.editorHeight).toBe(82)

    layout.mockClear()
    act(() => {
      dispatchMouseUp()
      vi.advanceTimersByTime(25)
    })
    expect(layout).toHaveBeenCalledTimes(1)
  })

  it('handlers call preventDefault on the starting event', () => {
    const editorRef = createRef<LayoutEditor>() as RefObject<LayoutEditor | null>
    const { result } = renderHook(() => useResizablePanels(editorRef))

    const evt = fakeReactMouseEvent({ clientX: 10 })
    act(() => {
      result.current.handleLeftResizeStart(evt)
    })
    expect(evt.preventDefault).toHaveBeenCalled()
    act(() => { dispatchMouseUp(); vi.advanceTimersByTime(25) })
  })
})
