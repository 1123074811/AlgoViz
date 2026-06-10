import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ALGORITHMS,
  type AlgorithmCategory,
  type Difficulty,
} from '@/data/algorithmCatalog'
import { CODE_TEMPLATES, getCodeTemplate, getAllCodeTemplates, type CodeLang } from '@/data/codeTemplates'

const VALID_CATEGORIES: AlgorithmCategory[] = [
  'sorting',
  'graph',
  'data-structure',
  'dp',
  'search-backtrack',
  'advanced',
  'interview',
  'contest',
]
const VALID_DIFFICULTY: Difficulty[] = ['easy', 'medium', 'hard']
const LANGS: CodeLang[] = ['python', 'javascript', 'cpp', 'java']

describe('algorithmCatalog · DEFAULT_ALGORITHMS', () => {
  it('is a non-empty list', () => {
    expect(Array.isArray(DEFAULT_ALGORITHMS)).toBe(true)
    expect(DEFAULT_ALGORITHMS.length).toBeGreaterThan(0)
  })

  it('every entry has well-formed required fields', () => {
    for (const algo of DEFAULT_ALGORITHMS) {
      expect(typeof algo.id).toBe('string')
      expect(algo.id.length).toBeGreaterThan(0)
      expect(typeof algo.name).toBe('string')
      expect(algo.name.length).toBeGreaterThan(0)
      expect(typeof algo.nameEn).toBe('string')
      expect(algo.nameEn.length).toBeGreaterThan(0)
      expect(VALID_CATEGORIES).toContain(algo.category)
      expect(VALID_DIFFICULTY).toContain(algo.difficulty)
      expect(typeof algo.hasPreset).toBe('boolean')
    }
  })

  it('has unique algorithm ids', () => {
    const ids = DEFAULT_ALGORITHMS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses snake_case-style ids (no spaces / uppercase)', () => {
    for (const a of DEFAULT_ALGORITHMS) {
      expect(a.id).toMatch(/^[a-z0-9_]+$/)
    }
  })

  it('covers multiple categories', () => {
    const categories = new Set(DEFAULT_ALGORITHMS.map((a) => a.category))
    expect(categories.size).toBeGreaterThan(1)
  })
})

describe('codeTemplates · getCodeTemplate', () => {
  it('returns the exact template for a known id + language', () => {
    const expected = CODE_TEMPLATES['bubble_sort']?.python
    expect(expected).toBeTruthy()
    expect(getCodeTemplate('bubble_sort', 'python')).toBe(expected)
  })

  it('falls back to the python template when the requested language is missing', () => {
    // Find an id that has python but is missing at least one other language.
    const entry = Object.entries(CODE_TEMPLATES).find(
      ([, byLang]) => byLang.python && LANGS.some((l) => !byLang[l]),
    )
    expect(entry).toBeTruthy()
    const [id, byLang] = entry!
    const missingLang = LANGS.find((l) => !byLang[l])!
    expect(getCodeTemplate(id, missingLang)).toBe(byLang.python)
  })

  it('returns a clearly-marked placeholder for an unknown id', () => {
    const result = getCodeTemplate('totally_unknown_algo', 'java')
    expect(result).toContain('not available')
  })
})

describe('codeTemplates · getAllCodeTemplates', () => {
  it('flattens every non-empty template entry', () => {
    const all = getAllCodeTemplates()
    expect(all.length).toBeGreaterThan(0)
    for (const { algoId, lang, code } of all) {
      expect(CODE_TEMPLATES[algoId]).toBeTruthy()
      expect(LANGS).toContain(lang)
      expect(code.length).toBeGreaterThan(0)
    }
  })

  it('matches the count of non-empty (id, lang) pairs in CODE_TEMPLATES', () => {
    let expectedCount = 0
    for (const byLang of Object.values(CODE_TEMPLATES)) {
      for (const code of Object.values(byLang)) {
        if (code) expectedCount++
      }
    }
    expect(getAllCodeTemplates().length).toBe(expectedCount)
  })
})
