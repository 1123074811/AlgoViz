import { useEffect, useRef, useState } from 'react'
import type { SceneState } from './types'
import { interpolateScene } from './interpolate'
import { MOTION } from './tokens'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 在「逻辑步骤」变化时，从当前显示态补间到 target。
 *
 * 关键：`deriveSceneState` 每次渲染都返回新对象，若以 target 引用作为 effect 依赖，
 * 补间每帧 setDisplayed 触发重渲染 → 新 target 引用 → effect 重启 → start 归零 →
 * 动画永远从头开始（疯狂抖动）。因此用 `transitionKey`（如 `script@step`）作为重启依据，
 * target 始终经 ref 读最新值，不进依赖数组。未传 key 时回退到「以 target 引用为 key」
 * 的旧行为（便于单测直接靠 rerender 触发）。
 *
 * 可中断：key 变化时以当前显示态为新起点重算。
 * reduced-motion 或 duration<=0 时直接返回 target（瞬移）。
 */
export function useSceneTransition(
  target: SceneState,
  durationMs: number = MOTION.duration.base,
  transitionKey?: string | number,
): SceneState {
  const [displayed, setDisplayed] = useState(target)
  const fromRef = useRef(target)
  const targetRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  // 提交后同步最新 target（不在 render 期写 ref）。声明在动画 effect 之前，
  // 保证 restartKey 变化时本 effect 先跑、动画 effect 再读到最新 target。
  useEffect(() => {
    targetRef.current = target
  })

  const instant = prefersReducedMotion() || durationMs <= 0
  // 传了 key 就用 key 决定何时重启；没传则退回 target 引用（旧行为）。
  const restartKey = transitionKey !== undefined ? transitionKey : target

  useEffect(() => {
    if (instant) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      fromRef.current = targetRef.current
      return
    }
    const from = fromRef.current
    const start = performance.now()
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const tick = (nowTs: number) => {
      const raw = Math.min(1, (nowTs - start) / durationMs)
      const eased = easeOutCubic(raw)
      const frame = interpolateScene(from, targetRef.current, eased)
      setDisplayed(frame)
      fromRef.current = frame
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = targetRef.current
        setDisplayed(targetRef.current)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [restartKey, durationMs, instant])

  // 瞬移时直接返回 target，避免在 effect 内同步 setState 触发级联渲染。
  return instant ? target : displayed
}
