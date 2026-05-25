import { useMemo } from 'react'
import type { VisualState } from '@/hooks/useAnimationEngine'

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

interface ArrayRendererProps {
  visualState: VisualState
}

export default function ArrayRenderer({ visualState }: ArrayRendererProps) {
  const { arrayData, colorMap } = visualState

  const bars = useMemo(() => {
    if (arrayData.length === 0) return null

    const maxVal = Math.max(...arrayData, 1)
    const barCount = arrayData.length

    return arrayData.map((value, index) => {
      const heightPct = (value / maxVal) * 100
      const color = COLOR_MAP[colorMap.get(index) ?? 'primary'] ?? COLOR_MAP.primary

      return {
        x: (index / barCount) * 100,
        width: 90 / barCount,
        height: Math.max(heightPct, 4),
        color,
        value,
        index,
      }
    })
  }, [arrayData, colorMap])

  if (!bars) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No data to visualize
      </div>
    )
  }

  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      <line x1="0" y1="85" x2="100" y2="85" stroke="var(--color-border)" strokeWidth="0.2" />
      <line x1="0" y1="42.5" x2="100" y2="42.5" stroke="var(--color-border)" strokeWidth="0.1" strokeDasharray="2,2" />

      {bars.map((bar) => (
        <g key={bar.index}>
          {/* Bar */}
          <rect
            x={`${bar.x + (100 / arrayData.length - bar.width) / 2}%`}
            y={`${85 - bar.height}%`}
            width={`${bar.width}%`}
            height={`${bar.height}%`}
            rx="1.5"
            fill={bar.color}
            style={{
              transition: 'fill 300ms ease, y 400ms cubic-bezier(0.34, 1.56, 0.64, 1), height 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
          {/* Value label */}
          <text
            x={`${bar.x + bar.width / 2}%`}
            y={`${85 - bar.height - 1.5}%`}
            textAnchor="middle"
            fontSize="3.5"
            fontWeight="600"
            fill={bar.color}
            fontFamily="var(--font-code)"
            style={{ transition: 'fill 300ms ease' }}
          >
            {bar.value}
          </text>
          {/* Index label */}
          <text
            x={`${bar.x + bar.width / 2}%`}
            y="92%"
            textAnchor="middle"
            fontSize="2.5"
            fill="var(--color-muted)"
            fontFamily="var(--font-code)"
          >
            {bar.index}
          </text>
        </g>
      ))}
    </svg>
  )
}
