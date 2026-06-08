import { describe, it, expect } from 'vitest'
import { trimAnchor } from '../primitives/EdgeView'
import { createEmptyScene } from '../types'
import type { SceneState, SceneNode } from '../types'

function sceneWithTreeNode(id: string, x: number, y: number, width = 48): SceneState {
  const node: SceneNode = {
    id, type: 'node', variant: 'tree.binary',
    position: { x, y }, size: { width, height: width },
    ports: [
      { id: 'parent', side: 'top', role: 'parent' },
      { id: 'child', side: 'bottom', role: 'child' },
    ],
    fields: [{ id: 'value', label: '', value: 8, role: 'value' }],
  }
  return { ...createEmptyScene(), entities: { [id]: node } }
}

describe('trimAnchor — 圆形结点从中心裁剪(防短线悬空回归)', () => {
  it('父结点底部连线从「圆周边界」出发,而非端口点再砍一次', () => {
    // 父结点中心 (100,100)，子结点在正下方 (100,300)。
    const scene = sceneWithTreeNode('p', 100, 100, 48)
    const portBottom = { x: 100, y: 124 } // bottom 端口(中心+半高)
    const childAnchor = { x: 100, y: 300 }
    const trimmed = trimAnchor(scene, 'p', portBottom, childAnchor)
    // 结果应在「中心 + (半径 r + gap5)」处朝向子结点 —— y ≈ 100 + (r+5)。
    // r 来自自适应圆布局(≈半宽 24 上下),关键是不能因为从端口(124)再砍 r 而跑到 ~149。
    expect(trimmed.x).toBeCloseTo(100)
    expect(trimmed.y).toBeLessThan(140) // 远小于「端口124 + r+gap」的双重裁剪结果
    expect(trimmed.y).toBeGreaterThan(100) // 在中心下方
  })

  it('连线长度足够长(不再是悬在中间的短线)', () => {
    const scene = { ...sceneWithTreeNode('p', 100, 100, 48).entities, ...sceneWithTreeNode('c', 100, 300, 48).entities }
    const full: SceneState = { ...createEmptyScene(), entities: scene }
    const fromPort = { x: 100, y: 124 }
    const toPort = { x: 100, y: 276 }
    const a = trimAnchor(full, 'p', fromPort, toPort)
    const b = trimAnchor(full, 'c', toPort, fromPort)
    // 父子中心相距 200，两端各裁 (r+5)。连线长度应远大于 100(占间距大头)。
    const len = Math.abs(b.y - a.y)
    expect(len).toBeGreaterThan(140)
  })
})
