import { describe, expect, it } from 'vitest'
import {
  BUILDER_PROTOCOL_VERSION,
  PROMPT_PROTOCOL_VERSION,
  createGeneratorArtifact,
  createGeneratorCacheKey,
  inferInputContract,
  validateInputContract,
} from '@/generator'

describe('GeneratorArtifact contracts', () => {
  it('uses source, language and protocol versions as the cache identity, never input values', () => {
    const first = createGeneratorArtifact({
      sourceCode: 'function sort(values) { return values.sort() }',
      language: 'JavaScript',
      category: 'linear',
      algorithm: 'sort',
      rendererType: 'array',
      generatorSource: 'b.arrayCreate(input)',
      inputSamples: [[3, 2, 1]],
    })
    const second = createGeneratorArtifact({
      sourceCode: 'function sort(values) { return values.sort() }',
      language: 'javascript',
      category: 'linear',
      algorithm: 'sort',
      rendererType: 'array',
      generatorSource: 'b.arrayCreate(input)',
      inputSamples: [[9, 8, 7, 6]],
    })

    expect(first.cacheKey).toBe(second.cacheKey)
    expect(first.inputContract).toEqual(second.inputContract)
    expect(first.cacheKey).toBe(createGeneratorCacheKey({
      sourceHash: first.sourceHash,
      language: 'javascript',
      builderVersion: BUILDER_PROTOCOL_VERSION,
      promptVersion: PROMPT_PROTOCOL_VERSION,
    }))
    expect(first.cacheKey).not.toContain('3,2,1')
  })

  it('infers compatible object keys and rejects a missing required key', () => {
    const contract = inferInputContract([
      { nums: [1, 2], target: 3, optional: true },
      { nums: [4, 5], target: 9 },
    ])

    expect(contract.acceptedKinds).toEqual(['object'])
    expect(contract.requiredObjectKeys).toEqual(['nums', 'target'])
    expect(validateInputContract(contract, { nums: [], target: 0 }).ok).toBe(true)
    expect(validateInputContract(contract, { nums: [] })).toEqual({
      ok: false,
      error: '输入缺少必需字段：target',
    })
  })

  it('rejects a top-level input kind that was not observed', () => {
    const contract = inferInputContract([[1, 2, 3]])
    expect(validateInputContract(contract, '1,2,3')).toEqual({
      ok: false,
      error: '输入类型应为 array，实际为 string',
    })
  })
})
