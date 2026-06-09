import type { AnimationScript } from '@/types/animation'

export function usesSceneEngine(script: AnimationScript | null | undefined): boolean {
  return !!script && (script.presentation?.engine === 'scene' || script.steps.some((step) => !!step.events?.length))
}

export function getSceneEventStats(script: AnimationScript | null | undefined) {
  if (!script) return { eventSteps: 0, totalEvents: 0 }
  return script.steps.reduce(
    (stats, step) => {
      const count = step.events?.length ?? 0
      return {
        eventSteps: stats.eventSteps + (count > 0 ? 1 : 0),
        totalEvents: stats.totalEvents + count,
      }
    },
    { eventSteps: 0, totalEvents: 0 },
  )
}

/**
 * Compute adaptive radius and font size for circular scene nodes (trees and graphs)
 * to maintain a perfect aesthetic proportion between text and node size.
 */
export function getAdaptiveCircleLayout(value: string, _defaultDiameter: number = 48): { r: number; fontSize: number } {
  const valLen = value.length
  
  if (valLen === 0) {
    return { r: 18, fontSize: 14 }
  }
  if (valLen === 1) {
    return { r: 18, fontSize: 16 } // Nice large font for single digit/char
  }
  if (valLen === 2) {
    return { r: 20, fontSize: 15 } // 40px diameter, 15px text fits perfectly
  }
  if (valLen === 3) {
    return { r: 23, fontSize: 13 } // 46px diameter, 13px text
  }
  // For 4 or more characters, expand radius and scale down font size
  const r = Math.max(24, 23 + (valLen - 3) * 3)
  const fontSize = Math.max(10, 13 - (valLen - 3) * 0.8)
  return { r, fontSize }
}
