import { describe, it, expect } from 'vitest'
import { normalizeAlgoId, recognizeAlgorithm } from '../recognize'

describe('normalizeAlgoId', () => {
  it('snake_case 原样保留', () => {
    expect(normalizeAlgoId('selection_sort')).toBe('selection_sort')
  })
  it('连字符转下划线', () => {
    expect(normalizeAlgoId('Selection-Sort')).toBe('selection_sort')
  })
  it('camelCase 转 snake_case', () => {
    expect(normalizeAlgoId('selectionSort')).toBe('selection_sort')
  })
  it('空格转下划线', () => {
    expect(normalizeAlgoId('bubble sort')).toBe('bubble_sort')
  })
  it('去除首尾空白', () => {
    expect(normalizeAlgoId('  quick_sort  ')).toBe('quick_sort')
  })
})

describe('recognizeAlgorithm', () => {
  it('识别内置标准算法返回规范化 id', () => {
    expect(recognizeAlgorithm('selection_sort')).toBe('selection_sort')
    expect(recognizeAlgorithm('Bubble-Sort')).toBe('bubble_sort')
    expect(recognizeAlgorithm('quickSort')).toBe('quick_sort')
  })
  it('未知/自定义算法返回 null', () => {
    expect(recognizeAlgorithm('my_custom_thing')).toBeNull()
    expect(recognizeAlgorithm('foobar')).toBeNull()
  })
  it('空值返回 null', () => {
    expect(recognizeAlgorithm('')).toBeNull()
    expect(recognizeAlgorithm(undefined)).toBeNull()
    expect(recognizeAlgorithm(null)).toBeNull()
  })
})
