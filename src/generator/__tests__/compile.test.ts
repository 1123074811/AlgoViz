import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnimationScript } from '@/types/animation'

const mocks = vi.hoisted(() => ({
  analyze: vi.fn(),
  runArtifact: vi.fn(),
  validateAcrossInputs: vi.fn(),
}))

vi.mock('@/ai', () => ({
  analyzeCodeGenerator: (...args: unknown[]) => mocks.analyze(...args),
}))
vi.mock('@/ai/categories', () => ({
  classifyAlgorithm: () => 'linear',
  CATEGORY_PROFILES: { linear: { rules: [] } },
}))
vi.mock('@/ai/fallbackScene', () => ({
  buildFallbackScene: vi.fn(),
}))
vi.mock('@/ai/quality', () => ({
  runQualityGate: () => ({ passed: true, issues: [] }),
}))
vi.mock('@/ai/repairGenerator', () => ({
  repairGenerator: vi.fn(),
}))
vi.mock('@/presets', () => ({
  generatePreset: vi.fn(),
}))
vi.mock('@/presets/recognize', () => ({
  recognizeAlgorithm: () => null,
}))
vi.mock('@/generator/runtime', () => ({
  runArtifact: (...args: unknown[]) => mocks.runArtifact(...args),
  validateArtifactAcrossInputs: (...args: unknown[]) => mocks.validateAcrossInputs(...args),
}))

import { compileArtifact } from '../compile'

const script: AnimationScript = {
  algorithm: 'sum',
  initialState: { type: 'array', data: [1, 2] },
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  result: 3,
  verification: { status: 'pass', source: 'js-exec' },
  steps: [],
}

describe('compileArtifact', () => {
  beforeEach(() => {
    mocks.analyze.mockReset()
    mocks.runArtifact.mockReset()
    mocks.validateAcrossInputs.mockReset()
  })

  it('executes the initial generator through the shared runArtifact service', async () => {
    mocks.analyze.mockResolvedValue({
      success: true,
      generator: { algorithm: 'sum', type: 'array', body: 'b.arrayCreate(input); b.result(3)' },
    })
    mocks.runArtifact.mockResolvedValue({ ok: true, script })
    mocks.validateAcrossInputs.mockImplementation(async artifact => ({
      ...artifact,
      validation: { status: 'passed', checkedInputs: 3, issues: [], confidence: 'high' },
    }))

    const result = await compileArtifact(
      {
        code: 'function sum(values) { return values.reduce((a, b) => a + b, 0) }',
        language: 'javascript',
        inputData: '[1,2]',
      },
      {
        currentInputValid: true,
        parseInput: raw => ({ valid: true, value: JSON.parse(raw) }),
      },
    )

    expect(result.ok).toBe(true)
    expect(mocks.runArtifact).toHaveBeenCalledTimes(1)
    expect(mocks.runArtifact.mock.calls[0][0]).toMatchObject({ generatorSource: expect.any(String) })
    expect(mocks.runArtifact.mock.calls[0][1]).toEqual([1, 2])
    expect(mocks.validateAcrossInputs).toHaveBeenCalledTimes(1)
    expect(result.artifact?.validation.confidence).toBe('high')
  })
})
