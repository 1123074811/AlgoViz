import { useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import type { VisualState } from '@/hooks/useAnimationEngine'
import type { AnimationStep } from '@/types/animation'

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

interface BarLayout {
  key: number
  left: number
  width: number
  y: number
  height: number
  color: string
  value: number
  index: number
}

interface ArrayRendererProps {
  visualState: VisualState
  currentStepData: AnimationStep | null
}

export default function ArrayRenderer({ visualState, currentStepData }: ArrayRendererProps) {
  const { arrayData, colorMap, elementIds } = visualState
  const barRefs = useRef<Map<number, SVGGElement>>(new Map())
  const prevLayout = useRef<Map<number, BarLayout>>(new Map())
  const animFrameRef = useRef(0)

  const bars = useMemo((): BarLayout[] | null => {
    if (arrayData.length === 0) return null

    const maxVal = Math.max(...arrayData, 1)
    const barCount = arrayData.length
    const totalWidth = 90
    const gutter = 3
    const availWidth = totalWidth - gutter * (barCount + 1)
    const barWidth = Math.max(Math.min(availWidth / barCount, 20), 3)
    const maxBarHeight = 83

    return arrayData.map((value, index) => {
      const elementId = elementIds[index] ?? index
      const color = COLOR_MAP[colorMap.get(index) ?? 'primary'] ?? COLOR_MAP.primary
      const heightPct = Math.max((value / maxVal) * maxBarHeight, maxBarHeight * 0.05)
      const left = 5 + gutter + index * (barWidth + gutter)

      return { key: elementId, left, width: barWidth, y: 88 - heightPct, height: heightPct, color, value, index }
    })
  }, [arrayData, colorMap, elementIds])

  // Interpolation-based animation from prev to current layout
  useLayoutEffect(() => {
    if (!bars) return

    const prev = prevLayout.current
    const changed = bars.some((b) => {
      const p = prev.get(b.key)
      return p && (Math.abs(p.left - b.left) > 0.01 || Math.abs(p.height - b.height) > 0.1)
    })

    if (!changed && prev.size === bars.length) {
      // No position changes — just update ref
      for (const b of bars) prev.set(b.key, b)
      return
    }

    // Capture current target and previous state
    const targetLayout = new Map(bars.map((b) => [b.key, b] as const))
    const startLayout = new Map<number, BarLayout>()
    for (const b of bars) {
      const p = prev.get(b.key)
      startLayout.set(b.key, p ? { ...p } : { ...b })
    }
    // Store target for next comparison
    for (const b of bars) prev.set(b.key, b)

    // Cancel any running animation
    cancelAnimationFrame(animFrameRef.current)

    // Reset all bars to their start positions BEFORE first paint
    for (const [key, start] of startLayout) {
      const el = barRefs.current.get(key)
      if (!el) continue
      el.style.transform = `translateX(${start.left}%)`
      const barRect = el.firstElementChild as SVGRectElement | null
      if (barRect) {
        barRect.setAttribute('y', `${start.y}%`)
        barRect.setAttribute('height', `${start.height}%`)
      }
    }

    const duration = 750
    const startTime = performance.now()

    function easeOutBack(t: number): number {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }

    function frame(now: number) {
      const elapsed = now - startTime
      const rawT = Math.min(elapsed / duration, 1)
      const t = easeOutBack(rawT)
      const currentBars = bars
      if (!currentBars) return

      for (const target of currentBars) {
        const el = barRefs.current.get(target.key)
        if (!el) continue

        const start = startLayout.get(target.key)
        if (!start) continue

        // Interpolate position
        const curLeft = start.left + (target.left - start.left) * t
        el.style.transform = `translateX(${curLeft}%)`

        // Interpolate bar rect position and size
        const barRect = el.firstElementChild as SVGRectElement | null
        if (barRect) {
          const curY = start.y + (target.y - start.y) * t
          const curH = start.height + (target.height - start.height) * t
          barRect.setAttribute('y', `${curY}%`)
          barRect.setAttribute('height', `${curH}%`)
        }

        // Update value label for short bars
        const texts = el.querySelectorAll('text')
        texts.forEach((txt) => {
          if (txt.getAttribute('class') === 'index-label') return
          const curY = start.y + (target.y - start.y) * t
          const curH = start.height + (target.height - start.height) * t
          if (curH > 14) {
            txt.setAttribute('y', `${curY + curH / 2 + 0.5}%`)
            txt.setAttribute('fill', 'white')
            txt.setAttribute('dominant-baseline', 'central')
          } else {
            txt.setAttribute('y', `${curY - 1}%`)
            txt.setAttribute('fill', target.color)
            txt.removeAttribute('dominant-baseline')
          }
        })
      }

      if (rawT < 1) {
        animFrameRef.current = requestAnimationFrame(frame)
      }
    }

    animFrameRef.current = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [bars])

  // Set initial position for new bars (before animation)
  useEffect(() => {
    if (!bars) return
    for (const bar of bars) {
      const el = barRefs.current.get(bar.key)
      if (el && !prevLayout.current.has(bar.key)) {
        el.style.transform = `translateX(${bar.left}%)`
        prevLayout.current.set(bar.key, bar)
      }
    }
  })

  const setBarRef = (key: number) => (el: SVGGElement | null) => {
    if (el) barRefs.current.set(key, el)
    else barRefs.current.delete(key)
  }

  const action = currentStepData?.action
  const isComparing = action?.type === 'compare'
  const isSwapping = action?.type === 'swap'
  const targetIndices = action?.targets ?? []
  const hasPair = targetIndices.length >= 2

  if (!bars) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No data to visualize
      </div>
    )
  }

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id="barClip">
          <rect x="0" y="0" width="100" height="96" />
        </clipPath>
      </defs>

      <line x1="3" y1="88" x2="97" y2="88" stroke="var(--color-border)" strokeWidth="0.3" />

      <g clipPath="url(#barClip)" style={{ willChange: 'transform' }}>
        {bars.map((bar) => {
          const isTarget = targetIndices.includes(bar.index)
          const isCompareTarget = isComparing && isTarget
          const isSwapTarget = isSwapping && isTarget

          return (
            <g key={bar.key} ref={setBarRef(bar.key)}>
              <rect
                x="0%"
                y={`${bar.y}%`}
                width={`${bar.width}%`}
                height={`${bar.height}%`}
                rx="2"
                fill={bar.color}
                style={{ transition: 'fill 0.3s ease' }}
              />

              {isCompareTarget && (
                <rect
                  x={`${-0.5}%`}
                  y={`${bar.y - 1}%`}
                  width={`${bar.width + 1}%`}
                  height={`${bar.height + 2}%`}
                  rx="3"
                  fill="none"
                  stroke={bar.color}
                  strokeWidth="0.6"
                  opacity="0.8"
                  className="compare-glow"
                />
              )}

              {isSwapTarget && (
                <rect
                  x={`${-0.3}%`}
                  y={`${bar.y - 0.5}%`}
                  width={`${bar.width + 0.6}%`}
                  height={`${bar.height + 1}%`}
                  rx="3"
                  fill={bar.color}
                  fillOpacity="0.2"
                />
              )}

              <text
                className="val-label"
                x={`${bar.width / 2}%`}
                y={bar.height > 14 ? `${bar.y + bar.height / 2 + 0.5}%` : `${bar.y - 1}%`}
                textAnchor="middle"
                dominantBaseline={bar.height > 14 ? 'central' : undefined}
                fontSize={bar.width > 8 ? '3.3' : '2.6'}
                fontWeight="600"
                fill={bar.height > 14 ? 'white' : bar.color}
                fontFamily="var(--font-code)"
                style={{ transition: 'fill 0.3s ease' }}
              >
                {bar.value}
              </text>

              <text
                className="index-label"
                x={`${bar.width / 2}%`}
                y="93%"
                textAnchor="middle"
                fontSize="2.2"
                fill="var(--color-muted)"
                fontFamily="var(--font-code)"
              >
                {bar.index}
              </text>
            </g>
          )
        })}

        {hasPair && (isComparing || isSwapping) && (
          <text
            x={`${(bars[targetIndices[0]].left + bars[targetIndices[0]].width / 2 + bars[targetIndices[1]].left + bars[targetIndices[1]].width / 2) / 2}%`}
            y="3.5%"
            textAnchor="middle"
            fontSize="3.5"
            fontWeight="bold"
            fill="var(--color-warning)"
          >
            {isComparing ? 'vs' : '⇄'}
          </text>
        )}
      </g>

      {currentStepData && (
        <g>
          <rect x="2" y="95.5" width="96" height="4.5" rx="1.5" fill="var(--color-surface)" />
          <text x="50" y="98.5" textAnchor="middle" fontSize="1.8" fill="var(--color-muted)" fontFamily="var(--font-code)">
            <tspan fontWeight="600" fill="var(--color-warning)">比 {currentStepData.stats.comparisons}</tspan>
            <tspan dx="4" fill="var(--color-border)">|</tspan>
            <tspan dx="4" fontWeight="600" fill="var(--color-danger)">换 {currentStepData.stats.swaps}</tspan>
            <tspan dx="4" fill="var(--color-border)">|</tspan>
            <tspan dx="4">访 {currentStepData.stats.accesses}</tspan>
          </text>
        </g>
      )}

      <style>{`
        @keyframes pulse-glow {
          from { opacity: 0.8; }
          to { opacity: 0.15; }
        }
        .compare-glow {
          animation: pulse-glow 0.6s ease-in-out infinite alternate;
        }
      `}</style>
    </svg>
  )
}
