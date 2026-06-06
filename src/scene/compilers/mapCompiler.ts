import type { SceneCommand } from '../commandTypes'
import type { MapAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import { DataUnit } from '../primitives/DataUnits'

const CX = 500
const BASE_Y = 260
const NODE_GAP = 140

export const mapCompiler: EventCompiler = {
  supports: (event): event is MapAlgorithmEvent => event.type.startsWith('map.'),
  compile: (event, context) => compileMapEvent(event as MapAlgorithmEvent, context),
}

function compileMapEvent(event: MapAlgorithmEvent, context: CompileContext): SceneCommand[] {
  const cleanupCommands: SceneCommand[] = []
  Object.keys(context.scene.entities).forEach(key => {
    if (key.startsWith('phantom_')) {
      cleanupCommands.push({ type: 'remove_entity', entityId: key })
    }
    const ent = context.scene.entities[key]
    if (ent && 'state' in ent && ent.state?.role === 'deleted') {
      cleanupCommands.push({ type: 'remove_entity', entityId: key })
    }
  })

  switch (event.type) {
    case 'map.create': {
      const count = event.entries.length
      const startX = CX - (count - 1) * NODE_GAP / 2
      return [
        ...cleanupCommands,
        ...event.entries.map(({ key, value }, index) => ({
          type: 'create_node' as const,
          node: DataUnit.mapEntry({ id: mapNodeId(index), key, value, x: startX + index * NODE_GAP, y: BASE_Y }),
        }))
      ]
    }
    case 'map.put': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('map_'))
      const existingIdx = ids.findIndex(id => {
        const ent = context.scene.entities[id]
        return ent?.type === 'node' && ent.meta?.key === event.key
      })
      if (existingIdx >= 0) {
        const eid = ids[existingIdx]
        return [
          ...cleanupCommands,
          { type: 'set_field', nodeId: eid, fieldId: 'value', field: { value: event.value }, animation: 'flash' },
          { type: 'set_state', entityId: eid, state: { role: 'inserted', color: 'success', pulse: true }, merge: true },
          { type: 'add_note', text: `put(${event.key}, ${event.value}) → updated` },
        ]
      }
      const count = ids.length
      const startX = CX - count * NODE_GAP / 2
      const id = mapNodeId(count)
      const repositions: SceneCommand[] = ids.map((eid, i) => ({
        type: 'move' as const, entityId: eid, to: { x: startX + i * NODE_GAP, y: BASE_Y }, duration: 300, easing: 'ease' as const,
      }))
      const phantomId = `phantom_put_${count}`
      return [
        ...cleanupCommands,
        ...repositions,
        { type: 'create_node', node: DataUnit.mapEntry({ id: phantomId, key: event.key, value: event.value, x: CX + 220, y: BASE_Y - 70, color: 'success' }) },
        { type: 'create_node', node: DataUnit.mapEntry({ id, key: event.key, value: event.value, x: startX + count * NODE_GAP, y: BASE_Y, role: 'inserted', color: 'success', pulse: true }) },
        { type: 'add_note', text: `put(${event.key}, ${event.value}) → inserted` },
      ]
    }
    case 'map.get': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('map_') && !k.startsWith('phantom_'))
      const target = ids.find(id => {
        const ent = context.scene.entities[id]
        return ent?.type === 'node' && ent.meta?.key === event.key
      })
      if (target) {
        return [
          ...cleanupCommands,
          { type: 'set_state', entityId: target, state: { role: event.found ? 'visited' : 'conflict', color: event.found ? 'success' : 'danger', pulse: true }, merge: true },
          { type: 'add_note', text: `get(${event.key}) → ${event.value}` },
        ]
      }
      return [...cleanupCommands, { type: 'add_note', text: `get(${event.key}) → null` }]
    }
    case 'map.remove': {
      const ids = Object.keys(context.scene.entities).filter(k => k.startsWith('map_') && !k.startsWith('phantom_'))
      const target = ids.find(id => {
        const ent = context.scene.entities[id]
        return ent?.type === 'node' && ent.meta?.key === event.key
      })
      if (!target) return [...cleanupCommands, { type: 'add_note', text: `remove(${event.key}) → not found` }]
      const targetEnt = context.scene.entities[target]
      const targetPos = (targetEnt && 'position' in targetEnt ? (targetEnt as { position: { x: number; y: number } }).position : null) ?? { x: CX, y: BASE_Y }
      const phantomId = `phantom_rm_${target}`
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: target, state: { role: 'deleted', color: 'danger', opacity: 0.3, pulse: true }, merge: true },
        { type: 'create_node', node: DataUnit.mapEntry({ id: phantomId, key: event.key, value: '', x: targetPos.x, y: targetPos.y - 70, color: 'danger' }) },
        { type: 'add_note', text: `remove(${event.key})` },
      ]
    }
  }
}

export function mapNodeId(index: number) { return `map_${index}` }
