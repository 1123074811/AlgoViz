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
