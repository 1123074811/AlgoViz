import { useEffect, useRef, useState } from 'react'
import type { SceneState } from './types'
import { interpolateScene } from './interpolate'
import { MOTION } from './tokens'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 在 target 变化时，从「当前显示态」补间到 target。
 * 可中断：新 target 到来时以当前显示态为新 prev 重新起算。
 * reduced-motion 或 duration<=0 时直接返回 target。
 */
export function useSceneTransition(target: SceneState, durationMs: number = MOTION.duration.base): SceneState {
  const [displayed, setDisplayed] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion() || durationMs <= 0) {
      fromRef.current = target
      setDisplayed(target)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const tick = (nowTs: number) => {
      const raw = Math.min(1, (nowTs - start) / durationMs)
      const eased = easeOutCubic(raw)
      const frame = interpolateScene(from, target, eased)
      setDisplayed(frame)
      fromRef.current = frame
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        setDisplayed(target)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, durationMs])

  return displayed
}
