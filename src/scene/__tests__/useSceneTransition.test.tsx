import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSceneTransition } from '../useSceneTransition'
import { createEmptyScene } from '../types'
import type { SceneState, SceneCell } from '../types'

function sceneAt(x: number): SceneState {
  const c: SceneCell = { id: 'arr_0', type: 'cell', position: { x, y: 0 }, size: { width: 44, height: 44 }, value: '1', col: 0, state: { role: 'idle', color: 'muted' } }
  return { ...createEmptyScene(), entities: { arr_0: c } }
}

describe('useSceneTransition', () => {
  let now = 0
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { now += 16; setTimeout(() => cb(now), 0); return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('reduced-motion 时直接返回目标场景（无补间）', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }))
    const { result, rerender } = renderHook(({ s }) => useSceneTransition(s, 320), { initialProps: { s: sceneAt(0) } })
    rerender({ s: sceneAt(100) })
    expect((result.current.entities['arr_0'] as SceneCell).position.x).toBe(100)
  })

  it('新目标到来后推进若干帧逐步逼近目标', async () => {
    const { result, rerender } = renderHook(({ s }) => useSceneTransition(s, 320), { initialProps: { s: sceneAt(0) } })
    rerender({ s: sceneAt(100) })
    await act(async () => { for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 0)) } })
    expect((result.current.entities['arr_0'] as SceneCell).position.x).toBeCloseTo(100, 0)
  })
})
