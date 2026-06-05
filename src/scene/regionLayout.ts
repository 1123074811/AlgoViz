import type { SceneState, SceneEntity, SceneCell, SceneNode, SceneLabel, SceneGroup, Point, Size } from './types'

const REGION_GAP_Y = 80      // 区域之间竖直间距
const REGION_PAD = 28        // 区域内边距
const REGION_TITLE_H = 24    // 标题占高
const START_X = 120
const START_Y = 120

interface Positioned { id: string; x: number; y: number; w: number; h: number }

/** 按 id 前缀推断结构分组（无显式 group 时的回退）。 */
export function structureOf(id: string): string {
  if (id.startsWith('arr_')) return 'array'
  if (id.startsWith('heap_')) return 'heap'
  if (id.startsWith('hashbucket_') || id.startsWith('hashentry_') || id === 'hashtable_loadfactor') return 'hashtable'
  if (id.startsWith('set_')) return 'set'
  if (id.startsWith('mathvar_')) return 'variables'
  if (id.startsWith('queue_')) return 'queue'
  if (id.startsWith('stack_')) return 'stack'
  if (id.startsWith('deque_')) return 'deque'
  if (id.startsWith('aux_')) return 'aux'
  if (/^s_\d+_\d+$/.test(id)) return 'string'
  return 'main' // 图/树节点等无前缀实体
}

function groupOf(entity: SceneEntity): string {
  if ('group' in entity && entity.group) return entity.group as string
  return structureOf(entity.id)
}

const REGION_TITLE: Record<string, string> = {
  array: '数组', heap: '堆', hashtable: '哈希表', set: '集合', variables: '变量',
  queue: '队列', stack: '栈', deque: '双端队列', aux: '辅助', string: '字符串', main: '主结构',
}

/** 收集有坐标的实体（cell/node/label）。 */
function positionedEntities(scene: SceneState): Array<SceneCell | SceneNode | SceneLabel> {
  const out: Array<SceneCell | SceneNode | SceneLabel> = []
  for (const e of Object.values(scene.entities)) {
    if (e.type === 'cell' || e.type === 'node') out.push(e)
  }
  for (const l of Object.values(scene.labels)) out.push(l)
  return out
}

function entityBox(e: SceneCell | SceneNode | SceneLabel): Positioned {
  const w = ('size' in e && e.size?.width) ? e.size.width : 80
  const h = ('size' in e && e.size?.height) ? e.size.height : 44
  return { id: e.id, x: e.position.x, y: e.position.y, w, h }
}

/**
 * 组合场景区域布局：把实体按组分区，竖直堆叠各区域使其互不重叠，
 * 整体平移组内实体，并写入每组的 SceneGroup（含 bounds + 标题）供 RegionView 渲染。
 * 纯函数，返回新 SceneState。
 */
export function applyRegionLayout(scene: SceneState): SceneState {
  const ents = positionedEntities(scene)
  if (ents.length === 0) return scene

  // 1. 分组
  const groups = new Map<string, Array<SceneCell | SceneNode | SceneLabel>>()
  for (const e of ents) {
    const g = groupOf(e)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(e)
  }
  if (groups.size <= 1) return scene // 单结构无需分区

  // 2. 每组局部 bbox + 竖直堆叠分配目标区域原点
  const offsets = new Map<string, { dx: number; dy: number; bounds: { position: Point; size: Size } }>()
  let cursorY = START_Y
  // 稳定顺序：main 优先，其余按字母
  const orderedKeys = [...groups.keys()].sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b)))
  for (const key of orderedKeys) {
    const list = groups.get(key)!
    const boxes = list.map(entityBox)
    const minX = Math.min(...boxes.map(b => b.x - b.w / 2))
    const minY = Math.min(...boxes.map(b => b.y - b.h / 2))
    const maxX = Math.max(...boxes.map(b => b.x + b.w / 2))
    const maxY = Math.max(...boxes.map(b => b.y + b.h / 2))
    const gw = maxX - minX
    const gh = maxY - minY
    // 目标：该组左上角对齐 (START_X, cursorY + 标题高)，平移量 = 目标 - 当前 min
    const targetTop = cursorY + REGION_TITLE_H
    const dx = START_X - minX
    const dy = targetTop - minY
    offsets.set(key, {
      dx, dy,
      bounds: { position: { x: START_X - REGION_PAD, y: cursorY - REGION_PAD + REGION_TITLE_H }, size: { width: gw + 2 * REGION_PAD, height: gh + 2 * REGION_PAD } },
    })
    cursorY = targetTop + gh + REGION_PAD + REGION_GAP_Y
  }

  // 3. 平移组内所有实体
  const entities = { ...scene.entities }
  const labels = { ...scene.labels }
  for (const [key, list] of groups) {
    const off = offsets.get(key)!
    for (const e of list) {
      const moved = { ...e, position: { x: e.position.x + off.dx, y: e.position.y + off.dy } }
      if (e.type === 'label') labels[e.id] = moved as SceneLabel
      else entities[e.id] = moved as SceneCell | SceneNode
    }
  }

  // 4. 写区域 SceneGroup（RegionView 读它画框+标题）
  const groupsOut: Record<string, SceneGroup> = { ...scene.groups }
  for (const [key, off] of offsets) {
    const gid = `region_${key}`
    groupsOut[gid] = {
      id: gid,
      type: 'group',
      label: REGION_TITLE[key] ?? key,
      entityIds: groups.get(key)!.map(e => e.id),
      bounds: off.bounds,
    }
  }

  return { ...scene, entities, labels, groups: groupsOut }
}
