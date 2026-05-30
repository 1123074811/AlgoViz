import type { SceneNode } from '../types'
import { DataUnit } from '../primitives/DataUnits'

export function createGraphNode(id: string, label: string, x = 0, y = 0): SceneNode {
  return DataUnit.graphNode({ id, label, x, y })
}

