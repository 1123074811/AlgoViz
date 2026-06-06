import {
  compileCallStackEvent,
  reduceCallStackEvent,
} from '../compilers/callStackCompiler'
import { compileDPEvent } from '../compilers/dpCompiler'
import { compileGridEvent, reduceGridEvent } from '../compilers/gridCompiler'
import type { AlgorithmOverlayEvent, AlgorithmOverlaySceneCommand } from './index'
import type { CallStackEvent, CallStackModel } from './callStackTypes'
import type { DPEvent, DPTableCollection } from './dpTypes'
import type { GridCollection, GridEvent } from './gridTypes'

export interface AlgorithmOverlayState {
  callStack?: CallStackModel
  dpTables: DPTableCollection
  grids: GridCollection
}

export const createAlgorithmOverlayState = (): AlgorithmOverlayState => ({
  dpTables: {},
  grids: {},
})

export const isAlgorithmOverlayEvent = (
  event: { type?: string } | null | undefined,
): event is AlgorithmOverlayEvent =>
  typeof event?.type === 'string' &&
  (event.type.startsWith('callstack.') ||
    event.type.startsWith('dp.') ||
    event.type.startsWith('grid.'))

export function reduceAlgorithmOverlayEvent(
  state: AlgorithmOverlayState,
  event: AlgorithmOverlayEvent,
): AlgorithmOverlayState {
  if (event.type.startsWith('callstack.')) {
    return {
      ...state,
      callStack: reduceCallStackEvent(state.callStack, event as CallStackEvent),
    }
  }

  if (event.type.startsWith('dp.')) {
    return {
      ...state,
      dpTables: compileDPEvent(event as DPEvent, state.dpTables).state,
    }
  }

  if (event.type.startsWith('grid.')) {
    return {
      ...state,
      grids: reduceGridEvent(state.grids, event as GridEvent),
    }
  }

  return state
}

export function compileAlgorithmOverlayEvent(
  state: AlgorithmOverlayState,
  event: AlgorithmOverlayEvent,
): { commands: AlgorithmOverlaySceneCommand[]; state: AlgorithmOverlayState } {
  if (event.type.startsWith('callstack.')) {
    const result = compileCallStackEvent(state.callStack, event as CallStackEvent)
    return {
      commands: result.commands,
      state: { ...state, callStack: result.model },
    }
  }

  if (event.type.startsWith('dp.')) {
    const result = compileDPEvent(event as DPEvent, state.dpTables)
    return {
      commands: result.commands,
      state: { ...state, dpTables: result.state },
    }
  }

  if (event.type.startsWith('grid.')) {
    const nextGrids = reduceGridEvent(state.grids, event as GridEvent)
    return {
      commands: compileGridEvent(event as GridEvent, state.grids),
      state: { ...state, grids: nextGrids },
    }
  }

  return { commands: [], state }
}

export function compileAlgorithmOverlayEvents(
  events: AlgorithmOverlayEvent[],
  initialState: AlgorithmOverlayState = createAlgorithmOverlayState(),
): { commands: AlgorithmOverlaySceneCommand[]; state: AlgorithmOverlayState } {
  let state = initialState
  const commands: AlgorithmOverlaySceneCommand[] = []

  events.forEach((event) => {
    const result = compileAlgorithmOverlayEvent(state, event)
    state = result.state
    commands.push(...result.commands)
  })

  return { commands, state }
}
