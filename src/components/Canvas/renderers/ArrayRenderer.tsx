import { useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import type { VisualState } from '@/hooks/useAnimationEngine'
import type { AnimationStep, VisualRole, ActionColor } from '@/types/animation'

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

const ROLE_COLORS: Record<VisualRole, ActionColor> = {
  current: 'warning', compare: 'warning', swap: 'danger', sorted: 'success',
  unsorted: 'muted', pivot: 'primary', min: 'danger', key: 'primary',
  visited: 'success', queued: 'primary', stacked: 'primary', relaxed: 'success',
  candidate: 'warning', selected: 'success', discarded: 'muted', path: 'primary',
  root: 'primary', parent: 'warning', child: 'primary', rotating: 'danger',
  balanced: 'success', conflict: 'danger',
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
  const { arrayData, colorMap, elementIds, teachingState } = visualState
  const barRefs = useRef<Map<number, SVGGElement>>(new Map())
  const prevLayout = useRef<Map<number, BarLayout>>(new Map())
  const animFrameRef = useRef(0)

  const hasVars = !!(teachingState?.variables && Object.keys(teachingState.variables).length > 0)
  const hasRanges = !!(teachingState?.ranges && teachingState.ranges.length > 0)
  const hasAux = !!(teachingState?.auxiliaryArrays && teachingState.auxiliaryArrays.length > 0)
  const auxCount = teachingState?.auxiliaryArrays?.length ?? 0
  // Reserve space: top=variables(6), bottom=ranges(5)+aux(3*count)+stats(3)
  const topReserve = hasVars ? 6 : 1
  const bottomReserve = (hasRanges ? 5 : 0) + (hasAux ? 3 * auxCount : 0) + 4
  const barArea = 100 - topReserve - bottomReserve
  const baseline = 100 - bottomReserve

  const bars = useMemo((): BarLayout[] | null => {
    if (arrayData.length === 0) return null

    const maxVal = Math.max(...arrayData, 1)
    const barCount = arrayData.length
    const totalWidth = 90
    const gutter = Math.max(1, 3 - Math.max(0, barCount - 12) * 0.2) // tighter gutter for many bars
    const availWidth = totalWidth - gutter * (barCount + 1)
    const barWidth = Math.max(Math.min(availWidth / barCount, 20), 1.5)
    const maxBarHeight = Math.max(barArea * 0.85, 10)

    return arrayData.map((value, index) => {
      const elementId = elementIds[index] ?? index
      const color = COLOR_MAP[colorMap.get(index) ?? 'primary'] ?? COLOR_MAP.primary
      const heightPct = Math.max((value / maxVal) * maxBarHeight, maxBarHeight * 0.04)
      const left = 5 + gutter + index * (barWidth + gutter)

      return { key: elementId, left, width: barWidth, y: baseline - heightPct, height: heightPct, color, value, index }
    })
  }, [arrayData, colorMap, elementIds, barArea, baseline])

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

  const shouldUseGrid = arrayData.length > 28 || bars.some((bar) => bar.width < 3)
  if (shouldUseGrid) {
    const columns = Math.min(18, Math.max(8, Math.ceil(Math.sqrt(arrayData.length * 2))))
    const rows = Math.ceil(arrayData.length / columns)
    const cellGap = 1
    const cellW = (92 - (columns - 1) * cellGap) / columns
    const cellH = Math.min(9, Math.max(5.5, (78 - (rows - 1) * cellGap) / rows))
    const startX = 4
    const startY = 8
    const targetCells = targetIndices
      .map((index) => {
        const row = Math.floor(index / columns)
        const col = index % columns
        return { index, x: startX + col * (cellW + cellGap), y: startY + row * (cellH + cellGap) }
      })

    return (
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrayLaneArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--color-danger)" />
          </marker>
          <marker id="arrayCompareArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--color-warning)" />
          </marker>
        </defs>

        <rect x="2" y="3" width="96" height="91" rx="3" fill="rgba(255,255,255,0.88)" stroke="var(--color-border)" strokeWidth="0.3" />
        <text x="5" y="6.5" fontSize="2.2" fontWeight="700" fill="var(--color-primary)">数组分行演示</text>
        <text x="95" y="6.5" textAnchor="end" fontSize="1.9" fill="var(--color-muted)" fontFamily="var(--font-code)">{arrayData.length} items</text>

        {arrayData.map((value, index) => {
          const row = Math.floor(index / columns)
          const col = index % columns
          const x = startX + col * (cellW + cellGap)
          const y = startY + row * (cellH + cellGap)
          const colorKey = colorMap.get(index) ?? (targetIndices.includes(index) ? currentStepData?.action.color : 'primary') ?? 'primary'
          const color = COLOR_MAP[colorKey] ?? COLOR_MAP.primary
          const isTarget = targetIndices.includes(index)
          const isSorted = colorKey === 'success'
          return (
            <g key={`${elementIds[index] ?? index}-${index}`} className={isTarget ? 'array-lane-pulse' : undefined}>
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                rx="1.2"
                fill={isTarget ? `${color}22` : isSorted ? 'rgba(16,185,129,0.14)' : 'white'}
                stroke={isTarget ? color : isSorted ? COLOR_MAP.success : 'var(--color-border)'}
                strokeWidth={isTarget ? 0.65 : 0.35}
              />
              <text x={x + cellW / 2} y={y + cellH / 2 + 0.8} textAnchor="middle" fontSize={cellW > 5 ? '2.8' : '2.1'} fontWeight="700" fill={isTarget ? color : 'var(--color-text)'} fontFamily="var(--font-code)">
                {String(value).slice(0, cellW > 5 ? 4 : 2)}
              </text>
              <text x={x + cellW / 2} y={y + cellH - 0.8} textAnchor="middle" fontSize="1.2" fill="var(--color-muted)" fontFamily="var(--font-code)">
                {visualState.labels?.[index] ?? index}
              </text>
            </g>
          )
        })}

        {hasPair && targetCells[0] && targetCells[1] && (
          <g>
            <path
              d={`M ${targetCells[0].x + cellW / 2} ${targetCells[0].y + cellH + 1.5} C ${targetCells[0].x + cellW / 2} ${targetCells[0].y + cellH + 5}, ${targetCells[1].x + cellW / 2} ${targetCells[1].y + cellH + 5}, ${targetCells[1].x + cellW / 2} ${targetCells[1].y + cellH + 1.5}`}
              fill="none"
              stroke={isSwapping ? 'var(--color-danger)' : 'var(--color-warning)'}
              strokeWidth="0.55"
              strokeDasharray={isComparing ? '1.5 1.2' : undefined}
              markerEnd={isSwapping ? 'url(#arrayLaneArrow)' : 'url(#arrayCompareArrow)'}
              className="array-flow"
            />
            <text
              x={(targetCells[0].x + targetCells[1].x + cellW) / 2}
              y={Math.min(targetCells[0].y, targetCells[1].y) - 1}
              textAnchor="middle"
              fontSize="2.4"
              fontWeight="800"
              fill={isSwapping ? 'var(--color-danger)' : 'var(--color-warning)'}
            >
              {isSwapping ? '交换' : '比较'}
            </text>
          </g>
        )}

        {currentStepData && (
          <g>
            <rect x="18" y="95" width="64" height="3.2" rx="1.2" fill="rgba(255,255,255,0.8)" stroke="var(--color-border)" strokeWidth="0.25" />
            <text x="50" y="97.3" textAnchor="middle" fontSize="1.7" fill="var(--color-muted)" fontFamily="var(--font-code)">
              <tspan fill="var(--color-warning)" fontWeight="700">比{currentStepData.stats.comparisons}</tspan>
              <tspan dx="3">|</tspan>
              <tspan dx="3" fill="var(--color-danger)" fontWeight="700">换{currentStepData.stats.swaps}</tspan>
              <tspan dx="3">| 访{currentStepData.stats.accesses}</tspan>
            </text>
          </g>
        )}

        <style>{`
          .array-lane-pulse {
            animation: array-lane-pop 0.65s ease-in-out infinite alternate;
          }
          .array-flow {
            animation: array-flow-dash 0.7s linear infinite;
          }
          @keyframes array-lane-pop {
            from { opacity: 1; }
            to { opacity: 0.72; }
          }
          @keyframes array-flow-dash {
            to { stroke-dashoffset: -8; }
          }
        `}</style>
      </svg>
    )
  }

  const rangeY = baseline + 0.3
  const auxStartY = rangeY + (hasRanges ? 3 : 0)
  const statsY = baseline + (hasRanges ? 3 : 0) + auxCount * 3.2
  const noWrap = hasVars || hasRanges || hasAux || (currentStepData !== null)

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id="barClip">
          <rect x="0" y={topReserve} width="100" height={barArea} />
        </clipPath>
      </defs>

      {/* Baseline */}
      <line x1="3" y1={baseline} x2="97" y2={baseline} stroke="var(--color-border)" strokeWidth="0.25" />

      {/* Variables bar */}
      {hasVars && (
        <g>
          <rect x="2" y="0.5" width="96" height="4" rx="1" fill="var(--color-surface)" />
          {Object.entries(teachingState!.variables!).slice(0, 5).map(([name, val], i) => (
            <text key={name} x={5 + i * 19} y="3.5" fontSize="2.1" fontFamily="var(--font-code)" fill="var(--color-muted)">
              <tspan fontWeight="600" fill="var(--color-primary)">{name}</tspan>
              <tspan dx="0.8">={String(val)}</tspan>
            </text>
          ))}
        </g>
      )}

      <g clipPath={noWrap ? 'url(#barClip)' : undefined} style={{ willChange: 'transform' }}>
        {bars.map((bar) => {
          const isTarget = targetIndices.includes(bar.index)
          const isCompareTarget = isComparing && isTarget
          const isSwapTarget = isSwapping && isTarget

          const nodeRole = teachingState?.tree?.nodeStates?.find(n => n.id === bar.index)
            ?? teachingState?.graph?.nodeStates?.find(n => n.id === String(bar.index))
          const roleColor = nodeRole ? COLOR_MAP[ROLE_COLORS[nodeRole.role]] ?? COLOR_MAP.primary : undefined
          const roleLabel = nodeRole ? nodeRole.role.toUpperCase().slice(0, 4) : undefined

          return (
            <g key={bar.key} ref={setBarRef(bar.key)}>
              <rect
                x="0%"
                y={`${bar.y}%`}
                width={`${bar.width}%`}
                height={`${bar.height}%`}
                rx={Math.min(1.5, bar.width * 0.3)}
                fill={bar.color}
                style={{ transition: 'fill 0.3s ease' }}
              />

              {isCompareTarget && bar.width > 3 && (
                <rect
                  x={`${-0.5}%`}
                  y={`${bar.y - 1}%`}
                  width={`${bar.width + 1}%`}
                  height={`${bar.height + 2}%`}
                  rx="2"
                  fill="none"
                  stroke={bar.color}
                  strokeWidth="0.5"
                  opacity="0.7"
                  className="compare-glow"
                />
              )}

              {isSwapTarget && bar.width > 3 && (
                <rect
                  x={`${-0.3}%`}
                  y={`${bar.y - 0.5}%`}
                  width={`${bar.width + 0.6}%`}
                  height={`${bar.height + 1}%`}
                  rx="2"
                  fill={bar.color}
                  fillOpacity="0.15"
                />
              )}

              {/* Role badge — only on bars wide enough and tall enough */}
              {roleColor && roleLabel && bar.width > 6 && bar.height > 10 && (
                <g>
                  <rect
                    x={`${-1}%`}
                    y={`${bar.y - 4}%`}
                    width={`${bar.width + 2}%`}
                    height="3"
                    rx="0.6"
                    fill={roleColor}
                    opacity="0.12"
                  />
                  <text
                    x={`${bar.width / 2}%`}
                    y={`${bar.y - 2}%`}
                    textAnchor="middle"
                    fontSize="1.6"
                    fontWeight="700"
                    fill={roleColor}
                    fontFamily="var(--font-code)"
                  >
                    {roleLabel}
                  </text>
                </g>
              )}

              <text
                className="val-label"
                x={`${bar.width / 2}%`}
                y={bar.height > 12 ? `${bar.y + bar.height / 2 + 0.4}%` : `${bar.y - 0.8}%`}
                textAnchor="middle"
                dominantBaseline={bar.height > 12 ? 'central' : undefined}
                fontSize={bar.width > 10 ? '3.2' : bar.width > 5 ? '2.4' : '1.8'}
                fontWeight="600"
                fill={bar.height > 12 ? 'white' : bar.color}
                fontFamily="var(--font-code)"
                style={{ transition: 'fill 0.3s ease' }}
              >
                {bar.width > 7 ? bar.value : (bar.width > 3 ? String(bar.value)[0] : '')}
              </text>

              {/* Index label below baseline */}
              <text
                className="index-label"
                x={`${bar.width / 2}%`}
                y={`${baseline + 1.5}%`}
                textAnchor="middle"
                fontSize={bar.width > 5 ? '2' : '1.5'}
                fill="var(--color-muted)"
                fontFamily="var(--font-code)"
              >
                {visualState.labels?.[bar.index] ?? bar.index}
              </text>
            </g>
          )
        })}

        {hasPair && (isComparing || isSwapping) && bars[targetIndices[0]] && bars[targetIndices[1]] && (
          <text
            x={`${(bars[targetIndices[0]].left + bars[targetIndices[0]].width / 2 + bars[targetIndices[1]].left + bars[targetIndices[1]].width / 2) / 2}%`}
            y={`${topReserve + 2}%`}
            textAnchor="middle"
            fontSize="3"
            fontWeight="bold"
            fill="var(--color-warning)"
          >
            {isComparing ? 'vs' : '⇄'}
          </text>
        )}
      </g>

      {/* Range indicators */}
      {hasRanges && (
        <g>
          {teachingState!.ranges!.slice(0, 2).map((r, ri) => {
            if (r.start >= arrayData.length || r.end < r.start) return null
            const startBar = bars[r.start]
            const endBar = bars[Math.min(r.end - 1, arrayData.length - 1)]
            if (!startBar || !endBar) return null
            const left = startBar.left
            const right = endBar.left + endBar.width
            const rc = COLOR_MAP[r.color ?? 'muted'] ?? COLOR_MAP.muted
            const yOff = ri * 1.5
            return (
              <g key={r.id}>
                <rect x={`${left}%`} y={`${rangeY + yOff}%`} width={`${right - left}%`} height="1.2" rx="0.4" fill={rc} opacity="0.25" />
                <text x={`${(left + right) / 2}%`} y={`${rangeY + yOff + 1}%`} textAnchor="middle" fontSize="1.3" fill={rc} fontFamily="var(--font-code)" opacity="0.8">
                  {r.label}
                </text>
              </g>
            )
          }).filter(Boolean)}
        </g>
      )}

      {/* Auxiliary arrays */}
      {hasAux && (
        <g>
          {teachingState!.auxiliaryArrays!.slice(0, 3).map((aux, ai) => {
            const ay = auxStartY + ai * 3.2
            const cellW = Math.min(4, 70 / Math.max(aux.data.length, 1))
            const maxCells = Math.min(aux.data.length, 18)
            const showData = aux.data.slice(0, maxCells)
            return (
              <g key={aux.id}>
                <text x="2.5" y={ay + 1} fontSize="1.4" fill="var(--color-muted)" fontFamily="var(--font-code)">{aux.label}</text>
                {showData.map((val, vi) => {
                  const cx = 9 + vi * (cellW + 0.4)
                  const isActive = aux.activeIndices?.includes(vi)
                  const cellColor = aux.colorMap?.[vi] ? COLOR_MAP[aux.colorMap[vi]] ?? COLOR_MAP.primary : undefined
                  return (
                    <g key={vi}>
                      <rect x={cx} y={ay + 0.2} width={cellW} height="2.2" rx="0.4"
                        fill={cellColor ?? (isActive ? COLOR_MAP.warning : 'var(--color-surface)')}
                        stroke={isActive ? COLOR_MAP.warning : 'var(--color-border)'} strokeWidth="0.2"
                        opacity={cellColor ? 1 : 0.7} />
                      <text x={cx + cellW / 2} y={ay + 1.5} textAnchor="middle" fontSize="1.2" fill="var(--color-muted)" fontFamily="var(--font-code)">{String(val).slice(0, 3)}</text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </g>
      )}

      {/* Stats bar */}
      {currentStepData && (
        <g>
          <rect x="2" y={statsY} width="96" height={100 - statsY} rx="1.2" fill="var(--color-surface)" />
          <text x="50" y={statsY + 1.8} textAnchor="middle" fontSize="1.7" fill="var(--color-muted)" fontFamily="var(--font-code)">
            <tspan fontWeight="600" fill="var(--color-warning)">比{currentStepData.stats.comparisons}</tspan>
            <tspan dx="3" fill="var(--color-border)">|</tspan>
            <tspan dx="3" fontWeight="600" fill="var(--color-danger)">换{currentStepData.stats.swaps}</tspan>
            <tspan dx="3" fill="var(--color-border)">|</tspan>
            <tspan dx="3">访{currentStepData.stats.accesses}</tspan>
          </text>
        </g>
      )}

      <style>{`
        @keyframes pulse-glow {
          from { opacity: 0.7; }
          to { opacity: 0.1; }
        }
        .compare-glow {
          animation: pulse-glow 0.6s ease-in-out infinite alternate;
        }
      `}</style>
    </svg>
  )
}
