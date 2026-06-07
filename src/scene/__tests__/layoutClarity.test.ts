import { describe, it, expect } from 'vitest'
import { applyRegionLayout, structureOf } from '../regionLayout'
import { layoutTree } from '../layouts/treeLayout'
import { arrayCompiler } from '../compilers/arrayCompiler'
import { measureNodeRenderWidth, truncateToWidth } from '../textMetrics'
import { createEmptyScene } from '../types'
import type { SceneState, SceneCell, SceneNode } from '../types'
import type { CompileContext } from '../SceneEngine'

// --- builders (mirroring existing scene test style) ---------------------------

function cell(id: string, x: number, y: number, value: string | number = '', w = 44, h = 44): SceneCell {
  return { id, type: 'cell', position: { x, y }, size: { width: w, height: h }, value }
}

function treeNode(id: string, fields: { value: string | number }[] = []): SceneNode {
  return {
    id,
    type: 'node',
    variant: 'tree.btree',
    position: { x: 0, y: 0 },
    size: { width: 96, height: 44 },
    fields: fields.map((f, i) => ({ id: `${id}_f${i}`, value: f.value })),
    ports: [],
  }
}

/** Axis-aligned bounding box from a region group's bounds. */
function bbox(b: { position: { x: number; y: number }; size: { width: number; height: number } }) {
  return { left: b.position.x, right: b.position.x + b.size.width, top: b.position.y, bottom: b.position.y + b.size.height }
}

function disjoint(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>): boolean {
  return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
}

// --- 1. composite: titled, pairwise-disjoint regions --------------------------

describe('composite 多结构分区', () => {
  function buildComposite(): SceneState {
    const s = createEmptyScene()
    // array region (arr_*)
    s.entities['arr_0'] = cell('arr_0', 140, 300, 5)
    s.entities['arr_1'] = cell('arr_1', 190, 300, 3)
    s.entities['arr_2'] = cell('arr_2', 240, 300, 8)
    // stack region (stack_*)
    s.entities['stack_0'] = cell('stack_0', 500, 360, 1)
    s.entities['stack_1'] = cell('stack_1', 500, 316, 2)
    // matrix region (cell_R_C + headers) — overlaps the others spatially before layout
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        s.entities[`cell_${r}_${c}`] = cell(`cell_${r}_${c}`, 200 + c * 44, 120 + r * 44, r * 2 + c)
      }
    }
    s.entities['m_corner'] = cell('m_corner', 160, 80, '')
    return s
  }

  it('array+stack+matrix 落到三个独立带标题的区域', () => {
    const out = applyRegionLayout(buildComposite())
    const regions = Object.values(out.groups).filter(g => g.id.startsWith('region_'))
    expect(regions.length).toBe(3)
    const ids = regions.map(r => r.id).sort()
    expect(ids).toEqual(['region_array', 'region_matrix', 'region_stack'])
    // every region carries a non-empty human title
    for (const r of regions) {
      expect(r.label, `region ${r.id} should have a title`).toBeTruthy()
      expect(r.bounds, `region ${r.id} should have bounds`).toBeDefined()
    }
  })

  it('各区域包围盒两两不相交', () => {
    const out = applyRegionLayout(buildComposite())
    const boxes = Object.values(out.groups)
      .filter(g => g.id.startsWith('region_'))
      .map(g => bbox(g.bounds!))
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(disjoint(boxes[i], boxes[j]), `region ${i} and ${j} overlap`).toBe(true)
      }
    }
  })

  it('每个实体仍落在其所属区域包围盒内', () => {
    const out = applyRegionLayout(buildComposite())
    for (const g of Object.values(out.groups)) {
      if (!g.id.startsWith('region_')) continue
      const box = bbox(g.bounds!)
      for (const eid of g.entityIds) {
        const e = out.entities[eid] as SceneCell
        const w = e.size?.width ?? 44
        const h = e.size?.height ?? 44
        expect(e.position.x - w / 2).toBeGreaterThanOrEqual(box.left - 1)
        expect(e.position.x + w / 2).toBeLessThanOrEqual(box.right + 1)
        expect(e.position.y - h / 2).toBeGreaterThanOrEqual(box.top - 1)
        expect(e.position.y + h / 2).toBeLessThanOrEqual(box.bottom + 1)
      }
    }
  })

  it('structureOf 识别 matrix 单元格与表头前缀', () => {
    expect(structureOf('cell_0_0')).toBe('matrix')
    expect(structureOf('m_rhead_0')).toBe('matrix')
    expect(structureOf('m_chead_0')).toBe('matrix')
    expect(structureOf('m_corner')).toBe('matrix')
  })
})

// --- 2. same-layer spacing / no overlap ---------------------------------------

const arrCtx = {} as CompileContext

function arrayCells(values: (string | number)[]): SceneCell[] {
  return arrayCompiler.compile({ type: 'array.create', values }, arrCtx).map(c => {
    if (c.type !== 'create_cell') throw new Error('expected create_cell')
    return c.cell as SceneCell
  })
}

describe('同层元素间距一致、不重叠', () => {
  it('数组单元格水平排布不重叠且间距恒定', () => {
    const cells = arrayCells([5, 3, 8, 1, 9])
    for (let i = 1; i < cells.length; i++) {
      const prevRight = cells[i - 1].position.x + (cells[i - 1].size?.width ?? 44) / 2
      const curLeft = cells[i].position.x - (cells[i].size?.width ?? 44) / 2
      const gap = curLeft - prevRight
      expect(gap, `${cells[i - 1].id}/${cells[i].id} overlap`).toBeGreaterThanOrEqual(0)
      // uniform square cells → uniform gap
      expect(gap).toBe(6)
    }
  })

  it('宽窄混合的数组单元格仍不重叠', () => {
    const cells = arrayCells(['[1,3]', '7', '[100,200]', '4'])
    for (let i = 1; i < cells.length; i++) {
      const prevRight = cells[i - 1].position.x + (cells[i - 1].size?.width ?? 44) / 2
      const curLeft = cells[i].position.x - (cells[i].size?.width ?? 44) / 2
      expect(curLeft, `${cells[i - 1].id}/${cells[i].id} overlap`).toBeGreaterThanOrEqual(prevRight)
    }
  })

  it('树同层节点宽度感知打包后包围盒不重叠（宽 B 树节点）', () => {
    const s = createEmptyScene()
    // root with two wide leaf children (long key lists)
    s.entities['root'] = treeNode('root', [{ value: 50 }])
    s.entities['L'] = treeNode('L', [{ value: '10,20,30' }, { value: '11,21,31' }])
    s.entities['R'] = treeNode('R', [{ value: '60,70,80' }, { value: '61,71,81' }])
    s.edges['e1'] = { id: 'e1', type: 'edge', from: { entityId: 'root' }, to: { entityId: 'L' } }
    s.edges['e2'] = { id: 'e2', type: 'edge', from: { entityId: 'root' }, to: { entityId: 'R' } }
    const pos = layoutTree(s)

    const widthOf = (id: string) => Math.max(96, measureNodeRenderWidth((s.entities[id] as SceneNode).fields, 96))
    // same depth: L and R are siblings on row 1 → must not overlap horizontally
    const lLeft = pos['L'].x - widthOf('L') / 2
    const lRight = pos['L'].x + widthOf('L') / 2
    const rLeft = pos['R'].x - widthOf('R') / 2
    const rRight = pos['R'].x + widthOf('R') / 2
    const noOverlap = lRight <= rLeft || rRight <= lLeft
    expect(noOverlap, 'wide sibling B-tree nodes overlap').toBe(true)
    // siblings share the same row (depth)
    expect(pos['L'].y).toBe(pos['R'].y)
    // parent sits on a higher row
    expect(pos['root'].y).toBeLessThan(pos['L'].y)
  })
})

// --- 3. labels / values fit within their cell ---------------------------------

describe('标签/数值不溢出单元格', () => {
  it('自适应宽度的数组单元格里数值不被截断', () => {
    const cells = arrayCells(['[15,18]', '[100,200]', '[8,10]'])
    for (const c of cells) {
      const w = c.size?.width ?? 44
      const shown = truncateToWidth(String(c.value), w - 6, 14)
      expect(shown, `cell ${c.id} value should fit without ellipsis`).toBe(String(c.value))
    }
  })

  it('超长文本在固定窄单元格内被 truncateToWidth 截断并带省略号', () => {
    const long = 'a-very-long-label-that-cannot-fit'
    const shown = truncateToWidth(long, 44 - 6, 12)
    expect(shown.length).toBeLessThan(long.length)
    expect(shown.endsWith('…')).toBe(true)
  })
})
