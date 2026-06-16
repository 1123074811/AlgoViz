import type { SceneCommand } from '../commandTypes'
import type { SkipListAlgorithmEvent } from '../eventTypes'
import type { CompileContext, EventCompiler } from '../SceneEngine'
import type { SceneCell } from '../types'
import { AuxiliaryUnit } from '../primitives/DataUnits'

const COL_W = 76
const ROW_H = 60
const BASE_X = 200
const BASE_Y = 360 // level 0 baseline; higher levels go up

export const skipListCompiler: EventCompiler = {
  supports: (event): event is SkipListAlgorithmEvent => event.type.startsWith('skip_list.'),
  compile: (event, context) => compile(event as SkipListAlgorithmEvent, context),
}

const cellId = (col: number, level: number) => `sl_${col}_${level}`
const xOf = (col: number) => BASE_X + col * COL_W
const yOf = (level: number) => BASE_Y - level * ROW_H

function cell(col: number, level: number, value: number | string, head = false): SceneCell {
  return {
    id: cellId(col, level),
    type: 'cell',
    position: { x: xOf(col), y: yOf(level) },
    size: { width: 48, height: 40 },
    value,
    col,
    state: { role: head ? 'header' : 'idle', color: head ? 'primary' : 'muted' },
    meta: { level },
  }
}

function compile(event: SkipListAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'skip_list.create': {
      const { values, heights } = event
      const maxLevel = Math.max(1, ...heights)
      const cmds: SceneCommand[] = []
      // Head tower at col 0; data nodes start at col 1.
      for (let lvl = 0; lvl < maxLevel; lvl++) cmds.push({ type: 'create_cell', cell: cell(0, lvl, 'H', true) })
      values.forEach((v, i) => {
        const col = i + 1
        for (let lvl = 0; lvl < heights[i]; lvl++) cmds.push({ type: 'create_cell', cell: cell(col, lvl, v) })
      })
      // Horizontal arrows per level between consecutive present cells (incl. head).
      for (let lvl = 0; lvl < maxLevel; lvl++) {
        const cols: number[] = [0, ...values.map((_, i) => i + 1).filter(i => heights[i - 1] > lvl)]
        for (let k = 0; k < cols.length - 1; k++) {
          cmds.push({ type: 'connect', edge: AuxiliaryUnit.arrow({
            id: `sle_${cols[k]}_${cols[k + 1]}_${lvl}`,
            fromEntity: cellId(cols[k], lvl), toEntity: cellId(cols[k + 1], lvl),
            curved: false, thickness: lvl === 0 ? 1.2 : 2, color: lvl === 0 ? 'muted' : 'primary',
          }) })
        }
      }
      cmds.push({ type: 'add_note', text: `跳表：${maxLevel} 层，上层稀疏索引加速查找` })
      void context
      return cmds
    }
    case 'skip_list.search': {
      const cmds: SceneCommand[] = []
      event.path.forEach(([node, level], idx) => {
        const col = node + 1
        cmds.push({ type: 'set_state', entityId: cellId(col, level), state: { role: 'current', color: 'warning', pulse: true }, merge: true })
        void idx
      })
      const last = event.path[event.path.length - 1]
      if (last) {
        cmds.push({ type: 'set_state', entityId: cellId(last[0] + 1, last[1]), state: { role: event.found ? 'visited' : 'conflict', color: event.found ? 'success' : 'danger', pulse: true }, merge: true })
      }
      cmds.push({ type: 'add_note', text: event.found ? `命中 ${event.target}` : `未找到 ${event.target}` })
      void context
      return cmds
    }
  }
}
