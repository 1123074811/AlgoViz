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

  it('稳定 key 下 target 引用变化不重启动画（防抖动回归）', async () => {
    const { result, rerender } = renderHook(
      ({ s, k }: { s: SceneState; k: string }) => useSceneTransition(s, 320, k),
      { initialProps: { s: sceneAt(0), k: 'step-0' } },
    )
    // 切到新步骤,启动动画
    rerender({ s: sceneAt(100), k: 'step-1' })
    await act(async () => { for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, 0)) } })
    const xMid = (result.current.entities['arr_0'] as SceneCell).position.x
    expect(xMid).toBeGreaterThan(0) // 已经在移动
    expect(xMid).toBeLessThan(100)
    // 同 key、但传入新的 target 引用(相同内容): 不应重启 → x 继续前进,不被打回起点
    rerender({ s: sceneAt(100), k: 'step-1' })
    await act(async () => { for (let i = 0; i < 3; i++) { await new Promise(r => setTimeout(r, 0)) } })
    const xAfter = (result.current.entities['arr_0'] as SceneCell).position.x
    expect(xAfter).toBeGreaterThanOrEqual(xMid - 0.001)
  })
})
