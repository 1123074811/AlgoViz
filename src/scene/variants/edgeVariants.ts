import type { ActionColor } from '@/types/animation'
import type { SceneEdge } from '../types'
import { AuxiliaryUnit } from '../primitives/DataUnits'

export function createEdge(id: string, fromEntityId: string, fromPortId: string, toEntityId: string, toPortId = 'input', color?: ActionColor, curved = false): SceneEdge {
  return AuxiliaryUnit.arrow({
    id,
    fromEntity: fromEntityId,
    fromPort: fromPortId,
    toEntity: toEntityId,
    toPort: toPortId,
    color,
    curved,
  })
}

