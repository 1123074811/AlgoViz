import type { ActionColor } from '@/types/animation'
import type { SceneCommand } from '../commandTypes'
import type { HashTableAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'

// ── Layout constants (HashTableView reads positions off the emitted cells) ──
const START_X = 200
const BUCKET_Y = 200
const CELL_W = 60 // bucket width
const CELL_H = 44
const BUCKET_GAP = 52 // horizontal gap between buckets — wide enough for chained entries
const CHAIN_GAP = 16 // vertical gap between chained entries (and bucket → first entry)
const ENTRY_H = 40
const ENTRY_W = 104 // entry box width — fits "key:value" without truncation

export const hashTableCompiler: EventCompiler = {
  supports: (event): event is HashTableAlgorithmEvent => event.type.startsWith('hashtable.'),
  compile: (event, context) => compileHashTableEvent(event as HashTableAlgorithmEvent, context),
}

export function hashBucketId(index: number) { return `hashbucket_${index}` }
export function hashEntryId(bucket: number, chainIndex: number) { return `hashentry_${bucket}_${chainIndex}` }
export const LOAD_FACTOR_ID = 'hashtable_loadfactor'

function bucketX(index: number) { return START_X + index * (CELL_W + BUCKET_GAP) }
function entryY(chainIndex: number) {
  // first entry sits one CHAIN_GAP below the bucket row, then stacks downward
  return BUCKET_Y + CELL_H / 2 + CHAIN_GAP + ENTRY_H / 2 + chainIndex * (ENTRY_H + CHAIN_GAP)
}

/** Capacity = number of bucket cells currently in the scene. */
function bucketCount(context: CompileContext): number {
  return Object.keys(context.scene.entities).filter(k => k.startsWith('hashbucket_')).length
}

/** Live (non-deleted) entry ids for a bucket, ordered by chain index. */
function entriesInBucket(context: CompileContext, bucket: number): string[] {
  return Object.keys(context.scene.entities)
    .filter(k => k.startsWith(`hashentry_${bucket}_`))
    .filter(k => context.scene.entities[k]?.type === 'cell' && context.scene.entities[k]?.state?.role !== 'deleted')
    .sort((a, b) => chainIndexOf(a) - chainIndexOf(b))
}

function chainIndexOf(entryId: string): number {
  return parseInt(entryId.split('_')[2] ?? '0', 10)
}

/** Total live entries across all buckets (n in the load factor n/capacity). */
function totalEntries(context: CompileContext): number {
  return Object.keys(context.scene.entities)
    .filter(k => k.startsWith('hashentry_'))
    .filter(k => context.scene.entities[k]?.state?.role !== 'deleted')
    .length
}

function findEntryByKey(context: CompileContext, bucket: number, key: string): string | undefined {
  return entriesInBucket(context, bucket).find(k => {
    const ent = context.scene.entities[k]
    const meta = ent?.type === 'cell' ? (ent.meta as { key?: string } | undefined) : undefined
    return meta?.key !== undefined && String(meta.key) === String(key)
  })
}

function loadFactorCell(n: number, capacity: number, x: number, y: number): SceneCell {
  return {
    id: LOAD_FACTOR_ID,
    type: 'cell',
    position: { x, y },
    // Real size so the auto viewBox includes the load-factor panel (HashTableView draws it).
    size: { width: 120, height: CELL_H },
    value: `${n}/${capacity}`,
    // empty_placeholder → CellView renders nothing; HashTableView reads .value/.meta
    state: { role: 'empty_placeholder', color: 'muted' },
    meta: { n, capacity },
  }
}

function loadFactorCommand(context: CompileContext, deltaN: number): SceneCommand {
  const capacity = bucketCount(context)
  const n = totalEntries(context) + deltaN
  const x = START_X + Math.max(capacity, 1) * (CELL_W + BUCKET_GAP)
  return { type: 'create_cell', cell: loadFactorCell(n, capacity, x, BUCKET_Y) }
}

function compileHashTableEvent(event: HashTableAlgorithmEvent, context: CompileContext): SceneCommand[] {
  // Cleanup deleted entries and reset prior-step pulses so state stays static.
  const cleanupCommands: SceneCommand[] = []
  Object.keys(context.scene.entities).forEach(key => {
    const ent = context.scene.entities[key]
    if (!ent) return
    if (key.startsWith('hashentry_') && ent.state?.role === 'deleted') {
      cleanupCommands.push({ type: 'remove_entity', entityId: key })
    }
    if ((key.startsWith('hashbucket_') || key.startsWith('hashentry_')) && ent.state?.pulse) {
      cleanupCommands.push({ type: 'set_state', entityId: key, state: { pulse: false }, merge: true })
    }
  })

  switch (event.type) {
    case 'hashtable.create': {
      const cells: SceneCommand[] = []
      for (let i = 0; i < event.capacity; i++) {
        cells.push({
          type: 'create_cell',
          cell: {
            id: hashBucketId(i),
            type: 'cell',
            position: { x: bucketX(i), y: BUCKET_Y },
            size: { width: CELL_W, height: CELL_H },
            value: '',
            col: i,
            state: { role: 'idle', color: 'muted' },
            meta: { bucket: i },
          },
        })
      }
      const lfX = START_X + event.capacity * (CELL_W + BUCKET_GAP)
      cells.push({ type: 'create_cell', cell: loadFactorCell(0, event.capacity, lfX, BUCKET_Y) })
      return cells
    }

    case 'hashtable.put': {
      const chainIndex = entriesInBucket(context, event.bucket).length
      const id = hashEntryId(event.bucket, chainIndex)
      const color: ActionColor = event.collision ? 'warning' : 'success'
      const entryCell: SceneCell = {
        id,
        type: 'cell',
        position: { x: bucketX(event.bucket), y: entryY(chainIndex) },
        size: { width: ENTRY_W, height: ENTRY_H },
        value: `${event.key}:${event.value}`,
        col: chainIndex,
        state: { role: 'inserted', color, pulse: true },
        meta: { bucket: event.bucket, chainIndex, key: event.key, rawValue: event.value },
      }
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: hashBucketId(event.bucket), state: { role: 'active', color, pulse: true }, merge: true },
        { type: 'create_cell', cell: entryCell },
        loadFactorCommand(context, 1),
        { type: 'add_note', text: event.collision ? `put(${event.key}) → 桶 ${event.bucket} 冲突，链地址法追加` : `put(${event.key}) → 桶 ${event.bucket}` },
      ]
    }

    case 'hashtable.get': {
      const color: ActionColor = event.found ? 'success' : 'danger'
      const match = event.found ? findEntryByKey(context, event.bucket, event.key) : undefined
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: hashBucketId(event.bucket), state: { role: 'current', color, pulse: true }, merge: true },
        ...(match ? [{ type: 'set_state' as const, entityId: match, state: { role: 'visited' as const, color, pulse: true }, merge: true }] : []),
        { type: 'add_note', text: `get(${event.key}) → 桶 ${event.bucket}：${event.found ? '命中' : '未找到'}` },
      ]
    }

    case 'hashtable.remove': {
      const target = findEntryByKey(context, event.bucket, event.key)
      if (!target) {
        return [
          ...cleanupCommands,
          { type: 'set_state', entityId: hashBucketId(event.bucket), state: { role: 'current', color: 'danger', pulse: true }, merge: true },
          { type: 'add_note', text: `remove(${event.key}) → 桶 ${event.bucket}：未找到` },
        ]
      }
      // Mark deleted (next-step cleanup removes it), then re-pack the chain visually.
      const remaining = entriesInBucket(context, event.bucket).filter(k => k !== target)
      const repack: SceneCommand[] = remaining.map((k, i) => ({
        type: 'move' as const,
        entityId: k,
        to: { x: bucketX(event.bucket), y: entryY(i) },
        duration: 250,
        easing: 'ease' as const,
      }))
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: target, state: { role: 'deleted', color: 'danger', opacity: 0.35, pulse: true }, merge: true },
        ...repack,
        loadFactorCommand(context, -1),
        { type: 'add_note', text: `remove(${event.key}) → 桶 ${event.bucket}` },
      ]
    }

    case 'hashtable.highlight_bucket': {
      return [
        ...cleanupCommands,
        { type: 'set_state', entityId: hashBucketId(event.bucket), state: { role: 'current', color: 'primary', pulse: true }, merge: true },
      ]
    }
  }
}
