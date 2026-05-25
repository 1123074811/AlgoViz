import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { AnimationScript, ActionColor } from '@/types/animation'

export interface VisualState {
  arrayData: number[]
  colorMap: Map<number, ActionColor>
  currentStep: number
  totalSteps: number
}

export function useAnimationEngine(script: AnimationScript | null) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = script?.steps.length ?? 0

  // Replay all steps up to currentStep to derive array state and persistent colors
  const visualState = useMemo<VisualState>(() => {
    if (!script) {
      return { arrayData: [], colorMap: new Map(), currentStep: 0, totalSteps: 0 }
    }

    let arr = [...script.initialState.data]
    const persistentMarked = new Map<number, ActionColor>()

    for (let i = 0; i < currentStep; i++) {
      const step = script.steps[i]
      if (step.action.type === 'swap') {
        const [a, b] = step.action.targets
        ;[arr[a], arr[b]] = [arr[b], arr[a]]
      }
      if (step.action.type === 'mark') {
        for (const t of step.action.targets) {
          persistentMarked.set(t, step.action.color)
        }
      }
    }

    // Current step action overrides colors on its targets
    if (currentStep > 0 && currentStep <= script.steps.length) {
      const currentAction = script.steps[currentStep - 1].action
      for (const t of currentAction.targets) {
        persistentMarked.set(t, currentAction.color)
      }
    }

    return {
      arrayData: arr,
      colorMap: persistentMarked,
      currentStep,
      totalSteps,
    }
  }, [script, currentStep])

  // Current step details
  const currentStepData = script?.steps[currentStep - 1] ?? null

  // Clear interval helper
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Auto-play
  useEffect(() => {
    if (!isPlaying || !script) {
      clearTimer()
      return
    }

    const ms = 1000 / speed
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= script.steps.length) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, ms)

    return clearTimer
  }, [isPlaying, speed, script, clearTimer])

  // Stop playing when reaching the end
  useEffect(() => {
    if (currentStep >= totalSteps && totalSteps > 0) {
      setIsPlaying(false)
    }
  }, [currentStep, totalSteps])

  const stepForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }, [totalSteps])

  const stepBackward = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(0)
  }, [])

  const goToEnd = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(totalSteps)
  }, [totalSteps])

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && currentStep >= totalSteps) {
        setCurrentStep(0)
        return true
      }
      return !prev
    })
  }, [currentStep, totalSteps])

  const loadScript = useCallback((_script: AnimationScript) => {
    setIsPlaying(false)
    setCurrentStep(0)
  }, [])

  return {
    visualState,
    currentStepData,
    isPlaying,
    speed,
    currentStep,
    totalSteps,
    setSpeed,
    stepForward,
    stepBackward,
    reset,
    goToEnd,
    togglePlay,
    loadScript,
  }
}
