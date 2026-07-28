import type { SceneCommand } from '../../commandTypes'
import type { SkipListAlgorithmEvent } from '../../eventTypes'
import type { CompileContext, EventCompiler } from '../../SceneEngine'
import type { SceneCell } from '../../types'
import { AuxiliaryUnit } from '../../primitives/DataUnits'
import { measureNodeWidth } from '../../textMetrics'

const ROW_H = 76
const COL_GAP = 30
const BASE_X = 150
const BASE_Y = 120

export const skipListCompiler: EventCompiler = {
  supports: (event): event is SkipListAlgorithmEvent => event.type.startsWith('skip_list.'),
  compile: (event, context) => compile(event as SkipListAlgorithmEvent, context),
}

const cellId = (col: number, level: number) => `sl_${col}_${level}`
const sceneCol = (node: number) => node + 1

function cell(col: number, level: number, value: number | string, x: number, y: number, width: number, head = false): SceneCell {
  return {
    id: cellId(col, level),
    type: 'cell',
    position: { x, y },
    size: { width, height: 44 },
    value,
    col,
    state: { role: head ? 'header' : 'idle', color: head ? 'primary' : 'muted' },
    meta: { level },
  }
}

function state(entityId: string, role: 'current' | 'visited' | 'conflict', color: 'warning' | 'primary' | 'success' | 'danger'): SceneCommand {
  return { type: 'set_state', entityId, state: { role, color, pulse: true }, merge: true }
}

function compile(event: SkipListAlgorithmEvent, context: CompileContext): SceneCommand[] {
  switch (event.type) {
    case 'skip_list.create': {
      const { values, heights } = event
      const maxLevel = Math.max(1, ...heights)
      const cmds: SceneCommand[] = []
      const widths = ['H', ...values].map(value => measureNodeWidth(String(value), { padding: 24, min: 52, max: 120 }))
      const xs: number[] = []
      let cursor = BASE_X
      widths.forEach((width, index) => {
        xs[index] = cursor + width / 2
        cursor += width + COL_GAP
      })
      const yOf = (level: number) => BASE_Y + (maxLevel - 1 - level) * ROW_H
      // Head tower at col 0; data nodes start at col 1.
      for (let lvl = 0; lvl < maxLevel; lvl++) {
        cmds.push({ type: 'create_cell', cell: cell(0, lvl, 'H', xs[0], yOf(lvl), widths[0], true) })
        cmds.push({
          type: 'create_label',
          label: { id: `sl_level_${lvl}`, type: 'label', text: `L${lvl}`, position: { x: BASE_X - 52, y: yOf(lvl) } },
        })
      }
      values.forEach((v, i) => {
        const col = i + 1
        for (let lvl = 0; lvl < heights[i]; lvl++) {
          cmds.push({ type: 'create_cell', cell: cell(col, lvl, v, xs[col], yOf(lvl), widths[col]) })
        }
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
    case 'skip_list.compare':
      return [state(cellId(sceneCol(event.node), event.level), 'current', 'warning')]
    case 'skip_list.move_right':
      return [state(cellId(sceneCol(event.to), event.level), 'visited', 'primary')]
    case 'skip_list.drop_down':
      return [state(cellId(sceneCol(event.node), event.toLevel), 'current', 'warning')]
    case 'skip_list.found':
      return [
        state(cellId(sceneCol(event.node), event.level), 'visited', 'success'),
        { type: 'add_note', text: `命中 ${event.target}` },
      ]
    case 'skip_list.miss':
      return [
        state(cellId(sceneCol(event.node), event.level), 'conflict', 'danger'),
        { type: 'add_note', text: `未找到 ${event.target}` },
      ]
  }
}
