import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { AnimationScript, ActionColor, TeachingState, VisualRole, TreeInitialNode } from '@/types/animation'

export interface VisualState {
  arrayData: number[]
  colorMap: Map<number, ActionColor>
  elementIds: number[]
  currentStep: number
  totalSteps: number
  nodes?: { id: string; label?: string; x?: number; y?: number }[]
  edges?: { source: string; target: string; weight?: number }[]
  root?: string | number
  children?: Record<string, Array<string | number>>
  treeNodes?: TreeInitialNode[]
  // Phase 2 teaching state
  teachingState?: TeachingState
  edgeColorMap?: Map<string, ActionColor>
  nodeRoleMap?: Map<string, VisualRole>
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
      return { arrayData: [], colorMap: new Map(), elementIds: [], currentStep: 0, totalSteps: 0, nodes: [], edges: [] }
    }

    let arr = [...script.initialState.data]
    const shouldReplayLinearData = script.initialState.type === 'array' || script.initialState.type === 'linked_list'
    const elementIds = arr.map((_, i) => i)
    const persistentMarked = new Map<number, ActionColor>()
    const persistentEdgeColors = new Map<string, ActionColor>()

    const replayLimit = Math.min(currentStep, script.steps.length)
    for (let i = 0; i < replayLimit; i++) {
      const step = script.steps[i]
      if (shouldReplayLinearData && step.action.type === 'swap') {
        const [a, b] = step.action.targets
        ;[arr[a], arr[b]] = [arr[b], arr[a]]
        ;[elementIds[a], elementIds[b]] = [elementIds[b], elementIds[a]]
      }
      if (shouldReplayLinearData && step.action.type === 'move') {
        const [from, to] = step.action.targets
        arr[to] = typeof step.action.value === 'number' ? step.action.value : arr[from]
      }
      if (shouldReplayLinearData && step.action.type !== 'insert' && typeof step.action.value === 'number' && step.action.to !== undefined) {
        arr[step.action.to] = step.action.value
      }
      if (shouldReplayLinearData && step.action.type === 'delete') {
        const [idx] = step.action.targets
        arr.splice(idx, 1)
        elementIds.splice(idx, 1)
      }
      if (shouldReplayLinearData && step.action.type === 'insert' && typeof step.action.value === 'number') {
        const pos = step.action.to ?? step.action.targets[0]
        const val = step.action.value
        elementIds.splice(pos, 0, elementIds.length)
        arr.splice(pos, 0, val)
      }
      if (step.action.type === 'mark') {
        for (const t of step.action.targets) {
          persistentMarked.set(t, step.action.color)
        }
      }
      if (step.action.type === 'edge') {
        const edgeKey = step.action.from !== undefined && step.action.to !== undefined
          ? `${step.action.from}->${step.action.to}`
          : step.action.targets.map(String).join('->')
        persistentEdgeColors.set(edgeKey, step.action.color)
      }
    }

    // Current step action overrides colors on its targets
    if (replayLimit > 0) {
      const currentAction = script.steps[replayLimit - 1].action
      for (const t of currentAction.targets) {
        persistentMarked.set(t, currentAction.color)
      }
    }

    // Derive node role map from teachingState if present
    const nodeRoleMap = new Map<string, VisualRole>()
    const stepData = replayLimit > 0 ? script.steps[replayLimit - 1] : null
    if (stepData?.teachingState?.graph?.nodeStates) {
      for (const ns of stepData.teachingState.graph.nodeStates) {
        nodeRoleMap.set(ns.id, ns.role)
      }
    }
    if (stepData?.teachingState?.tree?.nodeStates) {
      for (const ns of stepData.teachingState.tree.nodeStates) {
        nodeRoleMap.set(String(ns.id), ns.role)
      }
    }

    return {
      arrayData: arr,
      colorMap: persistentMarked,
      elementIds,
      currentStep: replayLimit,
      totalSteps,
      nodes: script.initialState.nodes,
      edges: script.initialState.edges,
      root: script.initialState.root,
      children: script.initialState.children,
      treeNodes: script.initialState.treeNodes,
      teachingState: stepData?.teachingState,
      edgeColorMap: persistentEdgeColors.size > 0 ? persistentEdgeColors : undefined,
      nodeRoleMap: nodeRoleMap.size > 0 ? nodeRoleMap : undefined,
    }
  }, [script, currentStep])

  // Current step details
  const currentStepData = script
    ? script.steps[Math.min(currentStep, script.steps.length) - 1] ?? null
    : null

  useEffect(() => {
    setIsPlaying(false)
    setCurrentStep(0)
  }, [script])

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

    const ms = 1500 / speed
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
