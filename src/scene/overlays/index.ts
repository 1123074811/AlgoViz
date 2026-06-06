export * from './callStackTypes'
export * from './dpTypes'
export * from './gridTypes'

import type { CallStackEvent, CallStackSceneCommand } from './callStackTypes'
import type { DPEvent, DPOverlayCommand } from './dpTypes'
import type { GridEvent, GridSceneCommand } from './gridTypes'

export type AlgorithmOverlayEvent = CallStackEvent | DPEvent | GridEvent

export type AlgorithmOverlaySceneCommand =
  | CallStackSceneCommand
  | DPOverlayCommand
  | GridSceneCommand
