import { describe, it, expect } from 'vitest'
import { generateHeapOperations } from '../heap'
import { deriveSceneState } from '@/scene/SceneEngine'
import { interpolateScene } from '@/scene/interpolate'
import type { SceneCell } from '@/scene/types'

describe('generateHeapOperations — 专用堆模块(不借用树)', () => {
  it('走 heap.* 事件与 module=heap，而非 tree', () => {
    const script = generateHeapOperations([4, 10, 3, 5, 1, 2])
    expect(script.presentation?.module).toBe('heap')
    const allEvents = script.steps.flatMap((s) => s.events ?? [])
    expect(allEvents.some((e) => e.type.startsWith('heap.'))).toBe(true)
    expect(allEvents.some((e) => e.type.startsWith('tree.'))).toBe(false)
  })

  it('第一步即渲染出根结点 heap_0（无空白首帧）', () => {
    const script = generateHeapOperations([4, 10, 3, 5, 1, 2])
    const scene = deriveSceneState(script, 1)
    expect(scene.entities['heap_0']).toBeDefined()
    expect((scene.entities['heap_0'] as SceneCell).value).toBe(4)
  })

  it('sift 步骤被补间识别为结点值互换 → 直线交叉动画', () => {
    const script = generateHeapOperations([4, 10, 3, 5, 1, 2])
    // 找到第一个含 heap.sift 的步骤序号（1-based step => deriveSceneState 用 step 计数）。
    const siftStepIdx = script.steps.findIndex((s) => (s.events ?? []).some((e) => e.type === 'heap.sift'))
    expect(siftStepIdx).toBeGreaterThan(0)

    // deriveSceneState(script, n) 回放前 n 步。prev = sift 之前，next = sift 之后。
    const prev = deriveSceneState(script, siftStepIdx) // 回放到 sift 步骤之前
    const next = deriveSceneState(script, siftStepIdx + 1) // 含 sift 步骤

    const sift = script.steps[siftStepIdx].events!.find((e) => e.type === 'heap.sift') as { from: number; to: number }
    const fromId = `heap_${sift.from}`
    const toId = `heap_${sift.to}`
    const prevFrom = prev.entities[fromId] as SceneCell
    const prevTo = prev.entities[toId] as SceneCell
    // 两端值确实互换了
    expect((next.entities[fromId] as SceneCell).value).toBe(prevTo.value)
    expect((next.entities[toId] as SceneCell).value).toBe(prevFrom.value)

    // 补间中点：两结点携带各自原值、沿直线移向对方位置
    const mid = interpolateScene(prev, next, 0.5)
    const midFrom = mid.entities[fromId] as SceneCell
    const midTo = mid.entities[toId] as SceneCell
    expect(midFrom.value).toBe(prevFrom.value)
    expect(midTo.value).toBe(prevTo.value)
    expect(midFrom.position.x).toBeCloseTo((prevFrom.position.x + prevTo.position.x) / 2)
    expect(midFrom.position.y).toBeCloseTo((prevFrom.position.y + prevTo.position.y) / 2)
  })
})
