import type { SceneCommand } from '../commandTypes'
import type { HeapAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell, SceneEdge } from '../types'

// ── Layout constants (HeapView reads positions off the emitted cells) ──
const ROOT_X = 480 // x center of the tree's root (level 0)
const ROOT_Y = 120 // y of level 0
const LEVEL_GAP = 96 // vertical distance between tree levels
const LEAF_GAP = 64 // horizontal spacing between adjacent slots on the deepest level
const NODE_R = 22 // node radius (used for size; HeapView draws circular shells)

export const heapCompiler: EventCompiler = {
  supports: (event): event is HeapAlgorithmEvent => event.type.startsWith('heap.'),
  compile: (event, context) => compileHeapEvent(event as HeapAlgorithmEvent, context),
}

export function heapNodeId(index: number) { return `heap_${index}` }
export function heapEdgeId(child: number) { return `heapedge_${child}` }
export const HEAP_VARIANT_ID = 'heap_variant' // hidden marker cell carrying min/max

/**
 * Reference depth used to size horizontal spacing. Slot spacing at level L is
 * LEAF_GAP * 2^(MAX_LEVEL - L), so adjacent leaves on level MAX_LEVEL sit LEAF_GAP
 * apart and every parent lands exactly on the midpoint of its two children. Heaps
 * deeper than this (>63 nodes) still render — leaves just get tighter than LEAF_GAP.
 */
const MAX_LEVEL = 5

/** Level (depth) of a complete-binary-tree node at array index i. */
function levelOf(i: number): number { return Math.floor(Math.log2(i + 1)) }

/**
 * Complete-binary-tree coordinates for array index i.
 * Each level is centered around ROOT_X; spacing scales by 2^(MAX_LEVEL - level) so
 * a parent's x equals the mean of its two children's x (children 2i+1, 2i+2).
 */
function nodePosition(i: number): { x: number; y: number } {
  const level = levelOf(i)
  const firstInLevel = (1 << level) - 1 // index of leftmost node on this level
  const posInLevel = i - firstInLevel // 0-based slot within the level
  const slotsInLevel = 1 << level
  const spacing = LEAF_GAP * Math.pow(2, MAX_LEVEL - level)
  // Center the level's slots symmetrically about ROOT_X.
  const x = ROOT_X + (posInLevel - (slotsInLevel - 1) / 2) * spacing
  const y = ROOT_Y + level * LEVEL_GAP
  return { x, y }
}

function nodeCell(index: number, value: number, state: SceneCell['state'], variant: 'min' | 'max'): SceneCell {
  const pos = nodePosition(index)
  return {
    id: heapNodeId(index),
    type: 'cell',
    position: pos,
    size: { width: NODE_R * 2, height: NODE_R * 2 },
    value,
    col: index,
    state: state ?? { role: 'idle', color: 'primary' },
    meta: { index, variant },
  }
}

function parentEdge(child: number): SceneEdge {
  const parent = Math.floor((child - 1) / 2)
  return {
    id: heapEdgeId(child),
    type: 'edge',
    from: { entityId: heapNodeId(parent) },
    to: { entityId: heapNodeId(child) },
  }
}

/** Live heap node indices currently in the scene, ascending. */
function heapIndices(context: CompileContext): number[] {
  return Object.keys(context.scene.entities)
    .filter(k => /^heap_\d+$/.test(k))
    .map(k => parseInt(k.split('_')[1], 10))
    .sort((a, b) => a - b)
}

function heapSize(context: CompileContext): number {
  return heapIndices(context).length
}

function valueAt(context: CompileContext, index: number): number {
  const ent = context.scene.entities[heapNodeId(index)]
  return ent?.type === 'cell' ? Number(ent.value) : 0
}

function currentVariant(context: CompileContext): 'min' | 'max' {
  const marker = context.scene.entities[HEAP_VARIANT_ID]
  const meta = marker?.type === 'cell' ? (marker.meta as { variant?: 'min' | 'max' } | undefined) : undefined
  return meta?.variant ?? 'min'
}

function variantMarkerCell(variant: 'min' | 'max'): SceneCell {
  // Off-screen, zero-size marker: carries the heap variant across steps. Never drawn
  // (empty_placeholder → CellView renders nothing; structureOf keeps it in the heap region).
  return {
    id: HEAP_VARIANT_ID,
    type: 'cell',
    position: { x: ROOT_X, y: ROOT_Y - 80 },
    size: { width: 0, height: 0 },
    value: '',
    state: { role: 'empty_placeholder', color: 'muted' },
    meta: { variant },
  }
}

function compileHeapEvent(event: HeapAlgorithmEvent, context: CompileContext): SceneCommand[] {
  // Reset prior-step pulses/highlights so heap state reads as static between steps.
  const cleanup: SceneCommand[] = []
  for (const key of Object.keys(context.scene.entities)) {
    const ent = context.scene.entities[key]
    if (!ent) continue
    if (/^heap_\d+$/.test(key) && (ent.state?.pulse || ent.state?.role !== 'idle')) {
      cleanup.push({ type: 'set_state', entityId: key, state: { role: 'idle', color: 'primary', pulse: false }, merge: true })
    }
  }
  for (const key of Object.keys(context.scene.edges)) {
    if (key.startsWith('heapedge_') && context.scene.edges[key].state?.pulse) {
      cleanup.push({ type: 'set_state', entityId: key, state: { pulse: false }, merge: true })
    }
  }

  switch (event.type) {
    case 'heap.create': {
      const variant = event.variant ?? 'min'
      const cmds: SceneCommand[] = [{ type: 'create_cell', cell: variantMarkerCell(variant) }]
      event.values.forEach((v, i) => {
        cmds.push({ type: 'create_cell', cell: nodeCell(i, v, { role: 'idle', color: 'primary' }, variant) })
        if (i > 0) cmds.push({ type: 'connect', edge: parentEdge(i) })
      })
      cmds.push({ type: 'add_note', text: `创建${variant === 'min' ? '最小' : '最大'}堆（完全二叉树，父 i 子 2i+1/2i+2）` })
      return cmds
    }

    case 'heap.push': {
      const variant = currentVariant(context)
      const index = heapSize(context)
      const cmds: SceneCommand[] = [
        ...cleanup,
        { type: 'create_cell', cell: nodeCell(index, event.value, { role: 'inserted', color: 'success', pulse: true }, variant) },
      ]
      if (index > 0) cmds.push({ type: 'connect', edge: parentEdge(index) })
      cmds.push({ type: 'add_note', text: `push(${event.value})：追加到末尾 index ${index}，随后上浮` })
      return cmds
    }

    case 'heap.pop': {
      const size = heapSize(context)
      if (size === 0) {
        return [...cleanup, { type: 'add_note', text: 'pop：堆为空' }]
      }
      const lastIndex = size - 1
      const topValue = valueAt(context, 0)
      const cmds: SceneCommand[] = [...cleanup]
      if (size === 1) {
        cmds.push({ type: 'remove_entity', entityId: heapNodeId(0) })
        cmds.push({ type: 'add_note', text: `pop()：弹出堆顶 ${topValue}，堆空` })
        return cmds
      }
      // Move last value into the root slot, then drop the last node (its edge auto-removes).
      const lastValue = valueAt(context, lastIndex)
      cmds.push({ type: 'set_cell', cellId: heapNodeId(0), value: lastValue, state: { role: 'swapping', color: 'warning', pulse: true } })
      cmds.push({ type: 'remove_entity', entityId: heapNodeId(lastIndex) })
      cmds.push({ type: 'add_note', text: `pop()：弹出堆顶 ${topValue}，末尾 ${lastValue} 补位到根，随后下沉` })
      return cmds
    }

    case 'heap.sift': {
      const { from, to } = event
      const fromVal = valueAt(context, from)
      const toVal = valueAt(context, to)
      return [
        ...cleanup,
        // Swap values between the two slots (positions stay fixed in the tree).
        { type: 'set_cell', cellId: heapNodeId(from), value: toVal, state: { role: 'swapping', color: 'warning', pulse: true } },
        { type: 'set_cell', cellId: heapNodeId(to), value: fromVal, state: { role: 'swapping', color: 'warning', pulse: true } },
        { type: 'add_note', text: `sift：比较并交换 index ${from} ↔ ${to}` },
      ]
    }

    case 'heap.peek': {
      const val = valueAt(context, event.index)
      return [
        ...cleanup,
        { type: 'set_state', entityId: heapNodeId(event.index), state: { role: 'current', color: 'primary', pulse: true }, merge: true },
        { type: 'add_note', text: `peek(index ${event.index}) = ${val}` },
      ]
    }
  }
}
