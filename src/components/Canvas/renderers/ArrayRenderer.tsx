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

    return arrayData.map((value, index) => {
      const heightPct = (value / maxVal) * 100
      const elementId = elementIds[index] ?? index
      const color = COLOR_MAP[colorMap.get(index) ?? 'primary'] ?? COLOR_MAP.primary

      return {
        key: elementId,
        x: (index / barCount) * 100,
        width: 90 / barCount,
        height: Math.max(heightPct, 4),
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

  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      <line x1="0" y1="85" x2="100" y2="85" stroke="var(--color-border)" strokeWidth="0.2" />
      <line x1="0" y1="42.5" x2="100" y2="42.5" stroke="var(--color-border)" strokeWidth="0.1" strokeDasharray="2,2" />

      {bars.map((bar) => {
        const barX = bar.x + (100 / arrayData.length - bar.width) / 2
        const barY = 85 - bar.height
        const isTarget = action?.targets.includes(bar.index)
        const isCompareTarget = isComparing && isTarget

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
            {/* Shadow for depth */}
            <motion.rect
              x={`${barX}%`}
              y={`${barY}%`}
              width={`${bar.width}%`}
              height={`${bar.height}%`}
              rx="1.5"
              fill="rgba(0,0,0,0.08)"
              animate={{
                y: `${barY + 0.5}%`,
                opacity: isCompareTarget ? 0.6 : 0.3,
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Main bar */}
            <motion.rect
              x={`${barX}%`}
              y={`${barY}%`}
              width={`${bar.width}%`}
              height={`${bar.height}%`}
              rx="1.5"
              fill={bar.color}
              animate={{
                scaleX: isCompareTarget ? 1.08 : 1,
                scaleY: isCompareTarget ? 1.04 : 1,
              }}
              transition={{
                fill: { duration: 0.3, ease: 'easeInOut' },
                scaleX: { duration: 0.4, ease: 'easeInOut', repeat: isCompareTarget ? 1 : 0, repeatType: 'reverse' },
                scaleY: { duration: 0.4, ease: 'easeInOut', repeat: isCompareTarget ? 1 : 0, repeatType: 'reverse' },
              }}
            />

            {/* Compare glow effect */}
            {isCompareTarget && (
              <motion.rect
                x={`${barX - 0.5}%`}
                y={`${barY - 0.5}%`}
                width={`${bar.width + 1}%`}
                height={`${bar.height + 1}%`}
                rx="2"
                fill="none"
                stroke={bar.color}
                strokeWidth="0.4"
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
              />
            )}

            {/* Value label */}
            <motion.text
              x={`${barX + bar.width / 2}%`}
              y={`${barY - 1.5}%`}
              textAnchor="middle"
              fontSize="3.5"
              fontWeight="600"
              fill={bar.color}
              fontFamily="var(--font-code)"
              animate={{
                fill: bar.color,
                scale: isCompareTarget ? 1.15 : 1,
                y: isCompareTarget ? `${barY - 3}%` : `${barY - 1.5}%`,
              }}
              transition={{ duration: 0.3 }}
              style={{ transformOrigin: 'center' }}
            >
              {bar.value}
            </motion.text>

            {/* Index label */}
            <motion.text
              x={`${barX + bar.width / 2}%`}
              y="92%"
              textAnchor="middle"
              fontSize="2.5"
              fill="var(--color-muted)"
              fontFamily="var(--font-code)"
              animate={{ opacity: isCompareTarget ? 0.5 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {bar.index}
            </motion.text>

            {/* Action indicator - arrow for compare/swap */}
            {isTarget && (isComparing || isSwapping) && (
              <motion.text
                x={`${barX + bar.width / 2}%`}
                y={`${barY - 4}%`}
                textAnchor="middle"
                fontSize="3"
                fontWeight="bold"
                fill={bar.color}
                initial={{ opacity: 0, y: `${barY - 1}%` }}
                animate={{ opacity: 1, y: `${barY - 4}%` }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isComparing ? '?' : '↔'}
              </motion.text>
            )}
          </motion.g>
        )
      })}

      {/* Text annotation overlay */}
      {currentStepData && (
        <motion.g
          key={`annotation-${currentStepData.stepId}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {/* Background pill */}
          <rect
            x="15"
            y="2"
            width="70"
            height="7"
            rx="3.5"
            fill="rgba(30, 41, 59, 0.85)"
          />
          {/* Annotation text */}
          <text
            x="50"
            y="5.5"
            textAnchor="middle"
            fontSize="2.3"
            fontWeight="500"
            fill="white"
            fontFamily="var(--font-body)"
          >
            {currentStepData.description.zh.length > 40
              ? currentStepData.description.zh.slice(0, 38) + '…'
              : currentStepData.description.zh}
          </text>
        </motion.g>
      )}

      {/* Stats bar at bottom */}
      {currentStepData && (
        <motion.g
          key={`stats-${currentStepData.stepId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <rect x="0" y="94" width="100" height="6" fill="var(--color-surface)" rx="0" />
          <text x="3" y="97.5" fontSize="1.8" fill="var(--color-muted)" fontFamily="var(--font-code)">
            <tspan fontWeight="600" fill="var(--color-warning)">比{currentStepData.stats.comparisons}</tspan>
            <tspan dx="3">|</tspan>
            <tspan dx="3" fontWeight="600" fill="var(--color-danger)">换{currentStepData.stats.swaps}</tspan>
            <tspan dx="3">|</tspan>
            <tspan dx="3">访{currentStepData.stats.accesses}</tspan>
          </text>
        </motion.g>
      )}

      {/* Sorted celebration */}
      {isMarking && action.targets.length >= arrayData.length - 1 && (
        <motion.text
          x="50"
          y="50"
          textAnchor="middle"
          fontSize="5"
          fontWeight="700"
          fill="var(--color-success)"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
        >
          ✓ Sorted
        </motion.text>
      )}
    </svg>
  )
}
