import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SEMANTIC_COLORS, SHAPE, TYPO, MOTION, type SemanticColorName } from '../tokens'

describe('design tokens', () => {
  it('每个语义色都有 stroke/fill/text 三字段', () => {
    const names: SemanticColorName[] = ['idle', 'primary', 'compare', 'active', 'success', 'danger', 'window']
    for (const n of names) {
      expect(SEMANTIC_COLORS[n]).toBeDefined()
      expect(SEMANTIC_COLORS[n].stroke).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(SEMANTIC_COLORS[n].fill).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(SEMANTIC_COLORS[n].text).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('形状/排版/动效令牌存在且类型正确', () => {
    expect(SHAPE.cellRadius).toBeTypeOf('number')
    expect(SHAPE.strokeWidth.base).toBeTypeOf('number')
    expect(TYPO.mono).toContain('monospace')
    expect(MOTION.easing).toMatch(/cubic-bezier/)
    expect(MOTION.duration.base).toBeTypeOf('number')
  })

  it('CellView 不再内联定义 COLOR_MAP 硬编码色板', () => {
    const src = readFileSync(resolve(__dirname, '../primitives/CellView.tsx'), 'utf8')
    expect(src).not.toMatch(/const COLOR_MAP/)
    expect(src).toMatch(/from '\.\.\/tokens'/)
  })
})
