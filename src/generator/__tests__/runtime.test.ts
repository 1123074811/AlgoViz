import { describe, expect, it } from 'vitest'
import {
  createGeneratorArtifact,
  runArtifact,
  validateArtifactAcrossInputs,
  type BoundaryInput,
} from '@/generator'

function sumArtifact(language = 'javascript', generatorSource?: string) {
  return createGeneratorArtifact({
    sourceCode: 'function sum(values) { return values.reduce((total, value) => total + value, 0) }',
    language,
    category: 'linear',
    algorithm: 'sum',
    rendererType: 'array',
    generatorSource: generatorSource ?? `
      const values = Array.isArray(input) ? input : []
      b.arrayCreate(values)
      let total = 0
      for (const value of values) {
        total += value
        b.varSet('total', total)
      }
      b.result(total)
    `,
    inputSamples: [[1, 2]],
  })
}

describe('GeneratorArtifact multi-input validation', () => {
  it('differentially validates JavaScript boundary inputs with high confidence', async () => {
    const artifact = await validateArtifactAcrossInputs(sumArtifact(), {
      sourceCode: 'function sum(values) { return values.reduce((total, value) => total + value, 0) }',
    })

    expect(artifact.validation).toMatchObject({
      status: 'passed',
      checkedInputs: 3,
      confidence: 'high',
    })
    expect(artifact.validation.cases?.every(testCase => testCase.status === 'passed')).toBe(true)
  })

  it('deterministically rejects a differential mismatch', async () => {
    const artifact = await validateArtifactAcrossInputs(
      sumArtifact('javascript', 'b.arrayCreate(input); b.result(0)'),
      {
        sourceCode: 'function sum(values) { return values.reduce((total, value) => total + value, 0) }',
        cases: [{ id: 'mismatch', input: [1] }],
      },
    )

    expect(artifact.validation.status).toBe('failed')
    expect(artifact.validation.confidence).toBe('low')
    expect(artifact.validation.cases).toEqual([
      { id: 'mismatch', status: 'failed', message: '结果不一致：0 != 1' },
    ])
  })

  it('records other languages as structurally passed but unverified', async () => {
    const artifact = await validateArtifactAcrossInputs(sumArtifact('java'), {
      sourceCode: 'int sum(int[] values) { return 0; }',
      cases: [{ id: 'minimal', input: [1] }],
    })

    expect(artifact.validation).toMatchObject({
      status: 'passed',
      confidence: 'unverified',
      cases: [{ id: 'minimal', status: 'skipped' }],
    })
  })

  it('accepts explicit empty/minimal/duplicate/no-solution/tie cases', async () => {
    const cases: BoundaryInput[] = [
      { id: 'empty', input: [] },
      { id: 'minimal', input: [1] },
      { id: 'duplicate', input: [1, 1] },
      { id: 'no-solution', input: [1, 2] },
      { id: 'tie', input: [2, 2, 4] },
    ]
    const source = 'function hasDuplicate(values) { return new Set(values).size !== values.length }'
    const artifact = createGeneratorArtifact({
      sourceCode: source,
      language: 'javascript',
      category: 'linear',
      algorithm: 'duplicate',
      rendererType: 'array',
      generatorSource: `
        const values = Array.isArray(input) ? input : []
        b.arrayCreate(values)
        b.result(new Set(values).size !== values.length)
      `,
      inputSamples: [[1, 2]],
    })

    const validated = await validateArtifactAcrossInputs(artifact, { sourceCode: source, cases })
    expect(validated.validation.status).toBe('passed')
    expect(validated.validation.cases?.map(testCase => testCase.id)).toEqual(cases.map(testCase => testCase.id))
  })
})

describe('GeneratorArtifact event budget', () => {
  it('passes the budget through the Worker boundary without changing result', async () => {
    const artifact = sumArtifact()
    const input = Array.from({ length: 100 }, (_, index) => index + 1)
    const compact = await runArtifact(artifact, input, { eventBudget: 5 })
    const detailed = await runArtifact(artifact, input, { eventBudget: 200 })

    expect(compact.ok && compact.script?.steps).toHaveLength(5)
    const compactSteps = compact.ok ? compact.script?.steps ?? [] : []
    expect(compactSteps[compactSteps.length - 1]?.description.zh).toContain('已省略')
    expect(compact.ok && compact.script?.result).toBe(5050)
    expect(detailed.ok && detailed.script?.result).toBe(compact.ok && compact.script?.result)
  })
})
