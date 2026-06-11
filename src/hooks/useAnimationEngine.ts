import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { AnimationScript, ActionColor, TeachingState, VisualRole, TreeInitialNode } from '@/types/animation'

interface PlaybackState {
  script: AnimationScript | null
  currentStep: number
  isPlaying: boolean
}

export interface VisualState {
  arrayData: number[]
  colorMap: Map<number, ActionColor>
  elementIds: number[]
  currentStep: number
  totalSteps: number
  labels?: string[]
  nodes?: { id: string; label?: string; x?: number; y?: number }[]
  edges?: { source: string; target: string; weight?: number }[]
  root?: string | number
  children?: Record<string, Array<string | number>>
  treeNodes?: TreeInitialNode[]
  matrix?: number[][]
  // Phase 2 teaching state
  teachingState?: TeachingState
  edgeColorMap?: Map<string, ActionColor>
  nodeRoleMap?: Map<string, VisualRole>
}

export function useAnimationEngine(script: AnimationScript | null) {
  const [playback, setPlayback] = useState<PlaybackState>(() => ({
    script,
    currentStep: 0,
    isPlaying: false,
  }))
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = script?.steps.length ?? 0
  const effectivePlayback = playback.script === script
    ? playback
    : { script, currentStep: 0, isPlaying: false }
  const currentStep = Math.min(effectivePlayback.currentStep, totalSteps)
  const isPlaying = effectivePlayback.isPlaying && currentStep < totalSteps

  const updatePlayback = useCallback((updater: (state: PlaybackState) => PlaybackState) => {
    setPlayback((prev) => {
      const base = prev.script === script
        ? prev
        : { script, currentStep: 0, isPlaying: false }
      return updater(base)
    })
  }, [script])

  // Replay all steps up to currentStep to derive array state and persistent colors
  const visualState = useMemo<VisualState>(() => {
    if (!script) {
      return { arrayData: [], colorMap: new Map(), elementIds: [], currentStep: 0, totalSteps: 0, nodes: [], edges: [] }
    }

    let arr = [...script.initialState.data]
    const shouldReplayLinearData = script.initialState.type === 'array' || script.initialState.type === 'linked_list' || script.initialState.type === 'tree'
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
      labels: script.initialState.labels,
      nodes: script.initialState.nodes,
      edges: script.initialState.edges,
      root: script.initialState.root,
      children: script.initialState.children,
      treeNodes: script.initialState.treeNodes,
      matrix: script.initialState.matrix,
      teachingState: stepData?.teachingState,
      edgeColorMap: persistentEdgeColors.size > 0 ? persistentEdgeColors : undefined,
      nodeRoleMap: nodeRoleMap.size > 0 ? nodeRoleMap : undefined,
    }
  }, [script, currentStep, totalSteps])

  // Current step details
  const currentStepData = script
    ? script.steps[Math.min(currentStep, script.steps.length) - 1] ?? null
    : null

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
      updatePlayback((prev) => {
        if (prev.currentStep >= script.steps.length) {
          return { ...prev, isPlaying: false }
        }
        const nextStep = prev.currentStep + 1
        return {
          ...prev,
          currentStep: nextStep,
          isPlaying: nextStep < script.steps.length,
        }
      })
    }, ms)

    return clearTimer
  }, [isPlaying, speed, script, clearTimer, updatePlayback])

  const stepForward = useCallback(() => {
    updatePlayback((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, totalSteps),
    }))
  }, [totalSteps, updatePlayback])

  const stepBackward = useCallback(() => {
    updatePlayback((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }))
  }, [updatePlayback])

  const reset = useCallback(() => {
    updatePlayback((prev) => ({ ...prev, isPlaying: false, currentStep: 0 }))
  }, [updatePlayback])

  const goToEnd = useCallback(() => {
    updatePlayback((prev) => ({ ...prev, isPlaying: false, currentStep: totalSteps }))
  }, [totalSteps, updatePlayback])

  /** 跳转到任意步，用于进度条拖拽和步骤列表点击；跳转后暂停自动播放。 */
  const goToStep = useCallback((step: number) => {
    updatePlayback((prev) => ({
      ...prev,
      isPlaying: false,
      currentStep: Math.max(0, Math.min(Math.floor(step), totalSteps)),
    }))
  }, [totalSteps, updatePlayback])

  const togglePlay = useCallback(() => {
    updatePlayback((prev) => {
      const normalizedStep = Math.min(prev.currentStep, totalSteps)
      if (!prev.isPlaying && normalizedStep >= totalSteps) {
        return { ...prev, currentStep: 0, isPlaying: true }
      }
      return { ...prev, currentStep: normalizedStep, isPlaying: !prev.isPlaying }
    })
  }, [totalSteps, updatePlayback])

  const loadScript = useCallback((nextScript: AnimationScript) => {
    setPlayback({ script: nextScript, currentStep: 0, isPlaying: false })
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
    goToStep,
    togglePlay,
    loadScript,
  }
}
