import { describe, expect, it } from 'vitest'
import {
  createGeneratorArtifact,
  validateInputContract,
} from '@/generator'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'

describe('GeneratorArtifact local runtime', () => {
  it('runs the same artifact for five inputs without recompilation', async () => {
    const artifact = createGeneratorArtifact({
      sourceCode: 'function sum(values) { return values.reduce((total, value) => total + value, 0) }',
      language: 'javascript',
      category: 'linear',
      algorithm: 'sum',
      rendererType: 'array',
      generatorSource: `
        const values = Array.isArray(input) ? input.slice() : []
        b.arrayCreate(values)
        let total = 0
        for (let index = 0; index < values.length; index++) {
          total += values[index]
          b.line(2).desc('累加当前元素').varSet('total', total)
        }
        b.result(total)
      `,
      inputSamples: [[1, 2, 3]],
    })
    const inputs = [[], [1], [3, 2, 1], [2, 2, 2], [9, 1, 5, 7]]

    const results = await Promise.all(inputs.map(async (input) => {
      const validated = validateInputContract(artifact.inputContract, input)
      expect(validated.ok).toBe(true)
      if (!validated.ok) throw new Error(validated.error)
      return runGeneratorSandboxed(
        artifact.generatorSource,
        validated.value,
        { algorithm: artifact.algorithm, type: artifact.rendererType },
      )
    }))

    expect(results.every((result) => result.ok)).toBe(true)
    expect(results.map((result) => result.script?.result)).toEqual([0, 1, 6, 6, 22])
  })
})
