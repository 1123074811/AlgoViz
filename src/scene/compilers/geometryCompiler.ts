import type { SceneCommand } from '../commandTypes'
import type { GeometryAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { ActionColor } from '@/types/animation'
import type { SceneCell } from '../types'
import { PLANE } from './geometryMap'

export const geometryCompiler: EventCompiler = {
  supports: (event): event is GeometryAlgorithmEvent => event.type.startsWith('geometry.'),
  compile: (event, context) => compile(event as GeometryAlgorithmEvent, context),
}

const PLANE_ID = 'geo_plane'

function geoCell(id: string, gx: number, gy: number, kind: string, extra: Record<string, unknown>, color: ActionColor): SceneCell {
  return {
    id: `geo_${id}`,
    type: 'cell',
    position: { x: PLANE.width / 2, y: PLANE.height / 2 }, // 实际位置由 GeometryView 按 meta 映射
    size: { width: 1, height: 1 },
    value: '',
    state: { role: 'idle', color },
    meta: { kind, gx, gy, color, ...extra },
  }
}

function compile(event: GeometryAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'geometry.plane':
      return [{
        type: 'create_cell',
        cell: {
          id: PLANE_ID,
          type: 'cell',
          position: { x: PLANE.width / 2, y: PLANE.height / 2 },
          size: { width: PLANE.width, height: PLANE.height },
          value: '',
          state: { role: 'idle', color: 'muted' },
          meta: { kind: 'plane', xRange: event.xRange, yRange: event.yRange },
        },
      }]
    case 'geometry.point':
      return [{ type: 'create_cell', cell: geoCell(event.id, event.x, event.y, 'point', { label: event.label }, event.color ?? 'primary') }]
    case 'geometry.segment':
      return [{ type: 'create_cell', cell: geoCell(event.id, event.from[0], event.from[1], 'segment', { to: event.to }, event.color ?? 'muted') }]
    case 'geometry.polygon':
      return [{ type: 'create_cell', cell: geoCell(event.id, event.points[0]?.[0] ?? 0, event.points[0]?.[1] ?? 0, 'polygon', { points: event.points }, event.color ?? 'primary') }]
    case 'geometry.sweepline':
      return [{ type: 'create_cell', cell: geoCell('sweep', event.axis === 'x' ? event.value : 0, event.axis === 'y' ? event.value : 0, 'sweepline', { axis: event.axis, value: event.value }, 'warning') }]
    case 'geometry.clear':
      return Object.keys(context.scene.entities).filter(k => k.startsWith('geo_')).map(id => ({ type: 'remove_entity' as const, entityId: id }))
  }
}
