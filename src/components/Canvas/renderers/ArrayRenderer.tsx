import { useMemo } from 'react'
import { motion } from 'framer-motion'
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
    // Full width for bars area with gutter
    const totalWidth = 92
    const gutter = 2
    const availWidth = totalWidth - gutter * (barCount + 1)
    const barWidth = Math.max(availWidth / barCount, 3)
    // Bar area height (from ground at 88 to top at 5)
    const maxBarHeight = 83

    return arrayData.map((value, index) => {
      const elementId = elementIds[index] ?? index
      const color = COLOR_MAP[colorMap.get(index) ?? 'primary'] ?? COLOR_MAP.primary
      const heightPct = Math.max((value / maxVal) * maxBarHeight, 6)

      return {
        key: elementId,
        centerX: 4 + gutter + index * (barWidth + gutter) + barWidth / 2,
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

  if (!bars) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No data to visualize
      </div>
    )
  }

  // Find compared/swapped bars for indicator positioning
  const targetIndices = action?.targets ?? []
  const hasPair = targetIndices.length >= 2

  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background */}
      <defs>
        <clipPath id="barArea">
          <rect x="0" y="0" width="100" height="96" />
        </clipPath>
      </defs>

      {/* Ground line */}
      <line x1="3" y1="88" x2="97" y2="88" stroke="var(--color-border)" strokeWidth="0.3" />

      <g clipPath="url(#barArea)">
        {bars.map((bar) => {
          const isTarget = targetIndices.includes(bar.index)
          const isCompareTarget = isComparing && isTarget
          const isSwapTarget = isSwapping && isTarget

          return (
            <motion.g
              key={bar.key}
              layout
              transition={{
                layout: {
                  type: 'spring',
                  stiffness: 180,
                  damping: 22,
                  mass: 0.8,
                },
              }}
            >
              {/* Bar body */}
              <motion.rect
                x={`${bar.centerX - bar.width / 2}%`}
                y={`${bar.barTop}%`}
                width={`${bar.width}%`}
                height={`${bar.height}%`}
                rx="2"
                fill={bar.color}
                animate={{
                  scaleX: isCompareTarget ? 1.06 : isSwapTarget ? 1.02 : 1,
                  scaleY: isCompareTarget ? 1.03 : 1,
                }}
                transition={{
                  fill: { duration: 0.3, ease: 'easeInOut' },
                  scaleX: { duration: 0.35, ease: 'easeInOut', repeat: isCompareTarget ? 1 : 0, repeatType: 'reverse' },
                  scaleY: { duration: 0.35, ease: 'easeInOut', repeat: isCompareTarget ? 1 : 0, repeatType: 'reverse' },
                }}
                style={{ transformOrigin: 'center' }}
              />

              {/* Compare pulse ring */}
              {isCompareTarget && (
                <motion.rect
                  x={`${bar.centerX - bar.width / 2 - 0.3}%`}
                  y={`${bar.barTop - 0.3}%`}
                  width={`${bar.width + 0.6}%`}
                  height={`${bar.height + 0.6}%`}
                  rx="2.5"
                  fill="none"
                  stroke={bar.color}
                  strokeWidth="0.5"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0.1 }}
                  transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse' }}
                />
              )}

              {/* Swap glow */}
              {isSwapTarget && (
                <motion.rect
                  x={`${bar.centerX - bar.width / 2 - 0.5}%`}
                  y={`${bar.barTop - 0.5}%`}
                  width={`${bar.width + 1}%`}
                  height={`${bar.height + 1}%`}
                  rx="3"
                  fill={bar.color}
                  fillOpacity="0.25"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ duration: 0.5 }}
                />
              )}

              {/* Value label - inside bar if tall, above if short */}
              {bar.height > 12 ? (
                <motion.text
                  x={`${bar.centerX}%`}
                  y={`${bar.barTop + bar.height / 2 + 0.5}%`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={bar.width > 8 ? '3.5' : '2.8'}
                  fontWeight="600"
                  fill="white"
                  fontFamily="var(--font-code)"
                  animate={{ opacity: isCompareTarget ? 0.7 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {bar.value}
                </motion.text>
              ) : (
                <motion.text
                  x={`${bar.centerX}%`}
                  y={`${bar.barTop - 1.2}%`}
                  textAnchor="middle"
                  fontSize={bar.width > 8 ? '3.2' : '2.6'}
                  fontWeight="600"
                  fill={bar.color}
                  fontFamily="var(--font-code)"
                  animate={{ opacity: isCompareTarget ? 0.7 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {bar.value}
                </motion.text>
              )}

              {/* Index label */}
              <text
                x={`${bar.centerX}%`}
                y="93%"
                textAnchor="middle"
                fontSize="2.2"
                fill="var(--color-muted)"
                fontFamily="var(--font-code)"
              >
                {bar.index}
              </text>
            </motion.g>
          )
        })}

        {/* Pair indicator — shown between two compared/swapped bars */}
        {hasPair && (isComparing || isSwapping) && (
          <motion.text
            x={`${(bars[targetIndices[0]].centerX + bars[targetIndices[1]].centerX) / 2}%`}
            y="4%"
            textAnchor="middle"
            fontSize="3.5"
            fontWeight="bold"
            fill="var(--color-warning)"
            initial={{ opacity: 0, y: '10%' }}
            animate={{ opacity: 1, y: '4%' }}
            transition={{ duration: 0.3 }}
          >
            {isComparing ? 'vs' : '⇄'}
          </motion.text>
        )}
      </g>

      {/* Stats bar at bottom */}
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

      {/* Sorted celebration */}
      {isMarking && (action?.targets.length ?? 0) >= arrayData.length - 1 && (
        <motion.text
          x="50"
          y="50"
          textAnchor="middle"
          fontSize="4.5"
          fontWeight="700"
          fill="var(--color-success)"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0.9], scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        >
          ✓
        </motion.text>
      )}
    </svg>
  )
}
