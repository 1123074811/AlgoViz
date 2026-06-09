import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GraphAnalysisView from '../GraphAnalysisView'
import { createEmptyScene } from '../../types'
import type { SceneState, SceneNode, SceneCell } from '../../types'

function graphNode(id: string, x: number, y: number): SceneNode {
  return { id, type: 'node', variant: 'graph.vertex', position: { x, y }, size: { width: 44, height: 44 }, ports: [], fields: [{ id: 'value', label: '', value: id, role: 'value' }] } as SceneNode
}

describe('GraphAnalysisView', () => {
  it('为有 disc/low 的图结点渲染标注文本', () => {
    const marker: SceneCell = { id: 'gan_marker', type: 'cell', position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, value: '', meta: { discLow: { A: [1, 1] }, stack: ['A'], components: { A: 0 } } } as SceneCell
    const scene: SceneState = { ...createEmptyScene(), entities: { A: graphNode('A', 100, 100), gan_marker: marker } }
    const { container } = render(<svg><GraphAnalysisView marker={marker} scene={scene} /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts.some(t => t?.includes('1/1'))).toBe(true) // disc/low 标注
  })
})
