import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { SetAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell, SceneEntityRole } from '../types'
import { DataUnit } from '../primitives/DataUnits'

// ── Layout constants (SetView reads positions off the emitted set_<i> cells) ──
const CX = 500
const BASE_Y = 260
const CELL_GAP = 56

export const setCompiler: EventCompiler = {
  supports: (event): event is SetAlgorithmEvent => event.type.startsWith('set.'),
  compile: (event, context) => compileSetEvent(event as SetAlgorithmEvent, context),
}

export function setCellId(index: number) { return `set_${index}` }

/** Live (non-deleted) member cells in slot order. */
function memberCells(context: CompileContext): SceneCell[] {
  return Object.keys(context.scene.entities)
    .filter(k => k.startsWith('set_'))
    .map(k => context.scene.entities[k])
    .filter((e): e is SceneCell => e?.type === 'cell' && e.state?.role !== 'deleted')
    .sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
}

/** Find a live member whose value equals `value` (set semantics: by value). */
function findMember(cells: SceneCell[], value: number | string): SceneCell | undefined {
  return cells.find(c => String(c.value) === String(value))
}

/** Center-anchored x for `count` members, slot `index`. */
function slotX(count: number, index: number): number {
  const startX = CX - (count - 1) * CELL_GAP / 2
  return startX + index * CELL_GAP
}

/**
 * Cleanup before each step:
 *  - drop phantom badges and already-deleted members (fade-out finished),
 *  - reset prior-step pulses/highlights so the set renders static between steps.
 */
function cleanup(context: CompileContext): SceneCommand[] {
  const commands: SceneCommand[] = []
  Object.keys(context.scene.entities).forEach(key => {
    const ent = context.scene.entities[key]
    if (!ent) return
    if (key.startsWith('phantom_') || key.startsWith('removed_')) {
      commands.push({ type: 'remove_entity', entityId: key })
      return
    }
    if (key.startsWith('set_') && ent.type === 'cell') {
      if (ent.state?.role === 'deleted') {
        commands.push({ type: 'remove_entity', entityId: key })
      } else if (ent.state?.pulse || ent.state?.role === 'visited' || ent.state?.role === 'conflict' || ent.state?.role === 'inserted') {
        // settle highlighted members back to a calm member style
        commands.push({ type: 'set_state', entityId: key, state: { role: 'idle', color: 'muted', pulse: false }, merge: true })
      }
    }
  })
  return commands
}

/** Re-pack members onto evenly spaced slots (after add/remove changes count). */
function repack(cells: SceneCell[], count: number): SceneCommand[] {
  return cells.map((c, i) => ({
    type: 'move' as const,
    entityId: c.id,
    to: { x: slotX(count, i), y: BASE_Y },
    duration: 300,
    easing: 'ease' as const,
  }))
}

function compileSetEvent(event: SetAlgorithmEvent, context: CompileContext): SceneCommand[] {
  const cleanupCommands = cleanup(context)

  switch (event.type) {
    case 'set.create': {
      // Deduplicate the initial members — a set holds distinct values only.
      const unique: Array<number | string> = []
      for (const v of event.values) {
        if (!unique.some(u => String(u) === String(v))) unique.push(v)
      }
      const count = unique.length
      return [
        ...cleanupCommands,
        ...unique.map((value, index) => ({
          type: 'create_cell' as const,
          cell: DataUnit.setCell({ id: setCellId(index), value, index, x: slotX(count, index), y: BASE_Y }),
        })),
      ]
    }

    case 'set.add': {
      const members = memberCells(context)
      // 去重：already present → no insertion, just flag the duplicate.
      const existing = findMember(members, event.value)
      if (existing) {
        return [
          ...cleanupCommands,
          { type: 'set_state', entityId: existing.id, state: { role: 'conflict', color: 'warning', pulse: true }, merge: true },
          { type: 'add_note', text: `add(${event.value}) → 已存在，集合去重，忽略` },
        ]
      }
      // New value → append a slot and re-pack the row to stay centered.
      const count = members.length + 1
      const slot = members.length
      const id = setCellId(nextSlotIndex(context))
      const phantomId = `phantom_add_${slot}`
      return [
        ...cleanupCommands,
        ...repack(members, count),
        { type: 'create_cell', cell: DataUnit.setCell({ id: phantomId, value: event.value, index: -1, x: slotX(count, slot), y: BASE_Y - 70, color: 'success' }) },
        { type: 'create_cell', cell: DataUnit.setCell({ id, value: event.value, index: slot, x: slotX(count, slot), y: BASE_Y, role: 'inserted', color: 'success', pulse: true }) },
        { type: 'add_note', text: `add(${event.value})` },
      ]
    }

    case 'set.remove': {
      const members = memberCells(context)
      const target = findMember(members, event.value)
      if (!target) {
        return [...cleanupCommands, { type: 'add_note', text: `remove(${event.value}) → 不在集合中` }]
      }
      const remaining = members.filter(c => c.id !== target.id)
      const targetPos = target.position ?? { x: CX, y: BASE_Y }
      return [
        ...cleanupCommands,
        // fade the target out (next step's cleanup removes it), re-pack the rest
        { type: 'set_state', entityId: target.id, state: { role: 'deleted', color: 'danger', opacity: 0.3, pulse: true }, merge: true },
        ...repack(remaining, remaining.length),
        { type: 'create_cell', cell: DataUnit.setCell({ id: `phantom_remove_${target.id}`, value: event.value, index: -1, x: targetPos.x, y: targetPos.y - 70, color: 'danger' }) },
        { type: 'add_note', text: `remove(${event.value})` },
      ]
    }

    case 'set.contains': {
      const members = memberCells(context)
      const target = findMember(members, event.value)
      const color: ActionColor = event.found ? 'success' : 'danger'
      const role: SceneEntityRole = event.found ? 'visited' : 'conflict'
      return [
        ...cleanupCommands,
        ...(target ? [{ type: 'set_state' as const, entityId: target.id, state: { role, color, pulse: true }, merge: true }] : []),
        { type: 'add_note', text: `contains(${event.value}) → ${event.found ? '命中' : '未命中'}` },
      ]
    }
  }
}

/** Pick a fresh, never-reused id index so appends don't collide with packed slots. */
function nextSlotIndex(context: CompileContext): number {
  const used = Object.keys(context.scene.entities)
    .filter(k => k.startsWith('set_'))
    .map(k => parseInt(k.slice('set_'.length), 10))
    .filter(n => !Number.isNaN(n))
  return used.length === 0 ? 0 : Math.max(...used) + 1
}
