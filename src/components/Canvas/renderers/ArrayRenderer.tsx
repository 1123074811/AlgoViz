import { useMemo } from 'react'
import type { VisualState } from '@/hooks/useAnimationEngine'
import type { AnimationStep } from '@/types/animation'

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

interface ArrayRendererProps {
  visualState: VisualState
  currentStepData: AnimationStep | null
}

export default function ArrayRenderer({ visualState, currentStepData }: ArrayRendererProps) {
  const { arrayData, colorMap, elementIds } = visualState

  const bars = useMemo(() => {
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
      const centerX = 5 + gutter + index * (barWidth + gutter) + barWidth / 2
      const fromX = centerX

      return {
        key: elementId,
        centerX,
        fromX,
        width: barWidth,
        height: heightPct,
        barTop: 88 - heightPct,
        color,
        value,
        index,
      }
    })
  }, [arrayData, colorMap, elementIds])

  const action = currentStepData?.action
  const isComparing = action?.type === 'compare'
  const isSwapping = action?.type === 'swap'
  const isMarking = action?.type === 'mark'
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

      {/* Ground line */}
      <line x1="3" y1="88" x2="97" y2="88" stroke="var(--color-border)" strokeWidth="0.3" />

      <g clipPath="url(#barClip)">
        {bars.map((bar) => {
          const isTarget = targetIndices.includes(bar.index)
          const isCompareTarget = isComparing && isTarget
          const isSwapTarget = isSwapping && isTarget
          const left = bar.centerX - bar.width / 2

          return (
            <g
              key={bar.key}
              style={{
                transform: `translateX(${left}%)`,
                transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {/* Bar body */}
              <rect
                x="0%"
                y={`${bar.barTop}%`}
                width={`${bar.width}%`}
                height={`${bar.height}%`}
                rx="2"
                fill={bar.color}
                style={{
                  transition: `fill 0.3s ease, y 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                }}
              />

              {/* Compare glow */}
              {isCompareTarget && (
                <rect
                  x={`${-0.5}%`}
                  y={`${bar.barTop - 1}%`}
                  width={`${bar.width + 1}%`}
                  height={`${bar.height + 2}%`}
                  rx="3"
                  fill="none"
                  stroke={bar.color}
                  strokeWidth="0.6"
                  opacity="0.7"
                  style={{
                    animation: 'pulse-glow 0.8s ease-in-out infinite alternate',
                  }}
                />
              )}

              {/* Swap highlight */}
              {isSwapTarget && (
                <rect
                  x={`${-0.3}%`}
                  y={`${bar.barTop - 0.5}%`}
                  width={`${bar.width + 0.6}%`}
                  height={`${bar.height + 1}%`}
                  rx="3"
                  fill={bar.color}
                  fillOpacity="0.15"
                />
              )}

              {/* Value label */}
              {bar.height > 12 ? (
                <text
                  x={`${bar.width / 2}%`}
                  y={`${bar.barTop + bar.height / 2 + 0.5}%`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={bar.width > 8 ? '3.3' : '2.6'}
                  fontWeight="600"
                  fill="white"
                  fontFamily="var(--font-code)"
                  style={{ transition: 'fill 0.3s ease' }}
                >
                  {bar.value}
                </text>
              ) : (
                <text
                  x={`${bar.width / 2}%`}
                  y={`${bar.barTop - 1}%`}
                  textAnchor="middle"
                  fontSize={bar.width > 8 ? '3' : '2.4'}
                  fontWeight="600"
                  fill={bar.color}
                  fontFamily="var(--font-code)"
                  style={{ transition: 'fill 0.3s ease' }}
                >
                  {bar.value}
                </text>
              )}

              {/* Index label */}
              <text
                x={`${bar.width / 2}%`}
                y="93%"
                textAnchor="middle"
                fontSize="2.2"
                fill="var(--color-muted)"
                fontFamily="var(--font-code)"
                style={{ transition: 'opacity 0.3s ease' }}
              >
                {bar.index}
              </text>
            </g>
          )
        })}

        {/* Pair indicator between bars */}
        {hasPair && (isComparing || isSwapping) && (
          <text
            x={`${(bars[targetIndices[0]].centerX + bars[targetIndices[1]].centerX) / 2}%`}
            y="3.5%"
            textAnchor="middle"
            fontSize="3.5"
            fontWeight="bold"
            fill="var(--color-warning)"
            style={{ transition: 'opacity 0.3s ease' }}
          >
            {isComparing ? 'vs' : '⇄'}
          </text>
        )}
      </g>

      {/* Stats bar */}
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
    </svg>
  )
}
